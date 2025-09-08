import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRoutes } from "./routes.js";
import { SessionManager } from "./session.js";
import { createSecurityMiddleware } from "./middleware.js";
import type { HttpTransportConfig } from "../types.js";

export async function startHttpTransport(
  mcpServer: McpServer,
  config: HttpTransportConfig
): Promise<void> {
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
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
      credentials: true
    }));
  }

  app.use(createSecurityMiddleware(config.security));

  // Create routes
  const routes = createRoutes(mcpServer, sessionManager, config);
  app.use('/mcp', routes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', transport: 'streamable-http' });
  });

  // Start server
  const port = config.port || 3000;
  const host = config.host || '0.0.0.0';
  
  app.listen(port, host, () => {
    console.log(`MCP HTTP Server listening on http://${host}:${port}`);
    console.log(`Health check: http://${host}:${port}/health`);
    console.log(`MCP endpoint: http://${host}:${port}/mcp`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    console.log('Shutting down HTTP server...');
    await sessionManager.cleanup();
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down HTTP server...');
    await sessionManager.cleanup();
  });
}