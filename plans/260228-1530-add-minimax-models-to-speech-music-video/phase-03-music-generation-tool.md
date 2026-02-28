# Phase 3: Music Generation Tool (NEW -- Minimax Music 2.5)

**Priority:** Medium | **Status:** Pending | **Effort:** Medium
**Depends on:** Phase 1 (config + client)

## Context

- [Research: Music API](../research/260228-minimax-speech-music-api-research.md) -- Section 2
- [plan.md](plan.md)

## Overview

Create a brand new `minimax_gen_music` tool in the Hands category. This is a Minimax-only capability (no Gemini equivalent) that generates full-length songs from lyrics and style prompts using the Music 2.5 model.

## Key Insights

- Endpoint: `POST /v1/music_generation`
- Model: `music-2.5`
- Requires lyrics (1-3500 chars) + optional prompt (0-2000 chars for style)
- 14 structure tags: `[Verse]`, `[Chorus]`, `[Bridge]`, `[Intro]`, `[Outro]`, etc.
- Duration: up to 5+ minutes per song
- Output: Use `output_format: "url"` to get download URL (valid 24h)
- Hex encoding alternative: hex-encoded audio bytes
- Best quality: sample_rate=44100, bitrate=256000
- Rate limit: 120 RPM, 20 concurrent connections
- Response can be large (5-min song ~20MB hex) -- always use URL mode

## Requirements

### Functional
- New tool `minimax_gen_music` in Hands tool registration
- Accept `lyrics` (required), `prompt` (optional), `model` param
- Support `audio_format` (mp3/wav), `sample_rate`, `bitrate` settings
- Download generated audio URL, save locally + optional R2 upload
- Return file path/URL to minimize token usage

### Non-functional
- Provider file under 200 lines
- Schema file under 100 lines
- Timeout: 5 minutes (songs can be long)
- Always use `output_format: "url"` (hex is too large for music)

## Related Code Files

### Create
- `src/tools/hands/providers/minimax-music-provider.ts` -- Music generation logic

### Modify
- `src/tools/hands/schemas.ts` -- Add MusicGenerationInputSchema + types
- `src/tools/hands/index.ts` -- Register `minimax_gen_music` tool

## Implementation Steps

### 1. Add music schemas to `src/tools/hands/schemas.ts`

Append at end of file:

```typescript
// ---- Music Generation Schemas (Minimax Music 2.5) ----

export const MusicStructureTags = [
  "[Intro]", "[Verse]", "[Pre Chorus]", "[Chorus]", "[Post Chorus]",
  "[Bridge]", "[Interlude]", "[Outro]", "[Hook]", "[Build Up]",
  "[Break]", "[Transition]", "[Inst]", "[Solo]"
] as const;

export const MusicGenerationInputSchema = z.object({
  lyrics: z.string().min(1).max(3500)
    .describe("Song lyrics with optional structure tags like [Verse], [Chorus], [Bridge]. Use \\n for line breaks. Required, 1-3500 chars."),
  prompt: z.string().max(2000).optional()
    .describe("Music style/mood description (e.g., 'Pop, melancholic, piano-driven ballad'). Optional, 0-2000 chars."),
  model: z.enum(["music-2.5"]).optional().default("music-2.5")
    .describe("Music generation model"),
  audio_format: z.enum(["mp3", "wav"]).optional().default("mp3")
    .describe("Output audio format"),
  sample_rate: z.enum(["16000", "24000", "32000", "44100"]).optional().default("44100")
    .describe("Audio sample rate in Hz"),
  bitrate: z.enum(["32000", "64000", "128000", "256000"]).optional().default("256000")
    .describe("Audio bitrate in bps"),
});

export type MusicGenerationInput = z.infer<typeof MusicGenerationInputSchema>;

export interface MusicGenerationResult {
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
```

### 2. Create `src/tools/hands/providers/minimax-music-provider.ts`

```typescript
/**
 * Minimax Music 2.5 Provider
 * Full-length song generation from lyrics and style prompts
 */
import { MinimaxClient } from "@/utils/minimax-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
import type { MusicGenerationResult } from "../schemas.js";

export interface MinimaxMusicOptions {
  lyrics: string;
  prompt?: string;
  model?: string;
  audioFormat?: string;
  sampleRate?: number;
  bitrate?: number;
  config: Config;
}

export async function generateMinimaxMusic(
  options: MinimaxMusicOptions
): Promise<MusicGenerationResult> {
  const startTime = Date.now();

  const {
    lyrics,
    prompt,
    model = "music-2.5",
    audioFormat = "mp3",
    sampleRate = 44100,
    bitrate = 256000,
    config,
  } = options;

  if (!lyrics || lyrics.trim().length === 0) {
    throw new APIError("Lyrics are required for music generation");
  }

  const client = new MinimaxClient(config);

  // Build request -- always use URL output to avoid huge hex payloads
  const body: Record<string, unknown> = {
    model,
    lyrics,
    output_format: "url",
    audio_setting: {
      sample_rate: sampleRate,
      bitrate,
      format: audioFormat,
    },
  };

  if (prompt) {
    body.prompt = prompt;
  }

  logger.info(
    `Minimax Music: model=${model} lyrics=${lyrics.length}chars prompt="${(prompt || "").substring(0, 50)}"`
  );

  // Call Music API (5 min timeout -- songs can be long)
  const response = await client.post("/v1/music_generation", body, 300000);

  // Extract audio URL
  const audioUrl = (response.data as any)?.audio;
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new APIError("Minimax Music returned no audio data");
  }

  const duration = (response.extra_info as any)?.music_duration ?? 0;

  // Download audio
  const audioBuffer = await client.downloadBuffer(audioUrl, 120000);
  const audioBase64 = audioBuffer.toString("base64");

  // Save to file
  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  let fileSize: number | undefined;

  try {
    const mimeType = audioFormat === "wav" ? "audio/wav" : "audio/mpeg";
    const savedFile = await saveBase64ToFile(audioBase64, mimeType, config, {
      prefix: "minimax-music",
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

  return {
    audioUrl: fileUrl || filePath || audioUrl,
    format: audioFormat,
    model,
    duration,
    generationTime,
    filePath,
    fileName,
    fileUrl,
    fileSize,
  };
}
```

### 3. Register `minimax_gen_music` in `src/tools/hands/index.ts`

Add the tool registration in `registerHandsTool()`. Insert after the video tool registrations and before the image editing tools. Add the import and handler:

```typescript
// Import at top of file:
import { generateMinimaxMusic } from "./providers/minimax-music-provider.js";
import { MusicGenerationInputSchema, type MusicGenerationInput } from "./schemas.js";
import { MinimaxClient } from "@/utils/minimax-client.js";

// Register minimax_gen_music tool (add after gemini_image_to_video registration):
server.registerTool(
  "minimax_gen_music",
  {
    title: "Minimax Music Generation Tool",
    description: "Generate full-length songs from lyrics and style descriptions using Minimax Music 2.5. Supports 14 structure tags, 100+ instruments, up to 5+ minutes. Requires MINIMAX_API_KEY.",
    inputSchema: {
      lyrics: z.string().min(1).max(3500).describe("Song lyrics with structure tags ([Verse], [Chorus], etc.)"),
      prompt: z.string().max(2000).optional().describe("Music style/mood (e.g., 'Pop ballad, piano, melancholic')"),
      model: z.enum(["music-2.5"]).optional().default("music-2.5").describe("Music model"),
      audio_format: z.enum(["mp3", "wav"]).optional().default("mp3").describe("Output format"),
      sample_rate: z.enum(["16000", "24000", "32000", "44100"]).optional().default("44100").describe("Sample rate Hz"),
      bitrate: z.enum(["32000", "64000", "128000", "256000"]).optional().default("256000").describe("Bitrate bps"),
    },
  },
  async (args) => {
    try {
      return await handleMusicGeneration(args, config);
    } catch (error) {
      const mcpError = handleError(error);
      logger.error(`Tool minimax_gen_music error:`, mcpError);
      return {
        content: [{ type: "text" as const, text: `Error: ${mcpError.message}` }],
        isError: true,
      };
    }
  }
);
```

Add handler function in `src/tools/hands/index.ts`:

```typescript
async function handleMusicGeneration(args: unknown, config: Config) {
  // Check if Minimax is configured
  if (!MinimaxClient.isConfigured(config)) {
    return {
      content: [{ type: "text" as const, text: "Error: MINIMAX_API_KEY is required for music generation. Set it in your environment variables." }],
      isError: true,
    };
  }

  const input = MusicGenerationInputSchema.parse(args) as MusicGenerationInput;

  logger.info(`Generating music: lyrics=${input.lyrics.length} chars`);

  const result = await generateMinimaxMusic({
    lyrics: input.lyrics,
    prompt: input.prompt,
    model: input.model,
    audioFormat: input.audio_format,
    sampleRate: parseInt(input.sample_rate || "44100"),
    bitrate: parseInt(input.bitrate || "256000"),
    config,
  });

  const contextText = `Music generated successfully using Minimax ${result.model}

**Generation Details:**
- Model: ${result.model}
- Duration: ${result.duration}s
- Format: ${result.format}
- Generation Time: ${result.generationTime}ms
- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ""}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ""}`;

  return {
    content: [{ type: "text" as const, text: contextText }],
    isError: false,
  };
}
```

## Todo

- [ ] Add `MusicGenerationInputSchema` + types to `src/tools/hands/schemas.ts`
- [ ] Create `src/tools/hands/providers/` directory
- [ ] Create `src/tools/hands/providers/minimax-music-provider.ts`
- [ ] Register `minimax_gen_music` tool in `src/tools/hands/index.ts`
- [ ] Add `handleMusicGeneration` handler in `src/tools/hands/index.ts`
- [ ] Run `bun run build` to verify

## Success Criteria

- `minimax_gen_music` tool registered and visible in MCP tool list
- Music generated and saved locally as MP3
- Error with clear message if `MINIMAX_API_KEY` not set
- Duration and generation time reported in response
- Build passes

## Risk Assessment

- **Medium risk**: Music generation can take 1-5 minutes for long songs. Mitigation: 5-min timeout
- **Low risk**: Large audio files (5-min song ~10MB MP3). Mitigation: URL-based output, save to file
- **Low risk**: Content filter (code 1026). Mitigation: pass error message to user

## Security Considerations

- API key validated before making any calls
- Downloaded audio URLs (24h expiry) not stored beyond immediate download
- Content policy violations surfaced as user-friendly errors

## Next Steps

- Phase 4 (video) can proceed in parallel with Phase 3 since both depend only on Phase 1
