#!/usr/bin/env bun

import { createServer } from "./server.js";
import { TransportManager } from "./transports/index.js";
import { loadConfig } from "./utils/config.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    const config = loadConfig();
    const server = await createServer();
    
    const transportConfig = {
      type: config.transport.type,
      http: config.transport.http?.enabled ? {
        port: config.transport.http.port,
        host: config.transport.http.host,
        sessionMode: config.transport.http.sessionMode,
        enableSse: config.transport.http.enableSse,
        enableJsonResponse: config.transport.http.enableJsonResponse,
        enableSseFallback: config.transport.http.enableSseFallback,
        ssePaths: config.transport.http.ssePaths,
        security: config.transport.http.security
      } : undefined
    };
    
    const transportManager = new TransportManager(server, transportConfig);
    await transportManager.start();
    
    logger.info(`Human MCP Server started with ${config.transport.type} transport`);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down server...');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();