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
  image_input: z.string().optional().describe("Starting frame image - supports file paths, URLs, or base64 data URIs"),
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

// Image Editing Schemas
export const ImageEditingInputSchema = z.object({
  operation: z.enum([
    "inpaint",
    "outpaint",
    "style_transfer",
    "object_manipulation",
    "multi_image_compose"
  ]).describe("Type of image editing operation to perform"),

  input_image: z.string().describe("Input image - supports file paths, URLs, or base64 data URIs (e.g., '/path/to/image.png', 'https://example.com/image.jpg', or 'data:image/png;base64,...')"),

  prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of the desired edit"),

  // Inpainting specific fields
  mask_image: z.string().optional().describe("Mask image for inpainting - supports file paths, URLs, or base64 data URIs (white = edit area, black = keep)"),
  mask_prompt: z.string().optional().describe("Text description of the area to mask for editing"),

  // Outpainting specific fields
  expand_direction: z.enum(["all", "left", "right", "top", "bottom", "horizontal", "vertical"]).optional().describe("Direction to expand the image"),
  expansion_ratio: z.number().min(0.1).max(3.0).optional().default(1.5).describe("How much to expand the image (1.0 = no expansion)"),

  // Style transfer specific fields
  style_image: z.string().optional().describe("Style reference image - supports file paths, URLs, or base64 data URIs"),
  style_strength: z.number().min(0.1).max(1.0).optional().default(0.7).describe("Strength of style application"),

  // Object manipulation specific fields
  target_object: z.string().optional().describe("Description of the object to manipulate"),
  manipulation_type: z.enum(["move", "resize", "remove", "replace", "duplicate"]).optional().describe("Type of object manipulation"),
  target_position: z.string().optional().describe("New position for the object (e.g., 'center', 'top-left')"),

  // Multi-image composition specific fields
  secondary_images: z.array(z.string()).optional().describe("Array of secondary images - each supports file paths, URLs, or base64 data URIs"),
  composition_layout: z.enum(["blend", "collage", "overlay", "side_by_side"]).optional().describe("How to combine multiple images"),
  blend_mode: z.enum(["normal", "multiply", "screen", "overlay", "soft_light"]).optional().describe("Blending mode for image composition"),

  // Common optional fields
  negative_prompt: z.string().optional().describe("What to avoid in the edited image"),
  strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
  guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
  seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
  output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format for the edited image"),
  quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level of the editing")
});

export type ImageEditingInput = z.infer<typeof ImageEditingInputSchema>;

export interface ImageEditingResult {
  editedImageData: string;
  format: string;
  operation: string;
  processingTime?: number;
  originalSize?: string;
  editedSize?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  metadata?: {
    prompt: string;
    operation: string;
    strength?: number;
    guidanceScale?: number;
    seed?: number;
  };
}

export interface ImageEditingOptions {
  operation: string;
  inputImage: string;
  prompt: string;
  maskImage?: string;
  maskPrompt?: string;
  expandDirection?: string;
  expansionRatio?: number;
  styleImage?: string;
  styleStrength?: number;
  targetObject?: string;
  manipulationType?: string;
  targetPosition?: string;
  secondaryImages?: string[];
  compositionLayout?: string;
  blendMode?: string;
  negativePrompt?: string;
  strength: number;
  guidanceScale: number;
  seed?: number;
  outputFormat: string;
  quality: string;
  fetchTimeout: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  saveDirectory?: string;
  filePrefix?: string;
}