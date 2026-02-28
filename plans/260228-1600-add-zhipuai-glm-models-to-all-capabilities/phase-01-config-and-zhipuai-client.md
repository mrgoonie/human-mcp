# Phase 1: Config + ZhipuAI HTTP Client

**Priority:** High | **Effort:** Medium
**Depends on:** None

## Context

- [plan.md](plan.md)
- Reference: `src/utils/minimax-client.ts` (follow exact same pattern)
- Reference: `src/utils/config.ts` (extend existing config)

## Overview

Create `ZhipuAIClient` HTTP client and extend config schema to support ZhipuAI provider.

## Files to Modify

- `src/utils/config.ts` -- add zhipuai config section + extend providers enum
- `src/utils/zhipuai-client.ts` -- NEW, standalone HTTP client

## Implementation Steps

### 1. Modify `src/utils/config.ts`

Add `zhipuai` config section after existing `minimax` section (line ~56):

```typescript
zhipuai: z.object({
  apiKey: z.string().optional(),
  apiHost: z.string().default("https://open.bigmodel.cn/api/paas/v4"),
}).optional(),
```

Extend existing `providers` object (line ~57-60) to add `vision` and `image`, and extend `speech`/`video` enums:

```typescript
providers: z.object({
  speech: z.enum(["gemini", "minimax", "zhipuai"]).default("gemini"),
  video: z.enum(["gemini", "minimax", "zhipuai"]).default("gemini"),
  vision: z.enum(["gemini", "zhipuai"]).default("gemini"),
  image: z.enum(["gemini", "zhipuai"]).default("gemini"),
}).default({ speech: "gemini", video: "gemini", vision: "gemini", image: "gemini" }),
```

In `loadConfig()` function, add env var mappings (after minimax section, line ~160):

```typescript
zhipuai: {
  apiKey: process.env.ZHIPUAI_API_KEY,
  apiHost: process.env.ZHIPUAI_API_HOST || "https://open.bigmodel.cn/api/paas/v4",
},
```

Extend providers section to include new fields:

```typescript
providers: {
  speech: (process.env.SPEECH_PROVIDER as any) || "gemini",
  video: (process.env.VIDEO_PROVIDER as any) || "gemini",
  vision: (process.env.VISION_PROVIDER as any) || "gemini",
  image: (process.env.IMAGE_PROVIDER as any) || "gemini",
},
```

### 2. Create `src/utils/zhipuai-client.ts`

Follow `minimax-client.ts` pattern exactly. Key differences from Minimax:
- ZhipuAI uses standard HTTP status codes (not `base_resp.status_code`)
- Auth: `Authorization: Bearer <API_KEY>` (same as Minimax)
- Base URL: `https://open.bigmodel.cn/api/paas/v4` (default)
- Response format varies by endpoint (not unified like Minimax)

Structure:
- `ZhipuAIApiError` class (extends Error, has statusCode + requestId)
- `ZhipuAIClient` class with:
  - `constructor(config)` -- validate apiKey, set apiHost
  - `post<T>(endpoint, body, timeoutMs)` -- typed JSON POST
  - `get<T>(endpoint, params?, timeoutMs)` -- typed JSON GET
  - `downloadBuffer(url, timeoutMs)` -- download binary content
  - `handleHttpError(status, body)` -- map error codes (401→auth, 429→rate limit)
  - `static isConfigured(config)` -- check if apiKey present

**Estimated lines:** ~120 (under 200-line limit)

## Todo

- [ ] Add `zhipuai` config section to `ConfigSchema` in `config.ts`
- [ ] Extend `providers` object with `vision` and `image` fields
- [ ] Extend `speech` and `video` enums to include `"zhipuai"`
- [ ] Add env var mappings in `loadConfig()`
- [ ] Create `src/utils/zhipuai-client.ts`
- [ ] Run `bun run build` to verify no type errors

## Success Criteria

- `ZhipuAIClient.isConfigured(config)` returns `true` when `ZHIPUAI_API_KEY` is set
- Config schema validates with new fields
- Existing Minimax config unchanged
- Build passes
