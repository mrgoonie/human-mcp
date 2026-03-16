/**
 * Minimax Hailuo 2.3 Video Provider
 * Async video generation: submit -> poll -> retrieve -> download
 */
import { MinimaxClient } from "@/utils/minimax-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
import type { VideoGenerationResult } from "../schemas.js";

export interface MinimaxVideoOptions {
  prompt: string;
  model?: string;
  duration?: number;
  resolution?: string;
  firstFrameImage?: string;
  promptOptimizer?: boolean;
  config: Config;
}

const DEFAULT_MODEL = process.env.MINIMAX_VIDEO_MODEL || "MiniMax-Hailuo-2.3";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_TIME_MS = 900_000; // 15 minutes

export async function generateMinimaxVideo(
  options: MinimaxVideoOptions
): Promise<VideoGenerationResult> {
  const startTime = Date.now();

  const {
    prompt,
    model = DEFAULT_MODEL,
    duration = 6,
    resolution = "1080P",
    firstFrameImage,
    promptOptimizer = true,
    config,
  } = options;

  // Validate: Hailuo 2.3 Fast is I2V only
  if (model === "MiniMax-Hailuo-2.3-Fast" && !firstFrameImage) {
    throw new APIError(
      "MiniMax-Hailuo-2.3-Fast only supports image-to-video (I2V). " +
      "Provide an image_input or use MiniMax-Hailuo-2.3 for text-to-video."
    );
  }

  // Validate: 1080P only supports 6s
  if (resolution === "1080P" && duration > 6) {
    throw new APIError(
      "1080P resolution only supports 6-second videos. " +
      "Use 768P for 10-second videos."
    );
  }

  const client = new MinimaxClient(config);

  // Step 1: Submit video generation task
  const body: Record<string, unknown> = {
    model,
    prompt,
    prompt_optimizer: promptOptimizer,
    duration,
    resolution,
  };

  if (firstFrameImage) {
    body.first_frame_image = firstFrameImage;
  }

  logger.info(
    `Minimax Video: model=${model} duration=${duration}s res=${resolution} ` +
    `i2v=${!!firstFrameImage} prompt="${prompt.substring(0, 60)}"`
  );

  const createResponse = await client.post("/v1/video_generation", body, 60000);
  const taskId = createResponse.task_id;

  if (!taskId) {
    throw new APIError("Minimax Video returned no task_id");
  }

  logger.info(`Minimax Video task created: ${taskId}`);

  // Step 2: Poll for completion
  const { fileId, width, height } = await pollVideoTask(client, taskId);

  // Step 3: Retrieve download URL
  const fileResponse = await client.get("/v1/files/retrieve", {
    file_id: fileId,
  });

  const downloadUrl = (fileResponse.file as any)?.download_url;
  if (!downloadUrl) {
    throw new APIError("Minimax Video returned no download URL");
  }

  // Step 4: Download video
  const videoBuffer = await client.downloadBuffer(downloadUrl, 120000);
  const videoBase64 = videoBuffer.toString("base64");

  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const savedFile = await saveBase64ToFile(videoBase64, "video/mp4", config, {
      prefix: "minimax-video",
      uploadToR2: !!(config.cloudflare?.accessKey),
    });
    filePath = savedFile.filePath;
    fileName = savedFile.fileName;
    fileUrl = savedFile.url;
    fileSize = savedFile.size;
    logger.info(`Minimax Video saved: ${filePath}`);
  } catch (error) {
    logger.warn(`Failed to save video file: ${error}`);
  }

  const generationTime = Date.now() - startTime;
  const durationStr = `${duration}s`;
  const aspectRatio = width && height
    ? (width > height ? "16:9" : height > width ? "9:16" : "1:1")
    : "16:9";

  return {
    videoData: fileUrl || filePath || downloadUrl,
    format: "mp4",
    model,
    duration: durationStr,
    aspectRatio,
    fps: 25,
    generationTime,
    size: width && height ? `${width}x${height}` : resolution,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}

/** Poll Minimax video task until Success or Fail */
async function pollVideoTask(
  client: MinimaxClient,
  taskId: string
): Promise<{ fileId: string; width: number; height: number }> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    const response = await client.get("/v1/query/video_generation", {
      task_id: taskId,
    });

    const status = response.status as string;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    logger.debug(`Minimax Video poll: status=${status} elapsed=${elapsed}s`);

    if (status === "Success") {
      const fileId = response.file_id as string;
      if (!fileId) {
        throw new APIError("Minimax Video succeeded but returned no file_id");
      }
      return {
        fileId,
        width: response.video_width ?? 0,
        height: response.video_height ?? 0,
      };
    }

    if (status === "Fail") {
      const msg = response.base_resp?.status_msg || "Unknown error";
      throw new APIError(`Minimax Video generation failed: ${msg}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new APIError(
    `Minimax Video generation timed out after ${MAX_POLL_TIME_MS / 1000}s`
  );
}
