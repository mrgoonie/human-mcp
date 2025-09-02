import { describe, it, expect, beforeEach } from "bun:test";
import { loadConfig } from "../../src/utils/config.js";

describe("Config", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
  });
  
  it("should load default configuration", () => {
    process.env.LOG_LEVEL = "info"; // Override test setup
    const config = loadConfig();
    
    expect(config.gemini.apiKey).toBe("test-key");
    expect(config.gemini.model).toBe("gemini-2.0-flash-latest");
    expect(config.server.port).toBe(3000);
    expect(config.logging.level).toBe("info");
  });
  
  it("should override defaults with environment variables", () => {
    process.env.PORT = "8080";
    process.env.LOG_LEVEL = "debug";
    process.env.GOOGLE_GEMINI_MODEL = "gemini-2.0-flash-exp";
    
    const config = loadConfig();
    
    expect(config.server.port).toBe(8080);
    expect(config.logging.level).toBe("debug");
    expect(config.gemini.model).toBe("gemini-2.0-flash-exp");
  });
  
  it("should throw error for missing API key", () => {
    // Clear environment variables set by other tests
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.GOOGLE_GEMINI_MODEL;
    
    expect(() => loadConfig()).toThrow();
  });
});