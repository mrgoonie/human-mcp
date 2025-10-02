import { rmbg } from "rmbg";
import { createBriaaiModel, createModnetModel, createU2netpModel } from "rmbg/models";
import { logger } from "@/utils/logger.js";
import { loadImageForProcessing } from "@/utils/image-loader.js";
import { Jimp, JimpMime } from "jimp";

export interface BackgroundRemovalOptions {
  inputImage: string;
  quality?: "fast" | "balanced" | "high";
  outputFormat?: "png" | "jpeg";
  backgroundColor?: string;
  jpegQuality?: number;
}

export interface BackgroundRemovalResult {
  imageWithoutBackground: string;
  format: string;
  originalDimensions: { width: number; height: number };
  processingTime: number;
  quality: string;
}

/**
 * Remove background from an image using AI
 */
export async function removeImageBackground(
  options: BackgroundRemovalOptions
): Promise<BackgroundRemovalResult> {
  const startTime = Date.now();

  try {
    logger.info(
      `Removing background from image, quality: ${options.quality || "balanced"}`
    );

    // Load and process input image
    const processedImage = await loadImageForProcessing(options.inputImage, {
      fetchTimeout: 30000,
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 95
    });

    // Convert base64 to buffer for background removal
    const imageBuffer = Buffer.from(processedImage.data, "base64");

    // Configure model based on quality setting
    const quality = options.quality || "balanced";
    let model;

    switch (quality) {
      case "fast":
        model = createU2netpModel(); // Fastest, lightweight (320px)
        break;

      case "high":
        model = createBriaaiModel(); // Highest quality (1024px)
        break;

      case "balanced":
      default:
        model = createModnetModel(); // Default, balanced quality/speed (512px)
        break;
    }

    // Remove background
    logger.info("Processing image with AI background removal...");
    const resultBuffer = await rmbg(imageBuffer, { model });

    // Get original dimensions
    const originalImage = await Jimp.fromBuffer(imageBuffer);
    const originalWidth = originalImage.width;
    const originalHeight = originalImage.height;

    logger.info(
      `Background removed from ${originalWidth}x${originalHeight} image`
    );

    // Handle output format
    const outputFormat = options.outputFormat || "png";
    let resultBase64: string;

    if (outputFormat === "jpeg" && options.backgroundColor) {
      // For JPEG, we need to add a background color since JPEG doesn't support transparency
      const resultImage = await Jimp.fromBuffer(resultBuffer);

      // Create background layer with specified color
      const background = new Jimp({ width: originalWidth, height: originalHeight, color: 0xffffffff });

      // Composite the transparent image onto the background
      background.composite(resultImage, 0, 0);

      // Get buffer as JPEG with quality
      const jpegBuffer = await background.getBuffer(JimpMime.jpeg, {
        quality: options.jpegQuality || 85
      });
      resultBase64 = `data:${JimpMime.jpeg};base64,${jpegBuffer.toString("base64")}`;
    } else {
      // For PNG, just convert the result to base64
      const resultImage = await Jimp.fromBuffer(resultBuffer);
      const pngBuffer = await resultImage.getBuffer(JimpMime.png);
      resultBase64 = `data:${JimpMime.png};base64,${pngBuffer.toString("base64")}`;
    }

    const processingTime = Date.now() - startTime;

    logger.info(`Background removal completed in ${processingTime}ms`);

    return {
      imageWithoutBackground: resultBase64,
      format: outputFormat,
      originalDimensions: { width: originalWidth, height: originalHeight },
      processingTime,
      quality
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Background removal failed after ${processingTime}ms:`, error);

    if (error instanceof Error) {
      if (error.message.includes("model") || error.message.includes("download")) {
        throw new Error(
          `Background removal failed: Model download or initialization error. ${error.message}`
        );
      }
      if (error.message.includes("memory")) {
        throw new Error(
          "Background removal failed: Out of memory. Try using a smaller image or 'fast' quality setting."
        );
      }
      throw new Error(`Background removal failed: ${error.message}`);
    }

    throw new Error("Background removal failed due to an unexpected error");
  }
}
