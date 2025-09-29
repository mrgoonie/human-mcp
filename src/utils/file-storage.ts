import { writeFileSync, mkdirSync } from "fs";
import { join, dirname, extname } from "path";
import { randomUUID } from "crypto";
import { logger } from "./logger.js";
import type { Config } from "./config.js";

export interface SavedFile {
  filePath: string;
  fileName: string;
  url?: string;
  size: number;
  mimeType: string;
}

export interface FileStorageOptions {
  prefix?: string;
  directory?: string;
  generateFileName?: boolean;
  uploadToR2?: boolean;
}

/**
 * Save base64 data to a local file
 */
export async function saveBase64ToFile(
  base64Data: string,
  mimeType: string,
  config: Config,
  options: FileStorageOptions = {}
): Promise<SavedFile> {
  try {
    // Extract base64 content if it's a data URI
    let cleanBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/data:[^;]+;base64,(.+)/);
      if (matches && matches[1]) {
        cleanBase64 = matches[1];
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Determine file extension from MIME type
    const extension = getExtensionFromMimeType(mimeType);

    // Generate filename
    const fileName = options.generateFileName !== false
      ? generateFileName(options.prefix, extension)
      : `generated${extension}`;

    // Determine save directory
    const saveDir = options.directory || process.cwd();
    const filePath = join(saveDir, fileName);

    // Ensure directory exists
    mkdirSync(dirname(filePath), { recursive: true });

    // Save file
    writeFileSync(filePath, buffer);

    logger.info(`Saved image to: ${filePath} (${buffer.length} bytes)`);

    const result: SavedFile = {
      filePath,
      fileName,
      size: buffer.length,
      mimeType
    };

    // Upload to Cloudflare R2 if configured and requested
    if (options.uploadToR2 && isCloudflareR2Configured(config)) {
      try {
        const r2Url = await uploadToCloudflareR2(buffer, fileName, mimeType, config);
        result.url = r2Url;
        logger.info(`Uploaded to Cloudflare R2: ${r2Url}`);
      } catch (error) {
        logger.warn(`Failed to upload to R2, but file saved locally: ${error}`);
      }
    }

    return result;

  } catch (error) {
    logger.error('Failed to save base64 data to file:', error);
    throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a unique filename with timestamp and UUID
 */
function generateFileName(prefix?: string, extension: string = '.jpg'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uuid = randomUUID().substring(0, 8);
  const prefixPart = prefix ? `${prefix}-` : '';
  return `${prefixPart}${timestamp}-${uuid}${extension}`;
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/mov': '.mov',
    'video/avi': '.avi'
  };

  return extensions[mimeType.toLowerCase()] || '.jpg';
}

/**
 * Check if Cloudflare R2 is properly configured
 */
function isCloudflareR2Configured(config: Config): boolean {
  const cf = config.cloudflare;
  return !!(cf?.accessKey && cf.secretKey && cf.endpointUrl && cf.bucketName);
}

/**
 * Upload file to Cloudflare R2
 */
async function uploadToCloudflareR2(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  config: Config
): Promise<string> {
  const cf = config.cloudflare;
  if (!cf || !isCloudflareR2Configured(config)) {
    throw new Error('Cloudflare R2 is not properly configured');
  }

  try {
    // Use AWS SDK v3 compatible S3 client for R2
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: cf.endpointUrl,
      credentials: {
        accessKeyId: cf.accessKey!,
        secretAccessKey: cf.secretKey!,
      },
      forcePathStyle: true,
    });

    const key = `generated/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: cf.bucketName!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    await s3Client.send(command);

    // Construct public URL
    const baseUrl = cf.baseUrl || `https://${cf.bucketName}.${cf.endpointUrl?.replace('https://', '')}`;
    return `${baseUrl}/${key}`;

  } catch (error) {
    logger.error('Failed to upload to Cloudflare R2:', error);
    throw new Error(`R2 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}