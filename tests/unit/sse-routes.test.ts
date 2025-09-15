import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { SSEManager } from "../../src/transports/http/sse-routes.js";
import type { HttpTransportConfig } from "../../src/transports/types.js";
import type { Response } from "express";

describe("SSEManager", () => {
  let sseManager: SSEManager;
  let config: HttpTransportConfig;

  beforeEach(() => {
    config = {
      port: 3000,
      sessionMode: "stateful",
      enableSseFallback: true,
      ssePaths: {
        stream: "/sse",
        message: "/messages"
      },
      security: {
        enableDnsRebindingProtection: true,
        allowedHosts: ["127.0.0.1", "localhost"]
      }
    };
    sseManager = new SSEManager(config);
  });

  afterEach(async () => {
    await sseManager.cleanup();
  });

  describe("session management", () => {
    it("should start with zero sessions", () => {
      expect(sseManager.getSessionCount()).toBe(0);
      expect(sseManager.hasSession("non-existent")).toBe(false);
    });

    it("should track session existence correctly", () => {
      // Mock response object for testing
      const mockRes = {
        setHeader: () => {},
        write: () => {},
        end: () => {},
        on: () => {},
        removeAllListeners: () => {}
      } as unknown as Response;

      const transport = sseManager.createSession("/messages", mockRes);
      
      expect(sseManager.getSessionCount()).toBe(1);
      expect(sseManager.hasSession(transport.sessionId)).toBe(true);
      expect(sseManager.getSession(transport.sessionId)).toBe(transport);
    });

    it("should return null for non-existent session", () => {
      expect(sseManager.getSession("non-existent-id")).toBe(null);
    });

    it("should cleanup sessions correctly", async () => {
      const mockRes = {
        setHeader: () => {},
        write: () => {},
        end: () => {},
        on: () => {},
        removeAllListeners: () => {}
      } as unknown as Response;

      sseManager.createSession("/messages", mockRes);
      expect(sseManager.getSessionCount()).toBe(1);

      await sseManager.cleanup();
      expect(sseManager.getSessionCount()).toBe(0);
    });
  });

  describe("configuration handling", () => {
    it("should use security configuration from config", () => {
      const mockRes = {
        setHeader: () => {},
        write: () => {},
        end: () => {},
        on: () => {},
        removeAllListeners: () => {}
      } as unknown as Response;

      const transport = sseManager.createSession("/messages", mockRes);
      
      // Transport should be created successfully with security config
      expect(transport).toBeDefined();
      expect(transport.sessionId).toBeDefined();
    });
  });
});