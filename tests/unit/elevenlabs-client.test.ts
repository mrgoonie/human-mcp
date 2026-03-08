import { describe, it, expect } from "bun:test";
import { ElevenLabsClient, ElevenLabsApiError } from "../../src/utils/elevenlabs-client.js";
import type { Config } from "../../src/utils/config.js";

function createTestConfig(apiKey?: string): Config {
  return {
    gemini: { apiKey: "", model: "gemini-2.5-flash", imageModel: "gemini-2.5-flash-image", useVertexAI: false, vertexLocation: "us-central1" },
    transport: { type: "stdio" },
    server: { port: 3000, maxRequestSize: "50MB", enableCaching: true, cacheTTL: 3600, requestTimeout: 300000, fetchTimeout: 60000 },
    security: { rateLimitRequests: 100, rateLimitWindow: 60000 },
    logging: { level: "info" },
    providers: { speech: "gemini", video: "gemini", vision: "gemini", image: "gemini" },
    documentProcessing: { enabled: true, maxFileSize: 52428800, supportedFormats: [], timeout: 300000, retryAttempts: 3, cacheEnabled: true, ocrEnabled: false, geminiModel: "gemini-2.5-flash" },
    elevenlabs: apiKey ? { apiKey, apiHost: "https://api.elevenlabs.io" } : undefined,
  } as Config;
}

describe("ElevenLabsClient", () => {
  describe("isConfigured", () => {
    it("returns true when API key is set", () => {
      const config = createTestConfig("test-key-123");
      expect(ElevenLabsClient.isConfigured(config)).toBe(true);
    });

    it("returns false when API key is missing", () => {
      const config = createTestConfig();
      expect(ElevenLabsClient.isConfigured(config)).toBe(false);
    });

    it("returns false when elevenlabs section is undefined", () => {
      const config = createTestConfig();
      delete (config as any).elevenlabs;
      expect(ElevenLabsClient.isConfigured(config)).toBe(false);
    });
  });

  describe("constructor", () => {
    it("creates client when API key is provided", () => {
      const config = createTestConfig("test-key-123");
      const client = new ElevenLabsClient(config);
      expect(client).toBeInstanceOf(ElevenLabsClient);
    });

    it("throws when API key is missing", () => {
      const config = createTestConfig();
      expect(() => new ElevenLabsClient(config)).toThrow("ELEVENLABS_API_KEY is required");
    });
  });

  describe("ElevenLabsApiError", () => {
    it("captures status code and request ID", () => {
      const error = new ElevenLabsApiError(429, "Rate limit exceeded", "req-abc-123");
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.requestId).toBe("req-abc-123");
      expect(error.name).toBe("ElevenLabsApiError");
    });

    it("works without request ID", () => {
      const error = new ElevenLabsApiError(500, "Internal error");
      expect(error.statusCode).toBe(500);
      expect(error.requestId).toBeUndefined();
    });
  });
});
