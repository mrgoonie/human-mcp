import { Jimp } from "jimp";
import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
import {
  loadJimpImage,
  jimpToBase64,
  getResizeAlgorithm,
  calculateAspectRatioDimensions
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
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
  saveDirectory?: string;
}

export interface CropResult {
  croppedImage: string;
  format: string;
  originalDimensions: { width: number; height: number };
  croppedDimensions: { width: number; height: number };
  cropRegion: { x: number; y: number; width: number; height: number };
  processingTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
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
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
  saveDirectory?: string;
}

export interface ResizeResult {
  resizedImage: string;
  format: string;
  originalDimensions: { width: number; height: number };
  resizedDimensions: { width: number; height: number };
  processingTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface RotateOptions {
  inputImage: string;
  angle: number;
  backgroundColor?: string;
  outputFormat?: "png" | "jpeg" | "bmp";
  quality?: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
  saveDirectory?: string;
}

export interface RotateResult {
  rotatedImage: string;
  format: string;
  originalDimensions: { width: number; height: number };
  rotatedDimensions: { width: number; height: number };
  angle: number;
  processingTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface MaskOptions {
  inputImage: string;
  maskImage: string;
  outputFormat?: "png" | "jpeg" | "bmp";
  quality?: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
  saveDirectory?: string;
}

export interface MaskResult {
  maskedImage: string;
  format: string;
  dimensions: { width: number; height: number };
  processingTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

/**
 * Crop an image using various modes
 */
export async function cropImage(options: CropOptions, config?: Config): Promise<CropResult> {
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

    // Save file and upload to R2 if configured
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const base64Match = croppedImage.match(/base64,(.+)/);
        const base64Data = base64Match?.[1] ?? croppedImage.replace(/^data:image\/[^;]+;base64,/, '');
        const mimeType = `image/${outputFormat}`;

        const savedFile = await saveBase64ToFile(
          base64Data,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'jimp-crop',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Cropped image saved to: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to save cropped image: ${error}. Returning base64 only.`);
      }
    }

    return {
      croppedImage,
      format: outputFormat,
      originalDimensions: { width: originalWidth, height: originalHeight },
      croppedDimensions: { width: croppedWidth, height: croppedHeight },
      cropRegion,
      processingTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
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
export async function resizeImage(options: ResizeOptions, config?: Config): Promise<ResizeResult> {
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

    // Save file and upload to R2 if configured
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const base64Match = resizedImage.match(/base64,(.+)/);
        const base64Data = base64Match?.[1] ?? resizedImage.replace(/^data:image\/[^;]+;base64,/, '');
        const mimeType = `image/${outputFormat}`;

        const savedFile = await saveBase64ToFile(
          base64Data,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'jimp-resize',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Resized image saved to: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to save resized image: ${error}. Returning base64 only.`);
      }
    }

    return {
      resizedImage,
      format: outputFormat,
      originalDimensions: { width: originalWidth, height: originalHeight },
      resizedDimensions: { width: resizedWidth, height: resizedHeight },
      processingTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
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
export async function rotateImage(options: RotateOptions, config?: Config): Promise<RotateResult> {
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

    // Save file and upload to R2 if configured
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const base64Match = rotatedImage.match(/base64,(.+)/);
        const base64Data = base64Match?.[1] ?? rotatedImage.replace(/^data:image\/[^;]+;base64,/, '');
        const mimeType = `image/${outputFormat}`;

        const savedFile = await saveBase64ToFile(
          base64Data,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'jimp-rotate',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Rotated image saved to: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to save rotated image: ${error}. Returning base64 only.`);
      }
    }

    return {
      rotatedImage,
      format: outputFormat,
      originalDimensions: { width: originalWidth, height: originalHeight },
      rotatedDimensions: { width: rotatedWidth, height: rotatedHeight },
      angle: options.angle,
      processingTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
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
 * Apply a grayscale alpha mask to an image using Jimp's .mask() method
 *
 * The mask uses the average pixel color (grayscale value) to determine transparency:
 * - Black pixels (0, 0, 0) in mask = fully transparent in result
 * - White pixels (255, 255, 255) in mask = fully opaque in result
 * - Gray pixels (e.g., 128, 128, 128) = partial transparency
 *
 * For colored masks, Jimp converts them to grayscale using the average of R, G, B values.
 *
 * Important: The mask image will be automatically resized to match the base image dimensions
 * if they don't match. This ensures compatibility with Jimp's .mask() API requirements.
 *
 * @param options - Mask operation options
 * @param config - Application configuration (for file saving and R2 upload)
 * @returns MaskResult with processed image data and file information
 */
export async function maskImage(options: MaskOptions, config?: Config): Promise<MaskResult> {
  const startTime = Date.now();

  try {
    // Load input image
    const { image: baseImage, originalFormat } = await loadJimpImage(options.inputImage);
    const baseWidth = baseImage.width;
    const baseHeight = baseImage.height;

    logger.info(`Applying mask to image: ${baseWidth}x${baseHeight}`);

    // Validate mask parameters
    validateMaskParams({
      maskImage: options.maskImage,
      imageWidth: baseWidth,
      imageHeight: baseHeight
    });

    // Load mask image
    const { image: maskImage } = await loadJimpImage(options.maskImage);
    const maskWidth = maskImage.width;
    const maskHeight = maskImage.height;

    logger.info(`Mask dimensions: ${maskWidth}x${maskHeight}`);

    // Validate and resize mask if dimensions don't match
    // Jimp's .mask() requires mask to be the same size as the base image
    if (maskWidth !== baseWidth || maskHeight !== baseHeight) {
      logger.warn(
        `Mask size (${maskWidth}x${maskHeight}) doesn't match base image (${baseWidth}x${baseHeight}), resizing mask...`
      );
      maskImage.resize({ w: baseWidth, h: baseHeight });
      logger.info(`Mask resized to ${baseWidth}x${baseHeight}`);
    }

    // Apply the mask using Jimp's .mask() method
    // The mask uses average pixel color (grayscale): black = transparent, white = opaque
    baseImage.mask(maskImage);

    const resultWidth = baseImage.width;
    const resultHeight = baseImage.height;

    logger.info(
      `Mask applied successfully`
    );

    // Convert to base64
    const outputFormat = options.outputFormat || originalFormat || "png";
    const maskedImage = await jimpToBase64(baseImage, outputFormat, options.quality);

    const processingTime = Date.now() - startTime;

    // Save file and upload to R2 if configured
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const base64Match = maskedImage.match(/base64,(.+)/);
        const base64Data = base64Match?.[1] ?? maskedImage.replace(/^data:image\/[^;]+;base64,/, '');
        const mimeType = `image/${outputFormat}`;

        const savedFile = await saveBase64ToFile(
          base64Data,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'jimp-mask',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Masked image saved to: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to save masked image: ${error}. Returning base64 only.`);
      }
    }

    return {
      maskedImage,
      format: outputFormat,
      dimensions: { width: resultWidth, height: resultHeight },
      processingTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Mask operation failed after ${processingTime}ms:`, error);

    throw new Error(
      `Mask failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
