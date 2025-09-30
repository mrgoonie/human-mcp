/**
 * Mock Control Utility for Environment-Based Mock Management
 *
 * This utility provides controlled mock application based on test type
 * to prevent global mock contamination between unit and integration tests.
 */

import { mock } from "bun:test";
import { MockHelpers } from "./mock-helpers.js";

export type TestType = "unit" | "integration" | "e2e" | "all";

/**
 * Get the current test type from environment variables
 */
export function getTestType(): TestType {
  const testType = process.env.TEST_TYPE as TestType;
  return testType || "all";
}

/**
 * Check if a specific mock should be applied for the current test type
 */
export function shouldApplyMock(mockName: string, testType: TestType = getTestType()): boolean {
  const mockConfig: Record<string, TestType[]> = {
    // Logger mock - apply to all test types
    logger: ["unit", "integration", "e2e", "all"],

    // File system mock - only for unit tests (avoid interfering with integration tests)
    fs: ["unit"],

    // Gemini client mock - NEVER apply globally anymore
    // Let individual test files handle their own Gemini client mocking
    // This prevents mock contamination between test files
    geminiClient: []
  };

  const allowedTypes = mockConfig[mockName as keyof typeof mockConfig] || [];
  return allowedTypes.includes(testType);
}

/**
 * Global mock instances (shared across test types)
 */
export const globalMocks = {
  logger: MockHelpers.createLoggerMock(),
  fs: MockHelpers.createFileSystemMock(),
  geminiClient: MockHelpers.createGeminiClientMock()
};

/**
 * Apply mocks conditionally based on test type
 */
export function applyConditionalMocks(testType: TestType = getTestType()): void {
  console.log(`[MockControl] Applying mocks for test type: ${testType}`);

  // Always apply logger mock (safe for all test types)
  if (shouldApplyMock("logger", testType)) {
    mock.module("@/utils/logger", () => ({
      logger: globalMocks.logger
    }));
    console.log(`[MockControl] ✓ Applied logger mock`);
  }

  // Conditionally apply file system mock
  if (shouldApplyMock("fs", testType)) {
    mock.module("fs", () => globalMocks.fs);
    console.log(`[MockControl] ✓ Applied fs mock`);
  }

  // Conditionally apply Gemini client mock
  if (shouldApplyMock("geminiClient", testType)) {
    mock.module("@google/generative-ai", () => ({
      GoogleGenerativeAI: mock(() => ({
        getGenerativeModel: globalMocks.geminiClient.getGenerativeModel
      }))
    }));
    console.log(`[MockControl] ✓ Applied Gemini client mock`);
  } else {
    console.log(`[MockControl] ⊗ Skipped Gemini client mock (integration test)`);
  }
}

/**
 * Reset mocks based on test type
 */
export function resetConditionalMocks(testType: TestType = getTestType()): void {
  if (shouldApplyMock("logger", testType)) {
    // Reset each logger mock method
    Object.values(globalMocks.logger).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
        mockFn.mockRestore();
      }
    });
  }

  if (shouldApplyMock("fs", testType)) {
    // Reset each fs mock method
    Object.values(globalMocks.fs).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
        mockFn.mockRestore();
      }
    });
  }

  if (shouldApplyMock("geminiClient", testType)) {
    // Reset each gemini client mock method
    Object.values(globalMocks.geminiClient).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
        mockFn.mockRestore();
      }
    });
  }
}

/**
 * Get mock configuration info for debugging
 */
export function getMockInfo(testType: TestType = getTestType()): object {
  return {
    testType,
    appliedMocks: {
      logger: shouldApplyMock("logger", testType),
      fs: shouldApplyMock("fs", testType),
      geminiClient: shouldApplyMock("geminiClient", testType)
    },
    environment: {
      TEST_TYPE: process.env.TEST_TYPE,
      NODE_ENV: process.env.NODE_ENV,
      __TEST_MODE__: (globalThis as any).__TEST_MODE__
    }
  };
}