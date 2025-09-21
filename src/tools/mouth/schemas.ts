import { z } from "zod";

// Available voice names from Gemini Speech Generation API
export const VoiceNames = [
  "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
  "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
  "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
  "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
] as const;

// Supported languages from Gemini Speech Generation API
export const SupportedLanguages = [
  "en-US", "en-IN", "es-ES", "es-MX", "fr-FR", "de-DE", "it-IT", "pt-BR",
  "pt-PT", "ru-RU", "ja-JP", "ko-KR", "zh-CN", "zh-TW", "ar-SA", "hi-IN",
  "tr-TR", "pl-PL", "nl-NL", "sv-SE", "da-DK", "no-NO", "fi-FI", "hu-HU"
] as const;

// Speech generation models
export const SpeechModels = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts"
] as const;

// Audio output formats
export const AudioFormats = [
  "wav",
  "base64",
  "url"
] as const;

// Base speech generation input schema
export const SpeechInputSchema = z.object({
  text: z.string().min(1).max(32000).describe("Text to convert to speech (max 32k tokens)"),
  voice: z.enum(VoiceNames).optional().default("Zephyr").describe("Voice to use for speech generation"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  style_prompt: z.string().optional().describe("Natural language prompt to control speaking style")
});

// Narration input schema for long-form content
export const NarrationInputSchema = z.object({
  content: z.string().min(1).describe("Long-form content to narrate"),
  voice: z.enum(VoiceNames).optional().default("Sage").describe("Voice to use for narration"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for narration"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  narration_style: z.enum(["professional", "casual", "educational", "storytelling"]).optional().default("professional").describe("Narration style"),
  chapter_breaks: z.boolean().optional().default(false).describe("Add pauses between chapters/sections"),
  max_chunk_size: z.number().optional().default(8000).describe("Maximum characters per audio chunk")
});

// Code explanation input schema
export const CodeExplanationInputSchema = z.object({
  code: z.string().min(1).describe("Code to explain"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for explanation"),
  programming_language: z.string().optional().describe("Programming language of the code"),
  voice: z.enum(VoiceNames).optional().default("Apollo").describe("Voice to use for explanation"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  explanation_level: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate").describe("Technical level of explanation"),
  include_examples: z.boolean().optional().default(true).describe("Include examples in explanation")
});

// Voice customization input schema
export const VoiceCustomizationInputSchema = z.object({
  text: z.string().min(1).max(1000).describe("Sample text to test voice customization"),
  voice: z.enum(VoiceNames).describe("Base voice to customize"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  style_variations: z.array(z.string()).optional().describe("Array of different style prompts to test"),
  compare_voices: z.array(z.enum(VoiceNames)).optional().describe("Additional voices to compare with the main voice")
});

// Type exports
export type SpeechInput = z.infer<typeof SpeechInputSchema>;
export type NarrationInput = z.infer<typeof NarrationInputSchema>;
export type CodeExplanationInput = z.infer<typeof CodeExplanationInputSchema>;
export type VoiceCustomizationInput = z.infer<typeof VoiceCustomizationInputSchema>;

// Speech generation response types
export interface SpeechGenerationResult {
  audioData: string;
  format: string;
  model: string;
  voice: string;
  language: string;
  generationTime: number;
  metadata: {
    timestamp: string;
    textLength: number;
    audioLength?: number;
    sampleRate: number;
    channels: number;
  };
}

export interface NarrationResult {
  chunks: SpeechGenerationResult[];
  totalDuration: number;
  chapterBreaks: number[];
  metadata: {
    timestamp: string;
    totalTextLength: number;
    totalChunks: number;
    narrationStyle: string;
  };
}

export interface CodeExplanationResult {
  explanation: SpeechGenerationResult;
  codeAnalysis: {
    programmingLanguage: string;
    complexity: string;
    keyPoints: string[];
    examples: string[];
  };
  metadata: {
    timestamp: string;
    explanationLevel: string;
    codeLength: number;
  };
}

export interface VoiceCustomizationResult {
  samples: {
    voice: string;
    stylePrompt?: string;
    audioData: string;
    metadata: {
      generationTime: number;
      audioLength?: number;
    };
  }[];
  recommendation: {
    bestVoice: string;
    bestStyle?: string;
    reasoning: string;
  };
  metadata: {
    timestamp: string;
    testText: string;
    totalSamples: number;
  };
}