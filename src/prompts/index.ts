import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { debuggingPrompts } from "./debugging-prompts.js";
import { logger } from "@/utils/logger.js";

export async function registerPrompts(server: McpServer) {
  // Register each debugging prompt
  for (const prompt of debuggingPrompts) {
    // Build zod schema for arguments
    const argsSchema: Record<string, z.ZodTypeAny> = {};
    for (const arg of prompt.arguments) {
      if (arg.required) {
        argsSchema[arg.name] = z.string().describe(arg.description);
      } else {
        argsSchema[arg.name] = z.string().optional().describe(arg.description);
      }
    }

    logger.debug(`Registering prompt: ${prompt.name}`);
    
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema
      },
      (args) => {
        logger.debug(`Getting prompt: ${prompt.name}`);
        
        let content = prompt.template;
        
        // Replace template variables
        if (args) {
          for (const [key, value] of Object.entries(args)) {
            const placeholder = `{{${key}}}`;
            content = content.replace(new RegExp(placeholder, 'g'), String(value));
          }
        }
        
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: content
              }
            }
          ]
        };
      }
    );
  }
}