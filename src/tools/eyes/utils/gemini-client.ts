import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type { Config } from "@/utils/config";
import { logger } from "@/utils/logger";
import { APIError } from "@/utils/errors";

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  
  constructor(private config: Config) {
    if (!config.gemini.apiKey) {
      throw new APIError("Google Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  
  getModel(detailLevel: "quick" | "detailed"): GenerativeModel {
    const modelName = detailLevel === "detailed" 
      ? this.config.gemini.model
      : "gemini-2.5-flash";
    
    return this.genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }
  
  async analyzeContent(
    model: GenerativeModel,
    prompt: string,
    mediaData: Array<{ mimeType: string; data: string }>
  ): Promise<string> {
    try {
      logger.debug(`Analyzing content with ${mediaData.length} media files`);
      
      const parts = [
        { text: prompt },
        ...mediaData.map(media => ({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data
          }
        }))
      ];
      
      // Add timeout wrapper
      const analysisPromise = model.generateContent(parts);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new APIError("Gemini API request timed out")), this.config.server.requestTimeout);
      });
      
      const result = await Promise.race([analysisPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new APIError("No response from Gemini API");
      }
      
      return text;
    } catch (error) {
      logger.error("Gemini API error:", error);
      if (error instanceof Error) {
        throw new APIError(`Gemini API error: ${error.message}`);
      }
      throw new APIError("Unknown Gemini API error");
    }
  }
}