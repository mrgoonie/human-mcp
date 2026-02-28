# Phase 4: Video Generation Provider (Hands)

**Priority:** High | **Effort:** Medium
**Depends on:** Phase 1

## Context

- [plan.md](plan.md)
- Reference: `src/tools/hands/providers/minimax-video-provider.ts` -- exact pattern to follow
- Reference: `src/tools/hands/processors/video-generator.ts` -- extend existing routing
- ZhipuAI Video: CogVideoX-3 uses async submit→poll→download (like Minimax Hailuo)

## Overview

Add ZhipuAI video provider. Video already has Minimax routing -- extend with ZhipuAI. CogVideoX-3 uses same async pattern as Minimax Hailuo 2.3.

## Key API Details

- **Submit:** `POST /videos/generations` → `{ id, task_status }`
- **Poll:** `GET /async-result/{id}` → `{ task_status, video_result: [{ url, cover_image_url }] }`
- **Model:** `cogvideox-3`
- **Modes:** T2V and I2V (via `image_url` param)
- **Price:** $0.20/video

## Files to Modify/Create

- `src/tools/hands/providers/zhipuai-video-provider.ts` -- NEW
- `src/tools/hands/processors/video-generator.ts` -- MODIFY (extend routing)
- `src/tools/hands/index.ts` -- MODIFY (extend provider enums)

## Implementation Steps

### 1. Create `src/tools/hands/providers/zhipuai-video-provider.ts`

Export `generateZhipuAIVideo(options) → Promise<VideoGenerationResult>`

Follow `minimax-video-provider.ts` pattern exactly:
1. Submit task via `POST /videos/generations`
2. Poll via `GET /async-result/{id}` (10s interval, 15min max)
3. On SUCCESS: get video URL from `video_result[0].url`
4. Download video buffer
5. Save via `saveBase64ToFile()` (reuse existing utility)
6. Return `VideoGenerationResult` matching existing type from `hands/schemas.ts`

### 2. Modify `src/tools/hands/processors/video-generator.ts`

Add ZhipuAI routing after existing Minimax block (~line 35):

```typescript
import { generateZhipuAIVideo } from "../providers/zhipuai-video-provider.js";
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";

// After minimax block:
if (provider === "zhipuai") {
  if (!config || !ZhipuAIClient.isConfigured(config)) {
    throw new Error("ZHIPUAI_API_KEY required when provider is 'zhipuai'");
  }
  return generateZhipuAIVideo({
    prompt: options.prompt,
    model: (options as any).zhipuai_model || "cogvideox-3",
    imageUrl: options.imageInput,
    config,
  });
}
```

### 3. Modify `src/tools/hands/index.ts`

Extend provider enums in `gemini_gen_video` and `gemini_image_to_video`:

```typescript
// Change from: z.enum(["gemini", "minimax"])
// To:
provider: z.enum(["gemini", "minimax", "zhipuai"]).optional().describe("Video provider"),
zhipuai_model: z.enum(["cogvideox-3"]).optional().describe("ZhipuAI video model"),
```

Pass zhipuai params through handlers:
```typescript
zhipuai_model: rawArgs.zhipuai_model,
```

## Todo

- [ ] Create `src/tools/hands/providers/zhipuai-video-provider.ts`
- [ ] Add ZhipuAI routing to `video-generator.ts`
- [ ] Extend provider enum in both video tool schemas
- [ ] Pass zhipuai params through handlers
- [ ] Run `bun run build`

## Success Criteria

- `gemini_gen_video` with `provider: "zhipuai"` calls CogVideoX-3
- `gemini_image_to_video` with `provider: "zhipuai"` passes image for I2V
- Async polling works (10s interval, 15min timeout)
- Video saved via `saveBase64ToFile()`
- Returns `VideoGenerationResult` type (same as Gemini/Minimax)
- Default remains "gemini"
- Build passes
