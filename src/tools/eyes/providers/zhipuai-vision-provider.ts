/**
 * ZhipuAI GLM-4.6V Vision Provider
 * OpenAI-compatible chat completions with image content
 */
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";
import { logger } from "@/utils/logger.js";
import type { Config } from "@/utils/config.js";

export interface ZhipuAIVisionOptions {
  source: string;
  focus?: string;
  detail: string;
  model?: string;
  config: Config;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Analyze an image using ZhipuAI GLM-4.6V vision model
 */
export async function analyzeWithZhipuAI(
  options: ZhipuAIVisionOptions
): Promise<{ analysis: string; metadata: { processing_time_ms: number } }> {
  const startTime = Date.now();
  const { source, focus, detail, model = options.config?.zhipuai?.visionModel || "glm-4.6v-flash", config } = options;

  const client = new ZhipuAIClient(config);

  // Build image content part
  const imageContent = await buildImageContent(source);

  // Build vision prompt
  const detailInstruction = detail === "quick"
    ? "Provide a brief analysis."
    : "Provide a detailed, comprehensive analysis.";

  const focusInstruction = focus ? `Focus specifically on: ${focus}.` : "";

  const prompt = `Analyze this image. ${focusInstruction} ${detailInstruction}

Provide:
- **Summary**: Key observations
- **Details**: Specific findings
- **Recommendations**: Suggested actions (if applicable)`;

  logger.info(`ZhipuAI Vision: model=${model} source=${source.substring(0, 50)}`);

  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          imageContent,
        ],
      },
    ],
    max_tokens: detail === "quick" ? 512 : 2048,
  };

  const response = await client.post<ChatCompletionResponse>("/chat/completions", body, 60000);

  const analysis = response.choices?.[0]?.message?.content;
  if (!analysis) {
    throw new Error("ZhipuAI Vision returned no analysis content");
  }

  const processingTime = Date.now() - startTime;
  logger.info(`ZhipuAI Vision completed in ${processingTime}ms`);

  return {
    analysis,
    metadata: { processing_time_ms: processingTime },
  };
}

/** Convert source to OpenAI-compatible image_url content part */
async function buildImageContent(source: string): Promise<Record<string, unknown>> {
  // Base64 data URI
  if (source.startsWith("data:image/")) {
    return { type: "image_url", image_url: { url: source } };
  }

  // HTTP URL
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return { type: "image_url", image_url: { url: source } };
  }

  // Local file path — read and convert to base64 data URI
  const fs = await import("fs/promises");
  const buffer = await fs.readFile(source);
  const base64 = buffer.toString("base64");

  // Detect MIME type from extension
  const ext = source.toLowerCase().split(".").pop() || "jpeg";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
  };
  const mimeType = mimeMap[ext] || "image/jpeg";

  return {
    type: "image_url",
    image_url: { url: `data:${mimeType};base64,${base64}` },
  };
}
