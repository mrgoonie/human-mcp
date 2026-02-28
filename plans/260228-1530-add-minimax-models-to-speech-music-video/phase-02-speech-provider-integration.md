# Phase 2: Speech Provider Integration (Minimax Speech 2.6)

**Priority:** High | **Status:** Pending | **Effort:** Medium
**Depends on:** Phase 1 (config + client)

## Context

- [Research: Speech API](../research/260228-minimax-speech-music-api-research.md) -- Sections 1.1-1.8
- [plan.md](plan.md)
- [Existing speech processor](../../src/tools/mouth/processors/speech-synthesis.ts)

## Overview

Create a Minimax Speech 2.6 provider and integrate it into the existing `mouth_speak` tool via a `provider` parameter. When `provider: "minimax"` is specified (or `SPEECH_PROVIDER=minimax` env var), route speech generation to the Minimax T2A v2 endpoint instead of Gemini.

## Key Insights

- Endpoint: `POST /v1/t2a_v2`
- Models: `speech-2.6-hd` (quality) or `speech-2.6-turbo` (speed)
- Use `output_format: "url"` to get download URL (avoids large hex payloads)
- If using hex: audio is **hex-encoded** (NOT base64) -- use `Buffer.from(data, "hex")`
- 300+ voices (e.g., `English_Graceful_Lady`, `English_Insightful_Speaker`)
- 7 emotions: `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`, `neutral`
- Max 10,000 chars per request
- Rate limit: 60 RPM default
- URL output valid for 9 hours

## Requirements

### Functional
- Add `provider` parameter to `mouth_speak` tool (default: "gemini", option: "minimax")
- Support `minimax_voice` parameter for Minimax voice IDs
- Support `minimax_model` parameter (`speech-2.6-hd` or `speech-2.6-turbo`)
- Support `emotion` parameter for Minimax emotion control
- Download URL audio, save using existing `AudioStorage` pattern
- Return same `SpeechGenerationResult` shape as Gemini provider

### Non-functional
- Provider file under 200 lines
- No new npm dependencies
- Graceful error if MINIMAX_API_KEY not set when provider=minimax

## Related Code Files

### Create
- `src/tools/mouth/providers/minimax-speech-provider.ts` -- Minimax Speech 2.6 implementation

### Modify
- `src/tools/mouth/processors/speech-synthesis.ts` -- Add provider routing
- `src/tools/mouth/schemas.ts` -- Add provider + Minimax-specific params

## Implementation Steps

### 1. Create `src/tools/mouth/providers/minimax-speech-provider.ts`

```typescript
/**
 * Minimax Speech 2.6 Provider
 * Text-to-speech via Minimax T2A v2 endpoint
 */
import { MinimaxClient } from "@/utils/minimax-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";
import type { SpeechGenerationResult } from "../schemas.js";
import { createAudioStorage } from "../utils/audio-storage.js";

export interface MinimaxSpeechOptions {
  text: string;
  voice?: string;          // Minimax voice ID (e.g., "English_Graceful_Lady")
  model?: string;          // "speech-2.6-hd" or "speech-2.6-turbo"
  language?: string;       // Language boost (e.g., "English", "auto")
  emotion?: string;        // "happy", "sad", "angry", etc.
  speed?: number;          // 0.5 - 2.0
  config: Config;
}

const DEFAULT_MINIMAX_VOICE = "English_Graceful_Lady";
const DEFAULT_MINIMAX_MODEL = "speech-2.6-hd";

export async function generateMinimaxSpeech(
  options: MinimaxSpeechOptions
): Promise<SpeechGenerationResult> {
  const startTime = Date.now();

  const {
    text,
    voice = DEFAULT_MINIMAX_VOICE,
    model = DEFAULT_MINIMAX_MODEL,
    language = "auto",
    emotion,
    speed = 1.0,
    config,
  } = options;

  // Validate
  if (!text || text.trim().length === 0) {
    throw new APIError("Text is required for speech generation");
  }
  if (text.length > 10000) {
    throw new APIError("Text too long for Minimax. Maximum 10,000 characters.");
  }

  const client = new MinimaxClient(config);

  // Build request body
  const body: Record<string, unknown> = {
    model,
    text,
    stream: false,
    output_format: "url",
    language_boost: language,
    voice_setting: {
      voice_id: voice,
      speed,
      vol: 1.0,
      pitch: 0,
      ...(emotion && { emotion }),
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
  };

  logger.info(
    `Minimax TTS: "${text.substring(0, 50)}..." voice=${voice} model=${model}`
  );

  // Call Minimax T2A v2
  const response = await client.post("/v1/t2a_v2", body, 60000);

  // Get audio URL from response
  const audioUrl = (response.data as any)?.audio;
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new APIError("Minimax TTS returned no audio data");
  }

  // Download the audio file
  const audioBuffer = await client.downloadBuffer(audioUrl, 120000);

  // Convert to base64 for storage
  const audioBase64 = audioBuffer.toString("base64");

  // Store using existing AudioStorage pattern
  const audioStorage = createAudioStorage(config);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `minimax-speech_${voice}_${timestamp}.mp3`;

  const storageResult = await audioStorage.storeAudio({
    audioData: audioBase64,
    filename,
    voice,
    language,
    text,
    format: "mp3",
  });

  const generationTime = Date.now() - startTime;

  // Build result matching SpeechGenerationResult shape
  const result: SpeechGenerationResult = {
    audioData: storageResult.cloudUrl || storageResult.localPath || audioUrl,
    format: "mp3",
    model,
    voice,
    language,
    generationTime,
    localPath: storageResult.localPath,
    cloudUrl: storageResult.cloudUrl,
    filename: storageResult.filename,
    fileSize: storageResult.size,
    storage: storageResult.storage,
    metadata: {
      timestamp: storageResult.metadata.timestamp,
      textLength: text.length,
      sampleRate: 32000,
      channels: 1,
      voice,
      language,
      textPreview: text.substring(0, 100),
      format: "mp3",
    },
  };

  logger.info(
    `Minimax TTS completed in ${generationTime}ms. File: ${storageResult.localPath || "N/A"}`
  );

  return result;
}
```

**Note:** The `AudioStorage.storeAudio()` currently calls `convertPcmToWav()` which assumes PCM input. For Minimax MP3 output, the storage function needs a small adjustment -- write the buffer directly instead of converting. This can be handled by checking the `format` parameter. If `format === "mp3"`, write the base64 buffer directly as MP3. Add this check in `audio-storage.ts` `storeAudio()` method:

```typescript
// In storeAudio(), before the PCM-to-WAV conversion:
if (format === "mp3" || format === "flac") {
  // Non-WAV formats: write buffer directly (no PCM conversion)
  const audioBuffer = Buffer.from(base64Data, 'base64');
  const fs = await import('fs/promises');
  await fs.writeFile(localPath, audioBuffer);
} else {
  // WAV: convert PCM to proper WAV format
  await this.convertPcmToWav(pcmBuffer, localPath);
}
```

### 2. Update `src/tools/mouth/processors/speech-synthesis.ts`

Add provider routing at the top of `generateSpeech()`:

```typescript
// At the top of generateSpeech(), after parsing options:
import { generateMinimaxSpeech } from "../providers/minimax-speech-provider.js";
import { MinimaxClient } from "@/utils/minimax-client.js";

// Inside generateSpeech():
// Check if provider is "minimax"
const provider = (options as any).provider || config.providers?.speech || "gemini";

if (provider === "minimax") {
  if (!MinimaxClient.isConfigured(config)) {
    throw new APIError("MINIMAX_API_KEY required when provider is 'minimax'");
  }
  return generateMinimaxSpeech({
    text,
    voice: (options as any).minimax_voice || voice,
    model: (options as any).minimax_model || "speech-2.6-hd",
    language: (options as any).minimax_language || "auto",
    emotion: (options as any).emotion,
    speed: (options as any).speed,
    config,
  });
}

// ... existing Gemini code continues below
```

### 3. Update `src/tools/mouth/schemas.ts`

Add provider-related fields to `SpeechInputSchema`:

```typescript
// Add to SpeechInputSchema:
provider: z.enum(["gemini", "minimax"]).optional()
  .describe("Speech provider (default: gemini, option: minimax)"),
minimax_voice: z.string().optional()
  .describe("Minimax voice ID (e.g., 'English_Graceful_Lady')"),
minimax_model: z.enum(["speech-2.6-hd", "speech-2.6-turbo"]).optional()
  .describe("Minimax speech model"),
minimax_language: z.string().optional()
  .describe("Minimax language boost (e.g., 'English', 'auto')"),
emotion: z.enum(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral"]).optional()
  .describe("Emotion for Minimax speech"),
speed: z.number().min(0.5).max(2.0).optional()
  .describe("Speech speed (0.5-2.0, Minimax only)"),
```

### 4. Update `src/tools/mouth/utils/audio-storage.ts`

Add MP3 format handling in `storeAudio()` method. Before the PCM-to-WAV conversion block (around line 130), add:

```typescript
// Handle non-WAV formats (MP3 from Minimax, etc.)
if (format !== "wav") {
  const audioBuffer = Buffer.from(base64Data, 'base64');
  const fs = await import('fs/promises');
  await fs.writeFile(localPath, audioBuffer);
  result.localPath = localPath;
  result.storage.local = true;
  result.size = audioBuffer.length;
  logger.info(`Audio saved locally as ${format.toUpperCase()}: ${localPath}`);
} else {
  // Existing WAV conversion code...
}
```

## Todo

- [ ] Create `src/tools/mouth/providers/` directory
- [ ] Create `src/tools/mouth/providers/minimax-speech-provider.ts`
- [ ] Update `src/tools/mouth/processors/speech-synthesis.ts` with provider routing
- [ ] Update `src/tools/mouth/schemas.ts` with provider + minimax params
- [ ] Update `src/tools/mouth/utils/audio-storage.ts` for MP3 format support
- [ ] Run `bun run build` to verify

## Success Criteria

- `mouth_speak` with default args still uses Gemini (no behavioral change)
- `mouth_speak` with `provider: "minimax"` calls Minimax Speech 2.6
- Audio saved locally as MP3 (not WAV) when using Minimax
- Error thrown with clear message if `provider: "minimax"` but no API key
- Build passes

## Risk Assessment

- **Medium risk**: AudioStorage assumes PCM/WAV input. Mitigation: add format check before conversion
- **Low risk**: Minimax voice IDs are free-form strings, no enum validation needed
- **Low risk**: 10,000 char limit (vs Gemini 32,000). Document in tool description

## Security Considerations

- Minimax API key never logged
- Audio URLs (9h expiry) not persisted beyond download
- Content policy errors (code 1026) mapped to user-friendly messages
