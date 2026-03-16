/**
 * ZhipuAI (Z.AI) Image Generation Provider
 * Models: glm-image (default), cogview-4
 * Endpoint: POST /images/generations
 * Response: returns image URL
 */
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import { logger } from "@/utils/logger.js";
import type { Config } from "@/utils/config.js";
import type { ImageGenerationResult } from "../schemas.js";

export interface ZhipuAIImageOptions {
  prompt: string;
  model?: string;
  size?: string;
  config: Config;
}

interface ImageGenResponse {
  created: number;
  data: Array<{ url: string }>;
}

/** Map aspect ratio to Z.AI compatible pixel size (multiples of 32) */
function mapAspectRatioToSize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    "1:1": "1024x1024",
    "16:9": "1344x768",
    "9:16": "768x1344",
    "4:3": "1152x864",
    "3:4": "864x1152",
    "3:2": "1216x832",
    "2:3": "832x1216",
    "4:5": "896x1120",
    "5:4": "1120x896",
    "21:9": "1568x672",
  };
  return sizeMap[aspectRatio] || "1024x1024";
}

/**
 * Generate an image using ZhipuAI GLM-Image / CogView-4
 */
export async function generateWithZhipuAI(
  options: ZhipuAIImageOptions & { aspectRatio?: string; outputFormat?: string; uploadToR2?: boolean }
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  const { prompt, model = process.env.ZHIPUAI_IMAGE_MODEL || "glm-image", config, aspectRatio, outputFormat, uploadToR2 } = options;

  const client = new ZhipuAIClient(config);

  const size = options.size || mapAspectRatioToSize(aspectRatio || "1:1");

  logger.info(`ZhipuAI Image: model=${model} size=${size} prompt="${prompt.substring(0, 60)}"`);

  const body: Record<string, unknown> = {
    model,
    prompt,
    size,
  };

  const response = await client.post<ImageGenResponse>("/images/generations", body, 120000);

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("ZhipuAI Image returned no image URL");
  }

  // Download the image to get buffer for local save
  const imageBuffer = await client.downloadBuffer(imageUrl);
  const base64 = imageBuffer.toString("base64");
  const mimeType = "image/png";
  const generationTime = Date.now() - startTime;

  // Save locally + optional R2
  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const saved = await saveBase64ToFile(base64, mimeType, config, {
      prefix: "zhipuai-image",
      uploadToR2: uploadToR2 ?? !!config.cloudflare?.accessKey,
    });
    filePath = saved.filePath;
    fileName = saved.fileName;
    fileUrl = saved.url;
    fileSize = saved.size;
  } catch (err) {
    logger.warn(`Failed to save ZhipuAI image locally: ${err}`);
  }

  logger.info(`ZhipuAI Image completed in ${generationTime}ms`);

  // Prefer returning file path / CDN URL over inline base64
  const resultData = fileUrl || filePath || `data:${mimeType};base64,${base64}`;
  const format = fileUrl ? "url" : filePath ? "file_path" : "base64_data_uri";

  return {
    imageData: resultData,
    format,
    model,
    generationTime,
    size,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}
