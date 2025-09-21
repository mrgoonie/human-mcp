import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { NarrationResult, SpeechGenerationResult } from "../schemas.js";

export interface NarrationOptions {
  content: string;
  voice?: string;
  model?: string;
  language?: string;
  outputFormat?: string;
  narrationStyle?: string;
  chapterBreaks?: boolean;
  maxChunkSize?: number;
  fetchTimeout?: number;
}

/**
 * Generate narration for long-form content
 */
export async function generateNarration(
  geminiClient: GeminiClient,
  options: NarrationOptions
): Promise<NarrationResult> {
  const startTime = Date.now();

  try {
    const {
      content,
      voice = "Sage",
      model = "gemini-2.5-pro-preview-tts",
      language = "en-US",
      outputFormat = "base64",
      narrationStyle = "professional",
      chapterBreaks = false,
      maxChunkSize = 8000,
      fetchTimeout = 60000
    } = options;

    logger.info(`Generating narration for ${content.length} characters with style: ${narrationStyle}`);

    // Validate input
    if (!content || content.trim().length === 0) {
      throw new APIError("Content is required for narration");
    }

    // Create style prompt based on narration style
    const stylePrompt = createNarrationStylePrompt(narrationStyle);

    // Split content into manageable chunks
    const chunks = geminiClient.splitTextForSpeech(content, maxChunkSize);
    logger.debug(`Split content into ${chunks.length} chunks for narration`);

    // Identify chapter breaks if requested
    const chapterBreakIndices: number[] = [];
    if (chapterBreaks) {
      chunks.forEach((chunk, index) => {
        if (isChapterBreak(chunk, index)) {
          chapterBreakIndices.push(index);
        }
      });
      logger.debug(`Identified ${chapterBreakIndices.length} chapter breaks`);
    }

    // Generate speech for all chunks
    const speechChunks = await geminiClient.generateSpeechChunks(chunks, {
      voice,
      model,
      language,
      stylePrompt
    });

    // Process results
    const processedChunks: SpeechGenerationResult[] = speechChunks.map((chunk, index) => {
      let audioData = chunk.audioData;

      if (outputFormat === "url") {
        // TODO: Implement URL upload to cloud storage
        logger.warn("URL output format not yet implemented, returning base64");
        audioData = `data:audio/wav;base64,${chunk.audioData}`;
      } else if (outputFormat === "wav") {
        // Keep raw base64 for WAV format
        audioData = chunk.audioData;
      } else {
        // Default to base64 data URI
        audioData = `data:audio/wav;base64,${chunk.audioData}`;
      }

      return {
        audioData,
        format: outputFormat === "wav" ? "wav" : "base64",
        model,
        voice,
        language,
        generationTime: chunk.metadata?.generationTime || 0,
        metadata: {
          timestamp: chunk.metadata?.timestamp || new Date().toISOString(),
          textLength: chunks[index]?.length || 0,
          sampleRate: 24000,
          channels: 1,
          chunkIndex: index,
          isChapterBreak: chapterBreakIndices.includes(index)
        }
      };
    });

    // Calculate total duration estimate (rough approximation)
    const totalDuration = processedChunks.reduce((total, chunk) => {
      // Estimate 150 words per minute for speech
      const wordCount = chunk.metadata.textLength / 5; // Average 5 characters per word
      const estimatedDuration = (wordCount / 150) * 60; // In seconds
      return total + estimatedDuration;
    }, 0);

    const result: NarrationResult = {
      chunks: processedChunks,
      totalDuration: Math.round(totalDuration),
      chapterBreaks: chapterBreakIndices,
      metadata: {
        timestamp: new Date().toISOString(),
        totalTextLength: content.length,
        totalChunks: processedChunks.length,
        narrationStyle
      }
    };

    const generationTime = Date.now() - startTime;
    logger.info(`Narration generation completed in ${generationTime}ms for ${processedChunks.length} chunks`);

    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Narration generation failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Narration generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create style prompt based on narration style
 */
function createNarrationStylePrompt(style: string): string {
  switch (style) {
    case "professional":
      return "Speak in a clear, professional tone suitable for business presentations or formal content";
    case "casual":
      return "Speak in a relaxed, conversational tone as if talking to a friend";
    case "educational":
      return "Speak in an engaging, instructional tone suitable for learning and education";
    case "storytelling":
      return "Speak with expressive storytelling flair, adding emotion and drama appropriate to the content";
    default:
      return "Speak in a clear, natural voice";
  }
}

/**
 * Determine if a chunk represents a chapter break
 */
function isChapterBreak(chunk: string, index: number): boolean {
  // Simple heuristics for chapter breaks
  const chapterIndicators = [
    /^Chapter\s+\d+/i,
    /^Section\s+\d+/i,
    /^Part\s+\d+/i,
    /^\d+\.\s+/,
    /^# /,
    /^## /
  ];

  return chapterIndicators.some(pattern => pattern.test(chunk.trim()));
}

/**
 * Add pause between chapters if needed
 */
function addChapterPause(audioData: string, isChapterBreak: boolean): string {
  if (!isChapterBreak) {
    return audioData;
  }

  // TODO: Implement audio pause insertion
  // For now, just return the original audio
  // Future implementation could add silence or fade effects
  return audioData;
}