# Phase 1: Update Config & Schemas

**Priority:** High | **Status:** Done | **Effort:** Small
**Revised:** 2026-02-28 (post red-team review)

## Context

- [Research Report](../research/260228-google-gemini-latest-model-releases.md)
- [plan.md](plan.md)
- [Red Team Review](reports/red-team-review.md)

## Overview

Update configuration defaults and Zod schemas to accept the new model IDs. Add extended aspect ratios for Nano Banana 2. Keep current defaults unchanged for backwards compatibility.

## Key Insights

- New image model: `gemini-3.1-flash-image-preview` (Nano Banana 2)
- Veo 3.1 DROPPED -- unverified model ID, not adding
- `gemini-2.0-flash-exp` deprecated June 2026 -- update fallback to `gemini-2.5-flash`
- Nano Banana 2 supports extended aspect ratios (2:3, 3:2, 4:5, 5:4, 21:9, 1:4, 4:1, 1:8, 8:1)
- Only line 167 in config.ts needs updating (lines 71/80 already correct)

## Related Code Files

### Modify
- `src/tools/hands/schemas.ts` -- Expand `z.enum` for `model` and `aspect_ratio` fields
- `src/utils/config.ts` -- Update line 167 env fallback only

## Implementation Steps

### 1. Update `src/tools/hands/schemas.ts`

**ImageGenerationInputSchema model enum (line 5):**
```typescript
// Before:
model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview"),

// After:
model: z.enum([
  "gemini-2.5-flash-image-preview",
  "gemini-3.1-flash-image-preview"
]).optional().default("gemini-2.5-flash-image-preview"),
```

**ImageGenerationInputSchema aspect_ratio enum (line 9):**
```typescript
// Before:
aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("1:1"),

// After:
aspect_ratio: z.enum([
  "1:1", "16:9", "9:16", "4:3", "3:4",
  "2:3", "3:2", "4:5", "5:4", "21:9",
  "1:4", "4:1", "1:8", "8:1"
]).optional().default("1:1"),
```

**VideoGenerationInputSchema model enum (line 45):**
```typescript
// NO CHANGE -- veo-3.1 dropped (unverified)
model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001"),
```

**VideoGenerationInputSchema aspect_ratio enum (line 48):**
```typescript
// Before:
aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9"),

// After:
aspect_ratio: z.enum([
  "1:1", "16:9", "9:16", "4:3", "3:4",
  "2:3", "3:2", "4:5", "5:4", "21:9",
  "1:4", "4:1", "1:8", "8:1"
]).optional().default("16:9"),
```

### 2. Update `src/utils/config.ts`

**ONLY line 167** needs changing (lines 71/80 already use `gemini-2.5-flash`):
```typescript
// Before (line 167):
geminiModel: process.env.DOCUMENT_GEMINI_MODEL || "gemini-2.0-flash-exp",

// After:
geminiModel: process.env.DOCUMENT_GEMINI_MODEL || "gemini-2.5-flash",
```

## Todo

- [x] Update ImageGenerationInputSchema model enum
- [x] Update ImageGenerationInputSchema aspect_ratio enum
- [x] Update VideoGenerationInputSchema aspect_ratio enum (video model enum unchanged)
- [x] Update config.ts line 167 document processing fallback
- [x] Run `bun run build` to verify

## Success Criteria

- Schemas accept `gemini-3.1-flash-image-preview` model
- Extended aspect ratios available in image AND video schemas
- Document processing defaults to `gemini-2.5-flash`
- Existing defaults unchanged
- Build passes
