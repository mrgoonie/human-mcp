# Phase 2: Vision Provider (Eyes)

**Priority:** High | **Effort:** Medium
**Depends on:** Phase 1

## Context

- [plan.md](plan.md)
- Reference: `src/tools/eyes/index.ts` -- current `handleOptimizedAnalyze()` handler
- ZhipuAI Vision: GLM-4.6V uses OpenAI-compatible `POST /chat/completions` with image content

## Overview

Add ZhipuAI as a vision provider for `eyes_analyze`. Eyes currently has NO provider routing -- it calls `processImage(model, source, options)` directly. Add routing in `handleOptimizedAnalyze()`.

## Key API Details

- **Endpoint:** `POST /chat/completions`
- **Models:** `glm-4.6v` ($0.30/1M tokens), `glm-4.6v-flash` (FREE)
- **Input:** OpenAI-compatible messages with `image_url` content type
- **Supports:** URL images and base64 data URIs
- **Max tokens:** 128K context window

## Files to Modify/Create

- `src/tools/eyes/providers/zhipuai-vision-provider.ts` -- NEW
- `src/tools/eyes/index.ts` -- MODIFY (add provider param + routing)

## Implementation Steps

### 1. Create `src/tools/eyes/providers/zhipuai-vision-provider.ts`

Export single async function: `analyzeWithZhipuAI(options) → Promise<{ analysis, metadata }>`

Key logic:
- Convert `source` (file path, URL, or base64) to OpenAI-compatible `image_url` content part
- For local files: read + convert to base64 data URI
- Build chat completion request with vision prompt
- Call `client.post("/chat/completions", body)`
- Return analysis text + processing time metadata

Return type must match existing format used by `formatAnalysisResult()` in `eyes/index.ts`:
```typescript
{ analysis: string; metadata: { processing_time_ms: number } }
```

### 2. Modify `src/tools/eyes/index.ts`

**a)** Add import:
```typescript
import { analyzeWithZhipuAI } from "./providers/zhipuai-vision-provider.js";
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";
```

**b)** Add params to `eyes_analyze` tool schema (after `detail`):
```typescript
provider: z.enum(["gemini", "zhipuai"]).optional().describe("Vision provider (default: gemini). zhipuai uses GLM-4.6V (glm-4.6v-flash is FREE)"),
zhipuai_model: z.enum(["glm-4.6v", "glm-4.6v-flash"]).optional().describe("ZhipuAI vision model"),
```

**c)** Add routing at start of `handleOptimizedAnalyze()` (before `detectMediaType`):
```typescript
const provider = (args as any).provider || config.providers?.vision || "gemini";
if (provider === "zhipuai") {
  if (!ZhipuAIClient.isConfigured(config)) {
    throw new Error("ZHIPUAI_API_KEY required when provider is 'zhipuai'");
  }
  const result = await analyzeWithZhipuAI({
    source: args.source as string,
    focus: args.focus as string | undefined,
    detail: (args.detail as string) || "detailed",
    model: (args as any).zhipuai_model || "glm-4.6v-flash",
    config,
  });
  return {
    content: [{ type: "text" as const, text: formatAnalysisResult(result, args.focus as string | undefined) }],
    isError: false,
  };
}
```

**d)** Update tool description to mention ZhipuAI.

## Todo

- [ ] Create `src/tools/eyes/providers/zhipuai-vision-provider.ts`
- [ ] Add provider param to `eyes_analyze` schema
- [ ] Add routing to `handleOptimizedAnalyze()`
- [ ] Update tool description
- [ ] Run `bun run build`

## Success Criteria

- `eyes_analyze` with `provider: "zhipuai"` calls GLM-4.6V API
- Default (no provider) still uses Gemini
- Supports URL, base64, and file path images
- Returns format compatible with `formatAnalysisResult()`
- Build passes

## Notes

- Only `eyes_analyze` gets ZhipuAI support. Document tools remain Gemini-only.
- `glm-4.6v-flash` is FREE -- excellent default
