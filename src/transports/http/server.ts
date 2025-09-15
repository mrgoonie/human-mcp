import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRoutes } from "./routes.js";
import { createSSERoutes } from "./sse-routes.js";
import { SessionManager } from "./session.js";
import { createSecurityMiddleware } from "./middleware.js";
import type { HttpTransportConfig, HttpServerHandle } from "../types.js";

export async function startHttpTransport(
  mcpServer: McpServer,
  config: HttpTransportConfig
): Promise<HttpServerHandle> {
  const app = express();
  const sessionManager = new SessionManager(config.sessionMode, config);

  // Apply middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(compression());
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