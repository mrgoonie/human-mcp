import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { CodeExplanationResult, SpeechGenerationResult } from "../schemas.js";

export interface CodeExplanationOptions {
  code: string;
  language?: string;
  programmingLanguage?: string;
  voice?: string;
  model?: string;
  outputFormat?: string;
  explanationLevel?: string;
  includeExamples?: boolean;
  fetchTimeout?: number;
}

/**
 * Generate speech explanation of code
 */
export async function generateCodeExplanation(
  geminiClient: GeminiClient,
  options: CodeExplanationOptions
): Promise<CodeExplanationResult> {
  const startTime = Date.now();

  try {
    const {
      code,
      language = "en-US",
      programmingLanguage,
      voice = "Apollo",
      model = "gemini-2.5-pro-preview-tts",
      outputFormat = "base64",
      explanationLevel = "intermediate",
      includeExamples = true,
      fetchTimeout = 60000
    } = options;

    logger.info(`Generating code explanation for ${code.length} characters of ${programmingLanguage || 'code'}`);

    // Validate input
    if (!code || code.trim().length === 0) {
      throw new APIError("Code is required for explanation");
    }

    // Analyze the code first to create a better explanation
    const codeAnalysis = await analyzeCode(geminiClient, code, programmingLanguage);

    // Generate explanation text
    const explanationText = await generateExplanationText(
      geminiClient,
      code,
      codeAnalysis,
      explanationLevel,
      includeExamples
    );

    // Create style prompt for technical explanation
    const stylePrompt = createTechnicalStylePrompt(explanationLevel);

    // Generate speech for the explanation
    const speechResult = await geminiClient.generateSpeechWithRetry(explanationText, {
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

    const explanation: SpeechGenerationResult = {
      audioData,
      format: outputFormat === "wav" ? "wav" : "base64",
      model,
      voice,
      language,
      generationTime: speechResult.metadata?.generationTime || 0,
      metadata: {
        timestamp: new Date().toISOString(),
        textLength: explanationText.length,
        sampleRate: 24000,
        channels: 1
      }
    };

    const result: CodeExplanationResult = {
      explanation,
      codeAnalysis,
      metadata: {
        timestamp: new Date().toISOString(),
        explanationLevel,
        codeLength: code.length
      }
    };

    const generationTime = Date.now() - startTime;
    logger.info(`Code explanation generation completed in ${generationTime}ms`);

    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Code explanation generation failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Code explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze code to understand its structure and complexity
 */
async function analyzeCode(
  geminiClient: GeminiClient,
  code: string,
  programmingLanguage?: string
): Promise<{
  programmingLanguage: string;
  complexity: string;
  keyPoints: string[];
  examples: string[];
}> {
  try {
    const model = geminiClient.getModel("detailed");

    const analysisPrompt = `Analyze this code and provide a JSON response with the following structure:
{
  "programmingLanguage": "detected or specified programming language",
  "complexity": "beginner|intermediate|advanced",
  "keyPoints": ["key concept 1", "key concept 2", "etc"],
  "examples": ["example usage 1", "example usage 2", "etc"]
}

Code to analyze:
\`\`\`${programmingLanguage || ''}
${code}
\`\`\`

Focus on identifying:
- Programming language (if not specified)
- Code complexity level
- Key programming concepts used
- Potential usage examples or applications`;

    const response = await model.generateContent(analysisPrompt);
    const analysisText = response.response.text();

    // Try to parse JSON response
    try {
      const analysis = JSON.parse(analysisText);
      return {
        programmingLanguage: analysis.programmingLanguage || programmingLanguage || "unknown",
        complexity: analysis.complexity || "intermediate",
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        examples: Array.isArray(analysis.examples) ? analysis.examples : []
      };
    } catch (parseError) {
      logger.warn("Failed to parse code analysis JSON, using fallback");
      return {
        programmingLanguage: programmingLanguage || "unknown",
        complexity: "intermediate",
        keyPoints: ["Code analysis", "Programming concepts"],
        examples: ["Usage example"]
      };
    }

  } catch (error) {
    logger.error("Code analysis failed:", error);
    return {
      programmingLanguage: programmingLanguage || "unknown",
      complexity: "intermediate",
      keyPoints: ["Code structure", "Programming logic"],
      examples: ["Basic usage"]
    };
  }
}

/**
 * Generate explanation text for the code
 */
async function generateExplanationText(
  geminiClient: GeminiClient,
  code: string,
  codeAnalysis: any,
  explanationLevel: string,
  includeExamples: boolean
): Promise<string> {
  const model = geminiClient.getModel("detailed");

  const levelInstructions = {
    beginner: "Explain in simple terms suitable for someone new to programming. Avoid jargon and explain basic concepts.",
    intermediate: "Provide a clear explanation assuming basic programming knowledge. Include technical terms with brief explanations.",
    advanced: "Give a detailed technical explanation including advanced concepts, performance considerations, and best practices."
  };

  const instruction = levelInstructions[explanationLevel as keyof typeof levelInstructions] || levelInstructions.intermediate;

  let explanationPrompt = `Explain the following ${codeAnalysis.programmingLanguage} code in a way that's suitable for audio narration.

${instruction}

Code to explain:
\`\`\`${codeAnalysis.programmingLanguage}
${code}
\`\`\`

Key points to address:
${codeAnalysis.keyPoints.map((point: string) => `- ${point}`).join('\n')}

Please provide a clear, conversational explanation that:
1. Describes what the code does overall
2. Explains the main components and their purpose
3. Describes the flow of execution
4. Highlights important programming concepts used`;

  if (includeExamples && codeAnalysis.examples.length > 0) {
    explanationPrompt += `\n5. Provides practical examples of how this code might be used:
${codeAnalysis.examples.map((example: string) => `   - ${example}`).join('\n')}`;
  }

  explanationPrompt += "\n\nMake the explanation natural and flowing for audio presentation, avoiding overly technical jargon unless necessary.";

  const response = await model.generateContent(explanationPrompt);
  return response.response.text();
}

/**
 * Create style prompt for technical explanations
 */
function createTechnicalStylePrompt(explanationLevel: string): string {
  switch (explanationLevel) {
    case "beginner":
      return "Speak in a friendly, patient tone as if teaching a beginner. Use simple language and speak slowly and clearly";
    case "intermediate":
      return "Speak in a clear, instructional tone suitable for someone with basic programming knowledge";
    case "advanced":
      return "Speak in a professional, technical tone appropriate for experienced developers";
    default:
      return "Speak in a clear, educational tone suitable for technical content";
  }
}