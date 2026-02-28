/**
 * ZhipuAI (Z.AI) Video Generation Provider
 * Models: cogvideox-3 (default)
 * Async: POST /videos/generations -> poll task_status -> download
 */
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
import type { VideoGenerationResult } from "../schemas.js";

export interface ZhipuAIVideoOptions {
  prompt: string;
  model?: string;
  duration?: number;
  size?: string;
  quality?: string;
  withAudio?: boolean;
  fps?: number;
  imageInput?: string;
  config: Config;
}

interface VideoCreateResponse {
  id: string;
  task_status: string;
  request_id?: string;
}

interface VideoStatusResponse {
  id: string;
  task_status: string;
  video_result?: Array<{
    url: string;
    cover_image_url?: string;
  }>;
  request_id?: string;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_TIME_MS = 900_000; // 15 minutes

/** Map aspect ratio to Z.AI video size */
function mapAspectRatioToVideoSize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    "1:1": "1024x1024",
    "16:9": "1920x1080",
    "9:16": "1080x1920",
    "4:3": "1440x1080",
    "3:4": "1080x1440",
    "3:2": "1620x1080",
    "2:3": "1080x1620",
  };
  return sizeMap[aspectRatio] || "1920x1080";
}

/** Map duration string to seconds */
function parseDuration(dur: string | number): number {
  if (typeof dur === "number") return dur;
  const match = dur.match(/^(\d+)s?$/);
  return match?.[1] ? parseInt(match[1], 10) : 5;
}

/**
 * Generate a video using ZhipuAI CogVideoX-3
 */
export async function generateZhipuAIVideo(
  options: ZhipuAIVideoOptions & { aspectRatio?: string; uploadToR2?: boolean }
): Promise<VideoGenerationResult> {
  const startTime = Date.now();

  const {
    prompt,
    model = "cogvideox-3",
    quality = "quality",
    withAudio = false,
    fps = 30,
    imageInput,
    config,
    aspectRatio,
    uploadToR2,
  } = options;

  const size = options.size || mapAspectRatioToVideoSize(aspectRatio || "16:9");
  const duration = options.duration || 5;

  const client = new ZhipuAIClient(config);

  // Step 1: Submit video generation task
  const body: Record<string, unknown> = {
    model,
    prompt,
    quality,
    with_audio: withAudio,
    size,
    fps,
    duration,
  };

  if (imageInput) {
    body.image_url = imageInput;
  }

  logger.info(
    `ZhipuAI Video: model=${model} size=${size} duration=${duration}s ` +
    `fps=${fps} quality=${quality} prompt="${prompt.substring(0, 60)}"`
  );

  const createResponse = await client.post<VideoCreateResponse>(
    "/videos/generations",
    body,
    60000
  );

  const taskId = createResponse.id;
  if (!taskId) {
    throw new APIError("ZhipuAI Video returned no task ID");
  }

  logger.info(`ZhipuAI Video task created: ${taskId}`);

  // Step 2: Poll for completion
  const videoUrl = await pollVideoTask(client, taskId);

  // Step 3: Download video
  const videoBuffer = await client.downloadBuffer(videoUrl, 120000);
  const videoBase64 = videoBuffer.toString("base64");

  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const savedFile = await saveBase64ToFile(videoBase64, "video/mp4", config, {
      prefix: "zhipuai-video",
      uploadToR2: uploadToR2 ?? !!config.cloudflare?.accessKey,
    });
    filePath = savedFile.filePath;
    fileName = savedFile.fileName;
    fileUrl = savedFile.url;
    fileSize = savedFile.size;
    logger.info(`ZhipuAI Video saved: ${filePath}`);
  } catch (error) {
    logger.warn(`Failed to save ZhipuAI video file: ${error}`);
  }

  const generationTime = Date.now() - startTime;

  return {
    videoData: fileUrl || filePath || videoUrl,
    format: "mp4",
    model,
    duration: `${duration}s`,
    aspectRatio: aspectRatio || "16:9",
    fps,
    generationTime,
    size,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}

/** Poll ZhipuAI video task until SUCCESS or FAIL */
async function pollVideoTask(
  client: ZhipuAIClient,
  taskId: string
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    const response = await client.get<VideoStatusResponse>(
      `/videos/generations/${taskId}`
    );

    const status = response.task_status;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    logger.debug(`ZhipuAI Video poll: status=${status} elapsed=${elapsed}s`);

    if (status === "SUCCESS") {
      const url = response.video_result?.[0]?.url;
      if (!url) {
        throw new APIError("ZhipuAI Video succeeded but returned no video URL");
      }
      return url;
    }

    if (status === "FAIL") {
      throw new APIError(`ZhipuAI Video generation failed (task=${taskId})`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new APIError(
    `ZhipuAI Video generation timed out after ${MAX_POLL_TIME_MS / 1000}s`
  );
}
