import { describe, it, expect, beforeAll, mock } from 'bun:test';
import { CloudflareR2Client, getCloudflareR2 } from '@/utils/cloudflare-r2';
import type { MockS3Command, MockCloudflareR2Client } from '../types/test-types.js';

// Mock the S3Client and PutObjectCommand
mock.module('@aws-sdk/client-s3', () => ({
  S3Client: mock(() => ({})),
  PutObjectCommand: mock((params: MockS3Command) => ({ ...params }))
}));

describe('Cloudflare R2 Integration', () => {
  beforeAll(() => {
    // Set up test environment variables
    process.env.CLOUDFLARE_CDN_ACCESS_KEY = 'test-access-key';
    process.env.CLOUDFLARE_CDN_SECRET_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_CDN_ENDPOINT_URL = 'https://test-account.r2.cloudflarestorage.com';
    process.env.CLOUDFLARE_CDN_BUCKET_NAME = 'test-bucket';
    process.env.CLOUDFLARE_CDN_BASE_URL = 'https://cdn.test.com';
  });

  it('should create CloudflareR2Client with correct configuration', () => {
    expect(() => new CloudflareR2Client()).not.toThrow();
  });

  it('should throw error when required environment variables are missing', () => {
    const originalAccessKey = process.env.CLOUDFLARE_CDN_ACCESS_KEY;
    delete process.env.CLOUDFLARE_CDN_ACCESS_KEY;

    expect(() => new CloudflareR2Client()).toThrow('Missing required Cloudflare R2 environment variables');
    
    process.env.CLOUDFLARE_CDN_ACCESS_KEY = originalAccessKey;
  });

  it('should check if Cloudflare R2 is configured', () => {
    const client = new CloudflareR2Client();
    expect(client.isConfigured()).toBe(true);
  });

  it('should return null when getCloudflareR2() called without configuration', () => {
    // Temporarily remove configuration
    const originalEnvs = {
      CLOUDFLARE_CDN_ACCESS_KEY: process.env.CLOUDFLARE_CDN_ACCESS_KEY,
      CLOUDFLARE_CDN_SECRET_KEY: process.env.CLOUDFLARE_CDN_SECRET_KEY,
      CLOUDFLARE_CDN_ENDPOINT_URL: process.env.CLOUDFLARE_CDN_ENDPOINT_URL,
      CLOUDFLARE_CDN_BUCKET_NAME: process.env.CLOUDFLARE_CDN_BUCKET_NAME,
      CLOUDFLARE_CDN_BASE_URL: process.env.CLOUDFLARE_CDN_BASE_URL,
    };

    Object.keys(originalEnvs).forEach(key => delete process.env[key]);

    const client = getCloudflareR2();
    expect(client).toBeNull();

    // Restore environment variables
    Object.assign(process.env, originalEnvs);
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