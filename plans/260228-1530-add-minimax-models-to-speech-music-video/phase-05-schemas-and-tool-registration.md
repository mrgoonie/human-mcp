# Phase 5: Cross-Cutting Schema Updates and File Storage Fixes

**Priority:** Medium | **Status:** Pending | **Effort:** Small
**Depends on:** Phase 1, Phase 2, Phase 3, Phase 4 (all schemas must be consistent)

## Context

- [plan.md](plan.md)
- [Phase 2 - Speech schemas](phase-02-speech-provider-integration.md)
- [Phase 3 - Music schemas](phase-03-music-generation-tool.md)
- [Phase 4 - Video schemas](phase-04-video-provider-integration.md)

## Overview

This phase handles cross-cutting concerns that span multiple phases: adding audio MIME type mappings to `file-storage.ts`, updating `audio-storage.ts` for non-WAV formats, and verifying all schema/tool-registration changes from Phases 2-4 are consistent. This phase is primarily a consolidation and verification step.

## Key Insights

- `file-storage.ts` `getExtensionFromMimeType()` lacks audio MIME type mappings (`audio/mpeg` -> `.mp3`, `audio/wav` -> `.wav`). Minimax music provider uses `saveBase64ToFile()` with audio MIME types.
- `audio-storage.ts` `storeAudio()` assumes PCM input and runs `convertPcmToWav()`. Minimax speech outputs MP3 directly. Need format-aware bypass.
- All schema changes from Phases 2-4 are additive (new optional fields). No breaking changes to existing types.
- Tool descriptions in `index.ts` should mention Minimax support where applicable.

## Requirements

### Functional
- `saveBase64ToFile()` correctly handles `audio/mpeg` and `audio/wav` MIME types
- `AudioStorage.storeAudio()` writes MP3 directly without PCM conversion
- All tool descriptions updated to mention provider options
- All Zod schemas validated at build time

### Non-functional
- No new files created in this phase
- Changes are purely additive
- Build must pass after all changes

## Related Code Files

### Modify
- `src/utils/file-storage.ts` -- Add audio MIME type mappings
- `src/tools/mouth/utils/audio-storage.ts` -- Add MP3/FLAC format bypass
- `src/tools/hands/index.ts` -- Update tool descriptions to mention Minimax support
- `src/tools/mouth/index.ts` -- Update `mouth_speak` tool description to mention Minimax support

## Implementation Steps

### 1. Update `src/utils/file-storage.ts` -- Add audio MIME mappings

In the `getExtensionFromMimeType()` function, add audio entries to the `extensions` map:

```typescript
// Add to extensions map in getExtensionFromMimeType():
'audio/mpeg': '.mp3',
'audio/mp3': '.mp3',
'audio/wav': '.wav',
'audio/x-wav': '.wav',
'audio/flac': '.flac',
'audio/ogg': '.ogg',
'audio/aac': '.aac',
```

This ensures `saveBase64ToFile()` generates correct file extensions when called from `minimax-music-provider.ts` with `audio/mpeg` MIME type.

### 2. Update `src/tools/mouth/utils/audio-storage.ts` -- MP3 format bypass

In the `storeAudio()` method, add a format check before the PCM-to-WAV conversion. Insert this block **before** the existing `convertPcmToWav()` call:

```typescript
// In storeAudio(), check format before PCM conversion:
if (format === "mp3" || format === "flac" || format === "ogg") {
  // Non-WAV formats: write buffer directly (no PCM conversion needed)
  const audioBuffer = Buffer.from(base64Data, "base64");
  const fs = await import("fs/promises");
  await fs.writeFile(localPath, audioBuffer);
  result.localPath = localPath;
  result.storage.local = true;
  result.size = audioBuffer.length;
  logger.info(`Audio saved locally as ${format.toUpperCase()}: ${localPath}`);
} else {
  // Existing WAV: convert PCM to proper WAV format
  // ... existing convertPcmToWav() code stays here
}
```

Also update the `localPath` construction to use the correct extension:

```typescript
// When building localPath, use format-specific extension:
const ext = format === "mp3" ? ".mp3" : format === "flac" ? ".flac" : ".wav";
const localPath = join(outputDir, `${filename.replace(/\.\w+$/, "")}${ext}`);
```

### 3. Update tool descriptions in `src/tools/hands/index.ts`

Update the `gemini_gen_video` tool description:

```typescript
// From:
description: "Generate videos from text descriptions using Gemini Veo 3.0 API",
// To:
description: "Generate videos from text descriptions using Gemini Veo 3.0 API. Optionally use provider='minimax' for Hailuo 2.3 video generation (requires MINIMAX_API_KEY).",
```

Update the `gemini_image_to_video` tool description:

```typescript
// From:
description: "Generate videos from images and text descriptions using Gemini Imagen + Veo 3.0 APIs",
// To:
description: "Generate videos from images and text descriptions using Gemini Imagen + Veo 3.0 APIs. Optionally use provider='minimax' for Hailuo 2.3/2.3-Fast video generation (requires MINIMAX_API_KEY).",
```

### 4. Update tool description in `src/tools/mouth/index.ts`

Update the `mouth_speak` tool description to mention Minimax:

```typescript
// Update mouth_speak description to mention Minimax support:
description: "Generate speech from text using Gemini TTS. Optionally use provider='minimax' for Minimax Speech 2.6 with 300+ voices and emotion control (requires MINIMAX_API_KEY).",
```

### 5. Verify schema consistency

After all phases are implemented, verify the following at build time:

1. `SpeechInputSchema` in `src/tools/mouth/schemas.ts` has `provider`, `minimax_voice`, `minimax_model`, `minimax_language`, `emotion`, `speed` fields (from Phase 2)
2. `MusicGenerationInputSchema` in `src/tools/hands/schemas.ts` has `lyrics`, `prompt`, `model`, `audio_format`, `sample_rate`, `bitrate` fields (from Phase 3)
3. `VideoGenerationInputSchema` in `src/tools/hands/schemas.ts` -- note: provider params are added inline in `index.ts` tool registrations, not in the schema file (matching existing pattern where tool registrations define their own inline schemas)
4. All new types exported: `MusicGenerationInput`, `MusicGenerationResult` (from Phase 3)

## Todo

- [ ] Add audio MIME type mappings to `src/utils/file-storage.ts`
- [ ] Add MP3 format bypass to `src/tools/mouth/utils/audio-storage.ts`
- [ ] Update `gemini_gen_video` tool description in `src/tools/hands/index.ts`
- [ ] Update `gemini_image_to_video` tool description in `src/tools/hands/index.ts`
- [ ] Update `mouth_speak` tool description in `src/tools/mouth/index.ts`
- [ ] Run `bun run build` to verify all schemas compile correctly

## Success Criteria

- `saveBase64ToFile("...", "audio/mpeg", ...)` creates `.mp3` file (not `.jpg`)
- `AudioStorage.storeAudio()` writes MP3 directly without PCM conversion when format is "mp3"
- All tool descriptions mention Minimax provider option
- Build passes with no type errors

## Risk Assessment

- **Low risk**: All changes are additive to existing utility functions
- **Low risk**: MIME type mapping is a simple dictionary addition
- **Medium risk**: `audio-storage.ts` format bypass must not break existing WAV flow. Mitigation: condition checks format explicitly; default remains WAV

## Security Considerations

- No new security concerns in this phase
- Audio files saved with proper MIME types

## Next Steps

- Phase 6 (.env.example + docs) can proceed after Phase 5
