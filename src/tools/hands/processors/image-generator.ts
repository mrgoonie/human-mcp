import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import type { ImageGenerationOptions, ImageGenerationResult } from "../schemas.js";
import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export async function generateImage(
  geminiClient: GeminiClient,
  options: ImageGenerationOptions,
  config?: Config
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    // Build the enhanced prompt with style and aspect ratio
    let enhancedPrompt = options.prompt;

    if (options.style) {
      const styleMapping: Record<string, string> = {
        photorealistic: "photorealistic, high quality, detailed",
        artistic: "artistic style, creative, expressive",
        cartoon: "cartoon style, animated, colorful",
        sketch: "pencil sketch, hand-drawn, artistic",
        digital_art: "digital art, modern, stylized"
      };
      const styleDescription = styleMapping[options.style];
      if (styleDescription) {
        enhancedPrompt = `${enhancedPrompt}, ${styleDescription}`;
      }
    }

    if (options.aspectRatio && options.aspectRatio !== "1:1") {
      enhancedPrompt = `${enhancedPrompt}, aspect ratio ${options.aspectRatio}`;
    }

    if (options.negativePrompt) {
      enhancedPrompt = `${enhancedPrompt}. Avoid: ${options.negativePrompt}`;
    }

    logger.info(`Enhanced prompt: "${enhancedPrompt}"`);

    // Get the image generation model
    const model = geminiClient.getImageGenerationModel(options.model);

    // Generate the image using Gemini API
    const response = await model.generateContent([
      {
        text: enhancedPrompt
      }
    ]);

    const result = response.response;

    // Extract image data from the response
    // Note: The actual implementation will depend on how Gemini returns image data
    // This is a placeholder implementation based on expected API behavior
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image candidates returned from Gemini API");
    }

    const candidate = candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("Invalid response format from Gemini API");
    }

    // Look for image data in the response parts
    let imageData: string | null = null;
    let mimeType = "image/jpeg";

    for (const part of candidate.content.parts) {
      if ('inlineData' in part && part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/jpeg";
        break;
      }
    }

    if (!imageData) {
      throw new Error("No image data found in Gemini response");
    }

    const generationTime = Date.now() - startTime;

    // Prepare the result based on output format
    let resultData: string;
    let format: string;
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    // Always save file to reduce token usage, unless explicitly disabled
    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const savedFile = await saveBase64ToFile(
          imageData,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'gemini-image',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Image saved to file: ${filePath}`);

        // For URL format, return the file URL if available, otherwise file path
        if (options.outputFormat === "url") {
          resultData = fileUrl || filePath || `data:${mimeType};base64,${imageData}`;
          format = fileUrl ? "url" : "file_path";
        } else {
          // For base64 format, return base64 but also include file info
          resultData = `data:${mimeType};base64,${imageData}`;
          format = "base64_data_uri";
        }
      } catch (error) {
        logger.warn(`Failed to save image file: ${error}. Falling back to base64 only.`);
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
      }
    } else {
      if (options.outputFormat === "base64") {
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
      } else {
        // For URL format without file saving, fall back to base64
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
        logger.warn("URL output format requested but file saving disabled. Returning base64 data URI");
      }
    }

    return {
      imageData: resultData,
      format,
      model: options.model,
      generationTime,
      size: estimateImageSize(imageData),
      filePath,
      fileName,
      fileUrl,
      fileSize
    };

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Image generation failed after ${generationTime}ms:`, error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Invalid or missing Google AI API key. Please check your GOOGLE_GEMINI_API_KEY environment variable.");
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("API quota exceeded or rate limit reached. Please try again later.");
      }
      if (error.message.includes("safety") || error.message.includes("policy")) {
        throw new Error("Image generation blocked due to safety policies. Please modify your prompt and try again.");
      }
      throw new Error(`Image generation failed: ${error.message}`);
    }

    throw new Error("Image generation failed due to an unexpected error");
  }
}

function estimateImageSize(base64Data: string): string {
  // Estimate image dimensions based on base64 data length
  // This is a rough estimation - actual size would need image parsing
  const dataLength = base64Data.length;
  const estimatedBytes = (dataLength * 3) / 4; // Base64 to bytes conversion

  // Rough estimation for common image sizes
  if (estimatedBytes < 100000) { // ~100KB
    return "512x512";
  } else if (estimatedBytes < 400000) { // ~400KB
    return "1024x1024";
  } else {
    return "1024x1024+";
  }
}