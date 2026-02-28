# Phase 7: Tests and Build Verification

**Priority:** High | **Status:** Pending | **Effort:** Medium
**Depends on:** Phase 1-6 (all implementation and docs complete)

## Context

- [plan.md](plan.md)
- [Existing tests](../../tests/)
- [Test patterns](../../tests/unit/config.test.ts)

## Overview

Write unit tests for the new Minimax integration covering: config parsing, MinimaxClient construction and error mapping, schema validation, file-storage MIME type mappings, and provider routing logic. Also run `bun run build` and `bun test` to verify everything compiles and passes.

## Key Insights

- Tests use `bun:test` framework (`describe`, `it`, `expect`, `beforeEach`, `mock`)
- Tests import from `@/utils/...` path alias
- Config tests set `process.env` directly
- File storage tests use `tmpdir()` and clean up after
- No real API calls in unit tests -- mock or test validation logic only
- Existing patterns: `tests/unit/config.test.ts`, `tests/unit/file-storage.test.ts`, `tests/unit/hands-schemas.test.ts`

## Requirements

### Functional
- Unit tests for Minimax config parsing (API key, host, providers)
- Unit tests for MinimaxClient construction (missing key, static `isConfigured`)
- Unit tests for MinimaxClient error code mapping
- Unit tests for MusicGenerationInputSchema validation
- Unit tests for file-storage audio MIME type mappings
- Unit tests for video duration parsing helper
- Build passes (`bun run build`)
- All tests pass (`bun test`)

### Non-functional
- Test files under 150 lines each
- No real API calls (mock or validate input only)
- Tests execute in under 5 seconds total

## Related Code Files

### Create
- `tests/unit/minimax-config.test.ts` -- Config + provider env vars
- `tests/unit/minimax-client.test.ts` -- Client construction + error codes
- `tests/unit/minimax-music-schemas.test.ts` -- Music schema validation
- `tests/unit/file-storage-audio.test.ts` -- Audio MIME type mapping tests

### Existing (verify still pass)
- `tests/unit/config.test.ts`
- `tests/unit/file-storage.test.ts`
- `tests/unit/hands-schemas.test.ts`
- `tests/unit/hands-video-schemas.test.ts`

## Implementation Steps

### 1. Create `tests/unit/minimax-config.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../../src/utils/config.js";

describe("Minimax Config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    // Restore original env
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
      else process.env[key] = originalEnv[key];
    });
  });

  it("should load config without Minimax key (optional)", () => {
    delete process.env.MINIMAX_API_KEY;
    const config = loadConfig();
    expect(config.minimax?.apiKey).toBeUndefined();
  });

  it("should load Minimax API key from environment", () => {
    process.env.MINIMAX_API_KEY = "test-minimax-key";
    const config = loadConfig();
    expect(config.minimax?.apiKey).toBe("test-minimax-key");
  });

  it("should use default Minimax API host", () => {
    process.env.MINIMAX_API_KEY = "test-minimax-key";
    const config = loadConfig();
    expect(config.minimax?.apiHost).toBe("https://api.minimax.io");
  });

  it("should override Minimax API host from environment", () => {
    process.env.MINIMAX_API_KEY = "test-minimax-key";
    process.env.MINIMAX_API_HOST = "https://api.minimaxi.chat";
    const config = loadConfig();
    expect(config.minimax?.apiHost).toBe("https://api.minimaxi.chat");
  });

  it("should default providers to gemini", () => {
    const config = loadConfig();
    expect(config.providers?.speech).toBe("gemini");
    expect(config.providers?.video).toBe("gemini");
  });

  it("should read provider selection from environment", () => {
    process.env.SPEECH_PROVIDER = "minimax";
    process.env.VIDEO_PROVIDER = "minimax";
    const config = loadConfig();
    expect(config.providers?.speech).toBe("minimax");
    expect(config.providers?.video).toBe("minimax");
  });
});
```

### 2. Create `tests/unit/minimax-client.test.ts`

```typescript
import { describe, it, expect } from "bun:test";
import { MinimaxClient, MinimaxApiError } from "../../src/utils/minimax-client.js";
import { loadConfig } from "../../src/utils/config.js";

describe("MinimaxClient", () => {
  it("should throw if no API key configured", () => {
    delete process.env.MINIMAX_API_KEY;
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    const config = loadConfig();

    expect(() => new MinimaxClient(config)).toThrow("MINIMAX_API_KEY is required");
  });

  it("should construct with valid API key", () => {
    process.env.MINIMAX_API_KEY = "test-minimax-key";
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    const config = loadConfig();

    const client = new MinimaxClient(config);
    expect(client).toBeDefined();
  });

  describe("isConfigured", () => {
    it("should return false when no API key", () => {
      delete process.env.MINIMAX_API_KEY;
      process.env.GOOGLE_GEMINI_API_KEY = "test-key";
      const config = loadConfig();
      expect(MinimaxClient.isConfigured(config)).toBe(false);
    });

    it("should return true when API key is set", () => {
      process.env.MINIMAX_API_KEY = "test-minimax-key";
      process.env.GOOGLE_GEMINI_API_KEY = "test-key";
      const config = loadConfig();
      expect(MinimaxClient.isConfigured(config)).toBe(true);
    });
  });

  describe("MinimaxApiError", () => {
    it("should create error with status code and trace ID", () => {
      const error = new MinimaxApiError(1002, "Rate limit exceeded", "trace-123");
      expect(error.statusCode).toBe(1002);
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.traceId).toBe("trace-123");
      expect(error.name).toBe("MinimaxApiError");
    });
  });
});
```

### 3. Create `tests/unit/minimax-music-schemas.test.ts`

```typescript
import { describe, it, expect } from "bun:test";
import { MusicGenerationInputSchema } from "../../src/tools/hands/schemas.js";

describe("MusicGenerationInputSchema", () => {
  it("should accept valid lyrics-only input", () => {
    const input = { lyrics: "[Verse]\nHello world\n[Chorus]\nLa la la" };
    const result = MusicGenerationInputSchema.parse(input);
    expect(result.lyrics).toBe(input.lyrics);
    expect(result.model).toBe("music-2.5"); // default
    expect(result.audio_format).toBe("mp3"); // default
    expect(result.sample_rate).toBe("44100"); // default
    expect(result.bitrate).toBe("256000"); // default
  });

  it("should accept lyrics with prompt", () => {
    const input = {
      lyrics: "[Verse]\nHello world",
      prompt: "Pop, upbeat, piano-driven",
    };
    const result = MusicGenerationInputSchema.parse(input);
    expect(result.prompt).toBe("Pop, upbeat, piano-driven");
  });

  it("should reject empty lyrics", () => {
    expect(() => MusicGenerationInputSchema.parse({ lyrics: "" })).toThrow();
  });

  it("should reject lyrics exceeding 3500 chars", () => {
    const longLyrics = "a".repeat(3501);
    expect(() =>
      MusicGenerationInputSchema.parse({ lyrics: longLyrics })
    ).toThrow();
  });

  it("should reject prompt exceeding 2000 chars", () => {
    const longPrompt = "a".repeat(2001);
    expect(() =>
      MusicGenerationInputSchema.parse({
        lyrics: "Hello",
        prompt: longPrompt,
      })
    ).toThrow();
  });

  it("should accept all audio format options", () => {
    const mp3 = MusicGenerationInputSchema.parse({
      lyrics: "Test",
      audio_format: "mp3",
    });
    expect(mp3.audio_format).toBe("mp3");

    const wav = MusicGenerationInputSchema.parse({
      lyrics: "Test",
      audio_format: "wav",
    });
    expect(wav.audio_format).toBe("wav");
  });

  it("should accept all sample rate options", () => {
    for (const rate of ["16000", "24000", "32000", "44100"]) {
      const result = MusicGenerationInputSchema.parse({
        lyrics: "Test",
        sample_rate: rate,
      });
      expect(result.sample_rate).toBe(rate);
    }
  });

  it("should reject invalid sample rate", () => {
    expect(() =>
      MusicGenerationInputSchema.parse({
        lyrics: "Test",
        sample_rate: "48000",
      })
    ).toThrow();
  });
});
```

### 4. Create `tests/unit/file-storage-audio.test.ts`

```typescript
import { describe, it, expect, afterAll } from "bun:test";
import { saveBase64ToFile } from "../../src/utils/file-storage.js";
import { loadConfig } from "../../src/utils/config.js";
import { join } from "path";
import { existsSync, unlinkSync, rmSync } from "fs";
import { tmpdir } from "os";

describe("File Storage - Audio MIME Types", () => {
  const testDir = join(tmpdir(), "human-mcp-audio-test");
  let config: any;

  // Minimal valid base64 data (tiny binary content for testing)
  const testBase64 = Buffer.from("test-audio-data").toString("base64");

  beforeAll(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    config = loadConfig();
  });

  afterAll(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors
    }
  });

  it("should save audio/mpeg as .mp3 file", async () => {
    const result = await saveBase64ToFile(testBase64, "audio/mpeg", config, {
      directory: testDir,
      prefix: "test-mp3",
    });

    expect(result.fileName).toMatch(/\.mp3$/);
    expect(result.mimeType).toBe("audio/mpeg");
    expect(existsSync(result.filePath)).toBe(true);

    unlinkSync(result.filePath);
  });

  it("should save audio/wav as .wav file", async () => {
    const result = await saveBase64ToFile(testBase64, "audio/wav", config, {
      directory: testDir,
      prefix: "test-wav",
    });

    expect(result.fileName).toMatch(/\.wav$/);
    expect(result.mimeType).toBe("audio/wav");
    expect(existsSync(result.filePath)).toBe(true);

    unlinkSync(result.filePath);
  });

  it("should save video/mp4 as .mp4 file", async () => {
    const result = await saveBase64ToFile(testBase64, "video/mp4", config, {
      directory: testDir,
      prefix: "test-mp4",
    });

    expect(result.fileName).toMatch(/\.mp4$/);
    expect(result.mimeType).toBe("video/mp4");
    expect(existsSync(result.filePath)).toBe(true);

    unlinkSync(result.filePath);
  });
});
```

### 5. Run build and test verification

After all phases are implemented, run:

```bash
# Build verification
bun run build

# Run all tests
bun test

# Run only new Minimax tests
bun test tests/unit/minimax-config.test.ts
bun test tests/unit/minimax-client.test.ts
bun test tests/unit/minimax-music-schemas.test.ts
bun test tests/unit/file-storage-audio.test.ts

# Ensure existing tests still pass
bun test tests/unit/config.test.ts
bun test tests/unit/file-storage.test.ts
bun test tests/unit/hands-schemas.test.ts
bun test tests/unit/hands-video-schemas.test.ts
```

### 6. Verify tool registration (manual check)

Start the server in dev mode and verify all tools are registered:

```bash
bun run dev
```

Confirm in the MCP tool list:
- `mouth_speak` (existing, now with provider param)
- `minimax_gen_music` (NEW)
- `gemini_gen_video` (existing, now with provider param)
- `gemini_image_to_video` (existing, now with provider param)

## Todo

- [ ] Create `tests/unit/minimax-config.test.ts`
- [ ] Create `tests/unit/minimax-client.test.ts`
- [ ] Create `tests/unit/minimax-music-schemas.test.ts`
- [ ] Create `tests/unit/file-storage-audio.test.ts`
- [ ] Run `bun run build` -- verify no compile errors
- [ ] Run `bun test` -- verify all tests pass (new + existing)
- [ ] Manual: start dev server, verify tool registration
- [ ] Fix any failing tests or build errors

## Success Criteria

- `bun run build` passes with no errors
- All new tests pass (minimax-config, minimax-client, minimax-music-schemas, file-storage-audio)
- All existing tests still pass (no regressions)
- `minimax_gen_music` tool visible in MCP tool list
- Provider params visible on `mouth_speak`, `gemini_gen_video`, `gemini_image_to_video`

## Risk Assessment

- **Low risk**: Unit tests do not make real API calls
- **Medium risk**: Existing tests may break if config schema changes affect defaults. Mitigation: all new config fields are optional with defaults

## Security Considerations

- Tests use fake API keys (`test-key`, `test-minimax-key`) only
- No real credentials in test files
- Temporary files cleaned up after tests

## Completion

When all tests pass and build succeeds, the Minimax integration is ready for:
1. Manual E2E testing with a real `MINIMAX_API_KEY`
2. Code review
3. Merge to `dev` branch
