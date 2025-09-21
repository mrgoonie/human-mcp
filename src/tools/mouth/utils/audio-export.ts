import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";

export interface AudioExportOptions {
  audioData: string;
  format: "wav" | "mp3" | "ogg";
  filename?: string;
  quality?: "low" | "medium" | "high";
}

export interface AudioExportResult {
  exportedData: string;
  format: string;
  filename: string;
  size: number;
  metadata: {
    timestamp: string;
    originalFormat: string;
    exportFormat: string;
    quality?: string;
  };
}

/**
 * Export audio data to different formats
 * Note: This is a basic implementation. For production use, consider using
 * libraries like ffmpeg-fluent for more robust audio format conversion.
 */
export async function exportAudio(options: AudioExportOptions): Promise<AudioExportResult> {
  const startTime = Date.now();

  try {
    const {
      audioData,
      format,
      filename = `speech_${Date.now()}`,
      quality = "medium"
    } = options;

    logger.debug(`Exporting audio to ${format} format with ${quality} quality`);

    // Validate input
    if (!audioData) {
      throw new APIError("Audio data is required for export");
    }

    // Extract base64 data if it's a data URI
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [, data] = audioData.split(',');
      if (!data) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;
    }

    // For now, we primarily work with WAV format from Gemini
    // Future implementations could add format conversion
    let exportedData = base64Data;
    let exportFormat = format;

    // Handle different export formats
    switch (format) {
      case "wav":
        // No conversion needed for WAV
        exportedData = base64Data;
        exportFormat = "wav";
        break;

      case "mp3":
        // TODO: Implement WAV to MP3 conversion using ffmpeg
        logger.warn("MP3 export not yet implemented, returning WAV");
        exportedData = base64Data;
        exportFormat = "wav";
        break;

      case "ogg":
        // TODO: Implement WAV to OGG conversion using ffmpeg
        logger.warn("OGG export not yet implemented, returning WAV");
        exportedData = base64Data;
        exportFormat = "wav";
        break;

      default:
        throw new APIError(`Unsupported export format: ${format}`);
    }

    // Calculate size (approximate)
    const sizeBytes = Math.floor((exportedData.length * 3) / 4); // Base64 to bytes approximation

    // Generate filename with extension
    const finalFilename = `${filename}.${exportFormat}`;

    const result: AudioExportResult = {
      exportedData: `data:audio/${exportFormat};base64,${exportedData}`,
      format: exportFormat,
      filename: finalFilename,
      size: sizeBytes,
      metadata: {
        timestamp: new Date().toISOString(),
        originalFormat: "wav",
        exportFormat,
        quality
      }
    };

    const exportTime = Date.now() - startTime;
    logger.info(`Audio export completed in ${exportTime}ms (${finalFilename}, ${sizeBytes} bytes)`);

    return result;

  } catch (error) {
    const exportTime = Date.now() - startTime;
    logger.error(`Audio export failed after ${exportTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Audio export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save audio to file system (for future use)
 */
export async function saveAudioToFile(
  audioData: string,
  filePath: string
): Promise<{ success: boolean; filePath: string; size: number }> {
  try {
    // Extract base64 data
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [, data] = audioData.split(',');
      if (!data) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, audioBuffer);

    logger.info(`Audio saved to: ${filePath} (${audioBuffer.length} bytes)`);

    return {
      success: true,
      filePath,
      size: audioBuffer.length
    };

  } catch (error) {
    logger.error(`Failed to save audio to file:`, error);
    throw new APIError(`Failed to save audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get audio file information
 */
export async function getAudioInfo(audioData: string): Promise<{
  format: string;
  size: number;
  duration?: number;
  sampleRate?: number;
  channels?: number;
}> {
  try {
    // Extract base64 data
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [header, data] = audioData.split(',');
      if (!data || !header) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;

      // Extract format from header
      const formatMatch = header.match(/audio\/(\w+)/);
      const format = formatMatch?.[1] || 'wav';

      const sizeBytes = Math.floor((base64Data.length * 3) / 4);

      // Basic WAV file analysis (simplified)
      if (format === 'wav') {
        return {
          format,
          size: sizeBytes,
          sampleRate: 24000, // Gemini default
          channels: 1, // Gemini default (mono)
          duration: undefined // Would need audio parsing library to calculate
        };
      }

      return {
        format,
        size: sizeBytes
      };
    }

    // If no header, assume raw base64
    const sizeBytes = Math.floor((base64Data.length * 3) / 4);
    return {
      format: 'unknown',
      size: sizeBytes
    };

  } catch (error) {
    logger.error('Failed to get audio info:', error);
    throw new APIError(`Failed to analyze audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate audio data format
 */
export function validateAudioData(audioData: string): boolean {
  try {
    if (!audioData || typeof audioData !== 'string') {
      return false;
    }

    // Check if it's a data URI
    if (audioData.startsWith('data:audio/')) {
      const [header, data] = audioData.split(',');
      return !!(header && data && data.length > 0);
    }

    // Check if it's raw base64
    if (audioData.length > 0 && audioData.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      return true;
    }

    return false;

  } catch (error) {
    logger.debug('Audio validation error:', error);
    return false;
  }
}

/**
 * Create download-ready blob URL (for browser environments)
 */
export function createBlobUrl(audioData: string, mimeType: string = 'audio/wav'): string {
  try {
    // Extract base64 data
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [, data] = audioData.split(',');
      if (!data) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;
    }

    // This would work in browser environments
    // For Node.js, this is just a placeholder
    logger.info(`Would create blob URL for ${mimeType} audio data`);

    // Return a placeholder URL
    return `blob:audio/${Date.now()}`;

  } catch (error) {
    logger.error('Failed to create blob URL:', error);
    throw new APIError(`Failed to create blob URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}