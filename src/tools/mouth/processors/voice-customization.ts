import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { VoiceCustomizationResult } from "../schemas.js";
import { VoiceNames } from "../schemas.js";

export interface VoiceCustomizationOptions {
  text: string;
  voice: string;
  model?: string;
  language?: string;
  outputFormat?: string;
  styleVariations?: string[];
  compareVoices?: string[];
  fetchTimeout?: number;
}

/**
 * Generate voice customization samples and recommendations
 */
export async function generateVoiceCustomization(
  geminiClient: GeminiClient,
  options: VoiceCustomizationOptions
): Promise<VoiceCustomizationResult> {
  const startTime = Date.now();

  try {
    const {
      text,
      voice,
      model = "gemini-2.5-flash-preview-tts",
      language = "en-US",
      outputFormat = "base64",
      styleVariations = [],
      compareVoices = [],
      fetchTimeout = 60000
    } = options;

    logger.info(`Generating voice customization samples for voice: ${voice} with ${styleVariations.length} style variations`);

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new APIError("Text is required for voice customization");
    }

    if (text.length > 1000) {
      throw new APIError("Text too long for voice customization. Maximum 1000 characters allowed");
    }

    if (!VoiceNames.includes(voice as any)) {
      throw new APIError(`Invalid voice: ${voice}. Must be one of: ${VoiceNames.join(', ')}`);
    }

    // Generate samples array
    const samples: VoiceCustomizationResult['samples'] = [];

    // Generate base sample with the main voice
    const baseSample = await generateVoiceSample(geminiClient, text, voice, undefined, model, language, outputFormat);
    samples.push(baseSample);

    // Generate samples with style variations
    for (const stylePrompt of styleVariations) {
      try {
        const styleSample = await generateVoiceSample(geminiClient, text, voice, stylePrompt, model, language, outputFormat);
        samples.push(styleSample);
      } catch (error) {
        logger.warn(`Failed to generate sample with style "${stylePrompt}":`, error);
        // Continue with other samples
      }
    }

    // Generate samples with comparison voices
    for (const compareVoice of compareVoices) {
      if (VoiceNames.includes(compareVoice as any) && compareVoice !== voice) {
        try {
          const compareSample = await generateVoiceSample(geminiClient, text, compareVoice, undefined, model, language, outputFormat);
          samples.push(compareSample);
        } catch (error) {
          logger.warn(`Failed to generate sample with voice "${compareVoice}":`, error);
          // Continue with other samples
        }
      }
    }

    // Generate recommendation
    const recommendation = await generateRecommendation(geminiClient, text, voice, styleVariations, compareVoices, samples);

    const result: VoiceCustomizationResult = {
      samples,
      recommendation,
      metadata: {
        timestamp: new Date().toISOString(),
        testText: text,
        totalSamples: samples.length
      }
    };

    const generationTime = Date.now() - startTime;
    logger.info(`Voice customization completed in ${generationTime}ms with ${samples.length} samples`);

    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Voice customization failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Voice customization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a single voice sample
 */
async function generateVoiceSample(
  geminiClient: GeminiClient,
  text: string,
  voice: string,
  stylePrompt: string | undefined,
  model: string,
  language: string,
  outputFormat: string
): Promise<VoiceCustomizationResult['samples'][0]> {
  const sampleStartTime = Date.now();

  try {
    const speechResult = await geminiClient.generateSpeechWithRetry(text, {
      voice,
      model,
      language,
      stylePrompt
    });

    // Process audio data
    let audioData = speechResult.audioData;

    if (outputFormat === "url") {
      // TODO: Implement URL upload to cloud storage
      logger.warn("URL output format not yet implemented, returning base64");
      audioData = `data:audio/wav;base64,${speechResult.audioData}`;
    } else if (outputFormat === "wav") {
      // Keep raw base64 for WAV format
      audioData = speechResult.audioData;
    } else {
      // Default to base64 data URI
      audioData = `data:audio/wav;base64,${speechResult.audioData}`;
    }

    const generationTime = Date.now() - sampleStartTime;

    return {
      voice,
      stylePrompt,
      audioData,
      metadata: {
        generationTime,
        audioLength: undefined // Could be calculated from audio data if needed
      }
    };

  } catch (error) {
    logger.error(`Failed to generate voice sample for ${voice}:`, error);
    throw new APIError(`Failed to generate voice sample: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate recommendation based on samples
 */
async function generateRecommendation(
  geminiClient: GeminiClient,
  text: string,
  primaryVoice: string,
  styleVariations: string[],
  compareVoices: string[],
  samples: VoiceCustomizationResult['samples']
): Promise<VoiceCustomizationResult['recommendation']> {
  try {
    const model = geminiClient.getModel("detailed");

    // Create analysis prompt
    const analysisPrompt = `Analyze the voice customization request and provide a recommendation in JSON format.

Test Text: "${text}"
Primary Voice: ${primaryVoice}
Style Variations Tested: ${styleVariations.length > 0 ? styleVariations.join(', ') : 'None'}
Comparison Voices: ${compareVoices.length > 0 ? compareVoices.join(', ') : 'None'}
Total Samples Generated: ${samples.length}

Based on the test text content and voice characteristics, provide a recommendation in this JSON format:
{
  "bestVoice": "recommended voice name",
  "bestStyle": "recommended style prompt or null",
  "reasoning": "explanation of why this combination is recommended for the given text"
}

Consider:
- Content type and tone of the test text
- Appropriateness of voice characteristics for the content
- Style variations that enhance the message
- Overall clarity and engagement

The recommendation should be practical and focused on the best user experience for this type of content.`;

    const response = await model.generateContent(analysisPrompt);
    const recommendationText = response.response.text();

    // Try to parse JSON response
    try {
      const recommendation = JSON.parse(recommendationText);
      return {
        bestVoice: recommendation.bestVoice || primaryVoice,
        bestStyle: recommendation.bestStyle || undefined,
        reasoning: recommendation.reasoning || "Based on voice characteristics and content analysis"
      };
    } catch (parseError) {
      logger.warn("Failed to parse recommendation JSON, using fallback");
      return {
        bestVoice: primaryVoice,
        bestStyle: styleVariations.length > 0 ? styleVariations[0] : undefined,
        reasoning: "Unable to generate detailed analysis. Primary voice recommended as fallback."
      };
    }

  } catch (error) {
    logger.error("Failed to generate recommendation:", error);
    return {
      bestVoice: primaryVoice,
      bestStyle: styleVariations.length > 0 ? styleVariations[0] : undefined,
      reasoning: "Unable to generate recommendation due to analysis error. Using primary voice as default."
    };
  }
}

/**
 * Get voice characteristics for better recommendations
 */
function getVoiceCharacteristics(voice: string): { description: string; suitableFor: string[] } {
  // Voice characteristics based on Gemini documentation
  const characteristics: Record<string, { description: string; suitableFor: string[] }> = {
    "Zephyr": { description: "Bright and energetic", suitableFor: ["presentations", "marketing", "announcements"] },
    "Puck": { description: "Upbeat and playful", suitableFor: ["entertainment", "children's content", "casual narration"] },
    "Charon": { description: "Informative and clear", suitableFor: ["educational content", "tutorials", "explanations"] },
    "Sage": { description: "Wise and authoritative", suitableFor: ["documentaries", "serious content", "professional narration"] },
    "Apollo": { description: "Articulate and sophisticated", suitableFor: ["technical content", "academic material", "formal presentations"] },
    "Kore": { description: "Warm and approachable", suitableFor: ["customer service", "friendly explanations", "conversational content"] },
    "Vox": { description: "Strong and commanding", suitableFor: ["announcements", "important messages", "authoritative content"] },
    "Odin": { description: "Deep and resonant", suitableFor: ["storytelling", "dramatic content", "narrative voice-overs"] },
    "Fenrir": { description: "Bold and dynamic", suitableFor: ["action content", "sports commentary", "energetic presentations"] },
    "Astrid": { description: "Clear and professional", suitableFor: ["business content", "reports", "formal communication"] }
  };

  return characteristics[voice] || {
    description: "Versatile voice",
    suitableFor: ["general content", "various applications"]
  };
}