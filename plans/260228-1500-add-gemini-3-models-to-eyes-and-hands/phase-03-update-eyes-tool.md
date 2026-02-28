# Phase 3: Update Eyes Tool Registration

**Priority:** Medium | **Status:** Done | **Effort:** Small

## Context

- [plan.md](plan.md)

## Overview

Eyes tools don't expose a `model` parameter in their schemas -- they use `config.gemini.model` via `geminiClient.getModel()`. Since Phase 2 already handles temperature adjustment in `getModel()`, the Eyes tool just works when user sets env var `GOOGLE_GEMINI_MODEL=gemini-3-flash-preview`.

**No code changes needed in Eyes tool files.** The Eyes tools are already model-agnostic thanks to the config-driven architecture.

## Verification

After Phase 2 is done:
1. Set `GOOGLE_GEMINI_MODEL=gemini-3-flash-preview`
2. Call `eyes_analyze` with `detail: "detailed"` -- should use Gemini 3 Flash
3. Call `eyes_analyze` with `detail: "quick"` -- should still use `gemini-2.5-flash` (hardcoded quick fallback)

## Todo

- [x] Verify no changes needed (already model-agnostic)
- [x] Document that Eyes uses env var model selection

## Success Criteria

- Eyes tools work with any model set via `GOOGLE_GEMINI_MODEL`
- No code changes needed in this phase
