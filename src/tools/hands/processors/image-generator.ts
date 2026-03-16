import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import type { ImageGenerationOptions, ImageGenerationResult } from "../schemas.js";
import { generateWithZhipuAI } from "../providers/zhipuai-image-provider.js";
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";
import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export async function generateImage(
  geminiClient: GeminiClient,
  options: ImageGenerationOptions,
  config?: Config
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  // Provider routing: ZhipuAI
  const provider = config?.providers?.image || "gemini";
  if (provider === "zhipuai" && config && ZhipuAIClient.isConfigured(config)) {
    return generateWithZhipuAI({
      prompt: options.prompt,
      model: options.model || config.zhipuai?.imageModel,
      aspectRatio: options.aspectRatio,
      outputFormat: options.outputFormat,
      uploadToR2: options.uploadToR2,
      config,
    });
  }

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

    // Generate image using raw REST API with responseModalities: ["TEXT", "IMAGE"]
    // The @google/generative-ai SDK v0.21.0 does not support responseModalities
    const imageResult = await geminiClient.generateImageContent({
      prompt: enhancedPrompt,
      model: options.model,
      aspectRatio: options.aspectRatio,
    });

    const imageData = imageResult.imageData;
    const mimeType = imageResult.mimeType;

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