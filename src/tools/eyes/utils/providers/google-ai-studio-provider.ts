import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type { IGeminiProvider } from "../gemini-provider.js";
import { APIError } from "@/utils/errors.js";
import { logger } from "@/utils/logger.js";

/**
 * Google AI Studio Provider
 * Uses the @google/generative-ai SDK with API key authentication
 */
export class GoogleAIStudioProvider implements IGeminiProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new APIError("Google Gemini API key is required for Google AI Studio provider");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    logger.info("Initialized Google AI Studio provider");
  }

  getGenerativeModel(params: {
    model: string;
    safetySettings?: any[];
    generationConfig?: any;
    systemInstruction?: any;
  }): GenerativeModel {
    return this.genAI.getGenerativeModel({
      model: params.model,
      safetySettings: params.safetySettings,
      generationConfig: params.generationConfig,
      systemInstruction: params.systemInstruction,
    });
  }

  getProviderType(): "google-ai-studio" {
    return "google-ai-studio";
  }

  getProviderName(): string {
    return "Google AI Studio";
  }
}
