import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { SessionStore, TransportSession, HttpTransportConfig } from "../types.js";

export class SessionManager {
  private transports: Map<string, StreamableHTTPServerTransport>;
  private sessionMode: 'stateful' | 'stateless';
  private store?: SessionStore;
  private config: HttpTransportConfig;

  constructor(sessionMode: 'stateful' | 'stateless', config: HttpTransportConfig, store?: SessionStore) {
    this.transports = new Map();
    this.sessionMode = sessionMode;
    this.config = config;
    this.store = store;
  }

  async createSession(mcpServer: McpServer): Promise<{ transport: StreamableHTTPServerTransport, sessionId: string }> {
    const sessionId = randomUUID();
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      enableJsonResponse: this.config.enableJsonResponse,
      enableDnsRebindingProtection: this.config.security?.enableDnsRebindingProtection ?? true,
      allowedHosts: this.config.security?.allowedHosts ?? ['127.0.0.1', 'localhost'],
    });

    // Store the transport by the generated session ID
    this.transports.set(sessionId, transport);
    
    transport.onclose = () => {
      this.terminateSession(sessionId);
    };

    if (this.store) {
      await this.store.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        transport: transport
      });
    }

    await mcpServer.connect(transport);
    
    return { transport, sessionId };
  }

  async getTransport(sessionId: string): Promise<StreamableHTTPServerTransport | null> {
    let transport = this.transports.get(sessionId);
    
    if (!transport && this.store) {
      const session = await this.store.get(sessionId);
      if (session && session.transport) {
        transport = session.transport;
        this.transports.set(sessionId, transport);
      }
    }
    
    return transport || null;
  }

  async terminateSession(sessionId: string): Promise<void> {
    const transport = this.transports.get(sessionId);
    if (transport) {
      // Remove from map first to prevent circular cleanup
      this.transports.delete(sessionId);
      // Clear the onclose handler to prevent recursion
      transport.onclose = undefined;
      transport.close();
    }
    
    if (this.store) {
      await this.store.delete(sessionId);
    }
  }

  async cleanup(): Promise<void> {
    // Create a copy of the map entries to avoid modification during iteration
    const transportEntries = Array.from(this.transports.entries());
    this.transports.clear();
    
    for (const [sessionId, transport] of transportEntries) {
      // Clear the onclose handler to prevent recursion during cleanup
      transport.onclose = undefined;
      transport.close();
    }
    
    if (this.store) {
      await this.store.cleanup();
    }
  }
}