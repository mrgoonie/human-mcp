import { Jimp, JimpMime } from "jimp";
import { logger } from "@/utils/logger.js";

export interface LoadedImage {
  image: InstanceType<typeof Jimp>;
  mimeType: string;
  originalFormat: string;
}

/**
 * Load image from various sources (file path, URL, base64)
 */
export async function loadJimpImage(source: string): Promise<LoadedImage> {
  try {
    let image: InstanceType<typeof Jimp>;
    let mimeType = "image/png";
    let originalFormat = "png";

    // Handle base64 data URI
    if (source.startsWith("data:")) {
      const matches = source.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid base64 data URI format");
      }

      mimeType = matches[1] || "image/png";
      const base64Data = matches[2] || "";
      if (!base64Data) {
        throw new Error("Invalid base64 data in data URI");
      }
      const buffer = Buffer.from(base64Data, "base64");
      image = (await Jimp.fromBuffer(buffer)) as InstanceType<typeof Jimp>;

      // Extract format from MIME type
      originalFormat = mimeType.split("/")[1] || "png";
    }
    // Handle URL (http/https)
    else if (source.startsWith("http://") || source.startsWith("https://")) {
      image = (await Jimp.read(source)) as InstanceType<typeof Jimp>;

      // Try to detect format from URL
      const urlPath = new URL(source).pathname.toLowerCase();
      if (urlPath.endsWith(".jpg") || urlPath.endsWith(".jpeg")) {
        originalFormat = "jpeg";
        mimeType = "image/jpeg";
      } else if (urlPath.endsWith(".png")) {
        originalFormat = "png";
        mimeType = "image/png";
      } else if (urlPath.endsWith(".gif")) {
        originalFormat = "gif";
        mimeType = "image/gif";
      } else if (urlPath.endsWith(".bmp")) {
        originalFormat = "bmp";
        mimeType = "image/bmp";
      }
    }
    // Handle file path
    else {
      image = (await Jimp.read(source)) as InstanceType<typeof Jimp>;

      // Detect format from file extension
      const lowerPath = source.toLowerCase();
      if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
        originalFormat = "jpeg";
        mimeType = "image/jpeg";
      } else if (lowerPath.endsWith(".png")) {
        originalFormat = "png";
        mimeType = "image/png";
      } else if (lowerPath.endsWith(".gif")) {
        originalFormat = "gif";
        mimeType = "image/gif";
      } else if (lowerPath.endsWith(".bmp")) {
        originalFormat = "bmp";
        mimeType = "image/bmp";
      }
    }

    logger.info(
      `Loaded image: ${image.width}x${image.height}, format: ${originalFormat}`
    );

    return {
      image,
      mimeType,
      originalFormat
    };
  } catch (error) {
    logger.error(`Failed to load image from source: ${error}`);
    throw new Error(
      `Failed to load image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert Jimp image to base64 data URI
 */
export async function jimpToBase64(
  image: InstanceType<typeof Jimp>,
  format: string = "png",
  quality?: number
): Promise<string> {
  try {
    // Get MIME type based on format
    let mimeType: string;
    switch (format.toLowerCase()) {
      case "jpeg":
      case "jpg":
        mimeType = JimpMime.jpeg;
        break;
      case "png":
        mimeType = JimpMime.png;
        break;
      case "bmp":
        mimeType = JimpMime.bmp;
        break;
      case "gif":
        mimeType = JimpMime.gif;
        break;
      default:
        mimeType = JimpMime.png;
    }

    // Get buffer with quality option if JPEG
    const options = format === "jpeg" && quality !== undefined ? { quality } : undefined;
    const buffer = await image.getBuffer(mimeType as any, options);

    // Convert to base64 data URI
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    logger.error(`Failed to convert Jimp image to base64: ${error}`);
    throw new Error(
      `Failed to convert image to base64: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert Jimp image to buffer
 */
export async function jimpToBuffer(
  image: InstanceType<typeof Jimp>,
  format: string = "png",
  quality?: number
): Promise<Buffer> {
  try {
    // Get MIME type based on format
    let mimeType: string;
    switch (format.toLowerCase()) {
      case "jpeg":
      case "jpg":
        mimeType = JimpMime.jpeg;
        break;
      case "png":
        mimeType = JimpMime.png;
        break;
      case "bmp":
        mimeType = JimpMime.bmp;
        break;
      case "gif":
        mimeType = JimpMime.gif;
        break;
      default:
        mimeType = JimpMime.png;
    }

    // Get buffer with quality option if JPEG
    const options = format === "jpeg" && quality !== undefined ? { quality } : undefined;
    const buffer = await image.getBuffer(mimeType as any, options);

    return buffer;
  } catch (error) {
    logger.error(`Failed to convert Jimp image to buffer: ${error}`);
    throw new Error(
      `Failed to convert image to buffer: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Parse resize algorithm from string
 * In Jimp v1, resize mode is passed as a string option
 */
export function getResizeAlgorithm(algorithm?: string): string {
  if (!algorithm) {
    return "bilinearInterpolation";
  }

  const normalizedAlgorithm = algorithm.toLowerCase();

  switch (normalizedAlgorithm) {
    case "nearestneighbor":
    case "nearest_neighbor":
      return "nearestNeighbor";
    case "bilinear":
      return "bilinearInterpolation";
    case "bicubic":
      return "bicubicInterpolation";
    case "hermite":
      return "hermiteInterpolation";
    case "bezier":
      return "bezierInterpolation";
    default:
      logger.warn(`Unknown resize algorithm: ${algorithm}, using bilinear`);
      return "bilinearInterpolation";
  }
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
export function calculateAspectRatioDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number
): { width: number; height: number } {
  if (targetWidth && targetHeight) {
    return { width: targetWidth, height: targetHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (targetWidth) {
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio)
    };
  }

  if (targetHeight) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight
    };
  }

  return { width: originalWidth, height: originalHeight };
}

/**
 * Parse blend mode from string
 * In Jimp v1, blend mode values must match the exact BlendMode enum values
 * See: https://jimp-dev.github.io/jimp/api/jimp/enumerations/blendmode/
 */
export function getBlendMode(mode?: string): string {
  if (!mode) {
    return "srcOver";
  }

  const normalizedMode = mode.toLowerCase().replace(/[_-]/g, "");

  switch (normalizedMode) {
    case "sourceover":
    case "normal":
    case "srcover":
      return "srcOver";
    case "destinationover":
    case "dstover":
      return "dstOver";
    case "multiply":
      return "multiply";
    case "add":
      return "add";
    case "screen":
      return "screen";
    case "overlay":
      return "overlay";
    case "darken":
      return "darken";
    case "lighten":
      return "lighten";
    case "hardlight":
      return "hardLight";
    case "difference":
      return "difference";
    case "exclusion":
      return "exclusion";
    default:
      logger.warn(`Unknown blend mode: ${mode}, using srcOver`);
      return "srcOver";
  }
}
