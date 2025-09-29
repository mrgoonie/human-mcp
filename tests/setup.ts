import { beforeAll, afterAll } from "bun:test";
import {
  applyConditionalMocks,
  resetConditionalMocks,
  globalMocks,
  getTestType,
  getMockInfo
} from "./utils/mock-control.js";

// Apply mocks conditionally based on TEST_TYPE environment variable
const testType = getTestType();
console.log(`[TestSetup] Initializing test environment for type: ${testType}`);
console.log(`[TestSetup] Mock configuration:`, getMockInfo(testType));

// Apply conditional mocks
applyConditionalMocks(testType);

// Export global mocks for compatibility
export { globalMocks };

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
  
  // Reset conditional mocks
  resetConditionalMocks(testType);
});