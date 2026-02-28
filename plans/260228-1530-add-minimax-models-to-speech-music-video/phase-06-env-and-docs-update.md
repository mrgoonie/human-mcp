# Phase 6: .env.example and Documentation Update

**Priority:** Low | **Status:** Pending | **Effort:** Small
**Depends on:** Phase 1-5 (all implementation complete)

## Context

- [plan.md](plan.md)
- [Existing .env.example](../../.env.example)
- [Existing README.md](../../README.md)

## Overview

Update `.env.example` with Minimax configuration variables and update project documentation to reflect the new provider options. This is purely a documentation phase with no code logic changes.

## Requirements

### Functional
- `.env.example` includes all Minimax-related env vars with descriptions
- README.md mentions Minimax provider support in relevant sections
- Documentation is accurate and consistent with implementation

### Non-functional
- Keep documentation concise
- Follow existing documentation style

## Related Code Files

### Modify
- `.env.example` -- Add Minimax configuration section
- `README.md` -- Update tool descriptions and feature list
- `docs/project-overview-pdr.md` -- Update if tool count changes (optional)

## Implementation Steps

### 1. Update `.env.example`

Append a new Minimax section after the Cloudflare R2 section:

```bash
# ============================================================
# Minimax AI Configuration (Optional - Alternative Provider)
# ============================================================
# Get your API key from: https://platform.minimax.io/user-center/basic-information/interface-key

# Minimax API Key (enables Speech 2.6, Music 2.5, Hailuo 2.3 Video)
MINIMAX_API_KEY=your_minimax_api_key_here

# Minimax API Host (default: https://api.minimax.io for global, use https://api.minimaxi.chat for China)
# MINIMAX_API_HOST=https://api.minimax.io

# Provider Selection (choose default provider per capability)
# Options: "gemini" (default) or "minimax"
# SPEECH_PROVIDER=gemini
# VIDEO_PROVIDER=gemini
```

### 2. Update `README.md`

Add Minimax to the features section. In the tool table or list, update:

**Under Speech/Mouth tools:**
```markdown
- `mouth_speak` - Text-to-speech using Gemini TTS or Minimax Speech 2.6 (300+ voices, 40 languages, emotion control)
```

**Under Hands tools:**
```markdown
- `minimax_gen_music` - Generate full-length songs from lyrics using Minimax Music 2.5 (up to 5+ min, 14 structure tags)
- `gemini_gen_video` - Generate videos using Gemini Veo 3.0 or Minimax Hailuo 2.3 (T2V, up to 1080P, 10s)
- `gemini_image_to_video` - Image-to-video using Gemini Veo 3.0 or Minimax Hailuo 2.3/2.3-Fast
```

**Add a "Multi-Provider Support" section or subsection:**
```markdown
### Multi-Provider Support

Human MCP supports multiple AI providers for media generation. Set the provider per-request or via environment variables:

| Capability | Gemini (default) | Minimax (optional) |
|---|---|---|
| Speech (TTS) | Gemini 2.5 Flash/Pro TTS | Speech 2.6 HD/Turbo (300+ voices, emotions) |
| Music | -- | Music 2.5 (lyrics + style, up to 5 min) |
| Video (T2V) | Veo 3.0 | Hailuo 2.3 (768P/1080P, 6-10s) |
| Video (I2V) | Veo 3.0 | Hailuo 2.3 / 2.3-Fast (50% cheaper) |

**Per-request:** Add `provider: "minimax"` to tool calls.
**Default provider:** Set `SPEECH_PROVIDER=minimax` or `VIDEO_PROVIDER=minimax` env vars.
**API key:** Set `MINIMAX_API_KEY` to enable Minimax provider.
```

### 3. Update tool count

If `README.md` mentions a specific tool count (currently 27 tools), increment by 1 for the new `minimax_gen_music` tool (28 total). Search for the number and update.

### 4. Update `docs/project-overview-pdr.md` (optional)

If this file references tool counts or provider lists, update accordingly. Keep changes minimal.

## Todo

- [ ] Update `.env.example` with Minimax configuration section
- [ ] Update `README.md` tool descriptions for multi-provider support
- [ ] Update `README.md` feature list / tool count
- [ ] Add Multi-Provider Support section to `README.md`
- [ ] Update `docs/project-overview-pdr.md` tool count (if applicable)

## Success Criteria

- `.env.example` has all Minimax env vars with clear descriptions
- `README.md` accurately reflects new Minimax capabilities
- Tool count updated to 28 (27 existing + 1 new `minimax_gen_music`)
- No broken links or references in documentation

## Risk Assessment

- **No risk**: Documentation-only changes, no code logic impact

## Security Considerations

- `.env.example` uses placeholder values (`your_minimax_api_key_here`), not real keys
- China API host option documented but commented out

## Next Steps

- Phase 7 (tests + build verification) is the final phase
