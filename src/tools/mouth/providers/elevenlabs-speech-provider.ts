/**
 * ElevenLabs Speech Provider
 * Text-to-speech via ElevenLabs TTS API
 */
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";
import type { SpeechGenerationResult } from "../schemas.js";
import { createAudioStorage } from "../utils/audio-storage.js";

export interface ElevenLabsSpeechOptions {
  text: string;
  voice_id?: string;
  model?: string;
  language_code?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  config: Config;
}

/** Default voice: Rachel */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL = "eleven_multilingual_v2";

/**
 * Curated voice name -> ID mapping for convenience.
 * Users can also pass raw voice IDs directly.
 */
export const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  adam: "pNInz6obpgDQGcFmaJgB",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  brian: "nPczCjzI2devNBz1zQrb",
  charlotte: "XB0fDUnXU5powFXDhCwa",
  george: "JBFqnCBsd6RMkjVDRZzb",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  daniel: "onwK4e9ZLuTAKqWW03F9",
};

/** Resolve voice name to ID. Accepts raw IDs or curated names. */
function resolveVoiceId(voiceInput?: string): string {
  if (!voiceInput) return DEFAULT_VOICE_ID;
  const mapped = ELEVENLABS_VOICE_MAP[voiceInput.toLowerCase()];
  return mapped || voiceInput;
}

export async function generateElevenLabsSpeech(
  options: ElevenLabsSpeechOptions
): Promise<SpeechGenerationResult> {
  const startTime = Date.now();

  const {
    text,
    voice_id,
    model = DEFAULT_MODEL,
    language_code,
    stability = 0.5,
    similarity_boost = 0.75,
    style = 0.0,
    speed = 1.0,
    config,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new APIError("Text is required for speech generation");
  }
  if (text.length > 10000) {
    throw new APIError("Text too long for ElevenLabs. Max 10,000 chars (multilingual_v2).");
  }

  const resolvedVoiceId = resolveVoiceId(voice_id);
  const client = new ElevenLabsClient(config);

  const body: Record<string, unknown> = {
    text,
    model_id: model,
    voice_settings: { stability, similarity_boost, style, speed },
  };
  if (language_code) {
    body.language_code = language_code;
  }

  logger.info(
    `ElevenLabs TTS: "${text.substring(0, 50)}..." voice=${resolvedVoiceId} model=${model}`
  );

  const audioBuffer = await client.postBinary(
    `/v1/text-to-speech/${resolvedVoiceId}`,
    body,
    { output_format: "mp3_44100_128" },
    60000
  );

  const audioBase64 = audioBuffer.toString("base64");

  const audioStorage = createAudioStorage(config);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `elevenlabs-speech_${resolvedVoiceId.substring(0, 8)}_${timestamp}.mp3`;

  const storageResult = await audioStorage.storeAudio({
    audioData: audioBase64,
    filename,
    voice: voice_id || "rachel",
    language: language_code || "en",
    text,
    format: "mp3",
  });

  const generationTime = Date.now() - startTime;

  const result: SpeechGenerationResult = {
    audioData: storageResult.cloudUrl || storageResult.localPath || `data:audio/mpeg;base64,${audioBase64}`,
    format: "mp3",
    model,
    voice: voice_id || "rachel",
    language: language_code || "en",
    generationTime,
    localPath: storageResult.localPath,
    cloudUrl: storageResult.cloudUrl,
    filename: storageResult.filename,
    fileSize: storageResult.size,
    storage: storageResult.storage,
    metadata: {
      timestamp: storageResult.metadata.timestamp,
      textLength: text.length,
      sampleRate: 44100,
      channels: 1,
      voice: voice_id || "rachel",
      language: language_code || "en",
      textPreview: text.substring(0, 100),
      format: "mp3",
    },
  };

  logger.info(
    `ElevenLabs TTS completed in ${generationTime}ms. File: ${storageResult.localPath || "N/A"}`
  );

  return result;
}
