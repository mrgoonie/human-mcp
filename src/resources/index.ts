import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { documentationContent, examplesContent } from "./documentation.js";
import { logger } from "@/utils/logger.js";

const resources = [
  {
    uri: "humanmcp://docs/api",
    name: "Human MCP API Documentation", 
    description: "Complete API reference for all Human MCP tools",
    mimeType: "text/markdown"
  },
  {
    uri: "humanmcp://examples/debugging",
    name: "Debugging Examples",
    description: "Real-world examples of using Human MCP for debugging",
    mimeType: "text/markdown"
  }
];

export async function registerResources(server: Server) {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug("Listing available resources");
    
    return {
      resources: resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType
      }))
    };
  });
  
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    logger.debug(`Reading resource: ${uri}`);
    
    let content: string;
    
    switch (uri) {
      case "humanmcp://docs/api":
        content = documentationContent;
        break;
      case "humanmcp://examples/debugging":
        content = examplesContent;
        break;
      default:
        throw new Error(`Resource not found: ${uri}`);
    }
    
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: content
        }
      ]
    };
  });
}