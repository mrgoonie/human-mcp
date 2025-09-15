import { Router } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { SessionManager } from "./session.js";
import type { HttpTransportConfig } from "../types.js";
import multer from 'multer';
import { getCloudflareR2 } from '@/utils/cloudflare-r2.js';
import { logger } from '@/utils/logger.js';

// Interface for SSE session checking (to avoid circular dependency)
interface SSESessionChecker {
  hasSession(sessionId: string): boolean;
}

export function createRoutes(
  mcpServer: McpServer,
  sessionManager: SessionManager,
  config: HttpTransportConfig,
  sseSessionChecker?: SSESessionChecker
): Router {
  const router = Router();

  // POST /mcp - Handle client requests
  router.post('/', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      
      if (config.sessionMode === 'stateless') {
        await handleStatelessRequest(mcpServer, req, res);
      } else {
        await handleStatefulRequest(mcpServer, sessionManager, sessionId, req, res, sseSessionChecker);
      }
    } catch (error) {
      handleError(res, error);
    }
  });

  // GET /mcp - SSE endpoint for notifications
  router.get('/', async (req, res) => {
    if (config.sessionMode === 'stateless') {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "SSE not supported in stateless mode"
        },
        id: null
      });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = await sessionManager.getTransport(sessionId);
    
    if (!transport) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    await transport.handleRequest(req, res);
  });

  // DELETE /mcp - Session termination
  router.delete('/', async (req, res) => {
    if (config.sessionMode === 'stateless') {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Session termination not applicable in stateless mode"
        },
        id: null
      });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string;
    await sessionManager.terminateSession(sessionId);
    res.status(204).send();
  });

  // Configure multer for memory storage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept images, videos, and GIFs
      if (file.mimetype.startsWith('image/') || 
          file.mimetype.startsWith('video/') ||
          file.mimetype === 'image/gif') {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'));
      }
    }
  });

  // POST /upload - Handle file uploads to Cloudflare R2
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'No file uploaded'
          },
          id: null
        });
        return;
      }

      const cloudflare = getCloudflareR2();
      if (!cloudflare) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Cloudflare R2 not configured. Please set up environment variables.'
          },
          id: null
        });
        return;
      }
      
      // Upload to Cloudflare R2
      const publicUrl = await cloudflare.uploadFile(
        req.file.buffer,
        req.file.originalname
      );
      
      res.json({
        jsonrpc: '2.0',
        result: {
          success: true,
          url: publicUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          message: 'File uploaded successfully to Cloudflare R2'
        },
        id: (req.body as any)?.id || null
      });
    } catch (error) {
      logger.error('Upload error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        id: (req.body as any)?.id || null
      });
    }
  });

  // POST /upload-base64 - Handle base64 uploads
  router.post('/upload-base64', async (req, res) => {
    try {
      const { data, mimeType, filename } = req.body;
      
      if (!data || !mimeType) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Missing required fields: data and mimeType'
          },
          id: null
        });
        return;
      }

      const cloudflare = getCloudflareR2();
      if (!cloudflare) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Cloudflare R2 not configured. Please set up environment variables.'
          },
          id: null
        });
        return;
      }
      
      // Remove data URI prefix if present
      const base64Data = data.replace(/^data:.*?;base64,/, '');
      
      // Upload to Cloudflare R2
      const publicUrl = await cloudflare.uploadBase64(
        base64Data,
        mimeType,
        filename
      );
      
      res.json({
        jsonrpc: '2.0',
        result: {
          success: true,
          url: publicUrl,
          message: 'Base64 data uploaded successfully to Cloudflare R2'
        },
        id: req.body?.id || null
      });
    } catch (error) {
      logger.error('Base64 upload error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Failed to upload base64 data: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        id: req.body?.id || null
      });
    }
  });

  return router;
}

async function handleStatelessRequest(
  mcpServer: McpServer,
  req: any,
  res: any
): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    transport.close();
  });

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

async function handleStatefulRequest(
  mcpServer: McpServer,
  sessionManager: SessionManager,
  sessionId: string | undefined,
  req: any,
  res: any,
  sseSessionChecker?: SSESessionChecker
): Promise<void> {
  // Check if sessionId is being used by SSE transport
  if (sessionId && sseSessionChecker?.hasSession(sessionId)) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Session ID is already in use by SSE transport',
      },
      id: null,
    });
    return;
  }

  let transport = sessionId ? 
    await sessionManager.getTransport(sessionId) : null;

  if (!transport && isInitializeRequest(req.body)) {
    const session = await sessionManager.createSession(mcpServer);
    transport = session.transport;
    res.setHeader('Mcp-Session-Id', session.sessionId);
  } else if (!transport) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
}

function handleError(res: any, error: any): void {
  console.error('MCP request error:', error);
  if (!res.headersSent) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  }
}