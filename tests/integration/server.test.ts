import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "../../src/server.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

describe("MCP Server Integration", () => {
  let server: Server;
  
  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    server = await createServer();
  });
  
  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });
  
  it("should create server successfully", () => {
    expect(server).toBeDefined();
  });
  
  it("should be properly configured", () => {
    expect(server).toBeInstanceOf(Server);
  });
});