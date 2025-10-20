import { VertexAI } from "@google-cloud/vertexai";
import { GenerativeModel } from "@google/generative-ai";
import type { IGeminiProvider } from "../gemini-provider.js";
import { APIError } from "@/utils/errors.js";
import { logger } from "@/utils/logger.js";

/**
 * Vertex AI Provider
 * Uses the @google-cloud/vertexai SDK with GCP authentication (ADC, Service Account, etc.)
 */
export class VertexAIProvider implements IGeminiProvider {
  private vertexAI: VertexAI;

  constructor(projectId: string, location: string = "us-central1", googleAuthOptions?: any) {
    if (!projectId) {
      throw new APIError("Vertex AI project ID is required. Set VERTEX_PROJECT_ID environment variable.");
    }

    try {
      this.vertexAI = new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: googleAuthOptions,
      });
      logger.info(`Initialized Vertex AI provider (project: ${projectId}, location: ${location})`);
    } catch (error) {
      logger.error("Failed to initialize Vertex AI provider:", error);
      throw new APIError(
        `Failed to initialize Vertex AI: ${error instanceof Error ? error.message : "Unknown error"}. ` +
        "Check your VERTEX_PROJECT_ID, authentication, and GCP permissions."
      );
    }
  }

  getGenerativeModel(params: {
    model: string;
    safetySettings?: any[];
    generationConfig?: any;
    systemInstruction?: any;
  }): GenerativeModel {
    return this.vertexAI.getGenerativeModel({
      model: params.model,
      safetySettings: params.safetySettings,
      generationConfig: params.generationConfig,
      systemInstruction: params.systemInstruction,
    }) as unknown as GenerativeModel;
  }

  getProviderType(): "vertex-ai" {
    return "vertex-ai";
  }

  getProviderName(): string {
    return "Vertex AI";
  }
}
