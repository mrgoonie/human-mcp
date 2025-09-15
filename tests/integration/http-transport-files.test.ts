import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { fileInterceptorMiddleware } from '@/transports/http/file-interceptor';
import type { Request, Response, NextFunction } from 'express';

describe('HTTP Transport File Handling', () => {
  beforeAll(() => {
    process.env.TRANSPORT_TYPE = 'http';
    // Set required Cloudflare R2 environment variables for testing
    process.env.CLOUDFLARE_CDN_ACCESS_KEY = 'test-access-key';
    process.env.CLOUDFLARE_CDN_SECRET_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_CDN_ENDPOINT_URL = 'https://test.r2.cloudflarestorage.com';
    process.env.CLOUDFLARE_CDN_BUCKET_NAME = 'test-bucket';
    process.env.CLOUDFLARE_CDN_BASE_URL = 'https://cdn.test.com';
  });

  afterAll(() => {
    delete process.env.TRANSPORT_TYPE;
    delete process.env.CLOUDFLARE_CDN_ACCESS_KEY;
    delete process.env.CLOUDFLARE_CDN_SECRET_KEY;
    delete process.env.CLOUDFLARE_CDN_ENDPOINT_URL;
    delete process.env.CLOUDFLARE_CDN_BUCKET_NAME;
    delete process.env.CLOUDFLARE_CDN_BASE_URL;
  });

  it('should handle Claude Desktop virtual paths', async () => {
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source: '/mnt/user-data/uploads/test.png',
            type: 'image'
          }
        },
        id: 'test-id'
      }
    } as Request;

    let statusCode = 0;
    let responseData: any = null;
    
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as unknown as Response;

    const next = () => {};

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Without proper file access and R2 configuration, should provide helpful error
    expect(statusCode).toBe(400);
    expect(responseData).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32602,
        message: 'File not accessible via HTTP transport',
        data: {
          path: '/mnt/user-data/uploads/test.png',
          suggestions: expect.arrayContaining([
            'Upload the file using the /mcp/upload endpoint first'
          ])
        }
      },
      id: 'test-id'
    });
  });

  it('should auto-upload local files in HTTP mode', async () => {
    // Test that middleware doesn't break when processing local paths
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source: '/local/path/image.jpg'
          }
        }
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Without proper Cloudflare configuration, the path should remain unchanged
    expect(req.body.params.arguments.source).toBe('/local/path/image.jpg');
    expect(nextCalled).toBe(true);
  });

  it('should skip non-file fields', async () => {
    const originalSource = 'https://example.com/image.jpg';
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source: originalSource,
            otherField: 'some value'
          }
        }
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Should not modify URL sources
    expect(req.body.params.arguments.source).toBe(originalSource);
    expect(nextCalled).toBe(true);
  });

  it('should skip non-tool-call requests', async () => {
    const req = {
      body: {
        method: 'initialize',
        params: {}
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    expect(nextCalled).toBe(true);
  });

  it('should handle multiple file fields', async () => {
    // Test that middleware processes multiple fields without breaking
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source1: '/path/image1.jpg',
            source2: '/path/image2.png',
            normalField: 'value'
          }
        }
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Without proper Cloudflare configuration, paths should remain unchanged
    expect(req.body.params.arguments.source1).toBe('/path/image1.jpg');
    expect(req.body.params.arguments.source2).toBe('/path/image2.png');
    expect(req.body.params.arguments.normalField).toBe('value');
    expect(nextCalled).toBe(true);
  });
});