# RED TEAM REVIEW: Gemini 3 Models Implementation Plan

**Reviewer:** Code Reviewer Agent (Red Team)
**Date:** 2026-02-28
**Plan Directory:** `d:\www\human-mcp\plans\260228-1500-add-gemini-3-models-to-eyes-and-hands\`
**Severity:** CRITICAL FLAWS DETECTED

---

## Executive Summary

This implementation plan has **MULTIPLE CRITICAL GAPS** that will cause build failures, runtime errors, and incomplete functionality. The plan incorrectly assumes certain models exist, fails to account for extended aspect ratios, misses critical file locations, and has an incomplete understanding of the codebase structure.

**Recommendation:** REJECT AND REVISE before implementation begins.

---

## CRITICAL ISSUE #1: Missing Inline Schema Updates in index.ts

### Severity: HIGH - WILL CAUSE BUILD FAILURE

**Location:** Phase 4 claims to update inline schemas in `src/tools/hands/index.ts` but **COMPLETELY MISSES** the aspect_ratio enums.

**Evidence from source code:**
- Line 58 in `index.ts`: `aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"])`
- Line 91 in `index.ts`: `aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"])`

**The plan does NOT account for:**
1. Updating aspect_ratio enum in `gemini_gen_image` registration (line ~58)
2. Updating aspect_ratio enum in `gemini_gen_video` registration (line ~91)
3. Updating aspect_ratio enum in `gemini_image_to_video` registration (line ~126)
4. Updating aspect_ratio enum in `handleImageToVideoGeneration` inline schema (line ~754)

**Impact:** If Nano Banana 2 supports extended aspect ratios (1:4, 4:1, 1:8, 8:1 per research report line 136), users CANNOT use them because the inline schemas will reject those values at runtime.

---

## CRITICAL ISSUE #2: Incorrect Document Processing Default Model

### Severity: HIGH - BREAKS EXISTING FUNCTIONALITY

**Location:** Phase 1, config.ts line 167

**Evidence from actual source code:**
```typescript
// Line 167 in config.ts (ACTUAL)
geminiModel: process.env.DOCUMENT_GEMINI_MODEL || "gemini-2.0-flash-exp",
```

**Plan says to change to:** `"gemini-2.5-flash"`

**The problem:** The plan is correct that `gemini-2.0-flash-exp` is deprecated (June 2026 per research report line 358), BUT:

1. **Line 71** in config.ts ALREADY uses `"gemini-2.5-flash"` as the schema default
2. **Line 80** in config.ts ALREADY uses `"gemini-2.5-flash"` in the object default
3. **Only line 167 needs updating** (the env var fallback)

**Impact:** The plan misidentifies which lines to change, creating confusion during implementation.

---

## CRITICAL ISSUE #3: Aspect Ratio Schema Incompleteness

### Severity: MEDIUM - MISSING FEATURE

**Location:** Phase 1, schemas.ts

**Research report line 136 states:**
> **Supported Aspect Ratios**: 1:1, 2:3, 3:2, 4:3, 3:4, 4:5, 5:4, 16:9, 9:16, 21:9, **1:4, 4:1, 1:8, 8:1**

**Current schema (line 9 in schemas.ts):**
```typescript
aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("1:1"),
```

**The plan does NOT:**
1. Add Nano Banana 2's extended aspect ratios (1:4, 4:1, 1:8, 8:1)
2. Add Nano Banana 2's additional standard ratios (2:3, 3:2, 4:5, 5:4, 21:9)

**Why this matters:**
- Nano Banana 2 is explicitly designed for ultra-wide/tall formats (research line 136, 194)
- These are **exclusive features** that differentiate Nano Banana 2 from the original
- Users upgrading to Nano Banana 2 specifically for these ratios will be UNABLE to use them

**Impact:** Core selling point of Nano Banana 2 is unavailable to users.

---

## CRITICAL ISSUE #4: Veo 3.1 Model Existence UNVERIFIED

### Severity: HIGH - POTENTIAL RUNTIME FAILURE

**Location:** Phase 1, adding `veo-3.1-generate-preview`

**Evidence from research report:**
- Line 346: `| **Veo 3.1** | veo-3.1-generate-preview | Video generation with 4K, portrait, templates |`
- Line 404: Listed in "Unresolved Questions" section

**The problem:**
Research report line 404 explicitly lists this as UNRESOLVED:
> 1. Will `gemini-pro-latest` alias update to point to `gemini-3.1-pro-preview`? (Likely, but no announcement yet.)

**There is NO official documentation link or API reference for `veo-3.1-generate-preview` in the research report resources section (lines 377-401).**

**Impact:** If this model ID does not actually exist in the Gemini API, ALL video generation calls with model=veo-3.1-generate-preview will fail at runtime.

**Recommendation:** Verify model exists via API test BEFORE adding to schemas. If unverified, mark as TODO for future phase.

---

## CRITICAL ISSUE #5: Missing Test File Updates

### Severity: MEDIUM - TEST FAILURES

**Location:** Phase 6 identifies test files to check, but is INCOMPLETE

**Grep results show these files reference hardcoded model strings:**
- `tests/utils/test-data-generators.ts` (referenced by ALL test files)
- `tests/unit/hands-tool.test.ts`
- `tests/unit/hands-schemas.test.ts`
- `tests/unit/config.test.ts`
- `tests/integration/hands-image-generation.test.ts`
- `tests/integration/enhanced-image-generation.test.ts`
- `tests/e2e/hands-real-api.test.ts`
- `tests/unit/hands-video-schemas.test.ts`
- `tests/integration/hands-video-generation.test.ts`

**The plan lists these for checking:**
- `tests/unit/config.test.ts` ✅
- `tests/unit/hands-schemas.test.ts` ✅
- `tests/unit/hands-video-schemas.test.ts` ✅
- `tests/unit/hands-tool.test.ts` ✅
- `tests/utils/test-data-generators.ts` ✅

**MISSING from plan:**
- `tests/integration/hands-image-generation.test.ts` ❌
- `tests/integration/enhanced-image-generation.test.ts` ❌
- `tests/integration/hands-video-generation.test.ts` ❌
- `tests/e2e/hands-real-api.test.ts` ❌

**Impact:** Tests will fail if they validate against old hardcoded enum values. Plan says "fix failing tests" but doesn't enumerate WHICH tests.

---

## CRITICAL ISSUE #6: Temperature Workaround is INCOMPLETE

### Severity: MEDIUM - INCORRECT IMPLEMENTATION

**Location:** Phase 2, temperature adjustment in gemini-client.ts

**Plan proposes:**
```typescript
const temperature = this.isGemini3Series(modelName) ? 1.0 : 0.1;
```

**Research report line 240 states:**
> Default is now 1.0; values below 1.0 may cause looping or degraded output
> **Recommendation: remove explicit temperature config entirely**

**The problem:**
1. Plan hardcodes temperature to 1.0 for Gemini 3 series
2. Research recommendation is to REMOVE explicit temperature (use default)
3. Plan does not account for future Gemini 3 models that might have different defaults

**Correct approach:**
```typescript
const config = this.isGemini3Series(modelName)
  ? { topK: 1, topP: 0.95, maxOutputTokens: 8192 } // No temperature
  : { temperature: 0.1, topK: 1, topP: 0.95, maxOutputTokens: 8192 };
```

**Impact:** Minor - hardcoded temp=1.0 will work, but deviates from Google's migration guide best practice.

---

## CRITICAL ISSUE #7: Gemini 3 Detection Logic is FRAGILE

### Severity: LOW - FUTURE BREAKAGE

**Location:** Phase 2, `isGemini3Series()` helper

**Plan proposes:**
```typescript
private isGemini3Series(modelName: string): boolean {
  return modelName.startsWith("gemini-3") || modelName.startsWith("gemini-3.");
}
```

**The problem:**
- `modelName.startsWith("gemini-3")` already covers `"gemini-3."` (redundant condition)
- Does NOT handle version aliases like `gemini-flash-latest` (research line 372)
- Does NOT handle future naming like `gemini-3.5-flash`

**Correct approach:**
```typescript
private isGemini3Series(modelName: string): boolean {
  return /^gemini-3(\.\d+)?/.test(modelName);
}
```

**Impact:** Minor - current logic works for known models, but may break on aliases or future versions.

---

## CRITICAL ISSUE #8: Breaking Change Documentation MISSING

### Severity: MEDIUM - USER CONFUSION

**Location:** Phase 5, README.md and .env.example updates

**The plan updates:**
- Technology stack line in README (line 48)
- .env.example comments

**MISSING:**
1. **Migration guide** for users switching from Gemini 2.5 to Gemini 3
2. **Breaking changes warning** about temperature behavior
3. **Feature matrix** showing which capabilities are model-specific (thinking_level vs thinking_budget)
4. **Deprecation notice** for gemini-2.0-flash-exp

**Research report lines 313-327 detail extensive breaking changes that users MUST know about.**

**Impact:** Users will blindly switch to Gemini 3 models and encounter:
- Unexpected looping (temperature issue)
- Missing features (image segmentation, Maps grounding)
- Incompatible parameters (thinking_budget)

---

## CRITICAL ISSUE #9: Eyes Tool Model Selection is UNDOCUMENTED

### Severity: LOW - DOCUMENTATION GAP

**Location:** Phase 3 states "No code changes needed" for Eyes tools

**The plan correctly identifies that Eyes tools use `config.gemini.model` and work automatically with env var changes.**

**However:**
1. Users don't know they can set `GOOGLE_GEMINI_MODEL=gemini-3-flash-preview`
2. .env.example comments don't mention this affects Eyes tools
3. README doesn't document the relationship between model env var and Eyes behavior

**Impact:** Users may think Eyes tools don't support Gemini 3 models because they aren't explicitly listed in tool schemas.

---

## CRITICAL ISSUE #10: Schema Default Inconsistencies

### Severity: LOW - MAINTAINABILITY

**Location:** Multiple files

**The codebase has DUPLICATE schema definitions:**

**In schemas.ts (line 5):**
```typescript
model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview"),
```

**In index.ts (line 54):**
```typescript
model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview").describe("Image generation model"),
```

**The plan updates BOTH locations, but does not address WHY this duplication exists or propose consolidation.**

**Impact:** Future model additions require updating 8+ locations (schemas.ts + 4 inline schemas in index.ts). High risk of desync.

---

## VERIFICATION QUESTIONS (UNANSWERED)

### 1. Veo 3.1 Model Existence
**Question:** Does `veo-3.1-generate-preview` actually exist in the Gemini API?
**Source:** Research report line 346, marked as "Unknown" in unresolved questions
**Test:** Make API call to verify before adding to schemas

### 2. Aspect Ratio Support by Model
**Question:** Do ALL Nano Banana models support ALL aspect ratios, or are extended ratios (1:4, 4:1, 1:8, 8:1) EXCLUSIVE to Nano Banana 2?
**Source:** Research report line 136, 194
**Impact:** If exclusive to Nano Banana 2, aspect_ratio validation should be MODEL-DEPENDENT, not static enum

### 3. Image Search Grounding
**Question:** Does Nano Banana 2's exclusive "Google Image Search Grounding" require new API parameters?
**Source:** Research report line 139-140
**Impact:** If yes, schemas are missing required fields

### 4. 4K Output Support
**Question:** Does Nano Banana 2's 4K output support (research line 192) require new `image_size` enum values?
**Source:** Research report line 137
**Current schema:** No `image_size` field exists in ImageGenerationInputSchema
**Impact:** 4K generation is impossible without this field

---

## MISSING FILES/CHANGES

### Files that SHOULD be modified but are NOT in the plan:

1. **`src/tools/eyes/index.ts`** - Should document that model selection works via env var
2. **`docs/migration-guide-gemini-3.md`** - Should exist for breaking changes
3. **`CHANGELOG.md`** - Should document new model support
4. **`.github/workflows/*.yml`** - CI/CD may need env var updates for tests

### Inline schema locations NOT accounted for:

1. `src/tools/hands/index.ts` line ~58 - aspect_ratio for gemini_gen_image
2. `src/tools/hands/index.ts` line ~91 - aspect_ratio for gemini_gen_video
3. `src/tools/hands/index.ts` line ~126 - aspect_ratio for gemini_image_to_video
4. `src/tools/hands/index.ts` line ~754 - aspect_ratio in handleImageToVideoGeneration

---

## RECOMMENDED ACTIONS

### Before Implementation:

1. **VERIFY veo-3.1-generate-preview exists** via API test - if not, remove from plan
2. **ADD aspect_ratio extended values** (1:4, 4:1, 1:8, 8:1, 2:3, 3:2, 4:5, 5:4, 21:9) to ALL schemas
3. **ADD image_size field** to ImageGenerationInputSchema with 512px, 1K, 2K, 4K options
4. **REVISE Phase 1** to correctly identify only line 167 in config.ts needs changing
5. **EXPAND Phase 4** to include aspect_ratio enum updates in index.ts
6. **EXPAND Phase 6** to enumerate ALL test files requiring updates

### During Implementation:

7. **IMPLEMENT model-dependent aspect_ratio validation** (if extended ratios are Nano Banana 2 exclusive)
8. **FIX temperature handling** to OMIT temperature for Gemini 3, not hardcode to 1.0
9. **IMPROVE isGemini3Series()** regex to handle aliases and future versions
10. **ADD migration guide** to docs/ explaining breaking changes

### After Implementation:

11. **TEST with actual API** - don't rely on schema validation alone
12. **DOCUMENT env var behavior** for Eyes tool model selection
13. **UPDATE README** with comprehensive model support matrix
14. **ADD deprecation warnings** for gemini-2.0-flash-exp users

---

## RISK ASSESSMENT

| Risk Category | Severity | Likelihood | Mitigation Status |
|---|---|---|---|
| Build failure (missing schema updates) | HIGH | HIGH | ❌ Not mitigated |
| Runtime errors (veo-3.1 doesn't exist) | HIGH | MEDIUM | ❌ Not verified |
| Missing features (extended aspect ratios) | MEDIUM | HIGH | ❌ Not planned |
| Test failures (unaccounted test files) | MEDIUM | HIGH | ⚠️ Partially mitigated |
| Breaking changes (temp, thinking config) | MEDIUM | LOW | ⚠️ Partially mitigated |
| Documentation gaps (migration guide) | LOW | HIGH | ❌ Not planned |

---

## FINAL VERDICT

**Status:** ❌ **REJECT - REVISE REQUIRED**

**Blocking issues:**
1. Missing aspect_ratio enum updates in 4 locations in index.ts
2. Unverified veo-3.1-generate-preview model existence
3. Missing extended aspect ratio support for Nano Banana 2
4. Incomplete test file enumeration

**Non-blocking issues:**
5. Suboptimal temperature handling (works but not best practice)
6. Missing migration guide documentation
7. Fragile Gemini 3 detection logic
8. Missing image_size field for 4K support

**Recommendation:** Address blocking issues #1-4 before implementation. Issues #5-8 can be deferred to follow-up phase.

---

**Red Team Reviewer:** Code Reviewer Agent
**Review Date:** 2026-02-28
**Next Review:** After plan revision
