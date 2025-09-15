import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { fileInterceptorMiddleware } from '@/transports/http/file-interceptor';
import type { Request, Response, NextFunction } from 'express';

// Mock the Cloudflare R2 client
mock.module('@/utils/cloudflare-r2', () => ({
  getCloudflareR2: () => ({
    uploadFile: mock(async (buffer: Buffer, filename: string) => {
      return `https://cdn.test.com/human-mcp/${filename}`;
    }),
    uploadBase64: mock(async (data: string, mimeType: string, filename?: string) => {
      return `https://cdn.test.com/human-mcp/${filename || 'upload.jpg'}`;
    })
  })
}));

mock.module('@/utils/logger', () => ({
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {})
  }
}));

describe('HTTP Transport File Handling', () => {
  beforeAll(() => {
    process.env.TRANSPORT_TYPE = 'http';
  });

  afterAll(() => {
    delete process.env.TRANSPORT_TYPE;
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

    const res = {
      status: mock(() => res),
      json: mock(() => {}),
    } as unknown as Response;

    const next = mock(() => {}) as NextFunction;

    // Mock fs operations
    const fs = await import('fs/promises');
    (fs.access as any) = mock(async () => false);

    await fileInterceptorMiddleware(req, res, next);

    // Should provide helpful error when file not found
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
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
    const next = mock(() => {}) as NextFunction;

    // Mock fs operations to simulate file exists
    const fs = await import('fs/promises');
    (fs.access as any) = mock(async () => true);
    (fs.readFile as any) = mock(async () => Buffer.from('fake image data'));

    await fileInterceptorMiddleware(req, res, next);

    // Should have replaced the local path with CDN URL
    expect(req.body.params.arguments.source).toBe('https://cdn.test.com/human-mcp/image.jpg');
    expect(next).toHaveBeenCalled();
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
    const next = mock(() => {}) as NextFunction;

    await fileInterceptorMiddleware(req, res, next);

    // Should not modify URL sources
    expect(req.body.params.arguments.source).toBe(originalSource);
    expect(next).toHaveBeenCalled();
  });

  it('should skip non-tool-call requests', async () => {
    const req = {
      body: {
        method: 'initialize',
        params: {}
      }
    } as Request;

    const res = {} as Response;
    const next = mock(() => {}) as NextFunction;

    await fileInterceptorMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle multiple file fields', async () => {
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
    const next = mock(() => {}) as NextFunction;

    // Mock fs operations
    const fs = await import('fs/promises');
    (fs.access as any) = mock(async () => true);
    (fs.readFile as any) = mock(async () => Buffer.from('fake image data'));

    await fileInterceptorMiddleware(req, res, next);

    // Should have replaced both file paths
    expect(req.body.params.arguments.source1).toBe('https://cdn.test.com/human-mcp/image1.jpg');
    expect(req.body.params.arguments.source2).toBe('https://cdn.test.com/human-mcp/image2.png');
    expect(req.body.params.arguments.normalField).toBe('value');
    expect(next).toHaveBeenCalled();
  });
});