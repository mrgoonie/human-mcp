import { describe, it, expect, beforeAll, afterAll, beforeEach, mock, afterEach } from 'bun:test';
import type { ImageGenerationOptions } from '@/tools/hands/schemas';
import type { GeminiClient } from '@/tools/eyes/utils/gemini-client';
import { TestDataGenerators } from '../utils/index.js';

// Create isolated mock for this test file
let mockGenerateContent = mock(async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return TestDataGenerators.createMockGeminiImageGenerationResponse();
});

const mockGeminiModel = {
  generateContent: mockGenerateContent
};

let mockGeminiClient: any;

// Initialize mock client with proper isolation
function initializeMockClient() {
  mockGenerateContent.mockClear();

  mockGeminiClient = {
    generateImageContent: mock(async () => ({
      imageData: "iVBORw0KGgoAAAANSUhEUg==",
      mimeType: "image/png"
    })),
    getImageGenerationModel: mock(() => mockGeminiModel)
  } as unknown as GeminiClient;
}

// Import generateImage AFTER setting up mocks to ensure proper isolation
let generateImage: any;
let loadConfig: any;

describe('Image Generation Integration Tests', () => {
  let config: any;

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';

    // Dynamically import modules AFTER mocks are ready
    const generatorModule = await import('@/tools/hands/processors/image-generator');
    const configModule = await import('@/utils/config');

    generateImage = generatorModule.generateImage;
    loadConfig = configModule.loadConfig;
    config = loadConfig();
    initializeMockClient();
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  afterEach(() => {
    // Clear any module cache contamination
    mockGenerateContent.mockClear();
  });

  beforeEach(() => {
    // Reset mocks before each test
    initializeMockClient();
  });

  describe('generateImage function', () => {
    it('should generate image with basic options', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A beautiful sunset over mountains',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result).toBeDefined();
      expect(result.imageData).toBeDefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image');
      expect(result.generationTime).toBeGreaterThanOrEqual(0);
      expect(result.size).toBeDefined();
    });

    it('should enhance prompt with style', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A portrait of a person',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        style: 'photorealistic',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGeminiClient.generateImageContent).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.stringContaining('photorealistic, high quality, detailed') })
      );
    });

    it('should enhance prompt with aspect ratio', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A landscape scene',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '16:9',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGeminiClient.generateImageContent).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.stringContaining('aspect ratio 16:9') })
      );
    });

    it('should handle negative prompt', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A beautiful flower',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        negativePrompt: 'blurry, distorted',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGeminiClient.generateImageContent).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.stringContaining('Avoid: blurry, distorted') })
      );
    });

    it('should combine all prompt enhancements', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A serene lake',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '4:3',
        style: 'artistic',
        negativePrompt: 'noisy, cluttered',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      const expectedPrompt = 'A serene lake, artistic style, creative, expressive, aspect ratio 4:3. Avoid: noisy, cluttered';
      expect(mockGeminiClient.generateImageContent).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expectedPrompt })
      );
    });

    it('should handle all style options', async () => {
      const styles = ['photorealistic', 'artistic', 'cartoon', 'sketch', 'digital_art'];

      for (const style of styles) {
        const options: ImageGenerationOptions = {
          prompt: 'Test image',
          model: 'gemini-2.5-flash-image',
          outputFormat: 'base64',
          aspectRatio: '1:1',
          style: style as any,
          fetchTimeout: 60000
        };

        await generateImage(mockGeminiClient, options);

        expect(mockGeminiClient.generateImageContent).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining(style === 'digital_art' ? 'digital art' : style)
          })
        );

        initializeMockClient();
      }
    });

    it('should use correct model configuration', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test prompt',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGeminiClient.generateImageContent).toHaveBeenCalled();
    });

    it('should measure generation time', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test timing',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.generationTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.generationTime).toBe('number');
    });

    it('should estimate image size', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test sizing',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.size).toMatch(/^\d+x\d+\+?$/);
    });
  });

  describe('error handling', () => {
    it('should handle API key errors', async () => {
      mockGeminiClient.generateImageContent.mockImplementationOnce(async () => {
        throw new Error('API key invalid');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test error',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'Invalid or missing Google AI API key'
      );
    });

    it('should handle quota exceeded errors', async () => {
      mockGeminiClient.generateImageContent.mockImplementationOnce(async () => {
        throw new Error('quota exceeded');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test quota error',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'API quota exceeded or rate limit reached'
      );
    });

    it('should handle safety policy errors', async () => {
      mockGeminiClient.generateImageContent.mockImplementationOnce(async () => {
        throw new Error('safety policy violation');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test safety error',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'Image generation blocked due to safety policies'
      );
    });

    it('should handle no candidates response', async () => {
      mockGeminiClient.generateImageContent.mockImplementationOnce(async () => {
        throw new Error('No image candidates returned from Gemini API');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test no candidates',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'No image candidates returned from Gemini API'
      );
    });

    it('should handle invalid response format', async () => {
      mockGeminiClient.generateImageContent.mockImplementationOnce(async () => {
        throw new Error('No image data found in Gemini response');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test invalid response',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'No image data found in Gemini response'
      );
    });

    it('should handle generic errors', async () => {
      mockGeminiClient.generateImageContent.mockImplementationOnce(async () => {
        throw new Error('Unknown error');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test generic error',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'Image generation failed: Unknown error'
      );
    });
  });

  describe('output format handling', () => {
    it('should return base64 data URI for base64 format', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test base64 output',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should fallback to base64 for URL format (not yet implemented)', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test URL output',
        model: 'gemini-2.5-flash-image',
        outputFormat: 'url',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });
  });
});