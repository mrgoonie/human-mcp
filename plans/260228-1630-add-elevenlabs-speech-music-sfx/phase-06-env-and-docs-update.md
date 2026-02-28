# Phase 6: Environment Variables and Documentation Update

## Context Links

- [.env.example](../../.env.example)
- [Codebase Structure Doc](../../docs/codebase-structure-architecture-code-standards.md)
- [Project Roadmap](../../docs/project-roadmap.md)
- [README](../../README.md)

## Overview

- **Priority:** Medium
- **Status:** ✅ Complete
- **Depends on:** Phases 1-5
- **Description:** Update `.env.example` with ElevenLabs config vars. Update docs to reflect new provider and tools.

## Requirements

### Functional
- `.env.example` includes `ELEVENLABS_API_KEY` and `ELEVENLABS_API_HOST`
- `SPEECH_PROVIDER` comment updated to include `elevenlabs`
- README updated with new tool count and ElevenLabs mention
- Codebase docs updated with new files and architecture

### Non-Functional
- Keep changes minimal and consistent with existing doc style

## Related Code Files

### Files to Modify
- `.env.example`
- `README.md`
- `docs/codebase-structure-architecture-code-standards.md`

## Implementation Steps

### Step 1: Update `.env.example`

Add after the Minimax section (after line 64):

```bash
# ElevenLabs API Configuration (Optional - for premium TTS, sound effects, music)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
# ELEVENLABS_API_HOST=https://api.elevenlabs.io

# Provider Defaults (gemini, minimax, zhipuai, or elevenlabs)
# SPEECH_PROVIDER=gemini
# VIDEO_PROVIDER=gemini
```

Also update the existing provider defaults comment (lines 65-67) to replace:
```bash
# Provider Defaults (gemini or minimax)
# SPEECH_PROVIDER=gemini
# VIDEO_PROVIDER=gemini
```

With:
```bash
# Provider Defaults (gemini, minimax, zhipuai, or elevenlabs for speech)
# SPEECH_PROVIDER=gemini
# VIDEO_PROVIDER=gemini
```

### Step 2: Update `README.md`

**2a. Update Hands section** (around line 20-26):

Add after the Browser Automation line:
```markdown
- **Sound Effects** (1 tool): elevenlabs_gen_sfx - Generate sound effects from text using ElevenLabs
- **Music Generation** (1 tool): elevenlabs_gen_music - Generate music tracks using ElevenLabs Music
```

**2b. Update Mouth section** (around line 28-33):

Update description to mention ElevenLabs:
```markdown
- **mouth_speak**: Convert text to speech with Gemini (30+ voices), Minimax (300+ voices), or ElevenLabs (40+ premium voices, 70+ languages)
```

**2c. Update tool counts:**
- Hands: `16 tools` -> `18 tools`
- Total: `27 MCP Tools` -> `29 MCP Tools`

**2d. Update Technology Stack** (around line 47-54):

Add:
```markdown
- **ElevenLabs API** - Premium text-to-speech, sound effects, and music generation
```

### Step 3: Update `docs/codebase-structure-architecture-code-standards.md`

**3a. Update directory structure** (add new files):

Under `src/tools/mouth/providers/`:
```
│   │       ├── providers/   # Speech providers
│   │       │   ├── minimax-speech-provider.ts
│   │       │   └── elevenlabs-speech-provider.ts
```

Under `src/tools/hands/providers/`:
```
│   │   │   └── providers/   # Content generation providers
│   │   │       ├── minimax-music-provider.ts
│   │   │       ├── minimax-video-provider.ts
│   │   │       ├── elevenlabs-sfx-provider.ts
│   │   │       └── elevenlabs-music-provider.ts
```

Under `src/utils/`:
```
│       ├── elevenlabs-client.ts # Shared ElevenLabs HTTP client
```

**3b. Update architecture diagram** to show ElevenLabs as external service.

**3c. Update tool count** in the document.

## Todo List

- [x] Add ElevenLabs config vars to `.env.example`
- [x] Update provider defaults comment in `.env.example`
- [x] Update README Hands section with new tools
- [x] Update README Mouth section with ElevenLabs mention
- [x] Update README tool counts (18 hands, 29 total)
- [x] Add ElevenLabs to Technology Stack in README
- [x] Update directory structure in codebase docs
- [x] Update architecture diagram in codebase docs

## Success Criteria

- `.env.example` has all necessary ElevenLabs variables
- README accurately reflects new tool count and capabilities
- Documentation reflects new file structure
- No incorrect or stale information in docs

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Doc counts get stale | Low | Verify against actual registered tools |
| README too long | Low | Keep additions concise |

## Security Considerations

- `.env.example` uses placeholder values, never real keys
- No API keys exposed in documentation
