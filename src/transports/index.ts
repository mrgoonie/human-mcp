import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startStdioTransport } from "./stdio.js";
import { startHttpTransport } from "./http/server.js";
import type { TransportConfig } from "./types.js";

export class TransportManager {
  private server: McpServer;
  private config: TransportConfig;

  constructor(server: McpServer, config: TransportConfig) {
    this.server = server;
    this.config = config;
  }

  async start(): Promise<void> {
    switch (this.config.type) {
      case 'stdio':
        await startStdioTransport(this.server);
        break;
      case 'http':
        await startHttpTransport(this.server, this.config.http!);
        break;
      case 'both':
        await Promise.all([
          startStdioTransport(this.server),
          startHttpTransport(this.server, this.config.http!)
        ]);
        break;
    }
  }
}