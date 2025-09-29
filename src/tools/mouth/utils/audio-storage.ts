import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";
import { saveAudioToFile } from "./audio-export.js";
import path from "path";
import { fileURLToPath } from "url";
import wav from "wav";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AudioStorageOptions {
  audioData: string;
  filename?: string;
  voice?: string;
  language?: string;
  text?: string;
  format?: string;
}

export interface AudioStorageResult {
  localPath?: string;
  cloudUrl?: string;
  filename: string;
  size: number;
  storage: {
    local: boolean;
    cloud: boolean;
  };
  metadata: {
    timestamp: string;
    voice?: string;
    language?: string;
    textPreview?: string;
    format: string;
  };
}

/**
 * Enhanced audio storage that saves locally by default and uploads to Cloudflare R2 if configured
 */
export class AudioStorage {
  private config: Config;
  private localStoragePath: string;

  constructor(config: Config) {
    this.config = config;
    // Create a local storage directory in the project root
    this.localStoragePath = path.resolve(process.cwd(), 'audio-outputs');
  }

  /**
   * Convert raw PCM data to proper WAV format
   */
  private async convertPcmToWav(pcmData: Buffer, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writer = new wav.FileWriter(filePath, {
        channels: 1,          // Mono audio
        sampleRate: 24000,    // 24kHz as per Gemini TTS spec
        bitDepth: 16,         // 16-bit PCM
      });

      writer.on('finish', resolve);
      writer.on('error', reject);

      // Write the PCM data to create a proper WAV file
      writer.write(pcmData);
      writer.end();
    });
  }

  /**
   * Store audio with automatic local saving and optional cloud upload
   */
  async storeAudio(options: AudioStorageOptions): Promise<AudioStorageResult> {
    const startTime = Date.now();

    try {
      const {
        audioData,
        filename,
        voice,
        language,
        text,
        format = "wav"
      } = options;

      logger.debug(`Storing audio: ${filename || 'auto-generated'}`);

      // Validate audio data
      if (!audioData) {
        throw new APIError("Audio data is required for storage");
      }

      // Generate filename if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFilename = filename || `speech_${timestamp}.${format}`;

      // Ensure storage directory exists
      await this.ensureStorageDirectory();

      const result: AudioStorageResult = {
        filename: finalFilename,
        size: 0,
        storage: {
          local: false,
          cloud: false
        },
        metadata: {
          timestamp: new Date().toISOString(),
          voice,
          language,
          textPreview: text ? text.substring(0, 100) + (text.length > 100 ? '...' : '') : undefined,
          format
        }
      };

      // Calculate audio size
      let base64Data = audioData;
      if (audioData.startsWith('data:')) {
        const [, data] = audioData.split(',');
        if (!data) {
          throw new APIError("Invalid audio data format");
        }
        base64Data = data;
      }
      result.size = Math.floor((base64Data.length * 3) / 4);

      // Always save locally first - convert PCM to proper WAV
      try {
        const localPath = path.join(this.localStoragePath, finalFilename);

        // Convert base64 to buffer (raw PCM data from Gemini)
        const pcmBuffer = Buffer.from(base64Data, 'base64');

        // Convert PCM to proper WAV format
        await this.convertPcmToWav(pcmBuffer, localPath);

        result.localPath = localPath;
        result.storage.local = true;
        logger.info(`Audio saved locally as WAV: ${localPath}`);
      } catch (error) {
        logger.warn(`Failed to save audio locally:`, error);
        // Continue with cloud upload even if local save fails
      }

      // Upload to Cloudflare R2 if configured
      if (this.isCloudflareConfigured()) {
        try {
          const cloudUrl = await this.uploadToCloudflare(audioData, finalFilename);
          result.cloudUrl = cloudUrl;
          result.storage.cloud = true;
          logger.info(`Audio uploaded to cloud: ${cloudUrl}`);
        } catch (error) {
          logger.warn(`Failed to upload audio to cloud:`, error);
          // Continue - local storage might still be available
        }
      }

      // Ensure at least one storage method succeeded
      if (!result.storage.local && !result.storage.cloud) {
        throw new APIError("Failed to store audio in any location");
      }

      const storageTime = Date.now() - startTime;
      logger.info(`Audio storage completed in ${storageTime}ms (${finalFilename}, ${result.size} bytes)`);

      return result;

    } catch (error) {
      const storageTime = Date.now() - startTime;
      logger.error(`Audio storage failed after ${storageTime}ms:`, error);

      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(`Audio storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensure the local storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      const fs = await import('fs/promises');

      try {
        await fs.access(this.localStoragePath);
      } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(this.localStoragePath, { recursive: true });
        logger.info(`Created audio storage directory: ${this.localStoragePath}`);
      }
    } catch (error) {
      logger.error(`Failed to ensure storage directory:`, error);
      throw new APIError(`Failed to create storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Cloudflare R2 is configured
   */
  private isCloudflareConfigured(): boolean {
    const cf = this.config.cloudflare;
    return !!(
      cf?.accessKey &&
      cf?.secretKey &&
      cf?.bucketName &&
      cf?.endpointUrl
    );
  }

  /**
   * Upload audio to Cloudflare R2
   */
  private async uploadToCloudflare(audioData: string, filename: string): Promise<string> {
    try {
      const cf = this.config.cloudflare;
      if (!cf || !this.isCloudflareConfigured()) {
        throw new APIError("Cloudflare R2 is not properly configured");
      }

      // Import AWS SDK for S3-compatible operations
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

      // Extract base64 data
      let base64Data = audioData;
      if (audioData.startsWith('data:')) {
        const [, data] = audioData.split(',');
        if (!data) {
          throw new APIError("Invalid audio data format");
        }
        base64Data = data;
      }

      // Convert to buffer
      const audioBuffer = Buffer.from(base64Data, 'base64');

      // Configure S3 client for Cloudflare R2
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: cf.endpointUrl,
        credentials: {
          accessKeyId: cf.accessKey!,
          secretAccessKey: cf.secretKey!,
        },
      });

      // Create unique key for the audio file
      const key = `audio/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: cf.bucketName!,
        Key: key,
        Body: audioBuffer,
        ContentType: 'audio/wav',
        ContentLength: audioBuffer.length,
        Metadata: {
          'generated-by': 'human-mcp',
          'timestamp': new Date().toISOString(),
        }
      });

      await s3Client.send(command);

      // Generate public URL
      const baseUrl = cf.baseUrl || `https://${cf.bucketName}.${cf.endpointUrl?.replace('https://', '')}`;
      const cloudUrl = `${baseUrl}/${key}`;

      logger.info(`Audio uploaded to Cloudflare R2: ${cloudUrl}`);
      return cloudUrl;

    } catch (error) {
      logger.error(`Cloudflare R2 upload failed:`, error);
      throw new APIError(`Cloud upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old audio files (optional utility)
   */
  async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<{ deletedCount: number; errors: string[] }> {
    try {
      const fs = await import('fs/promises');

      let deletedCount = 0;
      const errors: string[] = [];

      try {
        const files = await fs.readdir(this.localStoragePath);
        const now = Date.now();

        for (const file of files) {
          try {
            const filePath = path.join(this.localStoragePath, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
              await fs.unlink(filePath);
              deletedCount++;
              logger.debug(`Deleted old audio file: ${file}`);
            }
          } catch (error) {
            const errorMsg = `Failed to delete ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logger.warn(errorMsg);
          }
        }
      } catch (error) {
        errors.push(`Failed to read storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      logger.info(`Cleanup completed: ${deletedCount} files deleted, ${errors.length} errors`);
      return { deletedCount, errors };

    } catch (error) {
      logger.error(`Cleanup failed:`, error);
      throw new APIError(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    localPath: string;
    localFiles: number;
    totalSize: number;
    oldestFile?: string;
    newestFile?: string;
    cloudConfigured: boolean;
  }> {
    try {
      const fs = await import('fs/promises');

      const stats = {
        localPath: this.localStoragePath,
        localFiles: 0,
        totalSize: 0,
        oldestFile: undefined as string | undefined,
        newestFile: undefined as string | undefined,
        cloudConfigured: this.isCloudflareConfigured()
      };

      try {
        const files = await fs.readdir(this.localStoragePath);
        let oldestTime = Infinity;
        let newestTime = 0;

        for (const file of files) {
          try {
            const filePath = path.join(this.localStoragePath, file);
            const fileStat = await fs.stat(filePath);

            stats.localFiles++;
            stats.totalSize += fileStat.size;

            if (fileStat.mtime.getTime() < oldestTime) {
              oldestTime = fileStat.mtime.getTime();
              stats.oldestFile = file;
            }

            if (fileStat.mtime.getTime() > newestTime) {
              newestTime = fileStat.mtime.getTime();
              stats.newestFile = file;
            }
          } catch (error) {
            logger.warn(`Failed to stat file ${file}:`, error);
          }
        }
      } catch (error) {
        logger.warn(`Failed to read storage directory:`, error);
      }

      return stats;

    } catch (error) {
      logger.error(`Failed to get storage stats:`, error);
      throw new APIError(`Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create a configured AudioStorage instance
 */
export function createAudioStorage(config: Config): AudioStorage {
  return new AudioStorage(config);
}