import { mock } from 'bun:test';
import type { MockError } from '../types/test-types.js';

export class ErrorScenarios {
  /**
   * Common network errors for testing
   */
  static networkErrors = {
    CONNECTION_REFUSED: new Error('ECONNREFUSED: Connection refused'),
    TIMEOUT: new Error('ETIMEDOUT: Request timeout'),
    DNS_ERROR: new Error('ENOTFOUND: DNS lookup failed'),
    SSL_ERROR: new Error('SSL certificate verification failed'),
    NETWORK_UNREACHABLE: new Error('ENETUNREACH: Network is unreachable')
  };

  /**
   * HTTP error responses
   */
  static httpErrors = {
    NOT_FOUND: { status: 404, error: 'Resource not found' },
    UNAUTHORIZED: { status: 401, error: 'Unauthorized access' },
    FORBIDDEN: { status: 403, error: 'Forbidden' },
    SERVER_ERROR: { status: 500, error: 'Internal server error' },
    BAD_GATEWAY: { status: 502, error: 'Bad gateway' },
    SERVICE_UNAVAILABLE: { status: 503, error: 'Service unavailable' },
    RATE_LIMITED: { status: 429, error: 'Too many requests' }
  };

  /**
   * API specific errors
   */
  static apiErrors = {
    GEMINI_API_ERROR: new Error('Gemini API quota exceeded'),
    GEMINI_INVALID_KEY: new Error('Invalid Gemini API key'),
    GEMINI_MODEL_UNAVAILABLE: new Error('Gemini model temporarily unavailable'),
    CLOUDFLARE_R2_ERROR: new Error('Cloudflare R2 upload failed'),
    FILE_NOT_FOUND: new Error('ENOENT: File not found'),
    PERMISSION_DENIED: new Error('EACCES: Permission denied'),
    DISK_FULL: new Error('ENOSPC: No space left on device')
  };

  /**
   * Create a mock that fails with a specific error
   */
  static createFailingMock<T>(error: Error | MockError): ReturnType<typeof mock> {
    return mock(async (..._args: any[]): Promise<T> => {
      throw error;
    });
  }

  /**
   * Create a mock that fails intermittently
   */
  static createIntermittentMock<T>(
    successValue: T, 
    error: Error | MockError, 
    failureRate = 0.5
  ): ReturnType<typeof mock> {
    return mock(async (..._args: any[]): Promise<T> => {
      if (Math.random() < failureRate) {
        throw error;
      }
      return successValue;
    });
  }

  /**
   * Create a mock that times out
   */
  static createTimeoutMock<T>(delay = 5000): ReturnType<typeof mock> {
    return mock(async (..._args: any[]): Promise<T> => {
      await new Promise(resolve => setTimeout(resolve, delay));
      throw new Error('Request timeout');
    });
  }

  /**
   * Create a mock fetch that returns HTTP errors
   */
  static createErrorResponse(errorType: keyof typeof ErrorScenarios.httpErrors): Response {
    const error = ErrorScenarios.httpErrors[errorType];
    return new Response(JSON.stringify({ error: error.error }), {
      status: error.status,
      statusText: error.error,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Create test scenarios for network resilience
   */
  static createNetworkResilienceTests() {
    return {
      'should handle connection refused': {
        error: ErrorScenarios.networkErrors.CONNECTION_REFUSED,
        expectedMessage: 'Connection refused'
      },
      'should handle timeout': {
        error: ErrorScenarios.networkErrors.TIMEOUT,
        expectedMessage: 'Request timeout'
      },
      'should handle DNS errors': {
        error: ErrorScenarios.networkErrors.DNS_ERROR,
        expectedMessage: 'DNS lookup failed'
      },
      'should handle SSL errors': {
        error: ErrorScenarios.networkErrors.SSL_ERROR,
        expectedMessage: 'SSL certificate verification failed'
      }
    };
  }

  /**
   * Create test scenarios for API errors
   */
  static createAPIErrorTests() {
    return {
      'should handle Gemini API quota exceeded': {
        error: ErrorScenarios.apiErrors.GEMINI_API_ERROR,
        expectedMessage: 'Gemini API quota exceeded'
      },
      'should handle invalid API key': {
        error: ErrorScenarios.apiErrors.GEMINI_INVALID_KEY,
        expectedMessage: 'Invalid Gemini API key'
      },
      'should handle model unavailable': {
        error: ErrorScenarios.apiErrors.GEMINI_MODEL_UNAVAILABLE,
        expectedMessage: 'model temporarily unavailable'
      },
      'should handle file upload errors': {
        error: ErrorScenarios.apiErrors.CLOUDFLARE_R2_ERROR,
        expectedMessage: 'upload failed'
      }
    };
  }

  /**
   * Create test scenarios for file system errors
   */
  static createFileSystemErrorTests() {
    return {
      'should handle file not found': {
        error: ErrorScenarios.apiErrors.FILE_NOT_FOUND,
        expectedMessage: 'File not found'
      },
      'should handle permission denied': {
        error: ErrorScenarios.apiErrors.PERMISSION_DENIED,
        expectedMessage: 'Permission denied'
      },
      'should handle disk full': {
        error: ErrorScenarios.apiErrors.DISK_FULL,
        expectedMessage: 'No space left on device'
      }
    };
  }

  /**
   * Simulate retry logic testing
   */
  static createRetryMock<T>(
    finalResult: T,
    failures: (Error | MockError)[],
    maxRetries = 3
  ): ReturnType<typeof mock> {
    let attemptCount = 0;
    
    return mock(async (..._args: any[]): Promise<T> => {
      if (attemptCount < failures.length && attemptCount < maxRetries) {
        attemptCount++;
        throw failures[attemptCount - 1];
      }
      attemptCount++;
      return finalResult;
    });
  }

  /**
   * Test concurrent failure scenarios
   */
  static createConcurrentFailureMock<T>(
    results: (T | Error)[]
  ): ReturnType<typeof mock> {
    let callIndex = 0;
    
    return mock(async (..._args: any[]): Promise<T> => {
      const result = results[callIndex % results.length];
      callIndex++;
      
      if (result instanceof Error) {
        throw result;
      }
      
      return result as T;
    });
  }
}

export default ErrorScenarios;