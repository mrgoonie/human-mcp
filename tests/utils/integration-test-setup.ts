/**
 * Integration Test Setup Helper
 *
 * Provides utilities for setting up integration tests without global mock contamination.
 * Should be used in integration tests that need real API calls or specific mock behavior.
 */

import { mock } from "bun:test";
import { getTestType } from "./mock-control.js";

/**
 * Check if we're in integration test mode
 */
export function isIntegrationTest(): boolean {
  return getTestType() === "integration";
}

/**
 * Create a local Gemini client mock that won't conflict with global mocks
 * Use this in integration tests that need specific mock behavior
 */
export function createLocalGeminiMock() {
  console.log("[IntegrationTest] Creating local Gemini mock");

  const localMockGenerateContent = mock(async (request: any) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));

    // Return mock response based on request
    if (request.contents?.[0]?.parts?.[0]?.text?.includes("generate image")) {
      return {
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: "image/png",
                  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                }
              }]
            }
          }]
        }
      };
    }

    return {
      response: {
        candidates: [{
          content: {
            parts: [{ text: "Mock response" }]
          }
        }]
      }
    };
  });

  const localMockModel = {
    generateContent: localMockGenerateContent
  };

  const localMockClient = {
    getImageGenerationModel: mock(() => localMockModel),
    getGenerativeModel: mock(() => localMockModel)
  };

  return {
    client: localMockClient,
    generateContent: localMockGenerateContent,
    reset: () => {
      localMockGenerateContent.mockClear();
      localMockClient.getImageGenerationModel.mockClear();
      localMockClient.getGenerativeModel.mockClear();
    }
  };
}

/**
 * Override global mocks for integration tests
 * Call this in beforeAll() of integration tests that need different mock behavior
 */
export function overrideGlobalMocks() {
  if (!isIntegrationTest()) {
    console.log("[IntegrationTest] Not in integration mode, skipping mock override");
    return null;
  }

  console.log("[IntegrationTest] Overriding global mocks for integration test");

  // Create local mock that overrides the global one
  const localMock = createLocalGeminiMock();

  // Override the global mock module
  mock.module("@google/generative-ai", () => ({
    GoogleGenerativeAI: mock(() => ({
      getGenerativeModel: localMock.client.getGenerativeModel
    }))
  }));

  return localMock;
}

/**
 * Setup integration test environment
 * Call this in beforeAll() of integration tests
 */
export function setupIntegrationTest() {
  console.log("[IntegrationTest] Setting up integration test environment");

  // Set environment variables needed for tests
  process.env.GOOGLE_GEMINI_API_KEY = "integration-test-key";
  process.env.LOG_LEVEL = "error"; // Reduce logging noise

  // Override global mocks if needed
  const localMock = overrideGlobalMocks();

  return {
    localMock,
    cleanup: () => {
      console.log("[IntegrationTest] Cleaning up integration test environment");
      if (localMock) {
        localMock.reset();
      }
    }
  };
}

/**
 * Cleanup integration test environment
 * Call this in afterAll() of integration tests
 */
export function cleanupIntegrationTest() {
  console.log("[IntegrationTest] Cleaning up integration test environment");
  delete process.env.GOOGLE_GEMINI_API_KEY;
}

/**
 * Mock response generators for integration tests
 */
export const IntegrationMockResponses = {
  imageGeneration: {
    success: () => ({
      response: {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: "image/png",
                data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
              }
            }]
          }
        }]
      }
    }),

    error: () => {
      throw new Error("Mock API error for testing");
    },

    safetyError: () => ({
      response: {
        candidates: [],
        promptFeedback: {
          blockReason: "SAFETY",
          blockReasonMessage: "Content blocked for safety reasons"
        }
      }
    })
  }
};