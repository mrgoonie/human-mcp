import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { debuggingPrompts } from "./debugging-prompts.js";
import { logger } from "@/utils/logger.js";

export async function registerPrompts(server: Server) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug("Listing available prompts");
    
    return {
      prompts: debuggingPrompts.map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments
      }))
    };
  });
  
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    const prompt = debuggingPrompts.find(p => p.name === name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    
    logger.debug(`Getting prompt: ${name}`);
    
    let content = prompt.template;
    
    if (args) {
      for (const [key, value] of Object.entries(args)) {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }
    
    const missingArgs = prompt.arguments
      .filter(arg => arg.required && !args?.[arg.name])
      .map(arg => arg.name);
    
    if (missingArgs.length > 0) {
      throw new Error(`Missing required arguments: ${missingArgs.join(', ')}`);
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
  });
}