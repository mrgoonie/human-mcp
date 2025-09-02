import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { documentationContent, examplesContent } from "./documentation.js";
import { logger } from "@/utils/logger.js";

export async function registerResources(server: McpServer) {
  // Register API documentation resource
  server.registerResource(
    "api-docs",
    "humanmcp://docs/api",
    {
      title: "Human MCP API Documentation",
      description: "Complete API reference for all Human MCP tools",
      mimeType: "text/markdown"
    },
    async (uri) => {
      logger.debug(`Reading resource: ${uri.href}`);
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: documentationContent
        }]
      };
    }
  );

  // Register debugging examples resource  
  server.registerResource(
    "debugging-examples",
    "humanmcp://examples/debugging",
    {
      title: "Debugging Examples",
      description: "Real-world examples of using Human MCP for debugging",
      mimeType: "text/markdown"
    },
    async (uri) => {
      logger.debug(`Reading resource: ${uri.href}`);
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown", 
          text: examplesContent
        }]
      };
    }
  );
}