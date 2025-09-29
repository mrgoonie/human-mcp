import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../eyes/utils/gemini-client.js";
import {
  SpeechInputSchema,
  NarrationInputSchema,
  CodeExplanationInputSchema,
  VoiceCustomizationInputSchema,
  SupportedLanguages,
  type SpeechInput,
  type NarrationInput,
  type CodeExplanationInput,
  type VoiceCustomizationInput
} from "./schemas.js";
import { generateSpeech } from "./processors/speech-synthesis.js";
import { generateNarration } from "./processors/narration.js";
import { generateCodeExplanation } from "./processors/code-explanation.js";
import { generateVoiceCustomization } from "./processors/voice-customization.js";
import { exportAudio } from "./utils/audio-export.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

export async function registerMouthTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  // Register mouth_speak tool
  server.registerTool(
    "mouth_speak",
    {
      title: "Text-to-Speech Generation",
      description: "Generate speech from text using Gemini Speech Generation API with voice customization",
      inputSchema: {
        text: z.string().min(1).max(32000).describe("Text to convert to speech (max 32k tokens)"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).optional().default("Zephyr").describe("Voice to use for speech generation"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        style_prompt: z.string().optional().describe("Natural language prompt to control speaking style")
      }
    },
    async (args) => {
      try {
        return await handleSpeech(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_speak error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register mouth_narrate tool
  server.registerTool(
    "mouth_narrate",
    {
      title: "Long-form Content Narration",
      description: "Generate narration for long-form content with chapter breaks and style control",
      inputSchema: {
        content: z.string().min(1).describe("Long-form content to narrate"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).optional().default("Sage").describe("Voice to use for narration"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for narration"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        narration_style: z.enum(["professional", "casual", "educational", "storytelling"]).optional().default("professional").describe("Narration style"),
        chapter_breaks: z.boolean().optional().default(false).describe("Add pauses between chapters/sections"),
        max_chunk_size: z.number().optional().default(8000).describe("Maximum characters per audio chunk")
      }
    },
    async (args) => {
      try {
        return await handleNarration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_narrate error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register mouth_explain tool
  server.registerTool(
    "mouth_explain",
    {
      title: "Code Explanation with Speech",
      description: "Generate spoken explanations of code with technical analysis",
      inputSchema: {
        code: z.string().min(1).describe("Code to explain"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for explanation"),
        programming_language: z.string().optional().describe("Programming language of the code"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).optional().default("Apollo").describe("Voice to use for explanation"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        explanation_level: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate").describe("Technical level of explanation"),
        include_examples: z.boolean().optional().default(true).describe("Include examples in explanation")
      }
    },
    async (args) => {
      try {
        return await handleCodeExplanation(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_explain error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register mouth_customize tool
  server.registerTool(
    "mouth_customize",
    {
      title: "Voice Customization and Testing",
      description: "Test different voices and styles to find the best fit for your content",
      inputSchema: {
        text: z.string().min(1).max(1000).describe("Sample text to test voice customization"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).describe("Base voice to customize"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        style_variations: z.array(z.string()).optional().describe("Array of different style prompts to test"),
        compare_voices: z.array(z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ])).optional().describe("Additional voices to compare with the main voice")
      }
    },
    async (args) => {
      try {
        return await handleVoiceCustomization(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_customize error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );
}

async function handleSpeech(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = SpeechInputSchema.parse(args) as SpeechInput;

  logger.info(`Generating speech for text: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateSpeech(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          audio: result.audioData.startsWith('data:') ?
            `Audio generated (${Math.round(result.audioData.length / 1000)}KB base64 data)` :
            result.audioData,
          format: result.format,
          voice: result.voice,
          language: result.language,
          model: result.model,
          filename: result.filename,
          localPath: result.localPath,
          cloudUrl: result.cloudUrl,
          fileSize: result.fileSize,
          storage: result.storage,
          metadata: result.metadata,
          note: result.localPath ? `Audio automatically saved to: ${result.localPath}${result.cloudUrl ? ` and uploaded to: ${result.cloudUrl}` : ''}` : "Audio generation completed"
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleNarration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = NarrationInputSchema.parse(args) as NarrationInput;

  logger.info(`Generating narration for ${input.content.length} characters`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateNarration(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          chunks: result.chunks.map(chunk => ({
            audio: chunk.audioData.startsWith('data:') ?
              `Audio chunk (${Math.round(chunk.audioData.length / 1000)}KB base64 data)` :
              chunk.audioData,
            format: chunk.format,
            metadata: chunk.metadata
          })),
          totalDuration: result.totalDuration,
          chapterBreaks: result.chapterBreaks,
          metadata: result.metadata,
          note: "Consider implementing file saving to reduce token usage"
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleCodeExplanation(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = CodeExplanationInputSchema.parse(args) as CodeExplanationInput;

  logger.info(`Generating code explanation for ${input.code.length} characters of ${input.programming_language || 'code'}`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateCodeExplanation(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          explanation: {
            audio: result.explanation.audioData.startsWith('data:') ?
              `Audio explanation (${Math.round(result.explanation.audioData.length / 1000)}KB base64 data)` :
              result.explanation.audioData,
            format: result.explanation.format,
            metadata: result.explanation.metadata
          },
          codeAnalysis: result.codeAnalysis,
          metadata: result.metadata,
          note: "Consider implementing file saving to reduce token usage"
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleVoiceCustomization(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = VoiceCustomizationInputSchema.parse(args) as VoiceCustomizationInput;

  logger.info(`Generating voice customization samples for voice: ${input.voice}`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateVoiceCustomization(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          samples: result.samples.map(sample => ({
            voice: sample.voice,
            stylePrompt: sample.stylePrompt,
            audio: sample.audioData.startsWith('data:') ?
              `Voice sample (${Math.round(sample.audioData.length / 1000)}KB base64 data)` :
              sample.audioData,
            metadata: sample.metadata
          })),
          recommendation: result.recommendation,
          metadata: result.metadata,
          note: "Consider implementing file saving to reduce token usage"
        }, null, 2)
      }
    ],
    isError: false
  };
}