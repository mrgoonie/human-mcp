/**
 * Minimax Music 2.5 Provider
 * Full-length song generation from lyrics and style prompts
 */
import { MinimaxClient } from "@/utils/minimax-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
import type { MusicGenerationResult } from "../schemas.js";

export interface MinimaxMusicOptions {
  lyrics: string;
  prompt?: string;
  model?: string;
  audioFormat?: string;
  sampleRate?: number;
  bitrate?: number;
  config: Config;
}

export async function generateMinimaxMusic(
  options: MinimaxMusicOptions
): Promise<MusicGenerationResult> {
  const startTime = Date.now();

  const {
    lyrics,
    prompt,
    model = "music-2.5",
    audioFormat = "mp3",
    sampleRate = 44100,
    bitrate = 256000,
    config,
  } = options;

  if (!lyrics || lyrics.trim().length === 0) {
    throw new APIError("Lyrics are required for music generation");
  }

  const client = new MinimaxClient(config);

  const body: Record<string, unknown> = {
    model,
    lyrics,
    output_format: "url",
    audio_setting: {
      sample_rate: sampleRate,
      bitrate,
      format: audioFormat,
    },
  };

  if (prompt) {
    body.prompt = prompt;
  }

  logger.info(
    `Minimax Music: model=${model} lyrics=${lyrics.length}chars prompt="${(prompt || "").substring(0, 50)}"`
  );

  // 5 min timeout for music generation
  const response = await client.post("/v1/music_generation", body, 300000);

  const audioUrl = (response.data as any)?.audio;
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new APIError("Minimax Music returned no audio data");
  }

  const duration = (response.extra_info as any)?.music_duration ?? 0;

  // Download audio
  const audioBuffer = await client.downloadBuffer(audioUrl, 120000);
  const audioBase64 = audioBuffer.toString("base64");

  // Save to file
  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const mimeType = audioFormat === "wav" ? "audio/wav" : "audio/mpeg";
    const savedFile = await saveBase64ToFile(audioBase64, mimeType, config, {
      prefix: "minimax-music",
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

  return {
    audioUrl: fileUrl || filePath || audioUrl,
    format: audioFormat,
    model,
    duration,
    generationTime,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}
