import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { SpeechGenerationResult } from "../schemas.js";

export interface SpeechOptions {
  text: string;
  voice?: string;
  model?: string;
  language?: string;
  outputFormat?: string;
  stylePrompt?: string;
  fetchTimeout?: number;
}

/**
 * Generate speech from text using Gemini Speech Generation API
 */
export async function generateSpeech(
  geminiClient: GeminiClient,
  options: SpeechOptions
): Promise<SpeechGenerationResult> {
  const startTime = Date.now();

  try {
    const {
      text,
      voice = "Zephyr",
      model = "gemini-2.5-flash-preview-tts",
      language = "en-US",
      outputFormat = "base64",
      stylePrompt,
      fetchTimeout = 60000
    } = options;

    logger.info(`Generating speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" with voice: ${voice}`);

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new APIError("Text is required for speech generation");
    }

    if (text.length > 32000) {
      throw new APIError("Text too long. Maximum 32,000 characters allowed for speech generation");
    }

    // Generate speech using extended GeminiClient
    const speechResult = await geminiClient.generateSpeechWithRetry(text, {
      voice,
      model,
      language,
      stylePrompt
    });

    const generationTime = Date.now() - startTime;

    // Process audio data based on output format
    let processedAudioData = speechResult.audioData;

    if (outputFormat === "url") {
      // TODO: Implement URL upload to cloud storage
      // For now, return base64 with note
      logger.warn("URL output format not yet implemented, returning base64");
      processedAudioData = `data:audio/wav;base64,${speechResult.audioData}`;
    } else if (outputFormat === "wav") {
      // Return raw base64 for WAV format
      processedAudioData = speechResult.audioData;
    } else {
      // Default to base64 data URI
      processedAudioData = `data:audio/wav;base64,${speechResult.audioData}`;
    }

    const result: SpeechGenerationResult = {
      audioData: processedAudioData,
      format: outputFormat === "wav" ? "wav" : "base64",
      model,
      voice,
      language,
      generationTime,
      metadata: {
        timestamp: new Date().toISOString(),
        textLength: text.length,
        sampleRate: 24000,
        channels: 1,
        ...speechResult.metadata
      }
    };

    logger.info(`Speech generation completed in ${generationTime}ms`);
    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Speech generation failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}