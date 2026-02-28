# Phase 2: Update Gemini Client Model Methods

**Priority:** High | **Status:** Done | **Effort:** Medium
**Revised:** 2026-02-28 (post red-team review)

## Context

- [Research Report](../research/260228-google-gemini-latest-model-releases.md)
- [plan.md](plan.md)
- [Red Team Review](reports/red-team-review.md)

## Overview

Update `GeminiClient` methods to handle Gemini 3 series models properly, accounting for breaking changes in temperature behavior.

## Key Insights

- **Temperature below 1.0 causes looping on Gemini 3** -- critical to handle
- Google's migration guide recommends: **OMIT temperature entirely** for Gemini 3 (use server default)
- Current code uses `temperature: 0.1` for vision/doc models and `temperature: 0.7` for image gen
- Solution: detect Gemini 3 series models and OMIT temperature from generationConfig

## Related Code Files

### Modify
- `src/tools/eyes/utils/gemini-client.ts` -- Update model methods with Gemini 3-aware temperature

## Implementation Steps

### 1. Add Gemini 3 detection helper

At top of `GeminiClient` class, add:
```typescript
private isGemini3Series(modelName: string): boolean {
  return /^gemini-3(\.\d+)?/.test(modelName);
}
```

Uses regex to handle `gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-image-preview`, and future `gemini-3.5-*` variants.

### 2. Update `getModel()` (vision/analysis - line 145)

```typescript
getModel(detailLevel: "quick" | "detailed"): GenerativeModel {
  const modelName = detailLevel === "detailed"
    ? this.config.gemini.model
    : "gemini-2.5-flash";

  // Gemini 3 series: omit temperature per Google migration guide
  const generationConfig = this.isGemini3Series(modelName)
    ? { topK: 1, topP: 0.95, maxOutputTokens: 8192 }
    : { temperature: 0.1, topK: 1, topP: 0.95, maxOutputTokens: 8192 };

  return this.provider.getGenerativeModel({
    model: modelName,
    generationConfig,
  });
}
```

### 3. Update `getImageGenerationModel()` (line 161)

```typescript
getImageGenerationModel(modelName?: string): GenerativeModel {
  const imageModelName = modelName || this.config.gemini.imageModel || "gemini-2.5-flash-image-preview";

  // Gemini 3 series: omit temperature per Google migration guide
  const generationConfig = this.isGemini3Series(imageModelName)
    ? { topK: 32, topP: 0.95, maxOutputTokens: 8192 }
    : { temperature: 0.7, topK: 32, topP: 0.95, maxOutputTokens: 8192 };

  return this.provider.getGenerativeModel({
    model: imageModelName,
    generationConfig,
  });
}
```

### 4. Update `getDocumentModel()` (line 243)

Same pattern -- detect and omit temperature for Gemini 3.

### 5. Update `getVideoGenerationModel()` (line 1687)

Same pattern for video generation model.

### 6. Quick mode fallback

The hardcoded `"gemini-2.5-flash"` for quick mode is fine as-is -- it's a stable GA model. No change needed.

## Todo

- [x] Add `isGemini3Series()` helper method
- [x] Update `getModel()` -- omit temperature for Gemini 3
- [x] Update `getImageGenerationModel()` -- omit temperature for Gemini 3
- [x] Update `getDocumentModel()` -- omit temperature for Gemini 3
- [x] Update `getVideoGenerationModel()` -- omit temperature for Gemini 3
- [x] Run `bun run build` to verify

## Success Criteria

- Gemini 3 models get NO explicit temperature (uses server default)
- Existing Gemini 2.5 behavior unchanged (same temperature values)
- No compilation errors

## Risk Assessment

- **Low**: Temperature omission follows Google's official recommendation
- **Mitigation**: Existing models unaffected, Gemini 3 uses server-side defaults
