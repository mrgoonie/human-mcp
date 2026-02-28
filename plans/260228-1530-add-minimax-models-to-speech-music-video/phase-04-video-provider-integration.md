# Phase 4: Video Provider Integration (Minimax Hailuo 2.3)

**Priority:** High | **Status:** Pending | **Effort:** Large
**Depends on:** Phase 1 (config + client)

## Context

- [Research: Video API](../research/260228-minimax-hailuo-video-api-research.md)
- [plan.md](plan.md)
- [Existing video processor](../../src/tools/hands/processors/video-generator.ts)

## Overview

Create a Minimax Hailuo 2.3 video provider and integrate it into the existing `gemini_gen_video` and `gemini_image_to_video` tools via a `provider` parameter. When `provider: "minimax"` is specified (or `VIDEO_PROVIDER=minimax` env var), route video generation to the Minimax Hailuo API instead of Gemini Veo 3.0.

The Minimax video API uses an **async 3-step pattern** (submit task -> poll status -> retrieve file), which differs from Gemini's synchronous approach. This requires a dedicated provider with polling logic.

## Key Insights

- **Async workflow:** POST `/v1/video_generation` -> GET `/v1/query/video_generation?task_id=X` -> GET `/v1/files/retrieve?file_id=X`
- **Models:** `MiniMax-Hailuo-2.3` (T2V + I2V) or `MiniMax-Hailuo-2.3-Fast` (I2V only, ~50% cheaper)
- **Hailuo 2.3 Fast** does NOT support text-to-video -- must validate this
- **Duration:** 6s or 10s (10s only at 768P)
- **Resolution:** 768P or 1080P (1080P is 6s only)
- **Output:** MP4, 25 FPS, download URL valid 9 hours
- **Image input:** URL or base64 Data URL (JPG/PNG/WebP, max 20MB, aspect 2:5 to 5:2)
- **Camera commands:** 15 bracket-syntax commands in prompt (e.g., `[Tracking shot]`, `[Push in]`)
- **Prompt optimizer:** `prompt_optimizer: true` rewrites prompt for better results
- **Polling:** 10s interval recommended, ~4-5 min for 6s video, ~8-9 min for 10s video
- **Rate limit:** 5 RPM (very low -- critical to note)
- **Max timeout:** 15 minutes before considering task failed
- **Task statuses:** `Preparing`, `Queueing`, `Processing`, `Success`, `Fail`

## Requirements

### Functional
- Add `provider` parameter to `gemini_gen_video` and `gemini_image_to_video` tools
- Support `minimax_model` parameter (`MiniMax-Hailuo-2.3` or `MiniMax-Hailuo-2.3-Fast`)
- Support `resolution` parameter (768P, 1080P) for Minimax
- Support `prompt_optimizer` boolean for Minimax
- Validate: Hailuo 2.3 Fast cannot do T2V (block with error message)
- Validate: 1080P only supports 6s duration
- Async polling with 10s intervals, 15-min max timeout
- Download generated MP4, save using existing `saveBase64ToFile` pattern
- Return same `VideoGenerationResult` shape as Gemini provider

### Non-functional
- Provider file under 200 lines
- No new npm dependencies
- Graceful error if MINIMAX_API_KEY not set when provider=minimax
- 15-minute max timeout for video generation polling

## Related Code Files

### Create
- `src/tools/hands/providers/minimax-video-provider.ts` -- Minimax Hailuo 2.3 video generation

### Modify
- `src/tools/hands/processors/video-generator.ts` -- Add provider routing
- `src/tools/hands/schemas.ts` -- Add provider + Minimax-specific params to video schemas
- `src/tools/hands/index.ts` -- Pass provider params to handler functions

## Implementation Steps

### 1. Create `src/tools/hands/providers/minimax-video-provider.ts`

```typescript
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
  duration?: number;       // 6 or 10 seconds
  resolution?: string;     // "768P" or "1080P"
  firstFrameImage?: string; // URL or base64 Data URL for I2V
  promptOptimizer?: boolean;
  config: Config;
}

const DEFAULT_MODEL = "MiniMax-Hailuo-2.3";
const POLL_INTERVAL_MS = 10_000; // 10 seconds
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

  // Save to file
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

  // Map to existing VideoGenerationResult shape
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
        width: (response as any).video_width ?? 0,
        height: (response as any).video_height ?? 0,
      };
    }

    if (status === "Fail") {
      const msg = response.base_resp?.status_msg || "Unknown error";
      throw new APIError(`Minimax Video generation failed: ${msg}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new APIError(
    `Minimax Video generation timed out after ${MAX_POLL_TIME_MS / 1000}s`
  );
}
```

### 2. Update `src/tools/hands/processors/video-generator.ts`

Add provider routing at the top of `generateVideo()`:

```typescript
// Add import at top of file:
import { generateMinimaxVideo } from "../providers/minimax-video-provider.js";
import { MinimaxClient } from "@/utils/minimax-client.js";

// Inside generateVideo(), at the very top before existing logic:
// Check if provider is "minimax"
const provider = (options as any).provider || config?.providers?.video || "gemini";

if (provider === "minimax") {
  if (!config || !MinimaxClient.isConfigured(config)) {
    throw new Error("MINIMAX_API_KEY required when provider is 'minimax'");
  }

  // Map duration string to number (e.g., "4s" -> 6, Minimax only supports 6 or 10)
  const durationNum = parseDurationForMinimax(options.duration);

  return generateMinimaxVideo({
    prompt: options.prompt,
    model: (options as any).minimax_model || "MiniMax-Hailuo-2.3",
    duration: durationNum,
    resolution: (options as any).resolution || "1080P",
    firstFrameImage: options.imageInput,
    promptOptimizer: (options as any).prompt_optimizer ?? true,
    config,
  });
}

// ... existing Gemini code continues below
```

Add helper function at bottom of file:

```typescript
/** Convert Gemini-style duration string to Minimax-compatible number */
function parseDurationForMinimax(duration: string): number {
  const seconds = parseInt(duration.replace("s", ""));
  // Minimax only supports 6 or 10 seconds
  if (seconds <= 6) return 6;
  return 10;
}
```

### 3. Update `src/tools/hands/index.ts`

Modify `handleVideoGeneration()` and `handleImageToVideoGeneration()` to pass provider params through. Add to the `generationOptions` object:

```typescript
// In handleVideoGeneration(), add to generationOptions:
provider: (args as any).provider,
minimax_model: (args as any).minimax_model,
resolution: (args as any).resolution,
prompt_optimizer: (args as any).prompt_optimizer,

// In handleImageToVideoGeneration(), add to generationOptions:
provider: (args as any).provider,
minimax_model: (args as any).minimax_model,
resolution: (args as any).resolution,
prompt_optimizer: (args as any).prompt_optimizer,
```

Update the `gemini_gen_video` tool registration `inputSchema` to add provider params:

```typescript
// Add to gemini_gen_video inputSchema:
provider: z.enum(["gemini", "minimax"]).optional()
  .describe("Video provider (default: gemini, option: minimax for Hailuo 2.3)"),
minimax_model: z.enum(["MiniMax-Hailuo-2.3", "MiniMax-Hailuo-2.3-Fast"]).optional()
  .describe("Minimax video model (default: MiniMax-Hailuo-2.3)"),
resolution: z.enum(["768P", "1080P"]).optional()
  .describe("Video resolution for Minimax (default: 1080P)"),
prompt_optimizer: z.boolean().optional()
  .describe("Enable Minimax prompt optimization (default: true)"),
```

Update the `gemini_image_to_video` tool registration `inputSchema` similarly:

```typescript
// Add to gemini_image_to_video inputSchema:
provider: z.enum(["gemini", "minimax"]).optional()
  .describe("Video provider (default: gemini, option: minimax for Hailuo 2.3)"),
minimax_model: z.enum(["MiniMax-Hailuo-2.3", "MiniMax-Hailuo-2.3-Fast"]).optional()
  .describe("Minimax video model (default: MiniMax-Hailuo-2.3, Fast for cheaper I2V)"),
resolution: z.enum(["768P", "1080P"]).optional()
  .describe("Video resolution for Minimax (default: 1080P)"),
prompt_optimizer: z.boolean().optional()
  .describe("Enable Minimax prompt optimization (default: true)"),
```

## Todo

- [ ] Create `src/tools/hands/providers/` directory (if not already created in Phase 3)
- [ ] Create `src/tools/hands/providers/minimax-video-provider.ts`
- [ ] Update `src/tools/hands/processors/video-generator.ts` with provider routing
- [ ] Update `src/tools/hands/index.ts` -- add provider params to `gemini_gen_video` inputSchema
- [ ] Update `src/tools/hands/index.ts` -- add provider params to `gemini_image_to_video` inputSchema
- [ ] Update `src/tools/hands/index.ts` -- pass provider params in `handleVideoGeneration()`
- [ ] Update `src/tools/hands/index.ts` -- pass provider params in `handleImageToVideoGeneration()`
- [ ] Run `bun run build` to verify

## Success Criteria

- `gemini_gen_video` with default args still uses Gemini Veo 3.0 (no behavioral change)
- `gemini_gen_video` with `provider: "minimax"` calls Minimax Hailuo 2.3 for T2V
- `gemini_image_to_video` with `provider: "minimax"` calls Minimax Hailuo 2.3 for I2V
- `gemini_image_to_video` with `provider: "minimax", minimax_model: "MiniMax-Hailuo-2.3-Fast"` uses the fast model
- Error thrown if `minimax_model: "MiniMax-Hailuo-2.3-Fast"` used without image input (T2V)
- Error thrown if `resolution: "1080P"` used with 10s duration
- Error thrown if `provider: "minimax"` but no API key
- Video downloaded as MP4, saved locally, optional R2 upload
- Polling correctly handles all statuses (Preparing, Queueing, Processing, Success, Fail)
- 15-minute timeout fires if task hangs
- Build passes

## Risk Assessment

- **High risk**: Video generation can take 5-9 minutes. Mitigation: 15-min max timeout with 10s polling interval and clear logging
- **Medium risk**: Rate limit is only 5 RPM. Mitigation: Log warnings; leave throttling to caller; document the limit
- **Low risk**: Download URL expires after 9 hours. Mitigation: Download immediately after task completes
- **Low risk**: Content filter rejection (code 1026/1027). Mitigation: Pass error message to user

## Security Considerations

- API key validated before making any calls
- Audio/video URLs (9h expiry) not stored beyond immediate download
- Content policy violations surfaced as user-friendly errors
- No prompt content logged beyond first 60 characters

## Next Steps

- Phase 3 (music) can proceed in parallel since both depend only on Phase 1
- Phase 5 (schemas) consolidates any remaining schema changes
