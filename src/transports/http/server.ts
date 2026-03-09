import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRoutes } from "./routes.js";
import { createSSERoutes } from "./sse-routes.js";
import { SessionManager } from "./session.js";
import { createSecurityMiddleware } from "./middleware.js";
import { fileInterceptorMiddleware } from "./file-interceptor.js";
import type { HttpTransportConfig, HttpServerHandle } from "../types.js";
import { logger } from "@/utils/logger.js";

export async function startHttpTransport(
  mcpServer: McpServer,
  config: HttpTransportConfig
): Promise<HttpServerHandle> {
  const app = express();
  const sessionManager = new SessionManager(config.sessionMode, config);

  // Apply middleware
  app.use(express.json({ limit: '50mb' }));

  // Disable compression for MCP SSE endpoints to prevent response buffering.
  // compression() buffers SSE events, causing Claude Desktop to not receive responses.
  app.use(compression({
    filter: (req, res) => {
      // Skip compression for MCP endpoint (uses SSE for streaming responses)
      if (req.path === '/mcp' || req.path.startsWith('/mcp/')) return false;
      return compression.filter(req, res);
    }
  }));

  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API server
    crossOriginEmbedderPolicy: false
  }));

  if (config.security?.enableCors !== false) {
    app.use(cors({
      origin: config.security?.corsOrigins || '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization'],
      credentials: true
    }));
  }

  app.use(createSecurityMiddleware(config.security));

  // Add file interceptor middleware before routes
  app.use(fileInterceptorMiddleware);

  // Debug: intercept MCP responses to log what actually leaves the server
  app.use('/mcp', (req, res, next) => {
    // Anti-buffering headers for reverse proxies
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    const startTime = Date.now();
    const method = req.method;
    const sessionId = req.headers['mcp-session-id'] as string || '(none)';
    const url = req.originalUrl || req.url;

    logger.info(`[MCP HTTP] >>> ${method} ${url} sessionId=${sessionId}`);

    const originalEnd = res.end.bind(res);
    const originalWrite = res.write.bind(res);

    // Intercept res.write() to log SSE events
    res.write = function(chunk: any, ...args: any[]) {
      const data = typeof chunk === 'string' ? chunk : chunk?.toString?.('utf-8')?.substring(0, 500);
      logger.info(`[MCP HTTP] res.write ${method} (${Date.now() - startTime}ms): sessionId=${sessionId}, contentType=${res.getHeader('content-type')}, dataLength=${chunk?.length || 0}, preview=${data?.substring(0, 200)}`);
      return originalWrite(chunk, ...args);
    } as any;

    // Intercept res.end() to log final response
    res.end = function(chunk: any, ...args: any[]) {
      const data = chunk ? (typeof chunk === 'string' ? chunk : chunk?.toString?.('utf-8')?.substring(0, 500)) : '(empty)';
      logger.info(`[MCP HTTP] res.end ${method} (${Date.now() - startTime}ms): sessionId=${sessionId}, status=${res.statusCode}, contentType=${res.getHeader('content-type')}, dataLength=${chunk?.length || 0}, preview=${data?.substring(0, 300)}`);
      return originalEnd(chunk, ...args);
    } as any;

    // Log connection close
    res.on('close', () => {
      logger.info(`[MCP HTTP] connection closed ${method} (${Date.now() - startTime}ms): sessionId=${sessionId}, finished=${res.writableFinished}, status=${res.statusCode}`);
    });

    next();
  });

  // Create SSE routes first if enabled to get SSE manager reference
  let sseManager: any = undefined;
  if (config.enableSseFallback) {
    console.log('Enabling SSE fallback transport');
    const sseRoutes = createSSERoutes(mcpServer, config, sessionManager);
    app.use(sseRoutes);
    
    // Store SSE manager reference for cleanup and cross-validation
    sseManager = (sseRoutes as any).sseManager;
    (app as any).sseManager = sseManager;
  }

  // Create routes with SSE session checker
  const routes = createRoutes(mcpServer, sessionManager, config, sseManager);
  app.use('/mcp', routes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    const healthStatus: any = { 
      status: 'healthy', 
      transport: 'streamable-http' 
    };
    
    if (config.enableSseFallback) {
      healthStatus.sseFallback = 'enabled';
      healthStatus.ssePaths = config.ssePaths;
    }
    
    res.json(healthStatus);
  });

  // Start server
  const port = config.port || 3000;
  const host = config.host || '0.0.0.0';
  
  const server = app.listen(port, host, () => {
    console.log(`MCP HTTP Server listening on http://${host}:${port}`);
    console.log(`Health check: http://${host}:${port}/health`);
    console.log(`MCP endpoint: http://${host}:${port}/mcp`);
  });

  // Create cleanup function
  const cleanup = async () => {
    console.log('Shutting down HTTP server...');
    await sessionManager.cleanup();
    
    // Cleanup SSE sessions if enabled
    if (config.enableSseFallback && (app as any).sseManager) {
      await (app as any).sseManager.cleanup();
    }
  };

  // Graceful shutdown handling
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // Return server handle
  const handle: HttpServerHandle = {
    app,
    server,
    sessionManager,
    sseManager,
    async close() {
      await cleanup();
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  };

  return handle;
}