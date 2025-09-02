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