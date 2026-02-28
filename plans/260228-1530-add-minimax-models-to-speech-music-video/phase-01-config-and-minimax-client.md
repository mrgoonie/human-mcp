# Phase 1: Config + Minimax HTTP Client

**Priority:** High | **Status:** Pending | **Effort:** Small
**Depends on:** None (foundation phase)

## Context

- [Research: Speech & Music APIs](../research/260228-minimax-speech-music-api-research.md)
- [Research: Video API](../research/260228-minimax-hailuo-video-api-research.md)
- [plan.md](plan.md)

## Overview

Add Minimax configuration to the Zod ConfigSchema and create a shared HTTP client utility for all Minimax API calls. This is the foundation all other phases depend on.

## Key Insights

- All Minimax endpoints use same auth pattern: `Authorization: Bearer <API_KEY>`
- Base URL: `https://api.minimax.io` (global) or configurable via `MINIMAX_API_HOST`
- All responses share `base_resp.status_code` (0 = success) envelope
- No official Node.js SDK -- direct `fetch` is the recommended approach
- Error codes: 1002 (rate limit), 1004 (auth fail), 1008 (no balance), 1026 (content filter)

## Requirements

### Functional
- `MINIMAX_API_KEY` env var enables Minimax provider availability
- `MINIMAX_API_HOST` env var overrides base URL (default: `https://api.minimax.io`)
- Provider selection env vars: `SPEECH_PROVIDER`, `VIDEO_PROVIDER` (default: "gemini")
- Shared HTTP client handles auth, error mapping, and response parsing

### Non-functional
- Client file under 200 lines
- Config changes minimal (additive only)
- No new npm dependencies

## Related Code Files

### Modify
- `src/utils/config.ts` -- Add `minimax` section to ConfigSchema + provider env vars

### Create
- `src/utils/minimax-client.ts` -- Shared Minimax HTTP client

## Implementation Steps

### 1. Update `src/utils/config.ts`

Add `minimax` section to ConfigSchema after the `gemini` section:

```typescript
// Add after gemini section (around line 12):
minimax: z.object({
  apiKey: z.string().optional(),
  apiHost: z.string().default("https://api.minimax.io"),
}).optional(),
```

Add provider selection fields alongside existing transport section:

```typescript
// Add as top-level config field:
providers: z.object({
  speech: z.enum(["gemini", "minimax"]).default("gemini"),
  video: z.enum(["gemini", "minimax"]).default("gemini"),
}).default({ speech: "gemini", video: "gemini" }),
```

In `loadConfig()` function, add the parsing (after cloudflare section, around line 156):

```typescript
minimax: {
  apiKey: process.env.MINIMAX_API_KEY,
  apiHost: process.env.MINIMAX_API_HOST || "https://api.minimax.io",
},
providers: {
  speech: (process.env.SPEECH_PROVIDER as any) || "gemini",
  video: (process.env.VIDEO_PROVIDER as any) || "gemini",
},
```

### 2. Create `src/utils/minimax-client.ts`

```typescript
/**
 * Minimax API HTTP Client
 * Shared client for Speech 2.6, Music 2.5, and Hailuo 2.3 Video APIs
 */
import { logger } from "./logger.js";
import type { Config } from "./config.js";

export interface MinimaxApiResponse {
  base_resp: {
    status_code: number;
    status_msg: string;
  };
  data?: Record<string, unknown>;
  extra_info?: Record<string, unknown>;
  trace_id?: string;
  task_id?: string;
  // Video query fields
  status?: string;
  file_id?: string;
  file?: { file_id: string; download_url: string };
}

export class MinimaxApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public traceId?: string
  ) {
    super(message);
    this.name = "MinimaxApiError";
  }
}

export class MinimaxClient {
  private apiKey: string;
  private apiHost: string;

  constructor(config: Config) {
    const key = config.minimax?.apiKey;
    if (!key) {
      throw new Error("MINIMAX_API_KEY is required");
    }
    this.apiKey = key;
    this.apiHost = config.minimax?.apiHost || "https://api.minimax.io";
  }

  /** POST request to Minimax API */
  async post(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number = 300000
  ): Promise<MinimaxApiResponse> {
    const url = `${this.apiHost}${endpoint}`;
    logger.debug(`Minimax POST ${url}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const result = (await response.json()) as MinimaxApiResponse;
      this.checkError(result);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET request to Minimax API */
  async get(
    endpoint: string,
    params?: Record<string, string>,
    timeoutMs: number = 60000
  ): Promise<MinimaxApiResponse> {
    const url = new URL(`${this.apiHost}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, v)
      );
    }
    logger.debug(`Minimax GET ${url.toString()}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });

      const result = (await response.json()) as MinimaxApiResponse;
      this.checkError(result);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Download binary content from a URL */
  async downloadBuffer(
    downloadUrl: string,
    timeoutMs: number = 120000
  ): Promise<Buffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(downloadUrl, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Check response for Minimax error codes */
  private checkError(response: MinimaxApiResponse): void {
    const code = response.base_resp?.status_code;
    if (code === undefined || code === 0) return;

    const msg = response.base_resp?.status_msg || "Unknown error";
    const traceId = response.trace_id;

    switch (code) {
      case 1002:
      case 1039:
        throw new MinimaxApiError(code, `Rate limit exceeded: ${msg}`, traceId);
      case 1004:
      case 2049:
        throw new MinimaxApiError(code, `Authentication failed: ${msg}`, traceId);
      case 1008:
        throw new MinimaxApiError(code, `Insufficient balance: ${msg}`, traceId);
      case 1026:
      case 1027:
        throw new MinimaxApiError(code, `Content policy violation: ${msg}`, traceId);
      case 2013:
        throw new MinimaxApiError(code, `Invalid parameters: ${msg}`, traceId);
      default:
        throw new MinimaxApiError(code, `Minimax API error ${code}: ${msg}`, traceId);
    }
  }

  /** Check if Minimax is configured (API key present) */
  static isConfigured(config: Config): boolean {
    return !!(config.minimax?.apiKey);
  }
}
```

## Todo

- [ ] Add `minimax` section to ConfigSchema in `src/utils/config.ts`
- [ ] Add `providers` section to ConfigSchema
- [ ] Update `loadConfig()` to parse `MINIMAX_API_KEY`, `MINIMAX_API_HOST`, `SPEECH_PROVIDER`, `VIDEO_PROVIDER`
- [ ] Create `src/utils/minimax-client.ts` with post/get/downloadBuffer methods
- [ ] Run `bun run build` to verify no compile errors

## Success Criteria

- ConfigSchema accepts optional `minimax.apiKey` and `minimax.apiHost`
- `MinimaxClient` class can be instantiated with valid config
- `MinimaxClient.isConfigured()` returns false when no API key set
- Error codes properly mapped to descriptive error messages
- Build passes

## Risk Assessment

- **Low risk**: Purely additive config changes. No existing behavior modified
- **No dependencies**: Uses native `fetch` (available in Node 18+ and Bun)

## Security Considerations

- API key read from env var only, never hardcoded
- API key never logged (even at debug level)
- Bearer token only sent to `MINIMAX_API_HOST` endpoints
