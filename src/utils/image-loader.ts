import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { logger } from "@/utils/logger.js";
import { ProcessingError } from "@/utils/errors.js";
import { getCloudflareR2 } from "@/utils/cloudflare-r2.js";

// Security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'];

/**
 * Centralized image loading utility that handles multiple input formats:
 * - File paths (absolute or relative)
 * - URLs (http/https)
 * - Base64 data URIs
 * - Raw base64 strings
 *
 * Automatically converts images to base64 format suitable for Gemini API
 */
export async function loadImageForProcessing(
  source: string,
  options?: {
    fetchTimeout?: number;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<{ data: string; mimeType: string }> {
  const {
    fetchTimeout = 30000,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 85
  } = options || {};

  try {
    // Handle Claude Code virtual image references
    if (source.match(/^\[Image #\d+\]$/)) {
      throw new ProcessingError(
        `Virtual image reference "${source}" cannot be processed directly.\n\n` +
        `Solutions:\n` +
        `1. Use a direct file path (e.g., "/path/to/image.png")\n` +
        `2. Use a public URL (e.g., "https://example.com/image.png")\n` +
        `3. Convert to base64 data URI format`
      );
    }

    // Handle Claude Desktop virtual paths - auto-upload to Cloudflare
    if (source.startsWith('/mnt/user-data/') || source.startsWith('/mnt/')) {
      logger.info(`Detected Claude Desktop virtual path: ${source}`);
      const filename = source.split('/').pop() || 'upload.jpg';
      const tempPath = `/tmp/mcp-uploads/${filename}`;

      try {
        if (await fs.access(tempPath).then(() => true).catch(() => false)) {
          const buffer = await fs.readFile(tempPath);
          const cloudflare = getCloudflareR2();

          if (cloudflare) {
            const publicUrl = await cloudflare.uploadFile(buffer, filename);
            await fs.unlink(tempPath).catch(() => {});
            return loadImageForProcessing(publicUrl, options);
          }
        }
      } catch (error) {
        logger.warn(`Could not process temp file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      throw new ProcessingError(
        `Local file access not supported via HTTP transport.\n` +
        `Solutions:\n` +
        `1. Upload to Cloudflare R2 using /mcp/upload endpoint\n` +
        `2. Use a public URL\n` +
        `3. Convert to base64 data URI\n` +
        `4. Use stdio transport for local file access`
      );
    }

    // Handle base64 data URI format (data:image/png;base64,...)
    if (source.startsWith('data:image/')) {
      const [header, data] = source.split(',');
      if (!header || !data) {
        throw new ProcessingError("Invalid base64 data URI format");
      }

      const mimeMatch = header.match(/data:(image\/[^;]+)/);
      if (!mimeMatch || !mimeMatch[1]) {
        throw new ProcessingError("Invalid MIME type in data URI");
      }

      // For large base64 images in HTTP transport, optionally upload to Cloudflare R2
      const cloudflare = getCloudflareR2();
      if (process.env.TRANSPORT_TYPE === 'http' && cloudflare && data.length > 1024 * 1024) {
        logger.info('Large base64 image detected, uploading to Cloudflare R2');
        try {
          const publicUrl = await cloudflare.uploadBase64(data, mimeMatch[1]);
          return loadImageForProcessing(publicUrl, options);
        } catch (error) {
          logger.warn('Failed to upload to Cloudflare R2:', error);
          // Continue with base64 processing
        }
      }

      return {
        data,
        mimeType: mimeMatch[1]
      };
    }

    // Handle HTTP/HTTPS URLs
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

      try {
        logger.debug(`Fetching image from URL: ${source.substring(0, 100)}...`);
        const response = await fetch(source, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ProcessingError(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // Process and optimize image
        const processedImage = await sharp(uint8Array)
          .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality })
          .toBuffer();

        return {
          data: processedImage.toString('base64'),
          mimeType: 'image/jpeg'
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ProcessingError(`Fetch timeout: Failed to download image from ${source}`);
        }
        throw new ProcessingError(`Failed to fetch image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Handle local file paths
    // Try to read as file path (could be absolute or relative)
    try {
      // Validate file path security
      validateFilePath(source);

      // Validate file size
      await validateFileSize(source);

      logger.debug(`Loading local image file: ${source}`);

      // If using HTTP transport, upload to Cloudflare R2 if configured
      const cloudflare = getCloudflareR2();
      if (process.env.TRANSPORT_TYPE === 'http' && cloudflare) {
        logger.info(`HTTP transport detected, uploading local file to Cloudflare R2: ${source}`);
        try {
          const buffer = await fs.readFile(source);
          const filename = source.split('/').pop() || 'upload.jpg';
          const publicUrl = await cloudflare.uploadFile(buffer, filename);

          // Fetch from CDN
          return loadImageForProcessing(publicUrl, options);
        } catch (error) {
          logger.warn(`Failed to upload to Cloudflare R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with local file processing
        }
      }

      // For stdio transport or when Cloudflare is not configured, process locally
      const buffer = await fs.readFile(source);
      const processedImage = await sharp(buffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();

      return {
        data: processedImage.toString('base64'),
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // File not found - maybe it's raw base64?
        logger.debug('File not found, attempting to parse as raw base64');

        // Try to process as raw base64 string
        try {
          // Validate if it's valid base64
          if (!/^[A-Za-z0-9+/=]+$/.test(source.substring(0, 100))) {
            throw new Error('Not valid base64');
          }

          // Assume JPEG if no mime type specified
          return {
            data: source,
            mimeType: 'image/jpeg'
          };
        } catch {
          throw new ProcessingError(
            `Failed to load image from source: ${source.substring(0, 50)}...\n` +
            `Source must be a valid file path, URL, or base64 data URI.`
          );
        }
      }
      throw new ProcessingError(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    // Re-throw ProcessingError as-is
    if (error instanceof ProcessingError) {
      throw error;
    }
    // Wrap other errors
    throw new ProcessingError(`Image loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates if a file path is safe and within allowed directories
 * Prevents path traversal attacks
 */
function validateFilePath(filePath: string): void {
  // Resolve to absolute path
  const resolvedPath = path.resolve(filePath);

  // Check for null bytes (path traversal attempt)
  if (filePath.includes('\0')) {
    throw new ProcessingError('Invalid file path: null bytes detected');
  }

  // Check file extension
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ProcessingError(
      `Invalid file extension: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // Check if path is within project directory (for relative paths)
  const cwd = process.cwd();
  if (!resolvedPath.startsWith(cwd) && !path.isAbsolute(filePath)) {
    throw new ProcessingError(
      'Invalid file path: relative paths must be within project directory'
    );
  }

  // Additional security check: prevent access to sensitive system files
  const sensitivePatterns = [
    '/etc/',
    '/sys/',
    '/proc/',
    '/dev/',
    '/.ssh/',
    '/.env'
  ];

  for (const pattern of sensitivePatterns) {
    if (resolvedPath.includes(pattern)) {
      throw new ProcessingError('Invalid file path: access to sensitive system files is not allowed');
    }
  }
}

/**
 * Validates file size before loading
 */
async function validateFileSize(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      throw new ProcessingError(`Path is not a file: ${filePath}`);
    }

    if (stats.size > MAX_FILE_SIZE) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);
      throw new ProcessingError(
        `File too large: ${sizeMB}MB exceeds maximum allowed size of ${maxMB}MB`
      );
    }
  } catch (error) {
    if (error instanceof ProcessingError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new ProcessingError(`File not found: ${filePath}`);
    }
    throw new ProcessingError(`Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates if a string is a valid file path
 */
export function isFilePath(source: string): boolean {
  return (
    (source.startsWith('/') || source.startsWith('./') || source.startsWith('../')) &&
    !source.startsWith('http://') &&
    !source.startsWith('https://') &&
    !source.startsWith('data:')
  );
}

/**
 * Validates if a string is a URL
 */
export function isUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Validates if a string is a base64 data URI
 */
export function isDataUri(source: string): boolean {
  return source.startsWith('data:image/');
}