# Phase 7: Tests + Build Verification

**Priority:** High | **Effort:** Medium
**Depends on:** Phases 1-6

## Context

- [plan.md](plan.md)

## Overview

Run build, typecheck, and tests. Add unit tests for ZhipuAI client.

## Implementation Steps

### 1. Build + Typecheck

```bash
bun run build
bun run typecheck
```

Both must pass with zero errors.

### 2. Existing Tests

```bash
bun test
```

All existing tests must still pass.

### 3. Add ZhipuAI Client Tests

Create `src/utils/__tests__/zhipuai-client.test.ts`:

- `ZhipuAIClient.isConfigured()` returns `false` when no API key
- `ZhipuAIClient.isConfigured()` returns `true` when API key set
- Constructor throws when no API key
- Constructor uses default apiHost when not specified
- Constructor uses custom apiHost when specified

### 4. Regression Check

Verify all tools work without `provider` param (defaults to Gemini).

### 5. Manual Smoke Tests (if API key available)

- `eyes_analyze` with `provider: "zhipuai"`
- `gemini_gen_image` with `provider: "zhipuai"`
- `gemini_gen_video` with `provider: "zhipuai"`
- `mouth_speak` with `provider: "zhipuai"`

## Todo

- [ ] Run `bun run build` -- must pass
- [ ] Run `bun run typecheck` -- must pass
- [ ] Run `bun test` -- all existing tests must pass
- [ ] Create `src/utils/__tests__/zhipuai-client.test.ts`
- [ ] Run `bun test` with new tests
- [ ] Manual smoke test (if API key available)

## Success Criteria

- Build, typecheck, and tests all pass
- No regressions in existing tool behavior
