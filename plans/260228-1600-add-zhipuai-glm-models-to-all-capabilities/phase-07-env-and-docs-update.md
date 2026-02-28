# Phase 7: .env.example + Docs Update

**Priority:** Medium | **Status:** Pending | **Effort:** Small
**Depends on:** Phases 1-6

## Context

- [plan.md](plan.md)

## Overview

Update `.env.example` with ZhipuAI configuration variables and update project documentation.

## Implementation Steps

### 1. Update `.env.example`

Add after existing Gemini/Vertex config:

```env
# ZhipuAI (Z.AI / GLM) Configuration
# Get API key from https://z.ai/model-api or https://open.bigmodel.cn/
# ZHIPUAI_API_KEY=your_zhipuai_api_key_here
# ZHIPUAI_API_HOST=https://api.z.ai/api/paas/v4
# ZHIPUAI_TTS_HOST=https://open.bigmodel.cn/api/paas/v4

# Provider Selection (per capability, default: gemini)
# EYES_PROVIDER=gemini          # Options: gemini, zhipuai
# IMAGE_PROVIDER=gemini         # Options: gemini, zhipuai
# VIDEO_PROVIDER=gemini         # Options: gemini, zhipuai, minimax
# SPEECH_PROVIDER=gemini        # Options: gemini, zhipuai, minimax
```

### 2. Update `docs/project-overview-pdr.md`

Add ZhipuAI to technology stack section.

### 3. Update `docs/codebase-structure-architecture-code-standards.md`

Add new files to codebase structure:
- `src/utils/zhipuai-client.ts`
- `src/tools/eyes/providers/zhipuai-vision-provider.ts`
- `src/tools/hands/providers/zhipuai-image-provider.ts`
- `src/tools/hands/providers/zhipuai-video-provider.ts`
- `src/tools/mouth/providers/zhipuai-speech-provider.ts`

### 4. Update `docs/project-roadmap.md`

Add ZhipuAI provider integration milestone.

## Todo

- [ ] Update `.env.example` with ZhipuAI env vars
- [ ] Update docs/project-overview-pdr.md
- [ ] Update docs/codebase-structure-architecture-code-standards.md
- [ ] Update docs/project-roadmap.md
- [ ] Run `bun run build` to verify

## Success Criteria

- `.env.example` documents all ZhipuAI env vars
- Docs reflect new provider capability
- Build passes
