/**
 * Type definitions for API responses used in tests
 */

export interface HealthCheckResponse {
  status: string;
  transport: string;
  sseFallback: string;
  ssePaths: {
    stream: string;
    message: string;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
  };
}

export interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface SessionResponse {
  sessionId: string;
  transport: string;
  mode: string;
}