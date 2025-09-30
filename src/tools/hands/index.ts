import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../eyes/utils/gemini-client.js";
import {
  ImageGenerationInputSchema,
  VideoGenerationInputSchema,
  ImageEditingInputSchema,
  type ImageGenerationInput,
  type VideoGenerationInput,
  type ImageEditingInput
} from "./schemas.js";
import { generateImage } from "./processors/image-generator.js";
import { generateVideo, generateImageToVideo, pollVideoGeneration } from "./processors/video-generator.js";
import { editImage } from "./processors/image-editor.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";
import { formatMediaResponse } from "@/utils/response-formatter.js";

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

  // NOTE: Gemini 2.5 Flash uses TEXT-BASED conversational editing
  // No explicit masks required - just describe what to change in natural language
  // The model understands semantic editing through descriptive prompts

  // Register gemini_edit_image tool - general image editing tool
  server.registerTool(
    "gemini_edit_image",
    {
      title: "Gemini Image Editing Tool",
      description: "Edit images using AI with text-based instructions for inpainting, outpainting, style transfer, object manipulation, and composition. No masks required - just describe what you want to change.",
      inputSchema: {
        operation: z.enum([
          "inpaint",
          "outpaint",
          "style_transfer",
          "object_manipulation",
          "multi_image_compose"
        ]).describe("Type of image editing operation to perform"),
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of the desired edit"),
        mask_image: z.string().optional().describe("Base64 encoded mask image for inpainting (white = edit area, black = keep)"),
        mask_prompt: z.string().optional().describe("Text description of the area to mask for editing"),
        expand_direction: z.enum(["all", "left", "right", "top", "bottom", "horizontal", "vertical"]).optional().describe("Direction to expand the image"),
        expansion_ratio: z.number().min(0.1).max(3.0).optional().default(1.5).describe("How much to expand the image (1.0 = no expansion)"),
        style_image: z.string().optional().describe("Base64 encoded reference image for style transfer"),
        style_strength: z.number().min(0.1).max(1.0).optional().default(0.7).describe("Strength of style application"),
        target_object: z.string().optional().describe("Description of the object to manipulate"),
        manipulation_type: z.enum(["move", "resize", "remove", "replace", "duplicate"]).optional().describe("Type of object manipulation"),
        target_position: z.string().optional().describe("New position for the object (e.g., 'center', 'top-left')"),
        secondary_images: z.array(z.string()).optional().describe("Array of base64 encoded images for composition"),
        composition_layout: z.enum(["blend", "collage", "overlay", "side_by_side"]).optional().describe("How to combine multiple images"),
        blend_mode: z.enum(["normal", "multiply", "screen", "overlay", "soft_light"]).optional().describe("Blending mode for image composition"),
        negative_prompt: z.string().optional().describe("What to avoid in the edited image"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format for the edited image"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level of the editing")
      }
    },
    async (args) => {
      try {
        return await handleImageEditing(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_edit_image error:`, mcpError);

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

  // Register specialized image editing tools
  server.registerTool(
    "gemini_inpaint_image",
    {
      title: "Gemini Image Inpainting Tool",
      description: "Add or modify specific areas of an image using natural language descriptions. No mask required - just describe what to change and where.",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of what to add or change in the image"),
        mask_image: z.string().optional().describe("(Optional) Base64 encoded mask image - not used by Gemini but kept for compatibility"),
        mask_prompt: z.string().optional().describe("Text description of WHERE in the image to make changes (e.g., 'the empty space beside the cat', 'the top-left corner')"),
        negative_prompt: z.string().optional().describe("What to avoid in the edited area"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const inpaintArgs = { ...args, operation: "inpaint" };
        return await handleImageEditing(geminiClient, inpaintArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_inpaint_image error:`, mcpError);

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

  server.registerTool(
    "gemini_outpaint_image",
    {
      title: "Gemini Image Outpainting Tool",
      description: "Expand an image beyond its original borders in specified directions",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of what to add in the expanded areas"),
        expand_direction: z.enum(["all", "left", "right", "top", "bottom", "horizontal", "vertical"]).optional().default("all").describe("Direction to expand the image"),
        expansion_ratio: z.number().min(0.1).max(3.0).optional().default(1.5).describe("How much to expand the image (1.0 = no expansion)"),
        negative_prompt: z.string().optional().describe("What to avoid in the expanded areas"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const outpaintArgs = { ...args, operation: "outpaint" };
        return await handleImageEditing(geminiClient, outpaintArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_outpaint_image error:`, mcpError);

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

  server.registerTool(
    "gemini_style_transfer_image",
    {
      title: "Gemini Style Transfer Tool",
      description: "Transfer the style from one image to another using AI",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of the desired style"),
        style_image: z.string().optional().describe("Base64 encoded reference image for style transfer"),
        style_strength: z.number().min(0.1).max(1.0).optional().default(0.7).describe("Strength of style application"),
        negative_prompt: z.string().optional().describe("What style elements to avoid"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const styleArgs = { ...args, operation: "style_transfer" };
        return await handleImageEditing(geminiClient, styleArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_style_transfer_image error:`, mcpError);

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

  server.registerTool(
    "gemini_compose_images",
    {
      title: "Gemini Image Composition Tool",
      description: "Combine multiple images into a single composition using AI",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded primary image"),
        secondary_images: z.array(z.string()).describe("Array of base64 encoded secondary images to compose"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of how to compose the images"),
        composition_layout: z.enum(["blend", "collage", "overlay", "side_by_side"]).optional().default("blend").describe("How to combine the images"),
        blend_mode: z.enum(["normal", "multiply", "screen", "overlay", "soft_light"]).optional().default("normal").describe("Blending mode for image composition"),
        negative_prompt: z.string().optional().describe("What to avoid in the composition"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the composition effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const composeArgs = { ...args, operation: "multi_image_compose" };
        return await handleImageEditing(geminiClient, composeArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_compose_images error:`, mcpError);

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
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: 'gemini-image'
  };

  const result = await generateImage(geminiClient, generationOptions, config);

  // Extract base64 data from data URI if present
  let base64Data: string | undefined;
  let mimeType: string | undefined;

  if (result.imageData.startsWith('data:')) {
    const matches = result.imageData.match(/data:([^;]+);base64,(.+)/);
    if (matches && matches[1] && matches[2]) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  // Format response based on transport type
  const contextText = `✅ Image generated successfully using ${result.model}\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Size: ${result.size}\n- Generation Time: ${result.generationTime}ms\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}`;

  const formattedResponse = formatMediaResponse(
    {
      url: result.fileUrl,
      filePath: result.filePath,
      base64: base64Data,
      mimeType: mimeType,
      size: result.fileSize,
    },
    config,
    contextText
  );

  return {
    content: formattedResponse as any,
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
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: 'gemini-video'
  };

  const result = await generateVideo(geminiClient, generationOptions, config);

  // Format response based on transport type
  const contextText = `✅ Video generated successfully!\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Duration: ${result.duration}\n- Aspect Ratio: ${result.aspectRatio}\n- FPS: ${result.fps}\n- Generation Time: ${result.generationTime}ms\n- Operation ID: ${result.operationId}\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}`;

  const formattedResponse = formatMediaResponse(
    {
      url: result.fileUrl,
      filePath: result.filePath,
      mimeType: `video/${result.format}`,
      size: result.fileSize,
    },
    config,
    contextText
  );

  return {
    content: formattedResponse as any,
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
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: 'gemini-image-to-video'
  };

  const result = await generateImageToVideo(geminiClient, prompt, image_input, generationOptions, config);

  // Format response based on transport type
  const contextText = `✅ Video generated from image successfully!\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Duration: ${result.duration}\n- Aspect Ratio: ${result.aspectRatio}\n- FPS: ${result.fps}\n- Generation Time: ${result.generationTime}ms\n- Operation ID: ${result.operationId}\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}`;

  const formattedResponse = formatMediaResponse(
    {
      url: result.fileUrl,
      filePath: result.filePath,
      mimeType: `video/${result.format}`,
      size: result.fileSize,
    },
    config,
    contextText
  );

  return {
    content: formattedResponse as any,
    isError: false
  };
}

async function handleImageEditing(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = ImageEditingInputSchema.parse(args) as ImageEditingInput;
  const {
    operation,
    input_image,
    prompt,
    mask_image,
    mask_prompt,
    expand_direction,
    expansion_ratio,
    style_image,
    style_strength,
    target_object,
    manipulation_type,
    target_position,
    secondary_images,
    composition_layout,
    blend_mode,
    negative_prompt,
    strength,
    guidance_scale,
    seed,
    output_format,
    quality
  } = input;

  logger.info(`Editing image with operation: "${operation}" and prompt: "${prompt}"`);

  const editingOptions = {
    operation,
    inputImage: input_image,
    prompt,
    maskImage: mask_image,
    maskPrompt: mask_prompt,
    expandDirection: expand_direction,
    expansionRatio: expansion_ratio || 1.5,
    styleImage: style_image,
    styleStrength: style_strength || 0.7,
    targetObject: target_object,
    manipulationType: manipulation_type,
    targetPosition: target_position,
    secondaryImages: secondary_images,
    compositionLayout: composition_layout,
    blendMode: blend_mode,
    negativePrompt: negative_prompt,
    strength: strength || 0.8,
    guidanceScale: guidance_scale || 7.5,
    seed,
    outputFormat: output_format || "base64",
    quality: quality || "standard",
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: `edited-${operation}`
  };

  const result = await editImage(geminiClient, editingOptions, config);

  // Extract base64 data from data URI if present
  let base64Data: string | undefined;
  let mimeType: string | undefined;

  if (result.editedImageData.startsWith('data:')) {
    const matches = result.editedImageData.match(/data:([^;]+);base64,(.+)/);
    if (matches && matches[1] && matches[2]) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  // Format response based on transport type
  const contextText = `✅ Image edited successfully using ${operation} operation\n\n**Editing Details:**\n- Operation: ${operation}\n- Prompt: "${prompt}"\n- Format: ${result.format}\n- Original Size: ${result.originalSize}\n- Edited Size: ${result.editedSize}\n- Processing Time: ${result.processingTime}ms\n- Quality: ${quality}\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}${result.metadata ? `\n\n**Operation Metadata:**\n- Strength: ${result.metadata.strength}\n- Guidance Scale: ${result.metadata.guidanceScale}\n- Seed: ${result.metadata.seed || 'random'}` : ''}`;

  const formattedResponse = formatMediaResponse(
    {
      url: result.fileUrl,
      filePath: result.filePath,
      base64: base64Data,
      mimeType: mimeType,
      size: result.fileSize,
    },
    config,
    contextText
  );

  return {
    content: formattedResponse as any,
    isError: false
  };
}