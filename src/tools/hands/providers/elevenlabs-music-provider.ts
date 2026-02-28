/**
 * ElevenLabs Music Generation Provider
 * Full song composition from text prompts
 */
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export interface ElevenLabsMusicOptions {
  prompt: string;
  music_length_ms?: number;
  force_instrumental?: boolean;
  config: Config;
}

export interface ElevenLabsMusicResult {
  audioUrl: string;
  format: string;
  model: string;
  duration: number;
  generationTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export async function generateElevenLabsMusic(
  options: ElevenLabsMusicOptions
): Promise<ElevenLabsMusicResult> {
  const startTime = Date.now();

  const {
    prompt,
    music_length_ms = 30000,
    force_instrumental = false,
    config,
  } = options;

  if (!prompt || prompt.trim().length === 0) {
    throw new APIError("Prompt is required for music generation");
  }

  if (music_length_ms < 3000 || music_length_ms > 600000) {
    throw new APIError("music_length_ms must be between 3000 (3s) and 600000 (10min)");
  }

  const client = new ElevenLabsClient(config);

  const body: Record<string, unknown> = {
    prompt,
    music_length_ms,
    model_id: "music_v1",
    force_instrumental,
  };

  logger.info(
    `ElevenLabs Music: "${prompt.substring(0, 60)}..." length=${music_length_ms}ms instrumental=${force_instrumental}`
  );

  // 5 min timeout for long tracks
  const audioBuffer = await client.postBinary(
    "/v1/music",
    body,
    { output_format: "mp3_44100_128" },
    300000
  );

  const audioBase64 = audioBuffer.toString("base64");

  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const savedFile = await saveBase64ToFile(audioBase64, "audio/mpeg", config, {
      prefix: "elevenlabs-music",
      uploadToR2: !!(config.cloudflare?.accessKey),
    });
    filePath = savedFile.filePath;
    fileName = savedFile.fileName;
    fileUrl = savedFile.url;
    fileSize = savedFile.size;
    logger.info(`Music saved: ${filePath}`);
  } catch (error) {
    logger.warn(`Failed to save music file: ${error}`);
  }

  const generationTime = Date.now() - startTime;
  const durationSec = music_length_ms / 1000;

  return {
    audioUrl: fileUrl || filePath || "Music generated (no file path)",
    format: "mp3",
    model: "music_v1",
    duration: durationSec,
    generationTime,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}
