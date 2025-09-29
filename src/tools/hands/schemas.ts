import { z } from "zod";

export const ImageGenerationInputSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview"),
  output_format: z.enum(["base64", "url"]).optional().default("base64"),
  negative_prompt: z.string().optional(),
  style: z.enum(["photorealistic", "artistic", "cartoon", "sketch", "digital_art"]).optional(),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("1:1"),
  seed: z.number().int().min(0).optional()
});

export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;

export interface ImageGenerationResult {
  imageData: string;
  format: string;
  model: string;
  generationTime?: number;
  size?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface ImageGenerationOptions {
  prompt: string;
  model: string;
  outputFormat: string;
  negativePrompt?: string;
  style?: string;
  aspectRatio: string;
  seed?: number;
  fetchTimeout: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  saveDirectory?: string;
  filePrefix?: string;
}

// Video Generation Schemas
export const VideoGenerationInputSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001"),
  duration: z.enum(["4s", "8s", "12s"]).optional().default("4s"),
  output_format: z.enum(["mp4", "webm"]).optional().default("mp4"),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9"),
  fps: z.number().int().min(1).max(60).optional().default(24),
  image_input: z.string().optional().describe("Base64 encoded image or image URL to use as starting frame"),
  style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional(),
  camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional(),
  seed: z.number().int().min(0).optional()
});

export type VideoGenerationInput = z.infer<typeof VideoGenerationInputSchema>;

export interface VideoGenerationResult {
  videoData: string;
  format: string;
  model: string;
  duration: string;
  aspectRatio: string;
  fps: number;
  generationTime?: number;
  size?: string;
  operationId?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface VideoGenerationOptions {
  prompt: string;
  model: string;
  duration: string;
  outputFormat: string;
  aspectRatio: string;
  fps: number;
  imageInput?: string;
  style?: string;
  cameraMovement?: string;
  seed?: number;
  fetchTimeout: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  saveDirectory?: string;
  filePrefix?: string;
}