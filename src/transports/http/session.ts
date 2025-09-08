import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { SessionStore, TransportSession } from "../types.js";

export class SessionManager {
  private transports: Map<string, StreamableHTTPServerTransport>;
  private sessionMode: 'stateful' | 'stateless';
  private store?: SessionStore;

  constructor(sessionMode: 'stateful' | 'stateless', store?: SessionStore) {
    this.transports = new Map();
    this.sessionMode = sessionMode;
    this.store = store;
  }

  async createSession(mcpServer: McpServer): Promise<{ transport: StreamableHTTPServerTransport, sessionId: string }> {
    const sessionId = randomUUID();
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedHosts: ['127.0.0.1', 'localhost', '127.0.0.1:3001', 'localhost:3001'],
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
      transport.close();
      this.transports.delete(sessionId);
    }
    
    if (this.store) {
      await this.store.delete(sessionId);
    }
  }

  async cleanup(): Promise<void> {
    for (const [sessionId, transport] of this.transports) {
      transport.close();
    }
    this.transports.clear();
    
    if (this.store) {
      await this.store.cleanup();
    }
  }
}