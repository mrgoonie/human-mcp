# Plan: Add ZhipuAI (Z.AI / GLM) Model Support

**Date:** 2026-02-28
**Plan Dir:** `plans/260228-1600-add-zhipuai-glm-models-to-all-capabilities/`
**Research:**
- `plans/research/260228-zhipuai-glm-api-research.md`
- `plans/research/260228-zhipuai-cogview-cogvideo-research.md`
- `plans/reports/scout-glm-provider-report.md`
**Related Plans:**
- `plans/260228-1500-add-gemini-3-models-to-eyes-and-hands/plan.md`
- `plans/260228-1530-add-minimax-models-to-speech-music-video/plan.md`

---

## Overview

Add ZhipuAI (Z.AI) as a provider across all four Human MCP capabilities, following the **exact same pattern** as the existing Minimax integration.

| Capability | Tool | ZhipuAI Model | Price |
|---|---|---|---|
| **Vision** | `eyes_analyze` | `glm-4.6v` / `glm-4.6v-flash` (FREE) | $0-$0.30/1M tokens |
| **Image Gen** | `gemini_gen_image` | `cogview-4-250304` | $0.01/image |
| **Video Gen** | `gemini_gen_video` / `gemini_image_to_video` | `cogvideox-3` | $0.20/video |
| **Speech** | `mouth_speak` | `glm-tts` | ~$0.03/1K chars |

## Architecture (Matches Existing Minimax Pattern)

```
src/
  utils/
    zhipuai-client.ts               # NEW - HTTP client (like minimax-client.ts)
    config.ts                        # MODIFY - add zhipuai config + extend providers
  tools/
    eyes/
      providers/
        zhipuai-vision-provider.ts   # NEW - GLM-4.6V vision
      index.ts                       # MODIFY - add provider routing to eyes_analyze
    hands/
      providers/
        zhipuai-image-provider.ts    # NEW - CogView-4 image gen
        zhipuai-video-provider.ts    # NEW - CogVideoX-3 video gen
      processors/
        image-generator.ts           # MODIFY - add provider routing (like video-generator.ts)
        video-generator.ts           # MODIFY - extend provider routing
      index.ts                       # MODIFY - extend provider enums in tool schemas
    mouth/
      providers/
        zhipuai-speech-provider.ts   # NEW - GLM-TTS
      processors/
        speech-synthesis.ts          # MODIFY - extend provider routing
      index.ts                       # MODIFY - extend provider enum in mouth_speak
```

## Key Constraints

- **Follows Minimax pattern exactly** -- standalone client + processor routing + provider files
- **Backwards compatible** -- default provider stays "gemini"
- **Extends existing enums** -- `["gemini", "minimax"]` → `["gemini", "minimax", "zhipuai"]`
- **Files under 200 lines** -- modular provider files
- **No SDK dependencies** -- direct HTTP calls via ZhipuAIClient
- **Two base URLs**: `open.bigmodel.cn` (default, supports all APIs) and `api.z.ai` (international)
- **Async video** -- CogVideoX uses submit→poll→download (like Minimax Hailuo)
- **TTS char limit** -- GLM-TTS max 1024 chars/request, auto-chunk longer text
- **Storage reuse** -- uses existing `saveBase64ToFile()` and `createAudioStorage()`

## Phases

| # | Phase | Status | File |
|---|---|---|---|
| 1 | Config + ZhipuAI HTTP client | Done | [phase-01](phase-01-config-and-zhipuai-client.md) |
| 2 | Vision provider (Eyes) | Done | [phase-02](phase-02-vision-provider.md) |
| 3 | Image generation provider (Hands) | Done | [phase-03](phase-03-image-generation-provider.md) |
| 4 | Video generation provider (Hands) | Done | [phase-04](phase-04-video-generation-provider.md) |
| 5 | Speech provider (Mouth) | **Skipped** | [phase-05](phase-05-speech-provider.md) |
| 6 | .env.example + docs update | Done | [phase-06](phase-06-env-and-docs-update.md) |
| 7 | Tests + build verification | Done | [phase-07](phase-07-tests-and-build.md) |

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| ZhipuAI API unavailable | Medium | Graceful error; Gemini remains default |
| Two base URLs confusion | Low | Configurable via `ZHIPUAI_API_HOST` |
| Async video polling timeout | Low | 15-min max timeout with 10s interval |
| TTS 1024 char limit | Low | Auto-chunking with concatenation |
| Image URL expiry (30 days) | Low | Download and save immediately |

## Success Criteria

- [x] `ZHIPUAI_API_KEY` env var enables ZhipuAI provider
- [x] `eyes_analyze` with `provider: "zhipuai"` works via GLM-4.6V
- [x] `gemini_gen_image` with `provider: "zhipuai"` works via CogView-4
- [x] `gemini_gen_video` with `provider: "zhipuai"` works via CogVideoX-3
- [ ] `mouth_speak` with `provider: "zhipuai"` works via GLM-TTS — **Skipped (Phase 5)**
- [x] All existing tools work unchanged (default = "gemini")
- [x] `bun run build` passes
- [x] `bun test` passes
