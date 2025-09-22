import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../eyes/utils/gemini-client.js";
import {
  ImageGenerationInputSchema,
  VideoGenerationInputSchema,
  type ImageGenerationInput,
  type VideoGenerationInput
} from "./schemas.js";
import { generateImage } from "./processors/image-generator.js";
import { generateVideo, generateImageToVideo, pollVideoGeneration } from "./processors/video-generator.js";
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

  // Register gemini_gen_video tool
  server.registerTool(
    "gemini_gen_video",
    {
      title: "Gemini Video Generation Tool",
      description: "Generate videos from text descriptions using Gemini Veo 3.0 API",
      inputSchema: {
        prompt: z.string().describe("Text description of the video to generate"),
        model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001").describe("Video generation model"),
        duration: z.enum(["4s", "8s", "12s"]).optional().default("4s").describe("Duration of the generated video"),
        output_format: z.enum(["mp4", "webm"]).optional().default("mp4").describe("Output format for the generated video"),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9").describe("Aspect ratio of the generated video"),
        fps: z.number().int().min(1).max(60).optional().default(24).describe("Frames per second"),
        image_input: z.string().optional().describe("Base64 encoded image or image URL to use as starting frame"),
        style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional().describe("Style of the generated video"),
        camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional().describe("Camera movement type"),
        seed: z.number().optional().describe("Random seed for reproducible generation")
      }
    },
    async (args) => {
      try {
        return await handleVideoGeneration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_gen_video error:`, mcpError);

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

  // Register gemini_image_to_video tool
  server.registerTool(
    "gemini_image_to_video",
    {
      title: "Gemini Image-to-Video Tool",
      description: "Generate videos from images and text descriptions using Gemini Imagen + Veo 3.0 APIs",
      inputSchema: {
        prompt: z.string().describe("Text description of the video animation"),
        image_input: z.string().describe("Base64 encoded image or image URL to use as starting frame"),
        model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001").describe("Video generation model"),
        duration: z.enum(["4s", "8s", "12s"]).optional().default("4s").describe("Duration of the generated video"),
        output_format: z.enum(["mp4", "webm"]).optional().default("mp4").describe("Output format for the generated video"),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9").describe("Aspect ratio of the generated video"),
        fps: z.number().int().min(1).max(60).optional().default(24).describe("Frames per second"),
        style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional().describe("Style of the generated video"),
        camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional().describe("Camera movement type"),
        seed: z.number().optional().describe("Random seed for reproducible generation")
      }
    },
    async (args) => {
      try {
        return await handleImageToVideoGeneration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_image_to_video error:`, mcpError);

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

  // Return image as proper MCP content type instead of JSON text
  if (result.imageData.startsWith('data:')) {
    // Extract MIME type and base64 data from data URI
    const matches = result.imageData.match(/data:([^;]+);base64,(.+)/);
    if (matches) {
      const mimeType = matches[1];
      const base64Data = matches[2];

      return {
        content: [
          {
            type: "image" as const,
            data: base64Data,
            mimeType: mimeType
          },
          {
            type: "text" as const,
            text: `✅ Image generated successfully using ${result.model}\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Size: ${result.size}\n- Generation Time: ${result.generationTime}ms\n- Timestamp: ${new Date().toISOString()}`
          }
        ],
        isError: false
      };
    }
  }

  // Fallback to text format if data URI parsing fails
  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Image generated successfully!\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Size: ${result.size}\n- Generation Time: ${result.generationTime}ms\n\n**Image Data:** ${result.imageData.substring(0, 100)}...`
      }
    ],
    isError: false
  };
}

async function handleVideoGeneration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = VideoGenerationInputSchema.parse(args) as VideoGenerationInput;
  const { prompt, model, duration, output_format, aspect_ratio, fps, image_input, style, camera_movement, seed } = input;

  logger.info(`Generating video with prompt: "${prompt}" using model: ${model}`);

  const generationOptions = {
    prompt,
    model: model || "veo-3.0-generate-001",
    duration: duration || "4s",
    outputFormat: output_format || "mp4",
    aspectRatio: aspect_ratio || "16:9",
    fps: fps || 24,
    imageInput: image_input,
    style,
    cameraMovement: camera_movement,
    seed,
    fetchTimeout: config.server.fetchTimeout
  };

  const result = await generateVideo(geminiClient, generationOptions);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          video: result.videoData,
          format: result.format,
          model: result.model,
          prompt: prompt,
          operation_id: result.operationId,
          metadata: {
            timestamp: new Date().toISOString(),
            generation_time: result.generationTime,
            duration: result.duration,
            aspect_ratio: result.aspectRatio,
            fps: result.fps,
            size: result.size
          }
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleImageToVideoGeneration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = z.object({
    prompt: z.string(),
    image_input: z.string(),
    model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001"),
    duration: z.enum(["4s", "8s", "12s"]).optional().default("4s"),
    output_format: z.enum(["mp4", "webm"]).optional().default("mp4"),
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9"),
    fps: z.number().int().min(1).max(60).optional().default(24),
    style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional(),
    camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional(),
    seed: z.number().optional()
  }).parse(args);

  const { prompt, image_input, model, duration, output_format, aspect_ratio, fps, style, camera_movement, seed } = input;

  logger.info(`Generating video from image with prompt: "${prompt}" using model: ${model}`);

  const generationOptions = {
    prompt,
    model: model || "veo-3.0-generate-001",
    duration: duration || "4s",
    outputFormat: output_format || "mp4",
    aspectRatio: aspect_ratio || "16:9",
    fps: fps || 24,
    imageInput: image_input,
    style,
    cameraMovement: camera_movement,
    seed,
    fetchTimeout: config.server.fetchTimeout
  };

  const result = await generateImageToVideo(geminiClient, prompt, image_input, generationOptions);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          video: result.videoData,
          format: result.format,
          model: result.model,
          prompt: prompt,
          image_input: image_input,
          operation_id: result.operationId,
          metadata: {
            timestamp: new Date().toISOString(),
            generation_time: result.generationTime,
            duration: result.duration,
            aspect_ratio: result.aspectRatio,
            fps: result.fps,
            size: result.size
          }
        }, null, 2)
      }
    ],
    isError: false
  };
}