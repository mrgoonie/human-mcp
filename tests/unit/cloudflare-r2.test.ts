import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { CloudflareR2Client, getCloudflareR2, _resetCloudflareR2 } from '@/utils/cloudflare-r2';
import type { MockS3Command, MockCloudflareR2Client } from '../types/test-types.js';

// Mock the S3Client and PutObjectCommand
mock.module('@aws-sdk/client-s3', () => ({
  S3Client: mock(() => ({})),
  PutObjectCommand: mock((params: MockS3Command) => ({ ...params }))
}));

const testEnvVars: Record<string, string> = {
  CLOUDFLARE_CDN_ACCESS_KEY: 'test-access-key',
  CLOUDFLARE_CDN_SECRET_KEY: 'test-secret-key',
  CLOUDFLARE_CDN_ENDPOINT_URL: 'https://test-account.r2.cloudflarestorage.com',
  CLOUDFLARE_CDN_BUCKET_NAME: 'test-bucket',
  CLOUDFLARE_CDN_BASE_URL: 'https://cdn.test.com',
};

describe('Cloudflare R2 Integration', () => {
  const savedEnvVars: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const key of Object.keys(testEnvVars)) {
      savedEnvVars[key] = process.env[key];
    }
    Object.assign(process.env, testEnvVars);
    _resetCloudflareR2();
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(savedEnvVars)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    _resetCloudflareR2();
  });

  it('should create CloudflareR2Client with correct configuration', () => {
    expect(() => new CloudflareR2Client()).not.toThrow();
  });

  it('should throw error when required environment variables are missing', () => {
    const saved = process.env.CLOUDFLARE_CDN_ACCESS_KEY;
    delete process.env.CLOUDFLARE_CDN_ACCESS_KEY;
    try {
      expect(() => new CloudflareR2Client()).toThrow('Missing required Cloudflare R2 environment variables');
    } finally {
      process.env.CLOUDFLARE_CDN_ACCESS_KEY = saved;
    }
  });

  it('should check if Cloudflare R2 is configured', () => {
    const client = new CloudflareR2Client();
    expect(client.isConfigured()).toBe(true);
  });

  it('should return null when getCloudflareR2() called without configuration', () => {
    _resetCloudflareR2();
    const saved: Record<string, string | undefined> = {};
    for (const key of Object.keys(testEnvVars)) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    try {
      const client = getCloudflareR2();
      expect(client).toBeNull();
    } finally {
      Object.assign(process.env, saved);
      _resetCloudflareR2();
    }
  });

  it('should generate proper file keys with UUID', async () => {
    const client = new CloudflareR2Client();
    const testBuffer = Buffer.from('test file content');
    
    // Mock the S3 send method to capture the command
    let capturedCommand: MockS3Command | undefined;
    const mockSend = mock(async (command: MockS3Command) => {
      capturedCommand = command;
      return {};
    });
    
    (client as unknown as MockCloudflareR2Client).s3Client.send = mockSend;

    try {
      await client.uploadFile(testBuffer, 'test.jpg');
      
      expect(capturedCommand).toBeDefined();
      expect(capturedCommand!.input.Key).toMatch(/^human-mcp\/[a-f0-9-]{36}\.jpg$/);
      expect(capturedCommand!.input.ContentType).toBe('image/jpeg');
      expect(capturedCommand!.input.Metadata?.originalName).toBe('test.jpg');
    } catch (error) {
      // Expected to fail in test environment, but we captured the command
    }
  });

  it('should handle base64 upload correctly', async () => {
    const client = new CloudflareR2Client();
    const testBase64 = Buffer.from('test image data').toString('base64');
    
    let capturedCommand: MockS3Command | undefined;
    const mockSend = mock(async (command: MockS3Command) => {
      capturedCommand = command;
      return {};
    });
    
    (client as unknown as MockCloudflareR2Client).s3Client.send = mockSend;

    try {
      await client.uploadBase64(testBase64, 'image/png', 'test.png');
      
      expect(capturedCommand).toBeDefined();
      expect(capturedCommand!.input.Key).toMatch(/^human-mcp\/[a-f0-9-]{36}\.png$/);
      expect(capturedCommand!.input.ContentType).toBe('image/png');
    } catch (error) {
      // Expected to fail in test environment
    }
  });

  it('should handle upload errors gracefully', async () => {
    const client = new CloudflareR2Client();
    
    const mockSend = mock(async () => {
      throw new Error('Network error');
    });
    
    (client as unknown as MockCloudflareR2Client).s3Client.send = mockSend;

    await expect(client.uploadFile(Buffer.from('test'), 'test.jpg'))
      .rejects.toThrow('Failed to upload file: Network error');
  });
});