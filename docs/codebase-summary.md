# Human MCP - Codebase Summary

## Overview

Human MCP is a Model Context Protocol server that provides AI coding agents with visual analysis capabilities for debugging UI issues, processing screenshots, videos, and GIFs using Google Gemini AI. This summary provides a comprehensive overview of the codebase structure and key components.

## Project Statistics

- **Language**: TypeScript/JavaScript (Bun runtime)
- **Total Source Files**: ~65 files
- **Main Package**: @modelcontextprotocol/sdk, Google Generative AI, Zod, Sharp, fluent-ffmpeg
- **Architecture**: MCP Server with plugin-based tools
- **Build Tool**: Bun with TypeScript compilation

## Directory Structure

```
human-mcp/
├── .claude/                    # Claude Code agent configurations
├── .github/workflows/          # CI/CD automation
├── .serena/                   # Serena MCP tool configuration
├── docs/                      # Project documentation (NEW)
├── examples/                  # Usage examples
├── src/                       # Source code
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/eyes/           # Vision analysis tools
│   ├── prompts/              # Pre-built debugging prompts
│   ├── resources/            # MCP resources
│   ├── types/                # TypeScript definitions
│   └── utils/                # Core utilities
├── tests/                    # Test suites
├── dist/                     # Built output
└── Configuration files       # package.json, tsconfig.json, etc.
```

## Core Components

### 1. MCP Server (`src/server.ts`, `src/index.ts`)

**Purpose**: Initializes and starts the MCP server with stdio transport
**Key Functions**:
- Creates McpServer instance with metadata
- Registers tools, prompts, and resources
- Handles server lifecycle and error management

**Architecture Pattern**: Server initialization with dependency injection

```typescript
export async function createServer() {
  const config = loadConfig();
  const server = new McpServer({
    name: "human-mcp",
    version: "1.0.0",
  });

  await registerEyesTool(server, config);
  await registerPrompts(server);
  await registerResources(server);
  
  return server;
}
```

### 2. Vision Analysis Tools (`src/tools/eyes/`)

**Primary Tool**: `eyes.analyze` - Multi-modal visual content analysis
**Secondary Tool**: `eyes.compare` - Image comparison and difference detection

#### Tool Structure:
- **`index.ts`**: Tool registration and orchestration
- **`schemas.ts`**: Zod validation schemas for inputs/outputs
- **`processors/`**: Media-specific processing logic
  - `image.ts`: Direct image analysis
  - `video.ts`: Video frame extraction and analysis
  - `gif.ts`: GIF frame extraction and sequence analysis
- **`utils/`**: Tool utilities
  - `gemini-client.ts`: Google Gemini API integration
  - `formatters.ts`: Output formatting and structuring

#### Key Features:
- **Multi-format Support**: Images (PNG, JPEG, WebP), Videos (MP4, WebM, MOV, AVI), GIFs
- **Analysis Types**: general, ui_debug, error_detection, accessibility, performance, layout
- **Input Sources**: File paths, URLs, base64 data URIs
- **Comparison Types**: pixel, structural, semantic differences

### 3. Pre-built Debugging Workflows (`src/prompts/`)

**Component**: Debugging prompt templates for common UI analysis scenarios

**Available Prompts**:
- `debug_ui_screenshot`: Layout and rendering issue detection
- `analyze_error_recording`: Temporal error pattern analysis
- `accessibility_audit`: WCAG compliance and accessibility checking
- `performance_visual_audit`: Performance indicator analysis
- `layout_comparison`: Before/after layout difference analysis

**Integration**: Prompts are registered as MCP prompt resources with templating support

### 4. Configuration Management (`src/utils/config.ts`)

**Pattern**: Environment-driven configuration with Zod validation
**Key Features**:
- **Required**: Google Gemini API key
- **Optional**: Model selection, timeouts, caching, logging levels
- **Validation**: Runtime configuration validation with meaningful error messages
- **Defaults**: Sensible defaults for all optional settings

**Configuration Schema**:
```typescript
const ConfigSchema = z.object({
  gemini: z.object({
    apiKey: z.string().min(1, "Google Gemini API key is required"),
    model: z.string().default("gemini-2.5-flash"),
  }),
  server: z.object({
    requestTimeout: z.number().default(300000),
    fetchTimeout: z.number().default(60000),
    // ... other server config
  }),
  // ... security, logging config
});
```

### 5. Error Handling & Logging (`src/utils/`)

**Error Handling (`errors.ts`)**:
- Centralized error processing with MCP compliance
- Structured error responses with meaningful messages
- Error categorization and appropriate HTTP status mapping

**Logging (`logger.ts`)**:
- Structured logging with configurable levels
- Context-aware logging with request tracking
- Performance metrics and timing information
- Privacy-conscious logging (no sensitive data)

### 6. Media Processing Architecture

#### Image Processing (`src/tools/eyes/processors/image.ts`)
- Direct Gemini Vision API integration
- Support for all major image formats
- Base64 and URL input handling
- OCR and element detection capabilities

#### Video Processing (`src/tools/eyes/processors/video.ts`)
- ffmpeg integration via fluent-ffmpeg
- Frame extraction with configurable sampling
- Temporal analysis for error detection
- Support for common video formats

#### GIF Processing (`src/tools/eyes/processors/gif.ts`)
- Sharp library for frame extraction
- Animation sequence understanding
- Frame-by-frame analysis capabilities
- Support for both static and animated GIFs

### 7. Type System (`src/types/`, `src/tools/eyes/schemas.ts`)

**Type Safety Features**:
- Comprehensive TypeScript type definitions
- Zod runtime validation schemas
- Input/output type inference
- MCP protocol compliance types

**Key Schemas**:
- `EyesInputSchema`: Visual analysis input validation
- `EyesOutputSchema`: Structured analysis output format
- `CompareInputSchema`: Image comparison input validation
- `Config`: Environment configuration typing

### 8. Testing Infrastructure (`tests/`)

**Test Structure**:
- **Unit Tests**: Individual function and utility testing
- **Integration Tests**: End-to-end MCP server functionality
- **Setup**: Centralized test environment configuration
- **Coverage**: Core utilities and error handling

**Testing Tools**:
- Bun built-in test runner
- MCP inspector for manual testing
- Mock implementations for external services

## Key Dependencies

### Runtime Dependencies
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **@google/generative-ai**: Google Gemini API client
- **zod**: Runtime type validation and parsing
- **sharp**: Image processing and manipulation
- **fluent-ffmpeg**: Video processing wrapper for ffmpeg

### Development Dependencies
- **typescript**: Static type checking and compilation
- **@modelcontextprotocol/inspector**: Interactive MCP tool testing
- **semantic-release**: Automated version management and publishing
- **@types/*****: TypeScript type definitions for Node.js libraries

### System Dependencies
- **Bun Runtime**: JavaScript/TypeScript runtime environment
- **ffmpeg**: Video processing system dependency
- **Node.js**: Alternative runtime compatibility

## Configuration & Environment

### Required Environment Variables
- `GOOGLE_GEMINI_API_KEY`: Google Gemini API access key (required)

### Optional Environment Variables
- `GOOGLE_GEMINI_MODEL`: AI model selection (default: gemini-2.5-flash)
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `REQUEST_TIMEOUT`: Operation timeout in milliseconds (default: 300000)
- `FETCH_TIMEOUT`: HTTP request timeout in milliseconds (default: 60000)
- `ENABLE_CACHING`: Enable response caching (default: true)
- `CACHE_TTL`: Cache time-to-live in seconds (default: 3600)

### TypeScript Configuration
- **Target**: ESNext with bundler module resolution
- **Strict Mode**: All strict type checking options enabled
- **Path Mapping**: `@/*` aliases for clean imports
- **No Emit**: Bun handles compilation directly

## Architecture Patterns

### 1. Plugin-based Tool Architecture
Tools are registered dynamically with the MCP server, allowing for easy extension and modification without changing core server code.

### 2. Strategy Pattern for Media Processing
Different processors handle different media types, allowing for specialized optimization and feature sets per media type.

### 3. Configuration-driven Development
All runtime behavior configurable through environment variables with validation and sensible defaults.

### 4. Error-first Design
Comprehensive error handling at every layer with structured error responses and logging.

### 5. Schema-driven Validation
All external inputs validated through Zod schemas with TypeScript type inference for compile-time safety.

## Integration Points

### MCP Client Integration
The server exposes standard MCP protocol endpoints via stdio transport, making it compatible with any MCP-enabled AI agent or client.

### Google Gemini AI Integration
Direct integration with Google's Gemini API for visual analysis, with configurable model selection and comprehensive error handling.

### System Tool Integration
Integration with system-level tools (ffmpeg for video processing, Sharp for image processing) with proper error handling and fallback mechanisms.

## Development Workflow

### Development Commands
```bash
bun run dev        # Development server with hot reload
bun run build      # Production build
bun run start      # Run production build
bun test           # Run test suite
bun run typecheck  # TypeScript type checking
bun run inspector  # MCP tool inspector for testing
```

### Testing Strategy
- **Unit Testing**: Individual function testing with mocks
- **Integration Testing**: Full MCP server workflow testing
- **Manual Testing**: Interactive testing via MCP inspector
- **Configuration Testing**: Environment variable validation testing

## Performance Characteristics

### Response Times
- **Image Analysis**: 10-30 seconds depending on detail level
- **Video Processing**: 1-3 minutes for typical clips
- **GIF Analysis**: 30 seconds to 2 minutes depending on frame count
- **Image Comparison**: 15-45 seconds for detailed comparison

### Memory Usage
- **Base Server**: ~50-100MB
- **Image Processing**: +20-100MB per operation
- **Video Processing**: +100-500MB depending on video size
- **Concurrent Operations**: Scales linearly with request count

### Scalability Considerations
- **Stateless Design**: No persistent state between requests
- **Rate Limiting**: Configurable limits to prevent API abuse
- **Resource Cleanup**: Proper cleanup of temporary files and memory
- **Concurrent Request Handling**: Built-in MCP protocol concurrency support

## Security Features

### API Key Management
- Environment variable based configuration only
- No hardcoded credentials anywhere in codebase
- Validation of required credentials at startup

### Input Validation
- All external inputs validated through Zod schemas
- File path sanitization for local file access
- URL validation for remote content fetching
- Content size limits to prevent abuse

### Rate Limiting & Abuse Prevention
- Configurable rate limiting per time window
- Request size limits for large media files
- Timeout mechanisms to prevent resource exhaustion

## Future Extension Points

The codebase is designed for easy extension in several areas:

1. **Additional AI Models**: Easy integration of new AI vision models beyond Gemini
2. **New Media Types**: Plugin architecture supports adding new media processors
3. **Enhanced Analysis Types**: New analysis types can be added to existing processors
4. **Transport Protocols**: Support for additional MCP transport methods
5. **Caching Strategies**: More sophisticated caching implementations
6. **Monitoring & Metrics**: Enhanced observability and performance monitoring

## Summary

Human MCP represents a well-architected, extensible solution for bringing visual analysis capabilities to AI agents through the Model Context Protocol. The codebase demonstrates modern TypeScript best practices, robust error handling, comprehensive configuration management, and a clean separation of concerns that enables both reliability and extensibility.