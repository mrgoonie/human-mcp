import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startStdioTransport } from "./stdio.js";
import { startHttpTransport } from "./http/server.js";
import type { TransportConfig, HttpServerHandle } from "./types.js";

export class TransportManager {
  private server: McpServer;
  private config: TransportConfig;
  private httpHandle?: HttpServerHandle;

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
        this.httpHandle = await startHttpTransport(this.server, this.config.http!);
        break;
      case 'both':
        await startStdioTransport(this.server);
        this.httpHandle = await startHttpTransport(this.server, this.config.http!);
        break;
    }
  }

  async stop(): Promise<void> {
    if (this.httpHandle) {
      await this.httpHandle.close();
    }
  }
}