# Phase 5: Speech Provider (Mouth)

**Priority:** High | **Effort:** Medium
**Depends on:** Phase 1

## Context

- [plan.md](plan.md)
- Reference: `src/tools/mouth/providers/minimax-speech-provider.ts` -- exact pattern to follow
- Reference: `src/tools/mouth/processors/speech-synthesis.ts` -- extend existing routing
- ZhipuAI TTS: GLM-TTS uses `POST /audio/speech`

## Overview

Add ZhipuAI as speech provider for `mouth_speak`. Speech already has Minimax routing -- extend with ZhipuAI. GLM-TTS has a 1024-char limit per request, requiring auto-chunking.

## Key API Details

- **Endpoint:** `POST /audio/speech`
- **Model:** `glm-tts`
- **Voices:** `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`, `Coral`
- **Output:** Binary audio stream (MP3)
- **Max chars/request:** 1024
- **Price:** ~$0.03/1K chars

## Files to Modify/Create

- `src/tools/mouth/providers/zhipuai-speech-provider.ts` -- NEW
- `src/tools/mouth/processors/speech-synthesis.ts` -- MODIFY (extend routing)
- `src/tools/mouth/index.ts` -- MODIFY (extend provider enum)

## Implementation Steps

### 1. Create `src/tools/mouth/providers/zhipuai-speech-provider.ts`

Export `generateZhipuAISpeech(options) → Promise<SpeechGenerationResult>`

Follow `minimax-speech-provider.ts` pattern exactly:
1. Validate text, auto-chunk if > 1024 chars
2. For each chunk: `POST /audio/speech` → binary MP3 response
3. Note: GLM-TTS returns binary directly (NOT JSON with URL like Minimax)
4. Need raw `fetch()` for binary response (not `client.post()`)
5. Concatenate audio buffers
6. Convert to base64
7. Save via `createAudioStorage(config)` (reuse existing utility)
8. Return `SpeechGenerationResult` matching existing type from `mouth/schemas.ts`

Text chunking: split at sentence boundaries (`. `, `! `, `? `, `, `, or space).

### 2. Modify `src/tools/mouth/processors/speech-synthesis.ts`

Add ZhipuAI routing after existing Minimax block (~line 58):

```typescript
import { generateZhipuAISpeech } from "../providers/zhipuai-speech-provider.js";
import { ZhipuAIClient } from "@/utils/zhipuai-client.js";

// After minimax block:
if (provider === "zhipuai") {
  if (!ZhipuAIClient.isConfigured(config)) {
    throw new APIError("ZHIPUAI_API_KEY required when provider is 'zhipuai'");
  }
  return generateZhipuAISpeech({
    text,
    voice: (options as any).zhipuai_voice || "alloy",
    model: "glm-tts",
    speed: (options as any).speed,
    config,
  });
}
```

### 3. Modify `src/tools/mouth/index.ts`

Extend provider enum in `mouth_speak`:

```typescript
// Change from: z.enum(["gemini", "minimax"])
// To:
provider: z.enum(["gemini", "minimax", "zhipuai"]).optional().describe("Speech provider"),
zhipuai_voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer", "Coral"]).optional().describe("ZhipuAI TTS voice"),
```

Update tool description to mention ZhipuAI.

## Todo

- [ ] Create `src/tools/mouth/providers/zhipuai-speech-provider.ts`
- [ ] Add ZhipuAI routing to `speech-synthesis.ts`
- [ ] Extend provider enum in `mouth_speak` schema
- [ ] Add `zhipuai_voice` param
- [ ] Run `bun run build`

## Success Criteria

- `mouth_speak` with `provider: "zhipuai"` calls GLM-TTS
- Auto-chunking works for text > 1024 chars
- Audio saved via `createAudioStorage()` (matching Minimax pattern)
- Returns `SpeechGenerationResult` type (same as Gemini/Minimax)
- Default remains "gemini"
- Build passes
