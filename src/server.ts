import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEyesTool } from "./tools/eyes/index.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";
import { logger } from "./utils/logger.js";
import { loadConfig } from "./utils/config.js";

export async function createServer() {
  const config = loadConfig();
  
  const server = new Server(
    {
      name: "human-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    }
  );

  await registerEyesTool(server, config);
  await registerPrompts(server);
  await registerResources(server);

  server.onerror = (error) => {
    logger.error("MCP Server error:", error);
  };

  return server;
}

export async function startStdioServer() {
  try {
    const server = await createServer();
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    logger.info("Human MCP Server started successfully (stdio transport)");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}