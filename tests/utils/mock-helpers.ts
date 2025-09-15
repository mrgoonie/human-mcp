import { mock, type Mock } from 'bun:test';
import type { MockError, MockHttpResponseData } from '../types/test-types.js';

export interface MockedLogger {
  info: Mock<() => void>;
  error: Mock<() => void>;
  warn: Mock<() => void>;
  debug: Mock<() => void>;
}

export interface MockedFS {
  readFileSync: Mock<() => Buffer>;
  writeFileSync: Mock<() => void>;
  existsSync: Mock<() => boolean>;
  mkdirSync: Mock<() => void>;
  unlinkSync: Mock<() => void>;
}

export interface MockedGeminiClient {
  generateContent: Mock<() => Promise<any>>;
  getGenerativeModel: Mock<() => any>;
}

export class MockHelpers {
  static createLoggerMock(): MockedLogger {
    return {
      info: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {})
    };
  }

  static createFileSystemMock(): MockedFS {
    return {
      readFileSync: mock(() => Buffer.from('mock file content')),
      writeFileSync: mock(() => {}),
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      unlinkSync: mock(() => {})
    };
  }

  static createGeminiClientMock(): MockedGeminiClient {
    return {
      generateContent: mock(() => Promise.resolve({
        response: {
          text: () => JSON.stringify({
            summary: "Mock analysis result",
            details: "Mock detailed analysis",
            confidence: 0.95
          })
        }
      })),
      getGenerativeModel: mock(() => ({
        generateContent: mock(() => Promise.resolve({
          response: {
            text: () => JSON.stringify({
              summary: "Mock analysis result",
              details: "Mock detailed analysis", 
              confidence: 0.95
            })
          }
        }))
      }))
    };
  }

  static resetAllMocks(mocks: Record<string, unknown>): void {
    Object.values(mocks).forEach(mockObj => {
      if (typeof mockObj === 'object' && mockObj !== null) {
        Object.values(mockObj).forEach(mockFn => {
          if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
            (mockFn as Mock<any>).mockRestore();
          }
        });
      }
    });
  }

  static createMockResponse(data: MockHttpResponseData, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  static createMockError(message: string, code?: string | number): MockError {
    const error: MockError = { message };
    if (code) {
      error.code = code;
    }
    return error as MockError & Error;
  }
}

export default MockHelpers;