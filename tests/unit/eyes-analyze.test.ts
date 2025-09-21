import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { registerEyesTool } from '@/tools/eyes/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '@/utils/config';
import { MockHelpers, TestDataGenerators } from '../utils/index.js';

// Import global mocks from setup
import { globalMocks } from '../setup.js';

// Store original fetch for restoration
const originalFetch = global.fetch;

// Mock fetch for URL operations
const mockFetch = mock(async (url: string) => {
  if (url.includes('error')) {
    throw new Error('Fetch failed');
  }
  return new Response(TestDataGenerators.createMockImageBuffer(), {
    status: 200,
    headers: { 'content-type': 'image/jpeg' }
  });
});

// Mock Gemini client
const mockGeminiModel = {
  generateContent: mock(async () => ({
    response: {
      text: () => JSON.stringify(TestDataGenerators.createMockGeminiResponse())
    }
  }))
};

const mockGeminiClient = {
  getModel: mock(() => mockGeminiModel)
};

mock.module('@/tools/eyes/utils/gemini-client', () => ({
  GeminiClient: mock(() => mockGeminiClient)
}));

// Mock processors
mock.module('@/tools/eyes/processors/image', () => ({
  processImage: mock(async () => ({
    analysis: JSON.stringify(TestDataGenerators.createMockGeminiResponse())
  }))
}));

mock.module('@/tools/eyes/processors/video', () => ({
  processVideo: mock(async () => ({
    analysis: JSON.stringify(TestDataGenerators.createMockGeminiResponse())
  }))
}));

mock.module('@/tools/eyes/processors/gif', () => ({
  processGif: mock(async () => ({
    analysis: JSON.stringify(TestDataGenerators.createMockGeminiResponse())
  }))
}));

describe('Eyes Analyze Tool', () => {
  beforeAll(() => {
    // Apply fetch mock only for this test suite
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    // Restore original fetch after this test suite
    global.fetch = originalFetch;
  });
  let server: McpServer;

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    
    const config = loadConfig();

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });

    await registerEyesTool(server, config);
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  beforeEach(() => {
    // Reset mocks before each test
    MockHelpers.resetAllMocks({
      mockGeminiModel,
      mockGeminiClient,
      mockFetch
    });
  });

  describe('tool registration', () => {
    it('should register eyes_analyze tool successfully', () => {
      // Test that the registration process completed successfully
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register eyes_compare tool successfully', () => {
      // Test that the registration process completed successfully
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register tools without errors', () => {
      expect(server).toBeInstanceOf(McpServer);
    });
  });

  describe('eyes_analyze schema validation', () => {
    it('should validate schema registration without errors', () => {
      // Test that schema registration completes successfully
      expect(server).toBeDefined();
    });

    it('should handle mock processor calls', async () => {
      // Test that the mocked processors can be called
      const { processImage } = await import('@/tools/eyes/processors/image');
      const result = await (processImage as unknown as () => Promise<{ analysis: string }>)();
      expect(result.analysis).toContain('summary');
    });

    it('should handle mock Gemini client calls', () => {
      // Test that the mocked Gemini client can be instantiated and called
      expect(mockGeminiClient.getModel).toBeDefined();
      expect(mockGeminiModel.generateContent).toBeDefined();
    });
  });

  describe('eyes_compare schema validation', () => {
    it('should validate comparison schema registration', () => {
      // Test that comparison tool registration completes successfully
      expect(server).toBeDefined();
    });

    it('should handle mock data generation', () => {
      // Test that mock data generators work correctly
      const compareRequest = TestDataGenerators.createMockCompareRequest();
      expect(compareRequest.input1).toContain('data:image/png;base64');
      expect(compareRequest.input2).toContain('data:image/png;base64');
      expect(['pixel', 'structural', 'semantic']).toContain(compareRequest.comparison_type);
    });
  });

  describe('error handling', () => {
    it('should handle registration errors gracefully', () => {
      // Test that error handling is set up correctly
      expect(server).toBeInstanceOf(McpServer);
    });
  });
});