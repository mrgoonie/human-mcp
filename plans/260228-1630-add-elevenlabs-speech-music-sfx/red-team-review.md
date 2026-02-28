# Red-Team Review: Add ElevenLabs Provider Plan

**Date:** 2026-02-28
**Reviewer:** Red Team (Adversarial)
**Plan:** `plans/260228-1630-add-elevenlabs-speech-music-sfx/plan.md`

---

## Severity Legend

- **CRITICAL** -- Will cause build failure or runtime crash if plan followed as-is
- **HIGH** -- Logic error or inconsistency that must be fixed before implementation
- **MEDIUM** -- Improvement needed but won't block implementation
- **LOW** -- Nitpick or minor improvement

---

## Findings

### 1. CRITICAL: Wrong `providers.speech` enum base value in Phase 1

**File:** `phase-01-config-and-elevenlabs-client.md`, Step 1b

**Issue:** Plan says to change FROM:
```typescript
speech: z.enum(["gemini", "minimax", "zhipuai"]).default("gemini"),
```
But the **actual** `config.ts` line 62 is:
```typescript
speech: z.enum(["gemini", "minimax"]).default("gemini"),
```

ZhipuAI is NOT in the `speech` enum -- it's only in `video`, `vision`, and `image` enums. If implementer follows plan literally, the `old_string` match will fail.

**Resolution:** Change FROM value to `["gemini", "minimax"]`. Change TO value to `["gemini", "minimax", "elevenlabs"]`. If ZhipuAI plan executes first, adjust accordingly at implementation time.

---

### 2. HIGH: Tool count arithmetic error in plan.md

**File:** `plan.md`, line 50

**Issue:** Plan says "Total tools after: 30 (currently 27 + 2 new SFX/Music + mouth_speak extended)". But 27 + 2 = 29, not 30. `mouth_speak` extension doesn't add a new tool.

**Resolution:** Change to "Total tools after: 29 (currently 27 + 2 new SFX/Music tools)".

---

### 3. HIGH: `loadConfig()` line reference off by 3 lines

**File:** `phase-01-config-and-elevenlabs-client.md`, Step 1c

**Issue:** Plan says "after line 167, the minimax block". Actual code: minimax is at lines 163-166, zhipuai is at lines 167-170. ElevenLabs block should go after the zhipuai block (after line 170).

**Resolution:** Change reference to "after the zhipuai block (line 170)".

---

### 4. HIGH: `SfxGenerationResult` defined inline, not in schemas

**File:** `phase-03-sfx-generation-tool.md`

**Issue:** `SfxGenerationResult` interface is defined inside the provider file (lines 87-97), while `ElevenLabsMusicResult` is also defined inline in Phase 4. This is inconsistent with the project pattern where `MusicGenerationResult` lives in `hands/schemas.ts`. The Phase 5 handler functions reference these types but they're not exported from schemas.

**Resolution:** Either:
- (A) Move both result interfaces to `hands/schemas.ts` (consistent with existing pattern) -- RECOMMENDED
- (B) Keep inline and import directly in handlers from provider files (works but inconsistent)

Both approaches work. Since these are provider-specific result types not reused elsewhere, inline is acceptable if imports are added to Phase 5.

---

### 5. MEDIUM: `speed` param shared between Minimax and ElevenLabs

**File:** `phase-05-schemas-and-tool-registration.md`, `phase-02-speech-provider-integration.md`

**Issue:** Both Minimax and ElevenLabs use `speed` as a mouth_speak parameter. The existing `speed` field (line 50 in mouth/index.ts) is described as "Minimax only". The plan's Phase 5 does NOT rename it but the Phase 2 routing uses `speed: (options as any).speed` for ElevenLabs too.

**Resolution:** This actually works correctly -- `speed` is a shared concept (speech rate), and provider routing ensures only one provider processes at a time. Update the field description to: `"Speech speed (0.5-2.0, for Minimax and ElevenLabs)"`. No code change needed.

---

### 6. MEDIUM: Plan says "3 new files" but actual count is 6

**File:** `plan.md`, line 42

**Issue:** Plan.md says "3 new files, 7 modified files". Actual new file count:
1. `elevenlabs-client.ts`
2. `elevenlabs-speech-provider.ts`
3. `elevenlabs-sfx-provider.ts`
4. `elevenlabs-music-provider.ts`
5. `elevenlabs-client.test.ts`
6. `elevenlabs-schemas.test.ts`

That's 4 source files + 2 test files = 6 new files.

**Resolution:** Change to "4 new source files, 2 new test files, 7 modified files".

---

### 7. MEDIUM: `hands/index.ts` exceeds 200-line limit significantly

**File:** `phase-05-schemas-and-tool-registration.md`

**Issue:** `hands/index.ts` is already 1441 lines. Adding ~80 lines makes it ~1520. Codebase standard is 200 lines max per file. Plan acknowledges this but offers no mitigation.

**Resolution:** Not a blocker for this plan. The entire file needs modularization (extract handlers into processors/), but that's a separate refactoring task. Add a TODO comment at the bottom of Phase 5 noting this tech debt.

---

### 8. MEDIUM: Missing `handleError` import verification in Phase 5

**File:** `phase-05-schemas-and-tool-registration.md`

**Issue:** The handler error catch blocks use `handleError(error)` but the plan doesn't verify this function is imported. If it's missing, runtime error.

**Resolution:** Already verified -- `handleError` is imported at line 21 of `hands/index.ts`. No action needed, but plan should note this dependency explicitly.

---

### 9. LOW: Phase 6 `.env.example` has duplicate provider defaults section

**File:** `phase-06-env-and-docs-update.md`, Step 1

**Issue:** Plan adds a new ElevenLabs section with its own `# Provider Defaults` comment AND updates the existing one. This could result in two provider defaults comment blocks if not careful.

**Resolution:** Only update the existing provider defaults comment (lines 65-67). Don't add a second one in the ElevenLabs section.

---

### 10. LOW: `stability` and `similarity_boost` param naming

**File:** `phase-05-schemas-and-tool-registration.md`

**Issue:** The plan adds `stability` and `similarity_boost` as top-level mouth_speak params. These are generic-sounding names that could conflict with future providers. But `elevenlabs_style` is namespaced. Inconsistent.

**Resolution:** Acceptable as-is since these voice settings are common across TTS providers. If preferred, namespace them as `elevenlabs_stability`, `elevenlabs_similarity_boost` -- but this adds verbosity. Current approach is fine.

---

## Summary

| # | Severity | Issue | Action |
|---|----------|-------|--------|
| 1 | CRITICAL | Wrong `speech` enum base value in Phase 1 | Fix FROM value |
| 2 | HIGH | Tool count math error (30 should be 29) | Fix number |
| 3 | HIGH | Wrong `loadConfig()` line reference | Fix line ref |
| 4 | HIGH | `SfxGenerationResult` not in schemas | Import from provider or move to schemas |
| 5 | MEDIUM | `speed` param description says "Minimax only" | Update description |
| 6 | MEDIUM | File count wrong (3 vs 6) | Fix count |
| 7 | MEDIUM | `hands/index.ts` exceeds 200-line limit | Accept as tech debt |
| 8 | MEDIUM | `handleError` import not verified | Already verified, note in plan |
| 9 | LOW | Duplicate provider defaults in .env.example | Merge into one block |
| 10 | LOW | `stability`/`similarity_boost` not namespaced | Accept as-is |

## Verdict

**Plan is VIABLE with fixes.** One CRITICAL issue (#1) must be fixed before implementation -- the wrong enum base value will cause the Edit tool to fail. Three HIGH issues need attention but don't block the approach. Overall architecture is sound and follows existing patterns correctly.
