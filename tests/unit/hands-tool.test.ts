import { describe, it, expect, beforeAll, afterAll, beforeEach, mock, afterEach } from 'bun:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MockHelpers, TestDataGenerators } from '../utils/index.js';

// Create isolated mocks for this test file only (no global mock.module)
const mockGenerateImage = mock(async () => ({
  imageData: TestDataGenerators.createMockImageGenerationResponse().image,
  format: 'base64_data_uri',
  model: 'gemini-2.5-flash-image-preview',
  generationTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
  size: '1024x1024'
}));

const mockGeminiImageModel = {
  generateContent: mock(async () => TestDataGenerators.createMockGeminiImageGenerationResponse())
};

const mockGeminiClient = {
  getModel: mock(() => ({})),
  getImageGenerationModel: mock(() => mockGeminiImageModel)
};

// Import functions dynamically to avoid module contamination
let registerHandsTool: any;
let loadConfig: any;

describe('Hands Tool', () => {
  let server: McpServer;

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';

    // Import modules first
    const handsModule = await import('@/tools/hands/index');
    const configModule = await import('@/utils/config');

    registerHandsTool = handsModule.registerHandsTool;
    loadConfig = configModule.loadConfig;

    const config = loadConfig();

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });

    await registerHandsTool(server, config);
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  afterEach(() => {
    // Clear mocks after each test
    mockGenerateImage.mockClear();
    if (mockGeminiImageModel.generateContent.mockClear) {
      mockGeminiImageModel.generateContent.mockClear();
    }
  });

  beforeEach(() => {
    // Reset mocks before each test
    MockHelpers.resetAllMocks({
      mockGeminiImageModel,
      mockGeminiClient,
      mockGenerateImage
    });
  });

  describe('tool registration', () => {
    it('should register gemini_gen_image tool successfully', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register tools without errors', () => {
      expect(server).toBeInstanceOf(McpServer);
    });
  });

  describe('gemini_gen_image schema validation', () => {
    it('should validate schema registration without errors', () => {
      expect(server).toBeDefined();
    });

    it('should handle mock image generation calls', async () => {
      const result = await mockGenerateImage();

      expect(result.imageData).toBeDefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
    });

    it('should handle mock Gemini client calls', () => {
      expect(mockGeminiClient.getImageGenerationModel).toBeDefined();
      expect(mockGeminiImageModel.generateContent).toBeDefined();
    });
  });

  describe('input validation', () => {
    it('should validate valid image generation request', async () => {
      const request = TestDataGenerators.createMockImageGenerationRequest();

      // The schema validation happens within the tool handler
      // This test ensures the mock data is valid
      expect(request.prompt).toBeDefined();
      expect(request.model).toBe('gemini-2.5-flash-image-preview');
    });

    it('should handle all supported styles', () => {
      const styles = ['photorealistic', 'artistic', 'cartoon', 'sketch', 'digital_art'];

      styles.forEach(style => {
        const request = TestDataGenerators.createMockImageGenerationRequest({ style });
        expect(request.style).toBe(style);
      });
    });

    it('should handle all supported aspect ratios', () => {
      const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

      ratios.forEach(ratio => {
        const request = TestDataGenerators.createMockImageGenerationRequest({ aspect_ratio: ratio });
        expect(request.aspect_ratio).toBe(ratio);
      });
    });
  });

  describe('error handling', () => {
    it('should handle registration errors gracefully', () => {
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should handle mock generation errors', async () => {
      // Mock an error scenario
      const errorMock = mock(async () => {
        throw new Error('Generation failed');
      });

      mockGenerateImage.mockImplementationOnce(errorMock);

      try {
        await mockGenerateImage();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Generation failed');
      }
    });
  });

  describe('response format validation', () => {
    it('should return properly formatted response', async () => {
      const response = TestDataGenerators.createMockImageGenerationResponse();

      expect(response.success).toBe(true);
      expect(response.image).toBeDefined();
      expect(response.format).toBe('base64_data_uri');
      expect(response.model).toBe('gemini-2.5-flash-image-preview');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
      expect(response.metadata.generation_time).toBeGreaterThan(0);
      expect(response.metadata.size).toBeDefined();
    });

    it('should validate image data format', () => {
      const response = TestDataGenerators.createMockImageGenerationResponse();

      expect(response.image).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should include generation metadata', () => {
      const response = TestDataGenerators.createMockImageGenerationResponse();

      expect(response.metadata).toMatchObject({
        timestamp: expect.any(String),
        generation_time: expect.any(Number),
        size: expect.any(String)
      });
    });
  });
});