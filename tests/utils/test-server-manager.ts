import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startHttpTransport } from "../../src/transports/http/server.js";
import type { HttpTransportConfig, HttpServerHandle } from "../../src/transports/types.js";

export class TestServerManager {
  private servers: Map<number, HttpServerHandle> = new Map();
  private usedPorts: Set<number> = new Set();

  /**
   * Get a random available port for testing
   */
  async getAvailablePort(): Promise<number> {
    // Start from a high port to avoid conflicts with common services
    let port = 3000 + Math.floor(Math.random() * 1000);
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
      port = 3000 + Math.floor(Math.random() * 1000);
      attempts++;
    }

    throw new Error('Unable to find available port after maximum attempts');
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(1000)
      });
      // If we get a response, port is in use
      return false;
    } catch {
      // If we get an error (connection refused), port is available
      return true;
    }
  }

  /**
   * Start a test server with the given configuration
   */
  async startTestServer(config: Partial<HttpTransportConfig> = {}): Promise<{
    server: HttpServerHandle;
    port: number;
    baseUrl: string;
  }> {
    const port = await this.getAvailablePort();
    
    // Create a basic MCP server for testing
    const mcpServer = new McpServer(
      {
        name: "test-server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    const serverConfig: HttpTransportConfig = {
      port,
      host: "127.0.0.1",
      sessionMode: "stateful",
      enableSse: true,
      enableJsonResponse: true,
      enableSseFallback: true,
      ssePaths: {
        stream: "/sse",
        message: "/messages"
      },
      security: {
        enableCors: true,
        enableDnsRebindingProtection: true,
        allowedHosts: ["127.0.0.1", "localhost"]
      },
      ...config
    };

    const server = await startHttpTransport(mcpServer, serverConfig);
    this.servers.set(port, server);

    // Wait for server to be ready
    await this.waitForServerReady(port);

    return {
      server,
      port,
      baseUrl: `http://127.0.0.1:${port}`
    };
  }

  /**
   * Wait for server to be ready by checking health endpoint
   */
  private async waitForServerReady(port: number, timeout = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(1000)
        });
        
        if (response.ok) {
          const health = await response.json();
          if (health.status === 'healthy') {
            return;
          }
        }
      } catch {
        // Server not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Server on port ${port} did not become ready within ${timeout}ms`);
  }

  /**
   * Stop a specific server by port
   */
  async stopServer(port: number): Promise<void> {
    const server = this.servers.get(port);
    if (server) {
      await server.close();
      this.servers.delete(port);
      this.usedPorts.delete(port);
    }
  }

  /**
   * Stop all test servers
   */
  async stopAllServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(port => this.stopServer(port));
    await Promise.all(stopPromises);
  }

  /**
   * Get the number of active servers
   */
  getActiveServerCount(): number {
    return this.servers.size;
  }

  /**
   * Check if any servers are still running
   */
  hasActiveServers(): boolean {
    return this.servers.size > 0;
  }
}

// Global test server manager instance
export const testServerManager = new TestServerManager();