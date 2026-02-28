# Phase 4: Update Hands Tool Registration

**Priority:** High | **Status:** Done | **Effort:** Medium
**Revised:** 2026-02-28 (post red-team review)

## Context

- [plan.md](plan.md)
- [Red Team Review](reports/red-team-review.md)
- Phase 1 updates schemas, this phase updates tool registrations

## Overview

Update the Hands tool registration in `index.ts` to expose the new model options AND extended aspect ratios in the inline `z.enum()` definitions. These inline schemas override the imported schema enums.

## Key Insights

- `src/tools/hands/index.ts` has INLINE Zod schemas that duplicate `schemas.ts`
- Both model AND aspect_ratio enums must be updated in sync
- 8 total locations need updating (4 model + 4 aspect_ratio)
- Veo 3.1 DROPPED -- video model enums stay unchanged

## Related Code Files

### Modify
- `src/tools/hands/index.ts` -- Update inline `z.enum` for model AND aspect_ratio params

## Implementation Steps

### 1. Update `gemini_gen_image` tool registration

**Model enum (line ~54):**
```typescript
// Before:
model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview")

// After:
model: z.enum([
  "gemini-2.5-flash-image-preview",
  "gemini-3.1-flash-image-preview"
]).optional().default("gemini-2.5-flash-image-preview")
```

**Aspect ratio enum (line ~58):**
```typescript
// Before:
aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"])

// After:
aspect_ratio: z.enum([
  "1:1", "16:9", "9:16", "4:3", "3:4",
  "2:3", "3:2", "4:5", "5:4", "21:9",
  "1:4", "4:1", "1:8", "8:1"
])
```

### 2. Update `gemini_gen_video` tool registration

**Model enum (line ~88):**
NO CHANGE -- veo-3.1 dropped.

**Aspect ratio enum (line ~91):**
```typescript
// Before:
aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"])

// After:
aspect_ratio: z.enum([
  "1:1", "16:9", "9:16", "4:3", "3:4",
  "2:3", "3:2", "4:5", "5:4", "21:9",
  "1:4", "4:1", "1:8", "8:1"
])
```

### 3. Update `gemini_image_to_video` tool registration

**Model enum (line ~126):**
NO CHANGE -- veo-3.1 dropped.

**Aspect ratio enum (line ~129):**
```typescript
// Before:
aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"])

// After:
aspect_ratio: z.enum([
  "1:1", "16:9", "9:16", "4:3", "3:4",
  "2:3", "3:2", "4:5", "5:4", "21:9",
  "1:4", "4:1", "1:8", "8:1"
])
```

### 4. Update `handleImageToVideoGeneration` inline schema

**Model enum (line ~751):**
NO CHANGE -- veo-3.1 dropped.

**Aspect ratio enum (line ~754):**
```typescript
// Before:
aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"])

// After:
aspect_ratio: z.enum([
  "1:1", "16:9", "9:16", "4:3", "3:4",
  "2:3", "3:2", "4:5", "5:4", "21:9",
  "1:4", "4:1", "1:8", "8:1"
])
```

### 5. `handleImageGeneration` fallback (line ~647)

```typescript
model: model || "gemini-2.5-flash-image-preview",
```
No change -- the fallback stays the same. New models are opt-in.

## Todo

- [x] Update `gemini_gen_image` inline model enum
- [x] Update `gemini_gen_image` inline aspect_ratio enum
- [x] Update `gemini_gen_video` inline aspect_ratio enum (model unchanged)
- [x] Update `gemini_image_to_video` inline aspect_ratio enum (model unchanged)
- [x] Update `handleImageToVideoGeneration` inline aspect_ratio enum (model unchanged)
- [x] Run `bun run build` to verify

## Success Criteria

- `gemini-3.1-flash-image-preview` selectable in image generation tool
- Extended aspect ratios available in ALL image/video tools
- Video model enums unchanged (no veo-3.1)
- Default models unchanged
- Build passes
