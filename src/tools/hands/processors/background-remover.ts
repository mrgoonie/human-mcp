import { removeBackground, type Config } from "@imgly/background-removal";
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

    // Configure background removal based on quality setting
    const quality = options.quality || "balanced";
    let config: Config;

    switch (quality) {
      case "fast":
        config = {
          model: "isnet_quint8", // Faster, less accurate (quantized)
          output: {
            format: "image/png",
            quality: 0.8
          }
        };
        break;

      case "high":
        config = {
          model: "isnet", // More accurate, slower (full precision)
          output: {
            format: "image/png",
            quality: 1.0
          }
        };
        break;

      case "balanced":
      default:
        config = {
          model: "isnet_fp16", // Good balance (half precision)
          output: {
            format: "image/png",
            quality: 0.9
          }
        };
        break;
    }

    // Remove background
    logger.info("Processing image with AI background removal...");
    const blob = await removeBackground(imageBuffer, config);

    // Convert blob to buffer
    const resultBuffer = Buffer.from(await blob.arrayBuffer());

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
