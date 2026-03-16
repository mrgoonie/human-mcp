/**
 * ElevenLabs Sound Effects Provider
 * Text-to-sound-effects via ElevenLabs Sound Generation API
 */
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export interface ElevenLabsSfxOptions {
  text: string;
  duration_seconds?: number;
  prompt_influence?: number;
  loop?: boolean;
  config: Config;
}

export interface SfxGenerationResult {
  audioUrl: string;
  format: string;
  model: string;
  duration?: number;
  generationTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export async function generateElevenLabsSfx(
  options: ElevenLabsSfxOptions
): Promise<SfxGenerationResult> {
  const startTime = Date.now();

  const {
    text,
    duration_seconds,
    prompt_influence = 0.3,
    loop = false,
    config,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new APIError("Text prompt is required for SFX generation");
  }

  const client = new ElevenLabsClient(config);

  const body: Record<string, unknown> = {
    text,
    model_id: config.elevenlabs?.sfxModel || "eleven_text_to_sound_v2",
    prompt_influence,
    loop,
  };
  if (duration_seconds !== undefined) {
    body.duration_seconds = duration_seconds;
  }

  logger.info(
    `ElevenLabs SFX: "${text.substring(0, 60)}..." duration=${duration_seconds ?? "auto"} loop=${loop}`
  );

  const audioBuffer = await client.postBinary(
    "/v1/sound-generation",
    body,
    { output_format: "mp3_44100_128" },
    60000
  );

  const audioBase64 = audioBuffer.toString("base64");

  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const savedFile = await saveBase64ToFile(audioBase64, "audio/mpeg", config, {
      prefix: "elevenlabs-sfx",
      uploadToR2: !!(config.cloudflare?.accessKey),
    });
    filePath = savedFile.filePath;
    fileName = savedFile.fileName;
    fileUrl = savedFile.url;
    fileSize = savedFile.size;
    logger.info(`SFX saved: ${filePath}`);
  } catch (error) {
    logger.warn(`Failed to save SFX file: ${error}`);
  }

  const generationTime = Date.now() - startTime;

  return {
    audioUrl: fileUrl || filePath || "SFX generated (no file path)",
    format: "mp3",
    model: "eleven_text_to_sound_v2",
    duration: duration_seconds,
    generationTime,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}
