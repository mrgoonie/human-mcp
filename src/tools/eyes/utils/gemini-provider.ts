import { GenerativeModel } from "@google/generative-ai";

/**
 * Provider interface for Gemini API
 * Abstracts Google AI Studio and Vertex AI implementations
 */
export interface IGeminiProvider {
  /**
   * Get a generative model for text/multimodal tasks
   */
  getGenerativeModel(params: {
    model: string;
    safetySettings?: any[];
    generationConfig?: any;
    systemInstruction?: any;
  }): GenerativeModel;

  /**
   * Get provider type
   */
  getProviderType(): "google-ai-studio" | "vertex-ai";

  /**
   * Get provider display name for logging
   */
  getProviderName(): string;
}
