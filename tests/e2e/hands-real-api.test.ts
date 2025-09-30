import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { readFileSync } from 'fs';
import { generateImage } from '@/tools/hands/processors/image-generator';
import { GeminiClient } from '@/tools/eyes/utils/gemini-client';
import { registerHandsTool } from '@/tools/hands/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '@/utils/config';
import type { ImageGenerationOptions } from '@/tools/hands/schemas';

// Configuration for real API tests
const REAL_API_CONFIG = {
  gemini: {
    apiKey: '',
    model: 'gemini-2.5-flash'
  },
  server: {
    requestTimeout: 300000,
    fetchTimeout: 60000
  },
  documentProcessing: {
    geminiModel: 'gemini-2.5-flash',
    timeout: 300000,
    maxFileSize: 100 * 1024 * 1024
  }
} as Config;

// Helper function to check if real API tests should run
function shouldRunRealApiTests(): boolean {
  const envFile = '/Users/duynguyen/www/human-mcp/.env.prod';
  try {
    const envContent = readFileSync(envFile, 'utf-8');
    const apiKeyMatch = envContent.match(/GOOGLE_GEMINI_API_KEY="([^"]+)"/);
    if (apiKeyMatch && apiKeyMatch[1]) {
      REAL_API_CONFIG.gemini.apiKey = apiKeyMatch[1];
      return true;
    }
  } catch (error) {
    console.warn('Could not read .env.prod file:', error);
  }
  return false;
}

// Utility function to validate base64 image
function isValidBase64Image(data: string): boolean {
  const base64Regex = /^data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)$/;
  return base64Regex.test(data);
}

// Utility function to get image size from base64
function getImageSizeFromBase64(data: string): { width: number; height: number } | null {
  try {
    const base64Data = data.split(',')[1];
    if (!base64Data) return null;

    const buffer = Buffer.from(base64Data, 'base64');

    // Simple JPEG header parsing for dimensions
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      // This is a simplified approach - in production you'd use a proper image library
      return { width: 1024, height: 1024 }; // Default assumption
    }

    return null;
  } catch {
    return null;
  }
}

describe('Hands Tool E2E Tests with Real Gemini API', () => {
  let geminiClient: GeminiClient;
  let server: McpServer;
  const testTimeout = 120000; // 2 minutes for real API calls

  beforeAll(async () => {
    if (!shouldRunRealApiTests()) {
      console.log('Skipping real API tests - GOOGLE_GEMINI_API_KEY not found in .env.prod');
      return;
    }

    // Set environment variable for GeminiClient
    process.env.GOOGLE_GEMINI_API_KEY = REAL_API_CONFIG.gemini.apiKey;

    // Initialize real GeminiClient
    geminiClient = new GeminiClient(REAL_API_CONFIG);

    // Initialize server
    server = new McpServer({
      name: 'test-server-e2e',
      version: '1.0.0'
    });

    await registerHandsTool(server, REAL_API_CONFIG);
  });

  beforeEach(() => {
    if (!shouldRunRealApiTests()) {
      return;
    }
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe('Real Image Generation', () => {
    it('should generate a basic image with real API', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A simple geometric shape, a blue circle on white background',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(result.imageData).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toBeDefined();

      console.log(`✓ Generated image in ${result.generationTime}ms, size: ${result.size}`);
    }, testTimeout);

    it('should generate photorealistic image', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A professional headshot of a person in business attire',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '4:3',
        style: 'photorealistic',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated photorealistic image in ${result.generationTime}ms`);
    }, testTimeout);

    it('should generate artistic image', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'An abstract painting with flowing colors and dynamic brush strokes',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '16:9',
        style: 'artistic',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated artistic image in ${result.generationTime}ms`);
    }, testTimeout);

    it('should handle negative prompts', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A clean, minimal workspace with a laptop',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        negativePrompt: 'cluttered, messy, chaotic, dark',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated image with negative prompt in ${result.generationTime}ms`);
    }, testTimeout);

    it('should generate different aspect ratios', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const ratios = ['1:1', '16:9', '4:3'];

      for (const ratio of ratios) {
        const options: ImageGenerationOptions = {
          prompt: `A simple landscape scene in ${ratio} format`,
          model: 'gemini-2.5-flash-image-preview',
          outputFormat: 'base64',
          aspectRatio: ratio as any,
          fetchTimeout: 60000
        };

        const result = await generateImage(geminiClient, options);

        expect(result).toBeDefined();
        expect(isValidBase64Image(result.imageData)).toBe(true);
        expect(result.generationTime).toBeGreaterThan(0);

        console.log(`✓ Generated ${ratio} image in ${result.generationTime}ms`);
      }
    }, testTimeout);

    it('should handle cartoon style', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A friendly cartoon character waving hello',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        style: 'cartoon',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated cartoon image in ${result.generationTime}ms`);
    }, testTimeout);
  });

  describe('Real API Error Handling', () => {
    it('should handle invalid prompts gracefully', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'unsafe content that violates policies',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      try {
        await generateImage(geminiClient, options);
        // If no error is thrown, the API handled it gracefully
        console.log('✓ API handled potentially unsafe prompt gracefully');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        console.log(`✓ API correctly rejected unsafe prompt: ${(error as Error).message}`);
      }
    }, testTimeout);

    it('should handle very long prompts', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const longPrompt = 'A beautiful landscape with mountains and trees. '.repeat(50);

      const options: ImageGenerationOptions = {
        prompt: longPrompt,
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      try {
        const result = await generateImage(geminiClient, options);
        expect(isValidBase64Image(result.imageData)).toBe(true);
        console.log(`✓ Handled long prompt (${longPrompt.length} chars) in ${result.generationTime}ms`);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        console.log(`✓ API correctly rejected overly long prompt: ${(error as Error).message}`);
      }
    }, testTimeout);
  });

  describe('Performance Tests', () => {
    it('should generate image within reasonable time', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A quick test image - simple red square',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const startTime = Date.now();
      const result = await generateImage(geminiClient, options);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute

      console.log(`✓ Image generated in ${totalTime}ms (reported: ${result.generationTime}ms)`);
    }, testTimeout);

    it('should handle concurrent generation requests', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const requests = Array.from({ length: 3 }, (_, i) => {
        const options: ImageGenerationOptions = {
          prompt: `Concurrent test image ${i + 1} - simple shape`,
          model: 'gemini-2.5-flash-image-preview',
          outputFormat: 'base64',
          aspectRatio: '1:1',
          fetchTimeout: 60000
        };

        return generateImage(geminiClient, options);
      });

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(isValidBase64Image(result.imageData)).toBe(true);
        console.log(`✓ Concurrent request ${i + 1} completed in ${result.generationTime}ms`);
      });
    }, testTimeout);
  });

  describe('Quality Validation', () => {
    it('should return properly formatted base64 data', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A test image for format validation',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result.imageData).toMatch(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/);

      // Validate base64 can be decoded
      const base64Data = result.imageData.split(',')[1];
      expect(base64Data).toBeDefined();

      const buffer = Buffer.from(base64Data!, 'base64');
      expect(buffer.length).toBeGreaterThan(0);

      console.log(`✓ Generated valid base64 image, size: ${buffer.length} bytes`);
    }, testTimeout);

    it('should include complete metadata', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A test image for metadata validation',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toMatch(/^\d+x\d+\+?$/);

      console.log(`✓ Complete metadata: ${JSON.stringify({
        format: result.format,
        model: result.model,
        generationTime: result.generationTime,
        size: result.size
      })}`);
    }, testTimeout);
  });
});
