import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import type { VideoGenerationOptions, VideoGenerationResult } from "../schemas.js";
import { logger } from "@/utils/logger.js";

export async function generateVideo(
  geminiClient: GeminiClient,
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const startTime = Date.now();

  try {
    logger.info(`Generating video with prompt: "${options.prompt}" using model: ${options.model}`);

    const videoOptions = {
      model: options.model,
      duration: options.duration,
      aspectRatio: options.aspectRatio,
      fps: options.fps,
      imageInput: options.imageInput,
      style: options.style,
      cameraMovement: options.cameraMovement,
      seed: options.seed
    };

    const result = await geminiClient.generateVideoWithRetry(options.prompt, videoOptions);

    const generationTime = Date.now() - startTime;

    // Parse the result and return formatted response
    let resultData: string;
    let format: string;

    if (options.outputFormat === "mp4") {
      resultData = result.videoData;
      format = "mp4";
    } else if (options.outputFormat === "webm") {
      // Convert or handle WebM format if needed
      resultData = result.videoData;
      format = "webm";
      logger.warn("WebM format conversion not yet implemented, returning MP4");
    } else {
      resultData = result.videoData;
      format = "mp4";
    }

    return {
      videoData: resultData,
      format,
      model: options.model,
      duration: options.duration,
      aspectRatio: options.aspectRatio,
      fps: options.fps,
      generationTime,
      size: estimateVideoSize(options.duration, options.aspectRatio),
      operationId: result.operationId
    };

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Video generation failed after ${generationTime}ms:`, error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Invalid or missing Google AI API key. Please check your GOOGLE_GEMINI_API_KEY environment variable.");
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("API quota exceeded or rate limit reached. Please try again later.");
      }
      if (error.message.includes("safety") || error.message.includes("policy")) {
        throw new Error("Video generation blocked due to safety policies. Please modify your prompt and try again.");
      }
      if (error.message.includes("timeout")) {
        throw new Error("Video generation timed out. This is normal for longer videos. Please try again or use a shorter duration.");
      }
      throw new Error(`Video generation failed: ${error.message}`);
    }

    throw new Error("Video generation failed due to an unexpected error");
  }
}

export async function generateImageToVideo(
  geminiClient: GeminiClient,
  prompt: string,
  imageInput: string,
  options: Partial<VideoGenerationOptions> = {}
): Promise<VideoGenerationResult> {
  logger.info(`Generating video from image with prompt: "${prompt}"`);

  const videoOptions: VideoGenerationOptions = {
    prompt,
    model: options.model || "veo-3.0-generate-001",
    duration: options.duration || "4s",
    outputFormat: options.outputFormat || "mp4",
    aspectRatio: options.aspectRatio || "16:9",
    fps: options.fps || 24,
    imageInput,
    style: options.style,
    cameraMovement: options.cameraMovement,
    seed: options.seed,
    fetchTimeout: options.fetchTimeout || 300000
  };

  return await generateVideo(geminiClient, videoOptions);
}

export async function pollVideoGeneration(
  geminiClient: GeminiClient,
  operationId: string,
  maxWaitTime: number = 300000 // 5 minutes
): Promise<VideoGenerationResult> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  logger.info(`Polling video generation operation: ${operationId}`);

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await geminiClient.pollVideoGenerationOperation(operationId);

      if (status.done) {
        if (status.error) {
          throw new Error(`Video generation failed: ${status.error}`);
        }

        if (status.result) {
          const generationTime = Date.now() - startTime;
          logger.info(`Video generation completed in ${generationTime}ms`);

          return {
            videoData: status.result.videoData,
            format: "mp4",
            model: "veo-3.0-generate-001",
            duration: "4s", // Would come from operation metadata
            aspectRatio: "16:9", // Would come from operation metadata
            fps: 24, // Would come from operation metadata
            generationTime: status.result.generationTime,
            size: "1920x1080", // Would be calculated from actual video
            operationId
          };
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      logger.debug(`Video generation still in progress... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);

    } catch (error) {
      logger.error(`Error polling video generation:`, error);
      throw new Error(`Failed to poll video generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  throw new Error(`Video generation timed out after ${maxWaitTime / 1000} seconds`);
}

function estimateVideoSize(duration: string, aspectRatio: string): string {
  // Estimate video dimensions based on duration and aspect ratio
  const durationSeconds = parseInt(duration.replace('s', ''));

  let width: number, height: number;

  switch (aspectRatio) {
    case "1:1":
      width = 1024; height = 1024;
      break;
    case "16:9":
      width = 1920; height = 1080;
      break;
    case "9:16":
      width = 1080; height = 1920;
      break;
    case "4:3":
      width = 1440; height = 1080;
      break;
    case "3:4":
      width = 1080; height = 1440;
      break;
    default:
      width = 1920; height = 1080;
  }

  return `${width}x${height}`;
}