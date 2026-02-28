# Phase 6: Tests & Build Verification

**Priority:** High | **Status:** Done | **Effort:** Small
**Revised:** 2026-02-28 (post red-team review)

## Context

- [plan.md](plan.md)
- [Red Team Review](reports/red-team-review.md)

## Overview

Run existing tests and build to verify no regressions. Update test data if tests reference hardcoded model enums or aspect ratio values.

## Related Code Files

### Check/Modify (ALL files that may reference hardcoded model strings)

**Unit tests:**
- `tests/unit/config.test.ts`
- `tests/unit/hands-schemas.test.ts`
- `tests/unit/hands-video-schemas.test.ts`
- `tests/unit/hands-tool.test.ts`

**Integration tests:**
- `tests/integration/hands-image-generation.test.ts`
- `tests/integration/enhanced-image-generation.test.ts`
- `tests/integration/hands-video-generation.test.ts`

**E2E tests:**
- `tests/e2e/hands-real-api.test.ts`

**Test utilities:**
- `tests/utils/test-data-generators.ts`

## Implementation Steps

### 1. Run build

```bash
bun run build
```

Fix any TypeScript compilation errors.

### 2. Run tests

```bash
bun test
```

### 3. Fix failing tests

Tests that may need updating:
- Tests validating `model` field should accept `gemini-3.1-flash-image-preview`
- Tests validating `aspect_ratio` field should accept extended ratios
- Tests using `gemini-2.0-flash-exp` for document processing should update to `gemini-2.5-flash`
- Integration tests that check enum values against hardcoded lists
- Test data generators that produce test fixtures with old enum values

### 4. Run typecheck

```bash
bun run typecheck
```

## Todo

- [x] Run `bun run build`
- [x] Run `bun test`
- [x] Fix any failing unit tests
- [x] Fix any failing integration tests
- [x] Fix any failing e2e tests
- [x] Run `bun run typecheck`
- [x] Verify all pass

## Success Criteria

- `bun run build` -- zero errors
- `bun test` -- all pass
- `bun run typecheck` -- zero errors
