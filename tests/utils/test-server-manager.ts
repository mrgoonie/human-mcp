import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startHttpTransport } from "../../src/transports/http/server.js";
import type { HttpTransportConfig, HttpServerHandle } from "../../src/transports/types.js";

export class TestServerManager {
  private servers: Map<number, HttpServerHandle> = new Map();
  private usedPorts: Set<number> = new Set();

  /**
   * Get a random available port for testing using OS-level port checking
   */
  async getAvailablePort(): Promise<number> {
    // Use a wider range to avoid conflicts and add process PID for uniqueness
    const basePort = 5000 + (process.pid % 1000);
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const port = basePort + attempt;
      
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }

    throw new Error(`Unable to find available port after ${maxAttempts} attempts (tried ${basePort} to ${basePort + maxAttempts - 1})`);
  }

  /**
   * Check if a port is available using Node.js net module
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, '127.0.0.1', () => {
        server.close(() => {
          resolve(true);
        });
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
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
    const mcpServer = new McpServer({
      name: "test-server",
      version: "1.0.0"
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
  private async waitForServerReady(port: number, timeout = 15000): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(2000),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const text = await response.text();
            try {
              const health = JSON.parse(text) as { status: string };
              if (health.status === 'healthy') {
                // Give the server a bit more time to fully initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                return;
              }
            } catch (jsonError) {
              lastError = new Error(`Failed to parse JSON response: ${text.substring(0, 100)}`);
              // JSON parsing failed, server not ready yet
            }
          } else {
            // Try to read content to understand what's being returned
            const text = await response.text();
            const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
            lastError = new Error(`Expected JSON response, got: ${contentType}. Content preview: ${preview}`);
          }
        } else {
          lastError = new Error(`Health check failed with status: ${response.status}`);
        }
      } catch (error) {
        lastError = error as Error;
        // Server not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    throw new Error(`Server on port ${port} did not become ready within ${timeout}ms. Last error: ${lastError?.message || 'Unknown'}`);
  }

  /**
   * Stop a specific server by port
   */
  async stopServer(port: number): Promise<void> {
    const server = this.servers.get(port);
    if (server) {
      try {
        await server.close();
      } catch (error) {
        console.warn(`Error closing server on port ${port}:`, error);
      } finally {
        this.servers.delete(port);
        // Add delay before releasing port to ensure cleanup
        setTimeout(() => {
          this.usedPorts.delete(port);
        }, 1000);
      }
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