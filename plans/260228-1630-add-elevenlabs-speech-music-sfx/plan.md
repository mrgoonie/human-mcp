# Plan: Add ElevenLabs as Provider (Speech, SFX, Music)

**Date:** 2026-02-28
**Priority:** High
**Status:** ✅ Complete - All Phases Implemented, Tested, and Approved

## Overview

Integrate ElevenLabs APIs into Human MCP: add `provider: "elevenlabs"` to existing `mouth_speak` TTS tool, and create two new Hands tools (`elevenlabs_gen_sfx`, `elevenlabs_gen_music`). No SDK -- direct HTTP calls via a shared `ElevenLabsClient`. Auth via `xi-api-key` header. Binary audio responses saved as MP3.

## Research Reports

- [ElevenLabs API Report](../reports/researcher-elevenlabs-report.md)
- [SFX & Music API Report](../research/260228-elevenlabs-sound-effects-music-api.md)
- [Red-Team Review](red-team-review.md) -- 1 CRITICAL (fixed), 3 HIGH (fixed), 4 MEDIUM, 2 LOW
- [Code Review Report](code-review-report.md) -- Score: 8.5/10, Status: APPROVED FOR MERGE

## Phases

| # | Phase | Files | Status |
|---|-------|-------|--------|
| 1 | [Config + HTTP Client](phase-01-config-and-elevenlabs-client.md) | config.ts, elevenlabs-client.ts | ✅ Complete |
| 2 | [Speech Provider](phase-02-speech-provider-integration.md) | elevenlabs-speech-provider.ts | ✅ Complete |
| 3 | [SFX Tool](phase-03-sfx-generation-tool.md) | elevenlabs-sfx-provider.ts | ✅ Complete |
| 4 | [Music Tool](phase-04-music-generation-tool.md) | elevenlabs-music-provider.ts | ✅ Complete |
| 5 | [Schemas + Registration](phase-05-schemas-and-tool-registration.md) | schemas.ts, index.ts (mouth + hands) | ✅ Complete |
| 6 | [Env + Docs](phase-06-env-and-docs-update.md) | .env.example, docs/ | ✅ Complete |
| 7 | [Tests + Build](phase-07-tests-and-build-verification.md) | tests/, build scripts | ✅ Complete |

## Key Dependencies

- Phase 1 must complete first (config + client used everywhere)
- Phase 2-4 can run in parallel after Phase 1
- Phase 5 depends on Phase 2-4 (registers providers into tools)
- Phase 6-7 run last

## Key Design Decisions

1. **No SDK** -- direct HTTP via `ElevenLabsClient` (matches `MinimaxClient` pattern)
2. **Binary responses** -- ElevenLabs returns raw audio, not JSON with URLs. Client must handle `arrayBuffer()` not `json()`.
3. **MP3 default** -- output format `mp3_44100_128` for all endpoints
4. **Voice IDs** -- opaque strings, not human-readable names. Provide curated defaults.
5. **Timeout** -- 60s for TTS/SFX, 300s for music (up to 10min tracks)
6. **4 new source files, 2 new test files, 7 modified files** -- minimal footprint

## New Tool Count

- `mouth_speak` -- extended with `provider: "elevenlabs"` (existing tool)
- `elevenlabs_gen_sfx` -- new Hands tool (sound effects)
- `elevenlabs_gen_music` -- new Hands tool (music generation)

**Total tools after: 29 (currently 27 + 2 new SFX/Music tools)**

## Implementation Summary

**Status:** ✅ All phases complete. Tests pass. Build succeeds.

**Files Created:**
- ✅ `src/utils/elevenlabs-client.ts` (144 lines)
- ✅ `src/tools/mouth/providers/elevenlabs-speech-provider.ts` (146 lines)
- ✅ `src/tools/hands/providers/elevenlabs-sfx-provider.ts` (106 lines)
- ✅ `src/tools/hands/providers/elevenlabs-music-provider.ts` (107 lines)
- ✅ `tests/unit/elevenlabs-client.test.ts` (66 lines, 6 tests)
- ✅ `tests/unit/elevenlabs-schemas.test.ts` (74 lines, 11 tests)

**Files Modified:**
- ✅ `src/utils/config.ts` (added elevenlabs section + provider enum)
- ✅ `src/tools/mouth/processors/speech-synthesis.ts` (provider routing)
- ✅ `src/tools/mouth/schemas.ts` (7 new ElevenLabs params)
- ✅ `src/tools/mouth/index.ts` (extended mouth_speak schema)
- ✅ `src/tools/hands/schemas.ts` (2 new schemas)
- ✅ `src/tools/hands/index.ts` (2 new tools registered)
- ✅ `.env.example` (ElevenLabs env vars documented)

**Test Results:**
- ✅ 17 tests pass, 31 assertions
- ✅ Build succeeds (npm run build)
- ⚠️ 1 TypeScript error in unrelated file (zhipuai-video-provider.ts)

**Code Quality Score:** 8.5/10 (see [code-review-report.md](code-review-report.md))

## Risk Summary

| Risk | Status | Resolution |
|------|--------|------------|
| Binary response handling differs from Minimax | ✅ Mitigated | Separate `postBinary()` method works correctly |
| Music generation timeout (10min tracks) | ✅ Mitigated | 300s timeout, tested |
| ElevenLabs rate limits (2-15 concurrent) | ✅ Acceptable | Error handling captures rate limit errors |
| API key required for SFX/Music (paid only) | ✅ Documented | Clear error messages, optional config |

## Next Steps

1. **Fix unrelated TypeScript error:** `zhipuai-video-provider.ts:62` (separate PR)
2. **Optional improvements:** See code-review-report.md "Recommended Actions"
3. **Ready to merge:** All critical and high-priority red-team findings resolved
