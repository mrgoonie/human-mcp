# Phase 7: Tests and Build Verification

## Context Links

- [Test Setup](../../tests/setup.ts)
- [Config Tests](../../tests/unit/config.test.ts)
- [Server Tests](../../tests/integration/server.test.ts)
- [Package JSON](../../package.json)

## Overview

- **Priority:** High
- **Status:** ✅ Complete
- **Depends on:** All previous phases
- **Description:** Verify TypeScript compilation, add unit tests for ElevenLabs client and config, verify MCP server starts with new tools registered.

## Key Insights

- Existing tests use Vitest framework
- Config tests validate env parsing
- Integration tests verify server starts and tools register
- ElevenLabs API calls cannot be integration-tested without a real API key (paid plan)
- Focus on: config parsing, client construction, schema validation, error handling

## Requirements

### Functional
- TypeScript compiles without errors (`npm run build`)
- Existing tests still pass (`npm test`)
- New unit tests for ElevenLabs config parsing
- New unit tests for ElevenLabsClient construction and `isConfigured()`
- New unit tests for schema validation (SFX + Music schemas)
- Server integration test verifies new tools appear in tool list

### Non-Functional
- No mocks of actual API calls (API requires paid key)
- Tests run in < 30 seconds

## Related Code Files

### Files to Create
- `tests/unit/elevenlabs-client.test.ts`
- `tests/unit/elevenlabs-schemas.test.ts`

### Files to Modify
- `tests/unit/config.test.ts` -- add ElevenLabs config tests
- `tests/integration/server.test.ts` -- verify new tools in tool list

## Implementation Steps

### Step 1: Run TypeScript Build

```bash
npm run build
```

Fix any compilation errors. Common issues:
- Import paths with `.js` extension required for ESM
- Missing type exports
- Config type changes

### Step 2: Run Existing Tests

```bash
npm test
```

All existing tests must pass before adding new ones.

### Step 3: Add `tests/unit/elevenlabs-client.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { ElevenLabsClient, ElevenLabsApiError } from "../../src/utils/elevenlabs-client.js";
import type { Config } from "../../src/utils/config.js";

// Minimal config for testing
function createTestConfig(apiKey?: string): Config {
  return {
    gemini: { apiKey: "", model: "gemini-2.5-flash", imageModel: "gemini-2.5-flash-image-preview", useVertexAI: false, vertexLocation: "us-central1" },
    transport: { type: "stdio" },
    server: { port: 3000, maxRequestSize: "50MB", enableCaching: true, cacheTTL: 3600, requestTimeout: 300000, fetchTimeout: 60000 },
    security: { rateLimitRequests: 100, rateLimitWindow: 60000 },
    logging: { level: "info" },
    providers: { speech: "gemini", video: "gemini", vision: "gemini", image: "gemini" },
    documentProcessing: { enabled: true, maxFileSize: 52428800, supportedFormats: [], timeout: 300000, retryAttempts: 3, cacheEnabled: true, ocrEnabled: false, geminiModel: "gemini-2.5-flash" },
    elevenlabs: apiKey ? { apiKey, apiHost: "https://api.elevenlabs.io" } : undefined,
  } as Config;
}

describe("ElevenLabsClient", () => {
  describe("isConfigured", () => {
    it("returns true when API key is set", () => {
      const config = createTestConfig("test-key-123");
      expect(ElevenLabsClient.isConfigured(config)).toBe(true);
    });

    it("returns false when API key is missing", () => {
      const config = createTestConfig();
      expect(ElevenLabsClient.isConfigured(config)).toBe(false);
    });

    it("returns false when elevenlabs section is undefined", () => {
      const config = createTestConfig();
      delete (config as any).elevenlabs;
      expect(ElevenLabsClient.isConfigured(config)).toBe(false);
    });
  });

  describe("constructor", () => {
    it("creates client when API key is provided", () => {
      const config = createTestConfig("test-key-123");
      const client = new ElevenLabsClient(config);
      expect(client).toBeInstanceOf(ElevenLabsClient);
    });

    it("throws when API key is missing", () => {
      const config = createTestConfig();
      expect(() => new ElevenLabsClient(config)).toThrow("ELEVENLABS_API_KEY is required");
    });
  });

  describe("ElevenLabsApiError", () => {
    it("captures status code and request ID", () => {
      const error = new ElevenLabsApiError(429, "Rate limit exceeded", "req-abc-123");
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.requestId).toBe("req-abc-123");
      expect(error.name).toBe("ElevenLabsApiError");
    });
  });
});
```

### Step 4: Add `tests/unit/elevenlabs-schemas.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { SfxGenerationInputSchema, ElevenLabsMusicGenerationInputSchema } from "../../src/tools/hands/schemas.js";

describe("SfxGenerationInputSchema", () => {
  it("parses valid input with all fields", () => {
    const result = SfxGenerationInputSchema.parse({
      text: "Thunder rumbling in the distance",
      duration_seconds: 5,
      prompt_influence: 0.5,
      loop: true,
    });
    expect(result.text).toBe("Thunder rumbling in the distance");
    expect(result.duration_seconds).toBe(5);
    expect(result.prompt_influence).toBe(0.5);
    expect(result.loop).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = SfxGenerationInputSchema.parse({
      text: "Birds chirping",
    });
    expect(result.prompt_influence).toBe(0.3);
    expect(result.loop).toBe(false);
    expect(result.duration_seconds).toBeUndefined();
  });

  it("rejects empty text", () => {
    expect(() => SfxGenerationInputSchema.parse({ text: "" })).toThrow();
  });

  it("rejects duration out of range", () => {
    expect(() => SfxGenerationInputSchema.parse({ text: "test", duration_seconds: 0.1 })).toThrow();
    expect(() => SfxGenerationInputSchema.parse({ text: "test", duration_seconds: 31 })).toThrow();
  });

  it("rejects prompt_influence out of range", () => {
    expect(() => SfxGenerationInputSchema.parse({ text: "test", prompt_influence: -0.1 })).toThrow();
    expect(() => SfxGenerationInputSchema.parse({ text: "test", prompt_influence: 1.1 })).toThrow();
  });
});

describe("ElevenLabsMusicGenerationInputSchema", () => {
  it("parses valid input with all fields", () => {
    const result = ElevenLabsMusicGenerationInputSchema.parse({
      prompt: "An upbeat electronic track",
      music_length_ms: 60000,
      force_instrumental: true,
    });
    expect(result.prompt).toBe("An upbeat electronic track");
    expect(result.music_length_ms).toBe(60000);
    expect(result.force_instrumental).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = ElevenLabsMusicGenerationInputSchema.parse({
      prompt: "A chill beat",
    });
    expect(result.music_length_ms).toBe(30000);
    expect(result.force_instrumental).toBe(false);
  });

  it("rejects empty prompt", () => {
    expect(() => ElevenLabsMusicGenerationInputSchema.parse({ prompt: "" })).toThrow();
  });

  it("rejects duration below minimum", () => {
    expect(() => ElevenLabsMusicGenerationInputSchema.parse({ prompt: "test", music_length_ms: 2000 })).toThrow();
  });

  it("rejects duration above maximum", () => {
    expect(() => ElevenLabsMusicGenerationInputSchema.parse({ prompt: "test", music_length_ms: 700000 })).toThrow();
  });
});
```

### Step 5: Update `tests/unit/config.test.ts`

Add a test case for ElevenLabs config parsing:

```typescript
describe("ElevenLabs config", () => {
  it("parses ELEVENLABS_API_KEY from env", () => {
    process.env.ELEVENLABS_API_KEY = "test-el-key";
    const config = loadConfig();
    expect(config.elevenlabs?.apiKey).toBe("test-el-key");
    delete process.env.ELEVENLABS_API_KEY;
  });

  it("defaults apiHost to https://api.elevenlabs.io", () => {
    const config = loadConfig();
    expect(config.elevenlabs?.apiHost).toBe("https://api.elevenlabs.io");
  });

  it("accepts elevenlabs as speech provider", () => {
    process.env.SPEECH_PROVIDER = "elevenlabs";
    const config = loadConfig();
    expect(config.providers.speech).toBe("elevenlabs");
    delete process.env.SPEECH_PROVIDER;
  });
});
```

### Step 6: Verify Integration

```bash
# Build
npm run build

# Run all tests
npm test

# If available, start server briefly to verify tool registration
npm start -- --help 2>&1 || true
```

### Step 7: Manual Verification (optional, requires API key)

If an ElevenLabs API key is available:

```bash
# Set env
export ELEVENLABS_API_KEY=your_key_here

# Build and run
npm run build
```

Test via MCP client or HTTP endpoint:
- `mouth_speak` with `provider: "elevenlabs"`, `elevenlabs_voice: "rachel"`
- `elevenlabs_gen_sfx` with `text: "Thunder and rain"`
- `elevenlabs_gen_music` with `prompt: "Chill lo-fi beat"`, `music_length_ms: 10000`

## Todo List

- [x] Run `npm run build` -- fix any TypeScript errors
- [x] Run `npm test` -- verify existing tests pass
- [x] Create `tests/unit/elevenlabs-client.test.ts`
- [x] Create `tests/unit/elevenlabs-schemas.test.ts`
- [x] Add ElevenLabs config tests to `tests/unit/config.test.ts`
- [x] Run `npm test` -- verify all tests pass (old + new)
- [x] Verify server starts without errors
- [x] Manual API test with real key (optional)

## Success Criteria

- `npm run build` exits with code 0
- `npm test` exits with code 0
- All new tests pass
- No regressions in existing tests
- Server starts and new tools appear in tool list

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Build fails due to import issues | Medium | Fix ESM `.js` extensions; check tsconfig paths |
| Existing tests break from config change | Low | Config change is additive (optional field) |
| Test config mock missing new fields | Low | Update test helpers to include elevenlabs field |

## Security Considerations

- Test API keys are fake values, never real credentials
- No actual API calls made in unit tests
