import { logger } from "@/utils/logger.js";

/**
 * Validate crop parameters
 */
export function validateCropParams(params: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  imageWidth: number;
  imageHeight: number;
}): void {
  const { x = 0, y = 0, width, height, imageWidth, imageHeight } = params;

  if (x < 0 || y < 0) {
    throw new Error("Crop coordinates (x, y) must be non-negative");
  }

  if (width && width <= 0) {
    throw new Error("Crop width must be positive");
  }

  if (height && height <= 0) {
    throw new Error("Crop height must be positive");
  }

  if (width && x + width > imageWidth) {
    throw new Error(
      `Crop region (x: ${x}, width: ${width}) exceeds image width (${imageWidth})`
    );
  }

  if (height && y + height > imageHeight) {
    throw new Error(
      `Crop region (y: ${y}, height: ${height}) exceeds image height (${imageHeight})`
    );
  }
}

/**
 * Validate resize parameters
 */
export function validateResizeParams(params: {
  width?: number;
  height?: number;
  scale?: number;
  imageWidth: number;
  imageHeight: number;
}): void {
  const { width, height, scale, imageWidth, imageHeight } = params;

  // Must have either width/height or scale
  if (!width && !height && !scale) {
    throw new Error(
      "Must provide either width, height, or scale for resize operation"
    );
  }

  // Cannot have both dimensions and scale
  if (scale && (width || height)) {
    throw new Error("Cannot specify both scale and dimensions (width/height)");
  }

  if (width && width <= 0) {
    throw new Error("Resize width must be positive");
  }

  if (height && height <= 0) {
    throw new Error("Resize height must be positive");
  }

  if (scale && scale <= 0) {
    throw new Error("Resize scale must be positive");
  }

  // Warn about very large dimensions
  const maxDimension = 8192; // Reasonable limit for most use cases
  if (width && width > maxDimension) {
    logger.warn(
      `Resize width (${width}) exceeds recommended maximum (${maxDimension})`
    );
  }

  if (height && height > maxDimension) {
    logger.warn(
      `Resize height (${height}) exceeds recommended maximum (${maxDimension})`
    );
  }

  if (scale) {
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;

    if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
      logger.warn(
        `Scaled dimensions (${scaledWidth}x${scaledHeight}) exceed recommended maximum (${maxDimension})`
      );
    }
  }
}

/**
 * Validate rotate parameters
 */
export function validateRotateParams(params: { angle: number }): void {
  const { angle } = params;

  if (angle === undefined || angle === null) {
    throw new Error("Rotation angle is required");
  }

  // Normalize angle to -360 to 360 range
  const normalizedAngle = ((angle % 360) + 360) % 360;

  // Warn about non-90-degree rotations (slower, may have quality loss)
  if (normalizedAngle % 90 !== 0) {
    logger.info(
      `Rotating by ${angle} degrees (non-90 degree rotation may be slower and have slight quality loss)`
    );
  }
}

/**
 * Validate mask parameters
 */
export function validateMaskParams(params: {
  maskImage: string;
  x?: number;
  y?: number;
  imageWidth: number;
  imageHeight: number;
}): void {
  const { maskImage, x = 0, y = 0, imageWidth, imageHeight } = params;

  if (!maskImage) {
    throw new Error("Mask image is required for masking operation");
  }

  if (x < 0 || y < 0) {
    throw new Error("Mask coordinates (x, y) must be non-negative");
  }

  // Note: We can't validate mask dimensions here since we haven't loaded it yet
  // That will be done in the processor
}

/**
 * Calculate crop region from mode
 */
export function calculateCropRegion(
  mode: string,
  imageWidth: number,
  imageHeight: number,
  width?: number,
  height?: number,
  aspectRatio?: string
): { x: number; y: number; width: number; height: number } {
  let cropWidth = width || imageWidth;
  let cropHeight = height || imageHeight;

  // Handle aspect ratio
  if (aspectRatio) {
    const [ratioWidth, ratioHeight] = aspectRatio.split(":").map(Number);
    if (!ratioWidth || !ratioHeight || ratioWidth <= 0 || ratioHeight <= 0) {
      throw new Error(
        `Invalid aspect ratio format: ${aspectRatio}. Use format like "16:9" or "4:3"`
      );
    }

    const targetRatio = ratioWidth / ratioHeight;

    // If width is specified, calculate height
    if (width) {
      cropWidth = width;
      cropHeight = Math.round(width / targetRatio);
    }
    // If height is specified, calculate width
    else if (height) {
      cropHeight = height;
      cropWidth = Math.round(height * targetRatio);
    }
    // If neither is specified, fit to image
    else {
      const imageRatio = imageWidth / imageHeight;
      if (imageRatio > targetRatio) {
        // Image is wider, constrain by height
        cropHeight = imageHeight;
        cropWidth = Math.round(imageHeight * targetRatio);
      } else {
        // Image is taller, constrain by width
        cropWidth = imageWidth;
        cropHeight = Math.round(imageWidth / targetRatio);
      }
    }
  }

  // Ensure crop dimensions don't exceed image dimensions
  cropWidth = Math.min(cropWidth, imageWidth);
  cropHeight = Math.min(cropHeight, imageHeight);

  let x = 0;
  let y = 0;

  // Calculate position based on mode
  switch (mode.toLowerCase()) {
    case "manual":
      // x and y will be provided by the caller
      x = 0;
      y = 0;
      break;

    case "center":
      x = Math.floor((imageWidth - cropWidth) / 2);
      y = Math.floor((imageHeight - cropHeight) / 2);
      break;

    case "top_left":
      x = 0;
      y = 0;
      break;

    case "top_right":
      x = imageWidth - cropWidth;
      y = 0;
      break;

    case "bottom_left":
      x = 0;
      y = imageHeight - cropHeight;
      break;

    case "bottom_right":
      x = imageWidth - cropWidth;
      y = imageHeight - cropHeight;
      break;

    case "aspect_ratio":
      // For aspect ratio mode, default to center
      x = Math.floor((imageWidth - cropWidth) / 2);
      y = Math.floor((imageHeight - cropHeight) / 2);
      break;

    default:
      throw new Error(
        `Unknown crop mode: ${mode}. Supported modes: manual, center, top_left, top_right, bottom_left, bottom_right, aspect_ratio`
      );
  }

  return { x, y, width: cropWidth, height: cropHeight };
}
