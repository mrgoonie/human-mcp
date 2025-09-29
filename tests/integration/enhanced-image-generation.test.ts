import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { generateImage } from '@/tools/hands/processors/image-generator';
import { GeminiClient } from '@/tools/eyes/utils/gemini-client';
import { loadConfig } from '@/utils/config';
import { TestDataGenerators } from '../utils/index.js';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ImageGenerationOptions } from '@/tools/hands/schemas';

// Mock GeminiClient for integration tests
let mockGenerateContent = mock(async () => {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  return TestDataGenerators.createMockGeminiImageGenerationResponse();
});

const mockGeminiModel = {
  generateContent: mockGenerateContent
};

let mockGeminiClient: any;

// Initialize mock client
function initializeMockClient() {
  // Reset the mock
  mockGenerateContent.mockClear();

  mockGeminiClient = {
    getImageGenerationModel: mock(() => mockGeminiModel)
  } as unknown as GeminiClient;
}

describe('Enhanced Image Generation Integration Tests', () => {
  let config: any;
  let testDir: string;
  const generatedFiles: string[] = [];

  beforeAll(() => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    config = loadConfig();
    testDir = join(tmpdir(), 'human-mcp-enhanced-test');
    initializeMockClient();
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;

    // Clean up all generated files
    generatedFiles.forEach(filePath => {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    });

    // Clean up test directory
    try {
      if (existsSync(testDir)) {
        const fs = require('fs');
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  beforeEach(() => {
    // Reset mocks before each test
    initializeMockClient();
  });

  describe('automatic file saving functionality', () => {
    it('should save image to file automatically by default', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A beautiful sunset over mountains',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: testDir
      };

      const result = await generateImage(mockGeminiClient, options, config);

      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileSize).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(0);

      // Verify file actually exists
      expect(existsSync(result.filePath!)).toBe(true);

      // Track for cleanup
      generatedFiles.push(result.filePath!);

      // Verify response format
      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should include file metadata in response', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A portrait of a person',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: testDir,
        filePrefix: 'test-portrait'
      };

      const result = await generateImage(mockGeminiClient, options, config);

      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileName).toMatch(/^test-portrait-/);
      expect(result.fileSize).toBeGreaterThan(0);

      // Track for cleanup
      if (result.filePath) {
        generatedFiles.push(result.filePath);
      }
    });

    it('should respect saveToFile=false option', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A landscape scene',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '16:9',
        fetchTimeout: 60000,
        saveToFile: false
      };

      const result = await generateImage(mockGeminiClient, options, config);

      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
      expect(result.fileSize).toBeUndefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should generate unique filenames for multiple requests', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A serene lake',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '4:3',
        fetchTimeout: 60000,
        saveDirectory: testDir,
        filePrefix: 'unique-test'
      };

      const results = await Promise.all([
        generateImage(mockGeminiClient, options, config),
        generateImage(mockGeminiClient, options, config),
        generateImage(mockGeminiClient, options, config)
      ]);

      const filePaths = results.map(r => r.filePath).filter(Boolean);
      const fileNames = results.map(r => r.fileName).filter(Boolean);

      expect(filePaths).toHaveLength(3);
      expect(fileNames).toHaveLength(3);

      // All file paths should be unique
      expect(new Set(filePaths).size).toBe(3);
      expect(new Set(fileNames).size).toBe(3);

      // All files should exist
      filePaths.forEach(filePath => {
        expect(existsSync(filePath!)).toBe(true);
      });

      // Track for cleanup
      generatedFiles.push(...filePaths as string[]);
    });

    it('should handle URL output format with file saving', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Modern architecture building',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'url',
        aspectRatio: '16:9',
        fetchTimeout: 60000,
        saveDirectory: testDir
      };

      const result = await generateImage(mockGeminiClient, options, config);

      // Should still save file even for URL format
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(existsSync(result.filePath!)).toBe(true);

      // For URL format, should return file path as imageData when no URL service is configured
      expect(result.format).toBe('file_path');
      expect(result.imageData).toBe(result.filePath!);

      // Track for cleanup
      generatedFiles.push(result.filePath!);
    });

    it('should handle different file prefixes correctly', async () => {
      const prefixes = ['artwork', 'photo', 'sketch', 'digital'];
      const results = [];

      for (const prefix of prefixes) {
        const options: ImageGenerationOptions = {
          prompt: `A ${prefix} style image`,
          model: 'gemini-2.5-flash-image-preview',
          outputFormat: 'base64',
          aspectRatio: '1:1',
          fetchTimeout: 60000,
          saveDirectory: testDir,
          filePrefix: prefix
        };

        const result = await generateImage(mockGeminiClient, options, config);
        results.push(result);

        expect(result.fileName).toMatch(new RegExp(`^${prefix}-`));
        expect(existsSync(result.filePath!)).toBe(true);

        // Track for cleanup
        generatedFiles.push(result.filePath!);

        // Reset mock for next iteration
        initializeMockClient();
      }

      expect(results).toHaveLength(4);
    });

    it('should handle fallback gracefully when file saving fails', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Fallback test image',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: '/invalid/read-only/path/that/does/not/exist'
      };

      // Should not throw error, but fallback to base64 only
      const result = await generateImage(mockGeminiClient, options, config);

      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
    });
  });

  describe('enhanced response format validation', () => {
    it('should include all expected fields in enhanced response', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Complete response test',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: testDir
      };

      const result = await generateImage(mockGeminiClient, options, config);

      // Original fields
      expect(result.imageData).toBeDefined();
      expect(result.format).toBeDefined();
      expect(result.model).toBeDefined();
      expect(result.generationTime).toBeDefined();
      expect(result.size).toBeDefined();

      // Enhanced fields for file storage
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileSize).toBeDefined();
      expect(result.fileUrl).toBeUndefined(); // No R2 configured in test

      // Track for cleanup
      if (result.filePath) {
        generatedFiles.push(result.filePath);
      }
    });

    it('should maintain backward compatibility', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Backward compatibility test',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveToFile: false // Explicitly disable file saving
      };

      const result = await generateImage(mockGeminiClient, options, config);

      // Should have original response structure without file fields
      expect(result.imageData).toBeDefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toBeDefined();

      // File-related fields should be undefined
      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
      expect(result.fileSize).toBeUndefined();
      expect(result.fileUrl).toBeUndefined();
    });
  });
});