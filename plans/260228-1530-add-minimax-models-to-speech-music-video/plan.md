# Plan: Add Minimax Model Support (Speech 2.6, Music 2.5, Hailuo 2.3 Video)

**Date:** 2026-02-28
**Revised:** 2026-02-28 (post red-team review)
**Plan Dir:** `plans/260228-1530-add-minimax-models-to-speech-music-video/`
**Research:**
- `plans/research/260228-minimax-speech-music-api-research.md`
- `plans/research/260228-minimax-hailuo-video-api-research.md`
- `plans/reports/researcher-minimax-models-report.md`
**Red Team:** `reports/red-team-review.md`

---

## Overview

Add Minimax as an alternative AI provider for three capabilities in Human MCP:

| Capability | Existing Tool | Integration Type | Minimax Model |
|---|---|---|---|
| **Speech (TTS)** | `mouth_speak` | Add `provider` param | `speech-2.6-hd` / `speech-2.6-turbo` |
| **Music** | NEW | New `minimax_gen_music` tool | `music-2.5` |
| **Video** | `gemini_gen_video`, `gemini_image_to_video` | Add `provider` param | `MiniMax-Hailuo-2.3` / `2.3-Fast` |

## Red-Team Resolutions

| Issue | Resolution |
|---|---|
| C1: Circular Phase 2↔5 dependency | **FIXED** -- Move audio/file-storage fixes from Phase 5 → Phase 1 |
| C2: Missing type fields for providers | **FIXED** -- Extend SpeechOptions & VideoGenerationOptions with optional provider fields |
| C3: Inline schema strips provider params | **FIXED** -- Add provider fields to all inline Zod schemas |
| M1: File size violations (1348/354 lines) | **NOTED** -- Extract music handler into separate file; existing debt acknowledged |
| M2: R2 upload hardcoded content type | **FIXED** -- Pass format to uploadToCloudflare() |
| M3: Inconsistent schema strategy | **FIXED** -- Add provider fields to both schema files AND inline registrations |
| L1: Test missing beforeAll import | **FIXED** -- Add to import |

## Key Constraints

- **Backwards compatible** -- existing Gemini tools work unchanged by default
- **Provider is opt-in** via env var OR per-request `provider` parameter
- **No breaking changes** -- default provider stays "gemini"
- **Files under 200 lines** -- modularize into separate provider files
- **YAGNI/KISS/DRY** -- direct HTTP calls (no SDK dependencies)
- **Hex encoding** for Minimax audio (NOT base64)
- **URL-based output** preferred for Minimax (`output_format: "url"`)
- **Rate limits** -- 5 RPM video, 60 RPM speech, 120 RPM music

## Phases

| # | Phase | Status | File |
|---|---|---|---|
| 1 | Config + Minimax client + storage fixes | Done | [phase-01](phase-01-config-and-minimax-client.md) |
| 2 | Speech provider integration | Done | [phase-02-speech-provider-integration.md](phase-02-speech-provider-integration.md) |
| 3 | Music generation tool (NEW) | Done | [phase-03-music-generation-tool.md](phase-03-music-generation-tool.md) |
| 4 | Video provider integration | Done | [phase-04-video-provider-integration.md](phase-04-video-provider-integration.md) |
| 5 | Schemas + tool registration | Done | [phase-05-schemas-and-tool-registration.md](phase-05-schemas-and-tool-registration.md) |
| 6 | .env.example + docs update | Done | [phase-06-env-and-docs-update.md](phase-06-env-and-docs-update.md) |
| 7 | Tests + build verification | Done | [phase-07-tests-and-build-verification.md](phase-07-tests-and-build-verification.md) |

## Architecture

```
src/
  tools/
    mouth/
      providers/
        minimax-speech-provider.ts    # NEW - Minimax Speech 2.6 API
      utils/
        audio-storage.ts              # MODIFY - MP3 format bypass
      index.ts                         # MODIFY - add provider routing
      schemas.ts                       # MODIFY - add provider param
    hands/
      providers/
        minimax-video-provider.ts      # NEW - Minimax Hailuo 2.3 API
        minimax-music-provider.ts      # NEW - Minimax Music 2.5 API
      handlers/
        music-handler.ts               # NEW - extracted music handler (M1 fix)
      index.ts                         # MODIFY - add provider routing + new tool
      schemas.ts                       # MODIFY - add provider param + music schema
  utils/
    minimax-client.ts                  # NEW - shared HTTP client for Minimax API
    config.ts                          # MODIFY - add minimax config section
    file-storage.ts                    # MODIFY - add audio MIME types
```

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Minimax API unavailable | Medium | Graceful fallback error; Gemini remains default |
| Hex encoding bugs | Medium | Unit test for hex-to-buffer conversion |
| Video polling timeout | Low | 15-min max timeout with configurable interval |
| Rate limit (5 RPM video) | Low | Log warnings; leave throttling to caller |
| Music API long response times | Low | Configurable timeout (default 5 min for music) |

## Success Criteria

- [x] `MINIMAX_API_KEY` env var enables Minimax provider
- [x] `mouth_speak` with `provider: "minimax"` generates speech via Speech 2.6
- [x] `minimax_gen_music` tool generates music via Music 2.5
- [x] `gemini_gen_video` with `provider: "minimax"` generates video via Hailuo 2.3
- [x] `gemini_image_to_video` with `provider: "minimax"` generates I2V via Hailuo 2.3
- [x] All existing Gemini tools work unchanged (default provider = "gemini")
- [x] `bun run build` passes
- [x] `bun test` passes
- [x] `.env.example` updated with Minimax config
