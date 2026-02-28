# Phase 2: ElevenLabs Speech Provider Integration

## Context Links

- [ElevenLabs TTS API](../reports/researcher-elevenlabs-report.md#1-text-to-speech-api)
- [Minimax Speech Provider Reference](../../src/tools/mouth/providers/minimax-speech-provider.ts)
- [Speech Synthesis Processor](../../src/tools/mouth/processors/speech-synthesis.ts)
- [Audio Storage](../../src/tools/mouth/utils/audio-storage.ts)

## Overview

- **Priority:** High
- **Status:** ✅ Complete
- **Depends on:** Phase 1 (config + client)
- **Description:** Create ElevenLabs speech provider that integrates into the existing `mouth_speak` tool via the same provider routing pattern used for Minimax.

## Key Insights

- ElevenLabs TTS endpoint: `POST /v1/text-to-speech/{voice_id}`
- Voice ID is a path parameter (opaque string), not a body field
- Response is binary audio (not JSON with URL like Minimax)
- Default model: `eleven_multilingual_v2`; newest: `eleven_v3`
- Voice settings (stability, similarity_boost, style, speed) sent in body
- Output format set via `output_format` query param (default: `mp3_44100_128`)
- Max text length varies by model: 5000 (v3), 10000 (multilingual_v2), 40000 (flash/turbo)
- Provide 10 curated default voices with human-readable mapping

## Requirements

### Functional
- Accept text, voice_id, model, voice_settings, and language_code
- POST to `/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`
- Receive binary MP3 buffer
- Convert to base64, store via `createAudioStorage()` as MP3
- Return `SpeechGenerationResult` matching existing interface
- Default voice: Rachel (`21m00Tcm4TlvDq8ikWAM`)

### Non-Functional
- File under 100 lines
- Follow `minimax-speech-provider.ts` structure

## Architecture

```
speech-synthesis.ts (router)
  |-- provider === "elevenlabs"
  |     |
  |     v
  |   elevenlabs-speech-provider.ts
  |     |-- ElevenLabsClient.postBinary("/v1/text-to-speech/{voice_id}", ...)
  |     |-- Buffer -> base64 -> AudioStorage.storeAudio()
  |     |-- return SpeechGenerationResult
  |
  |-- provider === "minimax" (existing)
  |-- provider === "gemini" (existing, default)
```

## Related Code Files

### Files to Create
- `src/tools/mouth/providers/elevenlabs-speech-provider.ts`

### Files to Modify
- `src/tools/mouth/processors/speech-synthesis.ts` (lines 42-58, provider routing)

## Implementation Steps

### Step 1: Create `src/tools/mouth/providers/elevenlabs-speech-provider.ts`

```typescript
/**
 * ElevenLabs Speech Provider
 * Text-to-speech via ElevenLabs TTS API
 */
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";
import type { SpeechGenerationResult } from "../schemas.js";
import { createAudioStorage } from "../utils/audio-storage.js";

export interface ElevenLabsSpeechOptions {
  text: string;
  voice_id?: string;
  model?: string;
  language_code?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  config: Config;
}

/** Default voice: Rachel */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL = "eleven_multilingual_v2";

/**
 * Curated voice name -> ID mapping for convenience.
 * Users can also pass raw voice IDs directly.
 */
export const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  adam: "pNInz6obpgDQGcFmaJgB",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  brian: "nPczCjzI2devNBz1zQrb",
  charlotte: "XB0fDUnXU5powFXDhCwa",
  george: "JBFqnCBsd6RMkjVDRZzb",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  daniel: "onwK4e9ZLuTAKqWW03F9",
};

/** Resolve voice name to ID. Accepts raw IDs or curated names. */
function resolveVoiceId(voiceInput?: string): string {
  if (!voiceInput) return DEFAULT_VOICE_ID;
  const mapped = ELEVENLABS_VOICE_MAP[voiceInput.toLowerCase()];
  return mapped || voiceInput; // pass through if already an ID
}

export async function generateElevenLabsSpeech(
  options: ElevenLabsSpeechOptions
): Promise<SpeechGenerationResult> {
  const startTime = Date.now();

  const {
    text,
    voice_id,
    model = DEFAULT_MODEL,
    language_code,
    stability = 0.5,
    similarity_boost = 0.75,
    style = 0.0,
    speed = 1.0,
    config,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new APIError("Text is required for speech generation");
  }
  if (text.length > 10000) {
    throw new APIError("Text too long for ElevenLabs. Max 10,000 chars (multilingual_v2).");
  }

  const resolvedVoiceId = resolveVoiceId(voice_id);
  const client = new ElevenLabsClient(config);

  const body: Record<string, unknown> = {
    text,
    model_id: model,
    voice_settings: { stability, similarity_boost, style, speed },
  };
  if (language_code) {
    body.language_code = language_code;
  }

  logger.info(
    `ElevenLabs TTS: "${text.substring(0, 50)}..." voice=${resolvedVoiceId} model=${model}`
  );

  const audioBuffer = await client.postBinary(
    `/v1/text-to-speech/${resolvedVoiceId}`,
    body,
    { output_format: "mp3_44100_128" },
    60000
  );

  const audioBase64 = audioBuffer.toString("base64");

  const audioStorage = createAudioStorage(config);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `elevenlabs-speech_${resolvedVoiceId.substring(0, 8)}_${timestamp}.mp3`;

  const storageResult = await audioStorage.storeAudio({
    audioData: audioBase64,
    filename,
    voice: voice_id || "rachel",
    language: language_code || "en",
    text,
    format: "mp3",
  });

  const generationTime = Date.now() - startTime;

  const result: SpeechGenerationResult = {
    audioData: storageResult.cloudUrl || storageResult.localPath || `data:audio/mpeg;base64,${audioBase64}`,
    format: "mp3",
    model,
    voice: voice_id || "rachel",
    language: language_code || "en",
    generationTime,
    localPath: storageResult.localPath,
    cloudUrl: storageResult.cloudUrl,
    filename: storageResult.filename,
    fileSize: storageResult.size,
    storage: storageResult.storage,
    metadata: {
      timestamp: storageResult.metadata.timestamp,
      textLength: text.length,
      sampleRate: 44100,
      channels: 1,
      voice: voice_id || "rachel",
      language: language_code || "en",
      textPreview: text.substring(0, 100),
      format: "mp3",
    },
  };

  logger.info(
    `ElevenLabs TTS completed in ${generationTime}ms. File: ${storageResult.localPath || "N/A"}`
  );

  return result;
}
```

### Step 2: Modify `src/tools/mouth/processors/speech-synthesis.ts`

**2a. Add import** (after line 7):

```typescript
import { generateElevenLabsSpeech } from "../providers/elevenlabs-speech-provider.js";
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
```

**2b. Add ElevenLabs routing** (after the Minimax block, around line 58):

Insert after the `if (provider === "minimax") { ... }` block:

```typescript
if (provider === "elevenlabs") {
  if (!ElevenLabsClient.isConfigured(config)) {
    throw new APIError("ELEVENLABS_API_KEY required when provider is 'elevenlabs'");
  }
  return generateElevenLabsSpeech({
    text,
    voice_id: (options as any).elevenlabs_voice,
    model: (options as any).elevenlabs_model,
    language_code: (options as any).elevenlabs_language,
    stability: (options as any).stability,
    similarity_boost: (options as any).similarity_boost,
    style: (options as any).elevenlabs_style,
    speed: (options as any).speed,
    config,
  });
}
```

## Todo List

- [x] Create `src/tools/mouth/providers/elevenlabs-speech-provider.ts`
- [x] Add ElevenLabs import to `speech-synthesis.ts`
- [x] Add ElevenLabs provider routing block to `speech-synthesis.ts`
- [x] Verify TypeScript compilation

## Success Criteria

- `generateElevenLabsSpeech()` returns valid `SpeechGenerationResult` with MP3 data
- Audio file saved locally to `audio-outputs/` directory
- Voice name resolution works (e.g., "rachel" -> "21m00Tcm4TlvDq8ikWAM")
- Raw voice IDs pass through unchanged
- Provider routing correctly dispatches to ElevenLabs when `provider === "elevenlabs"`

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Text length exceeds model limit | Low | Validate against 10000 chars (multilingual_v2 default) |
| Invalid voice ID returns 422 | Low | Default to Rachel; clear error message |
| AudioStorage expects WAV PCM for WAV format | Low | We store as MP3, skip PCM conversion path |

## Security Considerations

- API key never appears in logs (client handles auth header internally)
- Text content not logged beyond first 50 chars
