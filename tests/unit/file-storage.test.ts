import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { saveBase64ToFile } from '@/utils/file-storage';
import { loadConfig } from '@/utils/config';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

describe('File Storage Utility Tests', () => {
  let config: any;
  let testDir: string;

  beforeAll(() => {
    // Set required environment variables for testing
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    config = loadConfig();
    testDir = join(tmpdir(), 'human-mcp-test-files');
  });

  afterAll(() => {
    // Clean up environment
    delete process.env.GOOGLE_GEMINI_API_KEY;

    // Clean up test files
    try {
      if (existsSync(testDir)) {
        const fs = require('fs');
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('saveBase64ToFile function', () => {
    it('should save base64 data to file successfully', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      const result = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: testDir,
        prefix: 'test-image'
      });

      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(result.mimeType).toBe(mimeType);
      expect(existsSync(result.filePath)).toBe(true);

      // Clean up
      if (existsSync(result.filePath)) {
        unlinkSync(result.filePath);
      }
    });

    it('should handle data URI format base64', async () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      const result = await saveBase64ToFile(dataUri, mimeType, config, {
        directory: testDir,
        prefix: 'test-data-uri'
      });

      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(existsSync(result.filePath)).toBe(true);

      // Clean up
      if (existsSync(result.filePath)) {
        unlinkSync(result.filePath);
      }
    });

    it('should generate unique filenames', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      const result1 = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: testDir,
        prefix: 'unique-test'
      });

      const result2 = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: testDir,
        prefix: 'unique-test'
      });

      expect(result1.fileName).not.toBe(result2.fileName);
      expect(result1.filePath).not.toBe(result2.filePath);

      // Clean up
      [result1.filePath, result2.filePath].forEach(path => {
        if (existsSync(path)) {
          unlinkSync(path);
        }
      });
    });

    it('should handle different MIME types correctly', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const mimeTypes = [
        { mime: 'image/png', expectedExt: '.png' },
        { mime: 'image/jpeg', expectedExt: '.jpg' },
        { mime: 'image/webp', expectedExt: '.webp' },
        { mime: 'image/gif', expectedExt: '.gif' }
      ];

      const results = [];

      for (const { mime, expectedExt } of mimeTypes) {
        const result = await saveBase64ToFile(base64Data, mime, config, {
          directory: testDir,
          prefix: 'mime-test'
        });

        expect(result.fileName).toMatch(new RegExp(`${expectedExt.replace('.', '\\.')}$`));
        expect(result.mimeType).toBe(mime);
        results.push(result);
      }

      // Clean up
      results.forEach(result => {
        if (existsSync(result.filePath)) {
          unlinkSync(result.filePath);
        }
      });
    });

    it('should create directory if it does not exist', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';
      const nestedDir = join(testDir, 'nested', 'directory');

      const result = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: nestedDir,
        prefix: 'nested-test'
      });

      expect(existsSync(nestedDir)).toBe(true);
      expect(existsSync(result.filePath)).toBe(true);

      // Clean up
      if (existsSync(result.filePath)) {
        unlinkSync(result.filePath);
      }
    });

    it('should handle error cases gracefully', async () => {
      // Test with an invalid directory path (null character not allowed in paths)
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';
      const invalidDir = '/\0invalid/path';

      await expect(saveBase64ToFile(base64Data, mimeType, config, {
        directory: invalidDir
      })).rejects.toThrow();
    });
  });
});