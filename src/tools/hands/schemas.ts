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
}