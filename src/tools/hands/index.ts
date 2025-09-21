import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../eyes/utils/gemini-client.js";
import {
  ImageGenerationInputSchema,
  type ImageGenerationInput
} from "./schemas.js";
import { generateImage } from "./processors/image-generator.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

export async function registerHandsTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  // Register gemini_gen_image tool
  server.registerTool(
    "gemini_gen_image",
    {
      title: "Gemini Image Generation Tool",
      description: "Generate images from text descriptions using Gemini Imagen API",
      inputSchema: {
        prompt: z.string().describe("Text description of the image to generate"),
        model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview").describe("Image generation model"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format for the generated image"),
        negative_prompt: z.string().optional().describe("Text describing what should NOT be in the image"),
        style: z.enum(["photorealistic", "artistic", "cartoon", "sketch", "digital_art"]).optional().describe("Style of the generated image"),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("1:1").describe("Aspect ratio of the generated image"),
        seed: z.number().optional().describe("Random seed for reproducible generation")
      }
    },
    async (args) => {
      try {
        return await handleImageGeneration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_gen_image error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );
}

async function handleImageGeneration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = ImageGenerationInputSchema.parse(args) as ImageGenerationInput;
  const { prompt, model, output_format, negative_prompt, style, aspect_ratio, seed } = input;

  logger.info(`Generating image with prompt: "${prompt}" using model: ${model}`);

  const generationOptions = {
    prompt,
    model: model || "gemini-2.5-flash-image-preview",
    outputFormat: output_format || "base64",
    negativePrompt: negative_prompt,
    style,
    aspectRatio: aspect_ratio || "1:1",
    seed,
    fetchTimeout: config.server.fetchTimeout
  };

  const result = await generateImage(geminiClient, generationOptions);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          image: result.imageData,
          format: result.format,
          model: result.model,
          prompt: prompt,
          metadata: {
            timestamp: new Date().toISOString(),
            generation_time: result.generationTime,
            size: result.size
          }
        }, null, 2)
      }
    ],
    isError: false
  };
}