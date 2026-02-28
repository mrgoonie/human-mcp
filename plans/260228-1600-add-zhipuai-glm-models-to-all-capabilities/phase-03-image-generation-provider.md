# Phase 3: Image Generation Provider (Hands)

**Priority:** High | **Effort:** Medium
**Depends on:** Phase 1

## Context

- [plan.md](plan.md)
- Reference: `src/tools/hands/processors/image-generator.ts` -- NO provider routing yet
- Reference: `src/tools/hands/processors/video-generator.ts` -- routing pattern to follow
- Reference: `src/tools/hands/providers/minimax-video-provider.ts` -- provider file pattern
- ZhipuAI Image: CogView-4 uses `POST /images/generations`

## Overview

Add ZhipuAI as image gen provider for `gemini_gen_image`. Image generation currently has NO provider routing (unlike video). Add routing in `image-generator.ts` following the `video-generator.ts` pattern.

## Key API Details

- **Endpoint:** `POST /images/generations`
- **Model:** `cogview-4-250304`
- **Output:** `b64_json` or `url` (valid 30 days)
- **Sizes:** `1024x1024`, `768x1344`, `1344x768`, `720x1280`, `1280x720`, etc.
- **Price:** $0.01/image

## Files to Modify/Create

- `src/tools/hands/providers/zhipuai-image-provider.ts` -- NEW
- `src/tools/hands/processors/image-generator.ts` -- MODIFY (add routing)
- `src/tools/hands/index.ts` -- MODIFY (add provider param + pass through)

## Implementation Steps

### 1. Create `src/tools/hands/providers/zhipuai-image-provider.ts`

Export `generateZhipuAIImage(options) → Promise<ImageGenerationResult>`

Key logic:
- Call `POST /images/generations` with `response_format: "b64_json"`
- Save image via `saveBase64ToFile()` (reuse existing utility)
- Return `ImageGenerationResult` matching existing type from `hands/schemas.ts`

Include `aspectRatioToSize()` helper to map aspect ratios to CogView-4 sizes.

### 2. Modify `src/tools/hands/processors/image-generator.ts`

Add provider routing at start of `generateImage()` (BEFORE existing `try` block):

```typescript
import { generateZhipuAIImage, aspectRatioToSize } from "../providers/zhipuai-image-provider.js";
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";

// Provider routing
const provider = (options as any).provider || config?.providers?.image || "gemini";
if (provider === "zhipuai") {
  if (!config || !ZhipuAIClient.isConfigured(config)) {
    throw new Error("ZHIPUAI_API_KEY required when provider is 'zhipuai'");
  }
  return generateZhipuAIImage({
    prompt: options.prompt,
    model: (options as any).zhipuai_model || "cogview-4-250304",
    size: aspectRatioToSize(options.aspectRatio),
    config,
  });
}
```

### 3. Modify `src/tools/hands/index.ts`

Add to `gemini_gen_image` tool schema (after `seed`):
```typescript
provider: z.enum(["gemini", "zhipuai"]).optional().describe("Image provider (default: gemini)"),
zhipuai_model: z.enum(["cogview-4-250304"]).optional().describe("ZhipuAI image model"),
```

In `handleImageGeneration()`, pass provider through to `generationOptions`:
```typescript
provider: (args as any).provider,
zhipuai_model: (args as any).zhipuai_model,
```

Update tool description to mention ZhipuAI.

## Todo

- [ ] Create `src/tools/hands/providers/zhipuai-image-provider.ts`
- [ ] Add provider routing to `image-generator.ts`
- [ ] Add provider params to `gemini_gen_image` schema
- [ ] Pass provider through `handleImageGeneration()`
- [ ] Update tool description
- [ ] Run `bun run build`

## Success Criteria

- `gemini_gen_image` with `provider: "zhipuai"` calls CogView-4
- Image saved via `saveBase64ToFile()` (local + optional R2)
- Returns `ImageGenerationResult` type (same as Gemini path)
- Default remains "gemini"
- Build passes
