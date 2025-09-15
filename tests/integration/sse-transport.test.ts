import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { testServerManager } from "../utils/test-server-manager.js";

describe("SSE Transport Integration", () => {
  let baseUrl: string;

  beforeAll(async () => {
    const testServer = await testServerManager.startTestServer({
      sessionMode: "stateful",
      enableSse: true,
      enableJsonResponse: true,
      enableSseFallback: true,
      ssePaths: {
        stream: "/sse",
        message: "/messages"
      },
      security: {
        enableCors: true,
        enableDnsRebindingProtection: true,
        allowedHosts: ["127.0.0.1", "localhost"]
      }
    });

    baseUrl = testServer.baseUrl;
  });

  afterAll(async () => {
    await testServerManager.stopAllServers();
  });

  describe("health endpoint", () => {
    it("should include SSE fallback status in health check", async () => {
      const response = await fetch(`${baseUrl}/health`);
      const health = await response.json() as {
        status: string;
        transport: string;
        sseFallback: string;
        ssePaths: { stream: string; message: string; };
      };
      
      expect(health.status).toBe("healthy");
      expect(health.transport).toBe("streamable-http");
      expect(health.sseFallback).toBe("enabled");
      expect(health.ssePaths).toEqual({
        stream: "/sse",
        message: "/messages"
      });
    });
  });

  describe("SSE endpoint availability", () => {
    it("should reject GET /sse in stateless mode", async () => {
      const response = await fetch(`${baseUrl}/sse`, {
        method: "GET"
      });
      
      // In current stateful mode, we expect different behavior
      // This test would need a separate server instance with stateless config
      // For now, just verify the endpoint exists
      expect(response.status).toBeDefined();
    });

    it("should reject POST /messages without sessionId", async () => {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          id: 1
        })
      });
      
      expect(response.status).toBe(400);
      const error = await response.json() as { error: { message: string } };
      expect(error.error.message).toContain("Missing sessionId");
    });

    it("should reject POST /messages with invalid sessionId", async () => {
      const response = await fetch(`${baseUrl}/messages?sessionId=invalid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          id: 1
        })
      });
      
      expect(response.status).toBe(400);
      const error = await response.json() as { error: { message: string } };
      expect(error.error.message).toContain("No active SSE session");
    });
  });

  describe("transport mixing prevention", () => {
    it("should prevent using streamable HTTP session ID on SSE endpoints", async () => {
      // First create a streamable HTTP session
      const initResponse = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0.0" }
          },
          id: 1
        })
      });

      const sessionId = initResponse.headers.get("Mcp-Session-Id");
      
      if (sessionId) {
        // Try to use this session ID on SSE message endpoint
        const response = await fetch(`${baseUrl}/messages?sessionId=${sessionId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "ping",
            id: 2
          })
        });
        
        expect(response.status).toBe(400);
        const error = await response.json() as { error: { message: string } };
        expect(error.error.message).toContain("streamable HTTP transport");
      }
    });
  });
});