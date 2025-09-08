# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Human MCP is a Model Context Protocol server that provides AI coding agents with visual analysis capabilities for debugging UI issues, processing screenshots, videos, and GIFs using Google Gemini AI.

## Development Commands

### Core Commands
- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production (outputs to dist/)
- `bun run start` - Run production build
- `bun test` - Run test suite
- `bun run typecheck` - Run TypeScript type checking
- `bun run inspector` - Launch MCP inspector for testing tools

### Testing with MCP Inspector
The inspector tool is crucial for testing MCP tools during development:
```bash
bun run inspector
```

## Architecture

### Core Structure
```
src/
├── index.ts          # Entry point, starts stdio server
├── server.ts         # MCP server setup and initialization  
├── tools/eyes/       # Vision analysis tools (main functionality)
├── prompts/          # Pre-built debugging prompts
├── resources/        # Documentation resources
└── utils/           # Configuration, logging, error handling
```

### Key Components

**Vision Analysis (tools/eyes/)**
- `index.ts` - Registers eyes.analyze and eyes.compare tools
- `processors/` - Handles image, video, and GIF processing
- `utils/gemini-client.ts` - Google Gemini API integration
- `schemas.ts` - Zod validation schemas for tool inputs

**Configuration (utils/config.ts)**
- Environment-based configuration using Zod validation
- Required: `GOOGLE_GEMINI_API_KEY`
- Optional settings for timeouts, caching, rate limits

## MCP Tools

### eyes.analyze
Primary tool for visual analysis of images, videos, and GIFs:
- Supports file paths, URLs, and base64 data URIs
- Configurable detail levels (quick/detailed)
- Frame extraction for videos and GIFs
- Custom analysis prompts

### eyes.compare  
Compares two images to identify visual differences:
- Three comparison types: pixel, structural, semantic
- Detailed difference reporting
- Impact assessment and recommendations

## Important Development Notes

### Google Gemini Documentation
- [Gemini API](https://ai.google.dev/gemini-api/docs?hl=en)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Video Understanding](https://ai.google.dev/gemini-api/docs/video-understanding?hl=en)
- [Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Document Understanding](https://ai.google.dev/gemini-api/docs/document-processing)
- [Audio Understanding](https://ai.google.dev/gemini-api/docs/audio)
- [Speech Generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Video Generation](https://ai.google.dev/gemini-api/docs/video)

### Error Handling
- All tool operations use centralized error handling via `utils/errors.ts`
- Errors are logged and returned as structured MCP responses
- Network timeouts are configurable via environment variables

### Media Processing
- Images: PNG, JPEG, WebP, GIF (static)
- Videos: MP4, WebM, MOV, AVI (uses ffmpeg via fluent-ffmpeg)  
- GIFs: Frame extraction using Sharp library
- All processors handle file paths, URLs, and base64 data

### TypeScript Configuration
- Uses ESNext modules with bundler resolution
- Path mapping: `@/*` maps to `src/*`
- Strict type checking enabled
- No emit mode (Bun handles compilation)

### Google Gemini Integration
- Uses Google Generative AI SDK
- Model selection based on detail level
- Configurable via `GOOGLE_GEMINI_MODEL` environment variable
- Default: `gemini-2.5-flash`

## Testing

Run tests with `bun test`. The project uses Bun's built-in test runner.

For manual testing of MCP tools, use the inspector:
```bash
bun run inspector
```

This launches a web interface for testing tool functionality interactively.

---

## Development Rules

### General
- Use `pnpm` instead of `npm` or `yarn` for package management
- Use `context7` mcp tools for exploring latest docs of plugins/packages
- Use `senera` mcp tools for semantic retrieval and editing capabilities

### Code Quality Guidelines
- Read and follow codebase structure and code standards in `./docs`
- Don't be too harsh on code linting, but make sure there are no syntax errors and code are compilable
- Prioritize functionality and readability over strict style enforcement and code formatting
- Use reasonable code quality standards that enhance developer productivity
- Use try catch error handling & cover security standards
- Use `code-reviewer` agent to review code after every implementation

### Pre-commit/Push Rules
- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build or github actions)
- Keep commits focused on the actual code changes
- **DO NOT** commit and push any confidential information (such as dotenv files, API keys, database credentials, etc.) to git repository!
- NEVER automatically add AI attribution signatures like:
  "🤖 Generated with [Claude Code]"
  "Co-Authored-By: Claude noreply@anthropic.com"
  Any AI tool attribution or signature
- Create clean, professional commit messages without AI references. Use conventional commit format.