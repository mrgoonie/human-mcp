import { beforeAll, afterAll, mock } from "bun:test";
import { MockHelpers } from "./utils/mock-helpers.js";

// Global mock instances
export const globalMocks = {
  logger: MockHelpers.createLoggerMock(),
  fs: MockHelpers.createFileSystemMock(),
  geminiClient: MockHelpers.createGeminiClientMock()
};

// Mock logger globally for all tests
mock.module("@/utils/logger", () => ({
  logger: globalMocks.logger
}));

// Mock fs module for Bun compatibility (disabled for integration tests)
// mock.module("fs", () => globalMocks.fs);

// Mock Google Gemini client
mock.module("@google/generative-ai", () => ({
  GoogleGenerativeAI: mock(() => ({
    getGenerativeModel: globalMocks.geminiClient.getGenerativeModel
  }))
}));

beforeAll(() => {
  // Set up test environment variables
  process.env.GOOGLE_GEMINI_API_KEY = "test-api-key";
  process.env.LOG_LEVEL = "error";
  process.env.NODE_ENV = "test";
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = "test-account";
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.CLOUDFLARE_R2_BUCKET = "test-bucket";
  
  // Initialize global test state
  (globalThis as any).__TEST_MODE__ = true;
});

afterAll(() => {
  // Clean up environment variables
  delete process.env.GOOGLE_GEMINI_API_KEY;
  delete process.env.LOG_LEVEL;
  delete process.env.NODE_ENV;
  delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  delete process.env.CLOUDFLARE_R2_BUCKET;
  
  // Clean up global test state
  delete (globalThis as any).__TEST_MODE__;
  
  // Reset all mocks
  MockHelpers.resetAllMocks(globalMocks);
});