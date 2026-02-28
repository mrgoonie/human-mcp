# Phase 4: Music Generation Tool

## Context Links

- [ElevenLabs Music API](../research/260228-elevenlabs-sound-effects-music-api.md#music-generation-api)
- [Minimax Music Provider Reference](../../src/tools/hands/providers/minimax-music-provider.ts)
- [File Storage Utility](../../src/utils/file-storage.ts)

## Overview

- **Priority:** High
- **Status:** ✅ Complete
- **Depends on:** Phase 1 (config + client)
- **Description:** Create a new `elevenlabs_gen_music` tool under Hands that generates music tracks from text prompts via ElevenLabs Music API.

## Key Insights

- Endpoint: `POST /v1/music`
- Model: `music_v1` (only model currently)
- Duration: 3,000 - 600,000 ms (3s to 10min)
- `prompt` and `composition_plan` are mutually exclusive -- start with `prompt` only (YAGNI)
- `force_instrumental: true` removes vocals
- Response: binary audio stream
- **Long generation times** for tracks > 1 min. Set 300s timeout.
- Paid plans only
- Output format via `output_format` query param

## Requirements

### Functional
- Accept prompt, music_length_ms, force_instrumental
- POST to `/v1/music?output_format=mp3_44100_128`
- Save binary audio to file via `saveBase64ToFile()`
- Return result with filePath, fileUrl, metadata
- Tool registered as `elevenlabs_gen_music` in Hands

### Non-Functional
- Provider file under 100 lines
- 300s (5 min) timeout for music generation
- Follow `minimax-music-provider.ts` pattern

## Architecture

```
hands/index.ts
  |-- elevenlabs_gen_music tool
  |     |
  |     v
  |   handleElevenLabsMusicGeneration()
  |     |-- parse ElevenLabsMusicGenerationInputSchema
  |     |-- ElevenLabsClient.postBinary("/v1/music", ...)
  |     |-- Buffer -> base64 -> saveBase64ToFile()
  |     |-- formatMediaResponse()
```

## Related Code Files

### Files to Create
- `src/tools/hands/providers/elevenlabs-music-provider.ts`

### Files to Modify (handled in Phase 5)
- `src/tools/hands/schemas.ts` -- add `ElevenLabsMusicGenerationInputSchema`
- `src/tools/hands/index.ts` -- register `elevenlabs_gen_music` tool

## Implementation Steps

### Step 1: Create `src/tools/hands/providers/elevenlabs-music-provider.ts`

```typescript
/**
 * ElevenLabs Music Generation Provider
 * Full song composition from text prompts
 */
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export interface ElevenLabsMusicOptions {
  prompt: string;
  music_length_ms?: number;
  force_instrumental?: boolean;
  config: Config;
}

export interface ElevenLabsMusicResult {
  audioUrl: string;
  format: string;
  model: string;
  duration: number;
  generationTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export async function generateElevenLabsMusic(
  options: ElevenLabsMusicOptions
): Promise<ElevenLabsMusicResult> {
  const startTime = Date.now();

  const {
    prompt,
    music_length_ms = 30000,
    force_instrumental = false,
    config,
  } = options;

  if (!prompt || prompt.trim().length === 0) {
    throw new APIError("Prompt is required for music generation");
  }

  if (music_length_ms < 3000 || music_length_ms > 600000) {
    throw new APIError("music_length_ms must be between 3000 (3s) and 600000 (10min)");
  }

  const client = new ElevenLabsClient(config);

  const body: Record<string, unknown> = {
    prompt,
    music_length_ms,
    model_id: "music_v1",
    force_instrumental,
  };

  logger.info(
    `ElevenLabs Music: "${prompt.substring(0, 60)}..." length=${music_length_ms}ms instrumental=${force_instrumental}`
  );

  // 5 min timeout for long tracks
  const audioBuffer = await client.postBinary(
    "/v1/music",
    body,
    { output_format: "mp3_44100_128" },
    300000
  );

  const audioBase64 = audioBuffer.toString("base64");

  // Save to file
  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const savedFile = await saveBase64ToFile(audioBase64, "audio/mpeg", config, {
      prefix: "elevenlabs-music",
      uploadToR2: !!(config.cloudflare?.accessKey),
    });
    filePath = savedFile.filePath;
    fileName = savedFile.fileName;
    fileUrl = savedFile.url;
    fileSize = savedFile.size;
    logger.info(`Music saved: ${filePath}`);
  } catch (error) {
    logger.warn(`Failed to save music file: ${error}`);
  }

  const generationTime = Date.now() - startTime;
  const durationSec = music_length_ms / 1000;

  return {
    audioUrl: fileUrl || filePath || "Music generated (no file path)",
    format: "mp3",
    model: "music_v1",
    duration: durationSec,
    generationTime,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}
```

## Todo List

- [x] Create `src/tools/hands/providers/elevenlabs-music-provider.ts`
- [x] Verify TypeScript compilation
- [x] Test with sample music prompt (manual, requires paid API key)

## Success Criteria

- `generateElevenLabsMusic()` returns valid `ElevenLabsMusicResult`
- Audio file saved locally as MP3
- 300s timeout handles long tracks without aborting
- Validates duration range (3s-10min)
- `force_instrumental` flag works correctly
- Clear error on missing API key or insufficient credits

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Long generation time for 10-min tracks | Medium | 300s timeout; user warned about long waits |
| Paid plan required | Low | Error message explains requirement |
| Bad prompt rejected by API | Low | API returns 422 with suggestion; ElevenLabsApiError captures it |
| Large audio file for 10-min tracks (~15MB MP3) | Low | Saved to disk, not kept in memory |

## Security Considerations

- Prompt text not logged beyond first 60 chars
- No user content sent to third parties beyond what user explicitly provides
