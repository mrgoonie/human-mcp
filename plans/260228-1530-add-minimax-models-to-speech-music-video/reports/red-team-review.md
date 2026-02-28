# Red-Team Review: Add Minimax Models (Speech, Music, Video)

**Reviewer:** Red-Team Agent
**Date:** 2026-02-28
**Plan:** `plans/260228-1530-add-minimax-models-to-speech-music-video/plan.md`

---

## Summary

7 issues found: **3 CRITICAL**, **3 MEDIUM**, **1 LOW**. Plan is solid architecturally but has dependency ordering problems, type safety gaps, and file size violations that will cause build failures or runtime errors if not fixed.

---

## CRITICAL Issues

### C1. Circular Dependency Between Phase 2 and Phase 5

**Problem:** Phase 2 (speech provider) calls `audioStorage.storeAudio({ format: "mp3" })` but `storeAudio()` at `audio-storage.ts:130-137` unconditionally calls `convertPcmToWav()`. The MP3 format bypass is planned for Phase 5, which depends on "Phase 1-4". Phase 2 will crash at runtime without Phase 5's fix.

**Same issue for Phase 3**: `minimax-music-provider.ts` calls `saveBase64ToFile("...", "audio/mpeg", ...)` but `getExtensionFromMimeType()` at `file-storage.ts:103-118` lacks audio MIME types. Falls back to `.jpg` extension for music files.

**Fix:** Move audio-storage format bypass and file-storage MIME mappings from Phase 5 into Phase 1 (foundation). These are prerequisites, not cross-cutting concerns.

### C2. VideoGenerationOptions Type Missing Provider Fields

**Problem:** Phase 4 adds `provider`, `minimax_model`, `resolution`, `prompt_optimizer` to `generationOptions` in `handleVideoGeneration()` (hands/index.ts:704-719), but the `VideoGenerationOptions` interface (hands/schemas.ts:74-90) doesn't include these fields. TypeScript will reject this at build time.

**Same issue for SpeechOptions:** `SpeechOptions` interface (speech-synthesis.ts:8-17) doesn't include `provider`, `minimax_voice`, etc. Plan uses `(options as any)` casts throughout.

**Fix:** Either extend `VideoGenerationOptions` and `SpeechOptions` interfaces with optional provider fields, or create separate Minimax option types. Don't use `as any` -- it defeats type safety.

### C3. handleImageToVideoGeneration Inline Schema Won't Parse Provider Params

**Problem:** `handleImageToVideoGeneration()` at hands/index.ts:748-759 uses an inline `z.object({...}).parse(args)` that strips unknown fields. The plan says to add `provider: (args as any).provider` to generationOptions, but `args` is already the parsed result. After `.parse()`, provider fields are gone.

**Fix:** Add provider fields to the inline Zod schema at hands/index.ts:748, or parse raw args before the schema parse.

---

## MEDIUM Issues

### M1. File Size Violations (200-Line Rule)

**Problem:**
- `hands/index.ts` is **1348 lines** -- adding music handler + tool registration adds ~60 more
- `mouth/index.ts` is **354 lines** -- adding provider params to schema adds ~20 more
- Plan constraint says "Files under 200 lines" but doesn't address this

**Fix:** Plan should note these files already exceed limits. Extract `handleMusicGeneration` into a separate handler file (e.g., `hands/handlers/music-handler.ts`) and consider handler extraction for mouth tools too. Don't make it worse.

### M2. AudioStorage R2 Upload Uses Hardcoded Content Type

**Problem:** `audio-storage.ts:259` sets `ContentType: 'audio/wav'` for all R2 uploads. When uploading Minimax MP3 audio, the content type is wrong. R2 would serve the file with incorrect MIME type headers.

**Fix:** Pass the format to `uploadToCloudflare()` and set correct content type based on format.

### M3. Inconsistent Schema Strategy (Inline vs File)

**Problem:**
- Phase 2 adds provider fields to both `schemas.ts` AND the inline inputSchema in `index.ts` -- good
- Phase 4 adds provider fields ONLY to inline inputSchema in `index.ts`, not to `VideoGenerationInputSchema` in `schemas.ts` -- inconsistent
- `handleVideoGeneration()` at line 699 does `VideoGenerationInputSchema.parse(args)` which will strip provider fields

**Fix:** Either consistently add provider fields to schema files too, or consistently parse raw args separately. Pick one approach and use it everywhere.

---

## LOW Issues

### L1. Test File Missing Import

**Problem:** `file-storage-audio.test.ts` (Phase 7) uses `beforeAll` but only imports `afterAll` from `bun:test`. Will fail at runtime.

**Fix:** Add `beforeAll` to the import destructure.

---

## Verification Checks Passed

- Config schema changes are additive and backwards compatible
- MinimaxClient class design is clean (post/get/downloadBuffer/checkError)
- Error code mapping covers all documented Minimax error codes
- Music schema validation ranges match API limits (lyrics 1-3500, prompt 0-2000)
- Video polling logic is correct (10s interval, 15-min max, correct status checks)
- Hailuo 2.3 Fast I2V-only validation is correct
- 1080P + 10s duration validation is correct
- No security issues (API key handling, no secrets logged)
- .env.example uses placeholder values

---

## Recommended Resolution Matrix

| ID | Severity | Phase | Resolution |
|---|---|---|---|
| C1 | CRITICAL | Phase 1 + 5 | Move audio/file-storage fixes from Phase 5 → Phase 1 |
| C2 | CRITICAL | Phase 2 + 4 | Extend SpeechOptions and VideoGenerationOptions types |
| C3 | CRITICAL | Phase 4 | Add provider params to inline schema at hands/index.ts:748 |
| M1 | MEDIUM | Phase 3 + 4 | Extract music handler; note existing file size debt |
| M2 | MEDIUM | Phase 5 | Pass format to uploadToCloudflare() for correct MIME |
| M3 | MEDIUM | Phase 2 + 4 | Standardize: add provider fields to both schema files AND inline |
| L1 | LOW | Phase 7 | Add `beforeAll` to test import |
