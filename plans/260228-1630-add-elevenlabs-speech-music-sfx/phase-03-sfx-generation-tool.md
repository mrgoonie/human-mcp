# Phase 3: Sound Effects Generation Tool

## Context Links

- [ElevenLabs SFX API](../research/260228-elevenlabs-sound-effects-music-api.md#sound-effects-generation-api)
- [Minimax Music Provider Reference](../../src/tools/hands/providers/minimax-music-provider.ts)
- [File Storage Utility](../../src/utils/file-storage.ts)
- [Response Formatter](../../src/utils/response-formatter.ts)

## Overview

- **Priority:** High
- **Status:** ✅ Complete
- **Depends on:** Phase 1 (config + client)
- **Description:** Create a new `elevenlabs_gen_sfx` tool under Hands that generates sound effects from text prompts via ElevenLabs Sound Generation API.

## Key Insights

- Endpoint: `POST /v1/sound-generation`
- Model: `eleven_text_to_sound_v2` (default, only production model)
- Duration: 0.5-30 seconds (auto if omitted)
- Looping support via `loop: true` (v2 model only)
- `prompt_influence`: 0-1 (default 0.3), higher = follows prompt more literally
- Response: binary audio stream (`application/octet-stream`)
- Output format via `output_format` query param (default: `mp3_44100_128`)
- Paid plans only (billed per generation)

## Requirements

### Functional
- Accept text prompt, duration_seconds, prompt_influence, loop, output_format
- POST to `/v1/sound-generation?output_format=mp3_44100_128`
- Save binary audio to file via `saveBase64ToFile()`
- Return result with filePath, fileUrl, metadata
- Tool registered as `elevenlabs_gen_sfx` in Hands

### Non-Functional
- Provider file under 100 lines
- Follow `minimax-music-provider.ts` pattern for file saving

## Architecture

```
hands/index.ts
  |-- elevenlabs_gen_sfx tool
  |     |
  |     v
  |   handleSfxGeneration()
  |     |-- parse SfxGenerationInputSchema
  |     |-- ElevenLabsClient.postBinary("/v1/sound-generation", ...)
  |     |-- Buffer -> base64 -> saveBase64ToFile()
  |     |-- formatMediaResponse()
```

## Related Code Files

### Files to Create
- `src/tools/hands/providers/elevenlabs-sfx-provider.ts`

### Files to Modify (handled in Phase 5)
- `src/tools/hands/schemas.ts` -- add `SfxGenerationInputSchema`
- `src/tools/hands/index.ts` -- register `elevenlabs_gen_sfx` tool

## Implementation Steps

### Step 1: Create `src/tools/hands/providers/elevenlabs-sfx-provider.ts`

```typescript
/**
 * ElevenLabs Sound Effects Provider
 * Text-to-sound-effects via ElevenLabs Sound Generation API
 */
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export interface ElevenLabsSfxOptions {
  text: string;
  duration_seconds?: number;
  prompt_influence?: number;
  loop?: boolean;
  config: Config;
}

export interface SfxGenerationResult {
  audioUrl: string;
  format: string;
  model: string;
  duration?: number;
  generationTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export async function generateElevenLabsSfx(
  options: ElevenLabsSfxOptions
): Promise<SfxGenerationResult> {
  const startTime = Date.now();

  const {
    text,
    duration_seconds,
    prompt_influence = 0.3,
    loop = false,
    config,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new APIError("Text prompt is required for SFX generation");
  }

  const client = new ElevenLabsClient(config);

  const body: Record<string, unknown> = {
    text,
    model_id: "eleven_text_to_sound_v2",
    prompt_influence,
    loop,
  };
  if (duration_seconds !== undefined) {
    body.duration_seconds = duration_seconds;
  }

  logger.info(
    `ElevenLabs SFX: "${text.substring(0, 60)}..." duration=${duration_seconds ?? "auto"} loop=${loop}`
  );

  const audioBuffer = await client.postBinary(
    "/v1/sound-generation",
    body,
    { output_format: "mp3_44100_128" },
    60000
  );

  const audioBase64 = audioBuffer.toString("base64");

  // Save to file
  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const savedFile = await saveBase64ToFile(audioBase64, "audio/mpeg", config, {
      prefix: "elevenlabs-sfx",
      uploadToR2: !!(config.cloudflare?.accessKey),
    });
    filePath = savedFile.filePath;
    fileName = savedFile.fileName;
    fileUrl = savedFile.url;
    fileSize = savedFile.size;
    logger.info(`SFX saved: ${filePath}`);
  } catch (error) {
    logger.warn(`Failed to save SFX file: ${error}`);
  }

  const generationTime = Date.now() - startTime;

  return {
    audioUrl: fileUrl || filePath || "SFX generated (no file path)",
    format: "mp3",
    model: "eleven_text_to_sound_v2",
    duration: duration_seconds,
    generationTime,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}
```

## Todo List

- [x] Create `src/tools/hands/providers/elevenlabs-sfx-provider.ts`
- [x] Verify TypeScript compilation
- [x] Test with sample SFX prompt (manual, requires API key)

## Success Criteria

- `generateElevenLabsSfx()` returns valid `SfxGenerationResult`
- Audio file saved locally as MP3
- Optional R2 upload works when configured
- Handles missing duration (auto mode)
- Handles loop parameter
- Clear error on missing API key

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SFX generation takes too long (30s clip) | Low | 60s timeout sufficient |
| Paid plan required | Low | Error message explains requirement |
| Empty or bad prompt returns poor audio | Low | User responsibility; prompt_influence helps |

## Security Considerations

- Text prompts not logged beyond first 60 chars
- Binary audio data handled as Buffer, not exposed in logs
