# Phase 1: Config + ElevenLabs HTTP Client

## Context Links

- [ElevenLabs API Report](../reports/researcher-elevenlabs-report.md)
- [Minimax Client Reference](../../src/utils/minimax-client.ts)
- [Config Reference](../../src/utils/config.ts)

## Overview

- **Priority:** Critical (blocks all other phases)
- **Status:** ✅ Complete
- **Description:** Add ElevenLabs config section to `config.ts` and create `elevenlabs-client.ts` HTTP client.

## Key Insights

- Auth uses `xi-api-key` header (not `Authorization: Bearer`)
- Audio endpoints return binary `application/octet-stream` (not JSON)
- Base URL: `https://api.elevenlabs.io`, with regional alternatives
- Output format is a query parameter, not body field
- Error responses are JSON even when success is binary

## Requirements

### Functional
- ElevenLabs API key configurable via `ELEVENLABS_API_KEY` env var
- API host configurable via `ELEVENLABS_API_HOST` env var (default: `https://api.elevenlabs.io`)
- `providers.speech` enum extended with `"elevenlabs"`
- HTTP client with `postBinary()` method returning `Buffer` for audio endpoints
- HTTP client with `postJson()` method for any JSON-response endpoints
- Static `isConfigured()` check

### Non-Functional
- Keep file under 120 lines
- Follow MinimaxClient patterns for consistency

## Architecture

```
Config (elevenlabs section)
  |
  v
ElevenLabsClient
  |-- postBinary(endpoint, body, queryParams?, timeout?) -> Buffer
  |-- postJson(endpoint, body, timeout?) -> any
  |-- static isConfigured(config) -> boolean
```

## Related Code Files

### Files to Modify
- `src/utils/config.ts` (lines 53-66)

### Files to Create
- `src/utils/elevenlabs-client.ts`

## Implementation Steps

### Step 1: Modify `src/utils/config.ts`

**1a. Add `elevenlabs` config section** (after line 56, the `minimax` section):

```typescript
elevenlabs: z.object({
  apiKey: z.string().optional(),
  apiHost: z.string().default("https://api.elevenlabs.io"),
}).optional(),
```

**1b. Extend `providers.speech` enum** (line 62):

Change:
```typescript
speech: z.enum(["gemini", "minimax"]).default("gemini"),
```
To:
```typescript
speech: z.enum(["gemini", "minimax", "elevenlabs"]).default("gemini"),
```

> **Note:** If ZhipuAI plan is implemented first, the FROM value may already include `"zhipuai"`. Adjust at implementation time.

**1c. Add elevenlabs section to `loadConfig()` return** (after the `zhipuai` block, around line 170):

```typescript
elevenlabs: {
  apiKey: process.env.ELEVENLABS_API_KEY,
  apiHost: process.env.ELEVENLABS_API_HOST || "https://api.elevenlabs.io",
},
```

### Step 2: Create `src/utils/elevenlabs-client.ts`

```typescript
/**
 * ElevenLabs API HTTP Client
 * Shared client for TTS, Sound Effects, and Music Generation APIs
 */
import { logger } from "./logger.js";
import type { Config } from "./config.js";

export class ElevenLabsApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = "ElevenLabsApiError";
  }
}

export class ElevenLabsClient {
  private apiKey: string;
  private apiHost: string;

  constructor(config: Config) {
    const key = config.elevenlabs?.apiKey;
    if (!key) {
      throw new Error("ELEVENLABS_API_KEY is required");
    }
    this.apiKey = key;
    this.apiHost = config.elevenlabs?.apiHost || "https://api.elevenlabs.io";
  }

  /**
   * POST request returning binary audio buffer.
   * Used for TTS, SFX, and Music endpoints.
   */
  async postBinary(
    endpoint: string,
    body: Record<string, unknown>,
    queryParams?: Record<string, string>,
    timeoutMs: number = 60000
  ): Promise<Buffer> {
    const url = new URL(`${this.apiHost}${endpoint}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([k, v]) =>
        url.searchParams.set(k, v)
      );
    }
    logger.debug(`ElevenLabs POST (binary) ${url.toString()}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const requestId = response.headers.get("request-id") || undefined;
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          errorMsg = this.extractErrorMessage(errorJson, response.status);
        } catch {
          // response body not JSON
        }
        throw new ElevenLabsApiError(response.status, errorMsg, requestId);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST request returning parsed JSON.
   * Used for non-audio endpoints if needed.
   */
  async postJson<T = unknown>(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number = 60000
  ): Promise<T> {
    const url = `${this.apiHost}${endpoint}`;
    logger.debug(`ElevenLabs POST (json) ${url}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const result = await response.json();
      if (!response.ok) {
        const requestId = response.headers.get("request-id") || undefined;
        const errorMsg = this.extractErrorMessage(result, response.status);
        throw new ElevenLabsApiError(response.status, errorMsg, requestId);
      }
      return result as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Extract human-readable error message from API error response */
  private extractErrorMessage(
    errorJson: any,
    statusCode: number
  ): string {
    if (errorJson?.detail?.message) {
      return errorJson.detail.message;
    }
    if (typeof errorJson?.detail === "string") {
      return errorJson.detail;
    }
    if (Array.isArray(errorJson?.detail)) {
      return errorJson.detail
        .map((d: any) => d.msg || JSON.stringify(d))
        .join("; ");
    }
    return `ElevenLabs API error (HTTP ${statusCode})`;
  }

  /** Check if ElevenLabs is configured (API key present) */
  static isConfigured(config: Config): boolean {
    return !!(config.elevenlabs?.apiKey);
  }
}
```

## Todo List

- [x] Add `elevenlabs` section to ConfigSchema in `config.ts`
- [x] Extend `providers.speech` enum with `"elevenlabs"` in `config.ts`
- [x] Add `elevenlabs` to `loadConfig()` return object in `config.ts`
- [x] Create `src/utils/elevenlabs-client.ts` with `ElevenLabsClient` class
- [x] Verify TypeScript compilation passes

## Success Criteria

- `loadConfig()` parses `ELEVENLABS_API_KEY` and `ELEVENLABS_API_HOST` from env
- `ElevenLabsClient.isConfigured(config)` returns true when API key is set
- `postBinary()` returns a Buffer from binary audio responses
- `postBinary()` throws `ElevenLabsApiError` on non-200 responses
- TypeScript compiles without errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Config schema change breaks existing parsing | Low | Optional field with `.optional()`, no breaking change |
| Binary response handling differs from Minimax | Medium | Dedicated `postBinary()` method, tested separately |

## Security Considerations

- API key stored in env var only, never logged
- API key transmitted via `xi-api-key` header over HTTPS
- No API key in request body or query params
