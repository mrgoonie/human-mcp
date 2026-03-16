/**
 * Minimax Speech 2.6 Provider
 * Text-to-speech via Minimax T2A v2 endpoint
 */
import { MinimaxClient } from "@/utils/minimax-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";
import type { SpeechGenerationResult } from "../schemas.js";
import { createAudioStorage } from "../utils/audio-storage.js";

export interface MinimaxSpeechOptions {
  text: string;
  voice?: string;
  model?: string;
  language?: string;
  emotion?: string;
  speed?: number;
  config: Config;
}

const DEFAULT_MINIMAX_VOICE = "English_Graceful_Lady";
const DEFAULT_MINIMAX_MODEL = process.env.MINIMAX_SPEECH_MODEL || "speech-2.6-hd";

export async function generateMinimaxSpeech(
  options: MinimaxSpeechOptions
): Promise<SpeechGenerationResult> {
  const startTime = Date.now();

  const {
    text,
    voice = DEFAULT_MINIMAX_VOICE,
    model = DEFAULT_MINIMAX_MODEL,
    language = "auto",
    emotion,
    speed = 1.0,
    config,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new APIError("Text is required for speech generation");
  }
  if (text.length > 10000) {
    throw new APIError("Text too long for Minimax. Maximum 10,000 characters.");
  }

  const client = new MinimaxClient(config);

  const body: Record<string, unknown> = {
    model,
    text,
    stream: false,
    output_format: "url",
    language_boost: language,
    voice_setting: {
      voice_id: voice,
      speed,
      vol: 1.0,
      pitch: 0,
      ...(emotion && { emotion }),
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
  };

  logger.info(
    `Minimax TTS: "${text.substring(0, 50)}..." voice=${voice} model=${model}`
  );

  const response = await client.post("/v1/t2a_v2", body, 60000);

  const audioUrl = (response.data as any)?.audio;
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new APIError("Minimax TTS returned no audio data");
  }

  const audioBuffer = await client.downloadBuffer(audioUrl, 120000);
  const audioBase64 = audioBuffer.toString("base64");

  const audioStorage = createAudioStorage(config);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `minimax-speech_${voice}_${timestamp}.mp3`;

  const storageResult = await audioStorage.storeAudio({
    audioData: audioBase64,
    filename,
    voice,
    language,
    text,
    format: "mp3",
  });

  const generationTime = Date.now() - startTime;

  const result: SpeechGenerationResult = {
    audioData: storageResult.cloudUrl || storageResult.localPath || audioUrl,
    format: "mp3",
    model,
    voice,
    language,
    generationTime,
    localPath: storageResult.localPath,
    cloudUrl: storageResult.cloudUrl,
    filename: storageResult.filename,
    fileSize: storageResult.size,
    storage: storageResult.storage,
    metadata: {
      timestamp: storageResult.metadata.timestamp,
      textLength: text.length,
      sampleRate: 32000,
      channels: 1,
      voice,
      language,
      textPreview: text.substring(0, 100),
      format: "mp3",
    },
  };

  logger.info(
    `Minimax TTS completed in ${generationTime}ms. File: ${storageResult.localPath || "N/A"}`
  );

  return result;
}
