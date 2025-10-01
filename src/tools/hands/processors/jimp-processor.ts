import { Jimp } from "jimp";
import { logger } from "@/utils/logger.js";
import {
  loadJimpImage,
  jimpToBase64,
  getResizeAlgorithm,
  calculateAspectRatioDimensions,
  getBlendMode
} from "../utils/jimp-helpers.js";
import {
  validateCropParams,
  validateResizeParams,
  validateRotateParams,
  validateMaskParams,
  calculateCropRegion
} from "../utils/validation.js";

export interface CropOptions {
  inputImage: string;
  mode?: "manual" | "center" | "top_left" | "top_right" | "bottom_left" | "bottom_right" | "aspect_ratio";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  outputFormat?: "png" | "jpeg" | "bmp";
  quality?: number;
}

export interface CropResult {
  croppedImage: string;
  format: string;
  originalDimensions: { width: number; height: number };
  croppedDimensions: { width: number; height: number };
  cropRegion: { x: number; y: number; width: number; height: number };
  processingTime: number;
}

export interface ResizeOptions {
  inputImage: string;
  width?: number;
  height?: number;
  scale?: number;
  maintainAspectRatio?: boolean;
  algorithm?: "nearestNeighbor" | "bilinear" | "bicubic" | "hermite" | "bezier";
  outputFormat?: "png" | "jpeg" | "bmp";
  quality?: number;
}

export interface ResizeResult {
  resizedImage: string;
  format: string;
  originalDimensions: { width: number; height: number };
  resizedDimensions: { width: number; height: number };
  processingTime: number;
}

export interface RotateOptions {
  inputImage: string;
  angle: number;
  backgroundColor?: string;
  outputFormat?: "png" | "jpeg" | "bmp";
  quality?: number;
}

export interface RotateResult {
  rotatedImage: string;
  format: string;
  originalDimensions: { width: number; height: number };
  rotatedDimensions: { width: number; height: number };
  angle: number;
  processingTime: number;
}

export interface MaskOptions {
  inputImage: string;
  maskImage: string;
  x?: number;
  y?: number;
  blendMode?: "source_over" | "multiply" | "screen" | "overlay" | "darken" | "lighten";
  opacity?: number;
  outputFormat?: "png" | "jpeg" | "bmp";
  quality?: number;
}

export interface MaskResult {
  maskedImage: string;
  format: string;
  dimensions: { width: number; height: number };
  processingTime: number;
}

/**
 * Crop an image using various modes
 */
export async function cropImage(options: CropOptions): Promise<CropResult> {
  const startTime = Date.now();

  try {
    // Load input image
    const { image, originalFormat } = await loadJimpImage(options.inputImage);
    const originalWidth = image.width;
    const originalHeight = image.height;

    logger.info(
      `Cropping image: ${originalWidth}x${originalHeight}, mode: ${options.mode || "manual"}`
    );

    // Determine crop mode
    const mode = options.mode || "manual";

    // Calculate crop region based on mode
    const cropRegion = calculateCropRegion(
      mode,
      originalWidth,
      originalHeight,
      options.width,
      options.height,
      options.aspectRatio
    );

    // Override x, y if provided in manual mode
    if (mode === "manual" && (options.x !== undefined || options.y !== undefined)) {
      cropRegion.x = options.x ?? cropRegion.x;
      cropRegion.y = options.y ?? cropRegion.y;
    }

    // Validate crop parameters
    validateCropParams({
      x: cropRegion.x,
      y: cropRegion.y,
      width: cropRegion.width,
      height: cropRegion.height,
      imageWidth: originalWidth,
      imageHeight: originalHeight
    });

    // Perform crop using Jimp v1 API
    image.crop({
      x: cropRegion.x,
      y: cropRegion.y,
      w: cropRegion.width,
      h: cropRegion.height
    });

    const croppedWidth = image.width;
    const croppedHeight = image.height;

    logger.info(
      `Cropped to: ${croppedWidth}x${croppedHeight}, region: (${cropRegion.x}, ${cropRegion.y}, ${cropRegion.width}, ${cropRegion.height})`
    );

    // Convert to base64
    const outputFormat = options.outputFormat || originalFormat || "png";
    const croppedImage = await jimpToBase64(image, outputFormat, options.quality);

    const processingTime = Date.now() - startTime;

    return {
      croppedImage,
      format: outputFormat,
      originalDimensions: { width: originalWidth, height: originalHeight },
      croppedDimensions: { width: croppedWidth, height: croppedHeight },
      cropRegion,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Crop operation failed after ${processingTime}ms:`, error);

    throw new Error(
      `Crop failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Resize an image
 */
export async function resizeImage(options: ResizeOptions): Promise<ResizeResult> {
  const startTime = Date.now();

  try {
    // Load input image
    const { image, originalFormat } = await loadJimpImage(options.inputImage);
    const originalWidth = image.width;
    const originalHeight = image.height;

    logger.info(`Resizing image: ${originalWidth}x${originalHeight}`);

    // Validate resize parameters
    validateResizeParams({
      width: options.width,
      height: options.height,
      scale: options.scale,
      imageWidth: originalWidth,
      imageHeight: originalHeight
    });

    // Calculate target dimensions
    let targetWidth: number;
    let targetHeight: number;

    if (options.scale) {
      // Scale mode
      targetWidth = Math.round(originalWidth * options.scale);
      targetHeight = Math.round(originalHeight * options.scale);
    } else {
      // Dimension mode
      const maintainAspectRatio = options.maintainAspectRatio !== false; // Default to true

      if (maintainAspectRatio) {
        const calculated = calculateAspectRatioDimensions(
          originalWidth,
          originalHeight,
          options.width,
          options.height
        );
        targetWidth = calculated.width;
        targetHeight = calculated.height;
      } else {
        targetWidth = options.width || originalWidth;
        targetHeight = options.height || originalHeight;
      }
    }

    // Get resize algorithm (mode in Jimp v1)
    const mode = getResizeAlgorithm(options.algorithm);

    // Perform resize using Jimp v1 API
    image.resize({ w: targetWidth, h: targetHeight, mode: mode as any });

    const resizedWidth = image.width;
    const resizedHeight = image.height;

    logger.info(
      `Resized to: ${resizedWidth}x${resizedHeight}, algorithm: ${options.algorithm || "bilinear"}`
    );

    // Convert to base64
    const outputFormat = options.outputFormat || originalFormat || "png";
    const resizedImage = await jimpToBase64(image, outputFormat, options.quality);

    const processingTime = Date.now() - startTime;

    return {
      resizedImage,
      format: outputFormat,
      originalDimensions: { width: originalWidth, height: originalHeight },
      resizedDimensions: { width: resizedWidth, height: resizedHeight },
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Resize operation failed after ${processingTime}ms:`, error);

    throw new Error(
      `Resize failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Rotate an image
 */
export async function rotateImage(options: RotateOptions): Promise<RotateResult> {
  const startTime = Date.now();

  try {
    // Load input image
    const { image, originalFormat } = await loadJimpImage(options.inputImage);
    const originalWidth = image.width;
    const originalHeight = image.height;

    logger.info(`Rotating image: ${originalWidth}x${originalHeight}, angle: ${options.angle}`);

    // Validate rotate parameters
    validateRotateParams({ angle: options.angle });

    // Perform rotation using Jimp v1 API
    // Note: Jimp v1 rotates clockwise for positive angles
    image.rotate({ deg: options.angle, mode: true });

    const rotatedWidth = image.width;
    const rotatedHeight = image.height;

    logger.info(`Rotated to: ${rotatedWidth}x${rotatedHeight}`);

    // Convert to base64
    const outputFormat = options.outputFormat || originalFormat || "png";
    const rotatedImage = await jimpToBase64(image, outputFormat, options.quality);

    const processingTime = Date.now() - startTime;

    return {
      rotatedImage,
      format: outputFormat,
      originalDimensions: { width: originalWidth, height: originalHeight },
      rotatedDimensions: { width: rotatedWidth, height: rotatedHeight },
      angle: options.angle,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Rotate operation failed after ${processingTime}ms:`, error);

    throw new Error(
      `Rotate failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Apply a mask to an image
 */
export async function maskImage(options: MaskOptions): Promise<MaskResult> {
  const startTime = Date.now();

  try {
    // Load input image
    const { image: baseImage, originalFormat } = await loadJimpImage(options.inputImage);
    const baseWidth = baseImage.width;
    const baseHeight = baseImage.height;

    logger.info(`Masking image: ${baseWidth}x${baseHeight}`);

    // Validate mask parameters
    validateMaskParams({
      maskImage: options.maskImage,
      x: options.x,
      y: options.y,
      imageWidth: baseWidth,
      imageHeight: baseHeight
    });

    // Load mask image
    const { image: maskImage } = await loadJimpImage(options.maskImage);
    const maskWidth = maskImage.width;
    const maskHeight = maskImage.height;

    logger.info(`Mask image: ${maskWidth}x${maskHeight}`);

    // Apply opacity to mask if specified
    if (options.opacity !== undefined && options.opacity !== 1.0) {
      const opacityValue = Math.max(0, Math.min(1, options.opacity));
      maskImage.opacity(opacityValue);
    }

    // Get blend mode
    const blendMode = getBlendMode(options.blendMode);

    // Composite the mask onto the base image using Jimp v1 API
    const x = options.x || 0;
    const y = options.y || 0;

    baseImage.composite(maskImage, x, y, {
      mode: blendMode as any,
      opacitySource: 1.0,
      opacityDest: 1.0
    });

    const resultWidth = baseImage.width;
    const resultHeight = baseImage.height;

    logger.info(
      `Mask applied at position (${x}, ${y}), blend mode: ${options.blendMode || "source_over"}`
    );

    // Convert to base64
    const outputFormat = options.outputFormat || originalFormat || "png";
    const maskedImage = await jimpToBase64(baseImage, outputFormat, options.quality);

    const processingTime = Date.now() - startTime;

    return {
      maskedImage,
      format: outputFormat,
      dimensions: { width: resultWidth, height: resultHeight },
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Mask operation failed after ${processingTime}ms:`, error);

    throw new Error(
      `Mask failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
