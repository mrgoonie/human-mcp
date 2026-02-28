# Phase 5: Schemas and Tool Registration

## Context Links

- [Mouth Schemas](../../src/tools/mouth/schemas.ts)
- [Mouth Index](../../src/tools/mouth/index.ts)
- [Hands Schemas](../../src/tools/hands/schemas.ts)
- [Hands Index](../../src/tools/hands/index.ts)
- [Response Formatter](../../src/utils/response-formatter.ts)

## Overview

- **Priority:** High
- **Status:** ✅ Complete
- **Depends on:** Phases 2, 3, 4 (providers must exist)
- **Description:** Extend mouth schemas/index for ElevenLabs TTS params. Add SFX and Music schemas to hands. Register `elevenlabs_gen_sfx` and `elevenlabs_gen_music` tools in hands index.

## Key Insights

- Mouth `SpeechInputSchema` already has provider-specific params (minimax_voice, minimax_model, etc.)
- Follow same pattern: add elevenlabs_voice, elevenlabs_model, stability, similarity_boost, elevenlabs_style params
- Provider enum in schema: extend `["gemini", "minimax"]` to `["gemini", "minimax", "elevenlabs"]`
- Hands schemas follow existing `MusicGenerationInputSchema` pattern
- Hands index tool registration follows existing `minimax_gen_music` pattern
- Keep handler functions concise by delegating to providers

## Requirements

### Functional
- `SpeechInputSchema.provider` accepts `"elevenlabs"`
- New ElevenLabs-specific params on SpeechInputSchema
- `mouth_speak` tool schema extended with ElevenLabs options
- `SfxGenerationInputSchema` defined in hands schemas
- `ElevenLabsMusicGenerationInputSchema` defined in hands schemas
- `elevenlabs_gen_sfx` tool registered in hands index
- `elevenlabs_gen_music` tool registered in hands index

### Non-Functional
- Keep changes minimal, additive only
- No breaking changes to existing schemas

## Related Code Files

### Files to Modify
- `src/tools/mouth/schemas.ts` -- extend SpeechInputSchema (line 40-45)
- `src/tools/mouth/index.ts` -- extend mouth_speak tool inputSchema (lines 33-51)
- `src/tools/hands/schemas.ts` -- add new schemas (end of file)
- `src/tools/hands/index.ts` -- register new tools + handlers

## Implementation Steps

### Step 1: Modify `src/tools/mouth/schemas.ts`

**1a. Extend `SpeechInputSchema` provider enum** (line 40):

Change:
```typescript
provider: z.enum(["gemini", "minimax"]).optional().describe("Speech provider (default: gemini, option: minimax for Speech 2.6)"),
```
To:
```typescript
provider: z.enum(["gemini", "minimax", "elevenlabs"]).optional().describe("Speech provider (default: gemini, options: minimax, elevenlabs)"),
```

**1b. Add ElevenLabs-specific params** (after line 45, after the `speed` field):

```typescript
elevenlabs_voice: z.string().optional().describe("ElevenLabs voice name (rachel, adam, brian, etc.) or voice ID string"),
elevenlabs_model: z.enum(["eleven_v3", "eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5"]).optional().describe("ElevenLabs TTS model"),
elevenlabs_language: z.string().optional().describe("ElevenLabs language code (ISO 639-1, e.g., 'en', 'es', 'fr')"),
stability: z.number().min(0).max(1).optional().describe("ElevenLabs voice stability (0-1, default 0.5)"),
similarity_boost: z.number().min(0).max(1).optional().describe("ElevenLabs voice similarity boost (0-1, default 0.75)"),
elevenlabs_style: z.number().min(0).max(1).optional().describe("ElevenLabs style exaggeration (0-1, default 0.0)"),
```

### Step 2: Modify `src/tools/mouth/index.ts`

**2a. Extend `mouth_speak` inputSchema** (around line 45):

Change the provider field:
```typescript
provider: z.enum(["gemini", "minimax"]).optional().describe("Speech provider (default: gemini, option: minimax)"),
```
To:
```typescript
provider: z.enum(["gemini", "minimax", "elevenlabs"]).optional().describe("Speech provider (default: gemini, options: minimax, elevenlabs)"),
```

**2b. Add ElevenLabs params to inputSchema** (after the `speed` field, around line 50):

```typescript
elevenlabs_voice: z.string().optional().describe("ElevenLabs voice name (rachel, adam, brian, charlotte, george, lily, matilda, sarah, daniel, alice) or raw voice ID"),
elevenlabs_model: z.enum(["eleven_v3", "eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5"]).optional().describe("ElevenLabs TTS model"),
elevenlabs_language: z.string().optional().describe("ElevenLabs language code (e.g., 'en', 'es')"),
stability: z.number().min(0).max(1).optional().describe("ElevenLabs voice stability (0=expressive, 1=consistent)"),
similarity_boost: z.number().min(0).max(1).optional().describe("ElevenLabs similarity boost (0=creative, 1=faithful)"),
elevenlabs_style: z.number().min(0).max(1).optional().describe("ElevenLabs style exaggeration (0=neutral, 1=exaggerated)"),
```

**2c. Update tool description** (line 32):

Change:
```typescript
description: "Generate speech from text using Gemini TTS. Optionally use provider='minimax' for Minimax Speech 2.6 with 300+ voices and emotion control (requires MINIMAX_API_KEY).",
```
To:
```typescript
description: "Generate speech from text. Providers: gemini (default), minimax (Speech 2.6, 300+ voices), elevenlabs (70+ languages, premium voices). Set provider param to select.",
```

### Step 3: Add schemas to `src/tools/hands/schemas.ts`

Append after the `MusicGenerationResult` interface (end of file, around line 328):

```typescript
// ---- ElevenLabs Sound Effects Schemas ----

export const SfxGenerationInputSchema = z.object({
  text: z.string().min(1).max(500)
    .describe("Text prompt describing the sound effect (e.g., 'Thunder rumbling with heavy rain')"),
  duration_seconds: z.number().min(0.5).max(30).optional()
    .describe("Duration in seconds (0.5-30). If omitted, AI decides optimal length."),
  prompt_influence: z.number().min(0).max(1).optional().default(0.3)
    .describe("How closely to follow the prompt (0=creative, 1=literal). Default: 0.3"),
  loop: z.boolean().optional().default(false)
    .describe("Create seamless looping audio (great for ambient sounds)"),
});

export type SfxGenerationInput = z.infer<typeof SfxGenerationInputSchema>;

// ---- ElevenLabs Music Generation Schemas ----

export const ElevenLabsMusicGenerationInputSchema = z.object({
  prompt: z.string().min(1).max(2000)
    .describe("Text description of the music to generate (e.g., 'An upbeat electronic track with synth pads and driving bass')"),
  music_length_ms: z.number().int().min(3000).max(600000).optional().default(30000)
    .describe("Duration in milliseconds (3000-600000, i.e., 3s to 10min). Default: 30000 (30s)"),
  force_instrumental: z.boolean().optional().default(false)
    .describe("Remove vocals and generate instrumental only"),
});

export type ElevenLabsMusicGenerationInput = z.infer<typeof ElevenLabsMusicGenerationInputSchema>;
```

### Step 4: Register tools in `src/tools/hands/index.ts`

**4a. Add imports** (after line 40, after minimax music import):

```typescript
import { generateElevenLabsSfx } from "./providers/elevenlabs-sfx-provider.js";
import { generateElevenLabsMusic } from "./providers/elevenlabs-music-provider.js";
import { ElevenLabsClient } from "@/utils/elevenlabs-client.js";
import {
  SfxGenerationInputSchema,
  ElevenLabsMusicGenerationInputSchema,
  type SfxGenerationInput,
  type ElevenLabsMusicGenerationInput,
} from "./schemas.js";
```

**Note:** Also add `SfxGenerationInputSchema`, `ElevenLabsMusicGenerationInputSchema`, and their types to the existing import from `./schemas.js` (lines 4-29). Merge into the existing import block.

**4b. Register `elevenlabs_gen_sfx` tool** (after the `minimax_gen_music` tool block, around line 197):

```typescript
// Register elevenlabs_gen_sfx tool
server.registerTool(
  "elevenlabs_gen_sfx",
  {
    title: "ElevenLabs Sound Effects Generation Tool",
    description: "Generate sound effects from text descriptions using ElevenLabs API. Supports 0.5-30s duration, looping, and prompt influence control. Requires ELEVENLABS_API_KEY (paid plan).",
    inputSchema: {
      text: z.string().min(1).max(500).describe("Text prompt describing the sound effect (e.g., 'Glass shattering on concrete', 'Forest ambience with birds')"),
      duration_seconds: z.number().min(0.5).max(30).optional().describe("Duration in seconds (0.5-30). Omit for auto-length."),
      prompt_influence: z.number().min(0).max(1).optional().default(0.3).describe("How closely to follow the prompt (0=creative, 1=literal)"),
      loop: z.boolean().optional().default(false).describe("Create seamless looping audio"),
    }
  },
  async (args) => {
    try {
      return await handleSfxGeneration(args, config);
    } catch (error) {
      const mcpError = handleError(error);
      logger.error(`Tool elevenlabs_gen_sfx error:`, mcpError);
      return {
        content: [{ type: "text" as const, text: `Error: ${mcpError.message}` }],
        isError: true
      };
    }
  }
);
```

**4c. Register `elevenlabs_gen_music` tool** (after the sfx tool):

```typescript
// Register elevenlabs_gen_music tool
server.registerTool(
  "elevenlabs_gen_music",
  {
    title: "ElevenLabs Music Generation Tool",
    description: "Generate music tracks from text descriptions using ElevenLabs Music API. Supports 3s-10min duration, instrumental mode. Requires ELEVENLABS_API_KEY (paid plan). May take several minutes for long tracks.",
    inputSchema: {
      prompt: z.string().min(1).max(2000).describe("Text description of the music (e.g., 'A chill lo-fi hip hop beat with vinyl crackle and soft piano')"),
      music_length_ms: z.number().int().min(3000).max(600000).optional().default(30000).describe("Duration in ms (3000-600000). Default: 30000 (30s)"),
      force_instrumental: z.boolean().optional().default(false).describe("Generate instrumental only (no vocals)"),
    }
  },
  async (args) => {
    try {
      return await handleElevenLabsMusicGeneration(args, config);
    } catch (error) {
      const mcpError = handleError(error);
      logger.error(`Tool elevenlabs_gen_music error:`, mcpError);
      return {
        content: [{ type: "text" as const, text: `Error: ${mcpError.message}` }],
        isError: true
      };
    }
  }
);
```

**4d. Add handler functions** (at the bottom of the file, before the closing):

```typescript
async function handleSfxGeneration(args: unknown, config: Config) {
  const input = SfxGenerationInputSchema.parse(args) as SfxGenerationInput;

  if (!ElevenLabsClient.isConfigured(config)) {
    throw new Error("ELEVENLABS_API_KEY is required for sound effects generation");
  }

  logger.info(`Generating SFX: "${input.text.substring(0, 50)}..."`);

  const result = await generateElevenLabsSfx({
    text: input.text,
    duration_seconds: input.duration_seconds,
    prompt_influence: input.prompt_influence,
    loop: input.loop,
    config,
  });

  const contextText = `Sound effect generated successfully!\n\n**Generation Details:**\n- Model: ${result.model}\n- Format: ${result.format}\n- Duration: ${result.duration ?? "auto"}s\n- Generation Time: ${result.generationTime}ms\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}`;

  const formattedResponse = formatMediaResponse(
    {
      url: result.fileUrl,
      filePath: result.filePath,
      mimeType: "audio/mpeg",
      size: result.fileSize,
    },
    config,
    contextText
  );

  return { content: formattedResponse as any, isError: false };
}

async function handleElevenLabsMusicGeneration(args: unknown, config: Config) {
  const input = ElevenLabsMusicGenerationInputSchema.parse(args) as ElevenLabsMusicGenerationInput;

  if (!ElevenLabsClient.isConfigured(config)) {
    throw new Error("ELEVENLABS_API_KEY is required for music generation");
  }

  logger.info(`Generating ElevenLabs music: "${input.prompt.substring(0, 50)}..."`);

  const result = await generateElevenLabsMusic({
    prompt: input.prompt,
    music_length_ms: input.music_length_ms,
    force_instrumental: input.force_instrumental,
    config,
  });

  const contextText = `Music generated successfully!\n\n**Generation Details:**\n- Model: ${result.model}\n- Format: ${result.format}\n- Duration: ${result.duration}s\n- Generation Time: ${result.generationTime}ms\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}`;

  const formattedResponse = formatMediaResponse(
    {
      url: result.fileUrl,
      filePath: result.filePath,
      mimeType: "audio/mpeg",
      size: result.fileSize,
    },
    config,
    contextText
  );

  return { content: formattedResponse as any, isError: false };
}
```

## Todo List

- [x] Extend `SpeechInputSchema.provider` enum with `"elevenlabs"` in `mouth/schemas.ts`
- [x] Add ElevenLabs-specific params to `SpeechInputSchema` in `mouth/schemas.ts`
- [x] Extend `mouth_speak` tool inputSchema in `mouth/index.ts`
- [x] Update `mouth_speak` tool description in `mouth/index.ts`
- [x] Add `SfxGenerationInputSchema` to `hands/schemas.ts`
- [x] Add `ElevenLabsMusicGenerationInputSchema` to `hands/schemas.ts`
- [x] Add imports for new providers and schemas in `hands/index.ts`
- [x] Register `elevenlabs_gen_sfx` tool in `hands/index.ts`
- [x] Register `elevenlabs_gen_music` tool in `hands/index.ts`
- [x] Add `handleSfxGeneration` handler in `hands/index.ts`
- [x] Add `handleElevenLabsMusicGeneration` handler in `hands/index.ts`
- [x] Verify TypeScript compilation

## Success Criteria

- `mouth_speak` accepts `provider: "elevenlabs"` without errors
- ElevenLabs-specific params parsed correctly from tool input
- `elevenlabs_gen_sfx` tool appears in MCP tool list
- `elevenlabs_gen_music` tool appears in MCP tool list
- All schema validations work (min/max, enums, defaults)
- No breaking changes to existing tools

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `hands/index.ts` is already large (1441 lines) | Medium | Only add ~80 lines; handlers are thin wrappers |
| Schema import conflicts | Low | Merge into existing import block carefully |
| Provider enum change breaks existing users | None | Additive change, default unchanged |

## Security Considerations

- No new secrets exposed in schema definitions
- Input validation via Zod prevents malicious input
