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
    expect(config.gemini.model).toBe("gemini-2.5-flash");
    expect(config.server.port).toBe(3000);
    expect(config.logging.level).toBe("info");
  });
  
  it("should override defaults with environment variables", () => {
    process.env.PORT = "8080";
    process.env.LOG_LEVEL = "debug";
    process.env.GOOGLE_GEMINI_MODEL = "gemini-2.5-flash";
    
    const config = loadConfig();
    
    expect(config.server.port).toBe(8080);
    expect(config.logging.level).toBe("debug");
    expect(config.gemini.model).toBe("gemini-2.5-flash");
  });
  
  it("should allow missing API key (for Vertex AI mode)", () => {
    // Clear environment variables set by other tests
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.GOOGLE_GEMINI_MODEL;

    // This should not throw because API key is optional when using Vertex AI
    const config = loadConfig();
    expect(config.gemini.apiKey).toBe("");
    expect(config.gemini.useVertexAI).toBe(false);
  });

  it("should enable Vertex AI mode when USE_VERTEX is set", () => {
    process.env.USE_VERTEX = "1";
    process.env.VERTEX_PROJECT_ID = "test-project";
    process.env.VERTEX_LOCATION = "us-central1";

    const config = loadConfig();

    expect(config.gemini.useVertexAI).toBe(true);
    expect(config.gemini.vertexProjectId).toBe("test-project");
    expect(config.gemini.vertexLocation).toBe("us-central1");
  });
});