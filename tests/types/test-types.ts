// Common test types to improve type safety across test files

export interface MockError {
  message: string;
  code?: string | number;
}

export interface MockGeminiResponse {
  summary: string;
  details: string;
  technical_details?: Record<string, any>;
  confidence: number;
  recommendations?: string[];
}

export interface MockComparisonResponse {
  summary: string;
  differences: any[];
  similarity_score: number;
  analysis_method: string;
  recommendations: string[];
  technical_details: Record<string, string>;
}

export interface MockAnalysisRequest {
  input: string;
  detail_level: 'quick' | 'detailed';
  custom_prompt?: string;
  max_frames?: number;
  source?: string;
  type?: 'image' | 'video' | 'gif';
  prompt?: string;
}

export interface MockCompareRequest {
  input1: string;
  input2: string;
  comparison_type: 'pixel' | 'structural' | 'semantic';
  custom_prompt?: string;
  source1?: string;
  source2?: string;
}

export interface MockHttpResponseData {
  status?: string;
  data?: any;
  error?: string;
  [key: string]: any;
}

export interface MockS3Command {
  Bucket: string;
  Key: string;
  Body?: Buffer | string;
  ContentType?: string;
  [key: string]: any;
}

export interface MockCloudflareR2Client {
  s3Client: {
    send: (command: MockS3Command) => Promise<any>;
  };
  uploadFile: (buffer: Buffer, filename: string) => Promise<string>;
  uploadBase64: (data: string, mimeType: string, filename?: string) => Promise<string>;
  isConfigured: () => boolean;
}

export interface MockSSEConfig {
  security?: {
    enableCors?: boolean;
    enableDnsRebindingProtection?: boolean;
    allowedHosts?: string[];
  };
  sessionMode?: 'stateful' | 'stateless';
  enableSse?: boolean;
  enableJsonResponse?: boolean;
  enableSseFallback?: boolean;
  ssePaths?: {
    stream: string;
    message: string;
  };
}

// Generic mock function type
export type MockFunction<T extends (...args: any[]) => any> = T & {
  mock: {
    calls: Parameters<T>[];
    results: { value: ReturnType<T> }[];
  };
  mockRestore?: () => void;
  mockImplementation?: (impl: T) => void;
  mockRejectedValue?: (value: any) => void;
  mockRejectedValueOnce?: (value: any) => void;
  mockResolvedValue?: (value: ReturnType<T>) => void;
  mockResolvedValueOnce?: (value: ReturnType<T>) => void;
};

// Extend global types for test environment
declare global {
  namespace globalThis {
    var __TEST_MODE__: boolean;
  }
}

export {};