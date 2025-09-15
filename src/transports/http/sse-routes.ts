import { Router } from "express";
import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { HttpTransportConfig } from "../types.js";
import type { SessionManager } from "./session.js";

interface SSESession {
  transport: SSEServerTransport;
  createdAt: number;
}

export class SSEManager {
  private sessions = new Map<string, SSESession>();

  constructor(private config: HttpTransportConfig) {}

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  createSession(endpoint: string, res: Response): SSEServerTransport {
    const transport = new SSEServerTransport(endpoint, res, {
      allowedHosts: this.config.security?.allowedHosts,
      allowedOrigins: this.config.security?.corsOrigins,
      enableDnsRebindingProtection: this.config.security?.enableDnsRebindingProtection
    });

    const session: SSESession = {
      transport,
      createdAt: Date.now()
    };

    this.sessions.set(transport.sessionId, session);

    // Cleanup on close
    transport.onclose = () => {
      this.sessions.delete(transport.sessionId);
      console.log(`SSE session ${transport.sessionId} closed`);
    };

    transport.onerror = (error) => {
      console.error(`SSE session ${transport.sessionId} error:`, error);
      this.sessions.delete(transport.sessionId);
    };

    console.log(`SSE session ${transport.sessionId} created`);
    return transport;
  }

  getSession(sessionId: string): SSEServerTransport | null {
    const session = this.sessions.get(sessionId);
    return session?.transport || null;
  }

  async cleanup(): Promise<void> {
    const promises = Array.from(this.sessions.values()).map(session => 
      session.transport.close()
    );
    await Promise.all(promises);
    this.sessions.clear();
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

export function createSSERoutes(
  mcpServer: McpServer,
  config: HttpTransportConfig,
  streamableSessionManager: SessionManager
): Router {
  const router = Router();
  const sseManager = new SSEManager(config);

  if (!config.ssePaths) {
    throw new Error("SSE paths configuration is required");
  }

  const { stream: streamPath, message: messagePath } = config.ssePaths;

  // Guard against stateless mode
  const checkStatefulMode = (req: Request, res: Response, next: any) => {
    if (config.sessionMode === 'stateless') {
      return res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "SSE endpoints not available in stateless mode"
        },
        id: null
      });
    }
    next();
  };

  // GET /sse - Establish SSE connection
  router.get(streamPath, checkStatefulMode, async (req: Request, res: Response) => {
    try {
      console.log('SSE connection request received');
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Set CORS headers for SSE if CORS is enabled
      if (config.security?.enableCors !== false) {
        res.setHeader('Access-Control-Allow-Origin', 
          config.security?.corsOrigins?.join(',') || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
      }
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const messageEndpoint = `${baseUrl}${messagePath}`;
      
      const transport = sseManager.createSession(messageEndpoint, res);
      
      // Connect transport to MCP server
      await mcpServer.connect(transport);
      
      // Start the SSE stream
      await transport.start();
      
      // Set up cleanup on connection close
      res.on('close', () => {
        transport.close();
      });
      
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error establishing SSE connection"
          },
          id: null
        });
      }
    }
  });

  // POST /messages - Handle incoming messages
  router.post(messagePath, checkStatefulMode, async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Missing sessionId query parameter"
          },
          id: null
        });
      }

      // Check if sessionId is being used by streamable HTTP transport
      const streamableTransport = await streamableSessionManager.getTransport(sessionId);
      if (streamableTransport) {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Session ID is already in use by streamable HTTP transport"
          },
          id: null
        });
      }

      const transport = sseManager.getSession(sessionId);
      if (!transport) {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: `No active SSE session found for sessionId: ${sessionId}`
          },
          id: null
        });
      }

      // Forward the message to the transport
      await transport.handlePostMessage(req, res, req.body);
      
    } catch (error) {
      console.error('Error handling SSE message:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error processing message"
          },
          id: null
        });
      }
    }
  });

  // Store reference to manager for cleanup
  (router as any).sseManager = sseManager;

  return router;
}