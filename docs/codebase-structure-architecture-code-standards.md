# Human MCP - Codebase Structure, Architecture & Code Standards

## Project Architecture

### High-Level Architecture

Human MCP follows a modular, event-driven architecture built around the Model Context Protocol (MCP). The system is designed as a server that exposes visual analysis capabilities through standardized MCP tools.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │◄──►│   Human MCP      │◄──►│  Google Gemini  │
│   (AI Agent)    │    │   Server         │    │     API         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Media Processors │
                    │ (Image/Video/GIF) │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  System Tools    │
                    │ (ffmpeg/sharp)   │
                    └──────────────────┘
```

### Core Components

1. **MCP Server Layer**: Protocol implementation and tool registration
2. **Tool Layer**: Visual analysis and comparison tools (`eyes.analyze`, `eyes.compare`)
3. **Processing Layer**: Media-specific processors for different content types
4. **Integration Layer**: External service integration (Gemini API)
5. **Utility Layer**: Configuration, logging, error handling, and validation

## Directory Structure

```
human-mcp/
├── .claude/                    # Claude Code agent configurations
│   ├── agents/                # Specialized agent definitions
│   ├── commands/              # Custom commands and workflows
│   └── hooks/                 # Git hooks and automation scripts
├── .github/
│   └── workflows/             # GitHub Actions for CI/CD
├── .serena/                   # Serena MCP tool configuration
├── docs/                      # Project documentation
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   └── codebase-structure-architecture-code-standards.md
├── examples/                  # Usage examples and demonstrations
│   └── debugging-session.ts
├── src/                       # Source code
│   ├── index.ts              # Entry point - starts stdio server
│   ├── server.ts             # MCP server setup and initialization
│   ├── tools/                # MCP tools implementation
│   │   └── eyes/             # Vision analysis tools
│   │       ├── index.ts      # Tool registration and orchestration
│   │       ├── schemas.ts    # Zod validation schemas
│   │       ├── processors/   # Media type processors
│   │       │   ├── image.ts  # Image processing logic
│   │       │   ├── video.ts  # Video processing with ffmpeg
│   │       │   └── gif.ts    # GIF frame extraction
│   │       └── utils/        # Tool-specific utilities
│   │           ├── gemini-client.ts  # Google Gemini API client
│   │           └── formatters.ts     # Output formatting utilities
│   ├── prompts/              # Pre-built debugging prompts
│   │   ├── index.ts          # Prompt registration
│   │   └── debugging-prompts.ts      # Debugging workflow templates
│   ├── resources/            # MCP resources (documentation)
│   │   ├── index.ts          # Resource registration
│   │   └── documentation.ts  # Tool documentation and examples
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Shared type definitions
│   └── utils/                # Core utilities
│       ├── config.ts         # Environment-based configuration
│       ├── logger.ts         # Structured logging
│       └── errors.ts         # Error handling and formatting
├── tests/                    # Test suites
│   ├── setup.ts             # Test environment setup
│   ├── unit/                # Unit tests
│   │   ├── config.test.ts   # Configuration validation tests
│   │   └── formatters.test.ts       # Output formatting tests
│   └── integration/         # Integration tests
│       └── server.test.ts   # MCP server functionality tests
├── dist/                    # Built output (generated)
├── package.json             # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── CLAUDE.md               # Claude Code project instructions
├── QUICKSTART.md           # Quick setup guide
└── README.md               # Project overview and setup
```

## Architectural Patterns

### 1. Model Context Protocol (MCP) Architecture

**Pattern**: Server-Client Protocol Implementation
- **Server Component**: Human MCP implements MCP server specification
- **Transport Layer**: Stdio transport for command-line integration
- **Tool Registration**: Dynamic tool registration with schema validation
- **Resource Exposure**: Documentation and examples exposed as MCP resources

```typescript
// MCP Server Setup Pattern
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

### 2. Plugin-based Tool Architecture

**Pattern**: Modular Tool Registration
- **Tool Interface**: Standardized tool registration with schema validation
- **Processor Strategy**: Different processors for different media types
- **Configuration Injection**: Environment-based configuration passed to tools

```typescript
// Tool Registration Pattern
server.registerTool(
  "eyes.analyze",
  {
    title: "Vision Analysis Tool",
    description: "Analyze images, videos, and GIFs using AI vision capabilities",
    inputSchema: EyesInputSchema
  },
  async (args) => {
    return await handleAnalyze(geminiClient, args, config);
  }
);
```

### 3. Strategy Pattern for Media Processing

**Pattern**: Media Type Specific Processing
- **Image Processor**: Direct processing with Gemini Vision API
- **Video Processor**: Frame extraction using ffmpeg, then batch analysis
- **GIF Processor**: Frame extraction using Sharp, animation sequence analysis

```typescript
// Strategy Pattern Implementation
switch (type) {
  case "image":
    result = await processImage(model, source, options);
    break;
  case "video":
    result = await processVideo(model, source, options);
    break;
  case "gif":
    result = await processGif(model, source, options);
    break;
  default:
    throw new Error(`Unsupported media type: ${type}`);
}
```

### 4. Configuration-driven Architecture

**Pattern**: Environment-based Configuration with Validation
- **Schema Validation**: Zod schemas for runtime configuration validation
- **Environment Variables**: All configuration via environment variables
- **Default Values**: Sensible defaults with override capability
- **Type Safety**: Full TypeScript typing for configuration objects

## Code Standards & Best Practices

### 1. TypeScript Standards

#### Type Safety
- **Strict Mode**: All TypeScript strict checks enabled
- **No Implicit Any**: Explicit typing required for all parameters
- **Runtime Validation**: Zod schemas for external input validation
- **Path Mapping**: `@/*` aliases for clean imports

```typescript
// Type-safe configuration pattern
const ConfigSchema = z.object({
  gemini: z.object({
    apiKey: z.string().min(1, "Google Gemini API key is required"),
    model: z.string().default("gemini-2.5-flash"),
  }),
  // ... other config
});

export type Config = z.infer<typeof ConfigSchema>;
```

#### Module Organization
- **ESNext Modules**: Modern ES module syntax throughout
- **Explicit Extensions**: `.js` extensions for all imports
- **Barrel Exports**: Index files for clean public APIs
- **Single Responsibility**: One primary export per file

### 2. Error Handling Patterns

#### Centralized Error Management
- **Error Utility**: Centralized error handling in `utils/errors.ts`
- **Structured Errors**: Consistent error format across all tools
- **MCP Compliance**: Error responses conform to MCP specification
- **Logging Integration**: All errors logged with context

```typescript
// Centralized error handling pattern
export function handleError(error: unknown): McpError {
  if (error instanceof Error) {
    return {
      code: ErrorCode.InternalError,
      message: error.message
    };
  }
  return {
    code: ErrorCode.InternalError,
    message: "An unknown error occurred"
  };
}
```

#### Graceful Degradation
- **Try-Catch Blocks**: Comprehensive error catching
- **Fallback Behaviors**: Graceful handling of missing dependencies
- **User-Friendly Messages**: Clear error messages for end users
- **Recovery Mechanisms**: Retry logic for transient failures

### 3. Logging Standards

#### Structured Logging
- **Log Levels**: debug, info, warn, error with configuration
- **Contextual Information**: Request IDs, tool names, processing steps
- **Performance Metrics**: Timing information for operations
- **Privacy Awareness**: No sensitive data in logs

```typescript
// Structured logging pattern
logger.info(`Analyzing ${type} with detail level: ${detail_level}`, {
  toolName: 'eyes.analyze',
  mediaType: type,
  detailLevel: detail_level,
  processingTime: Date.now() - startTime
});
```

### 4. Input Validation Standards

#### Schema-driven Validation
- **Zod Schemas**: Runtime validation for all external inputs
- **Type Inference**: TypeScript types derived from schemas
- **Descriptive Errors**: Clear validation error messages
- **Optional Parameters**: Proper handling of optional inputs

```typescript
// Schema validation pattern
export const EyesInputSchema = z.object({
  source: z.string().describe("URL, file path, or base64 encoded content"),
  type: z.enum(["image", "video", "gif"]).describe("Type of visual content"),
  detail_level: z.enum(["quick", "detailed"]).default("detailed"),
  // ... other fields
});

export type EyesInput = z.infer<typeof EyesInputSchema>;
```

### 5. Security Standards

#### API Key Management
- **Environment Variables**: API keys only via environment variables
- **No Hardcoding**: Never commit API keys or secrets
- **Configuration Validation**: Required secrets validated at startup
- **Secure Defaults**: Security-first configuration defaults

#### Input Sanitization
- **Path Validation**: Safe file path handling
- **URL Validation**: Proper URL parsing and validation
- **Content Limits**: Size limits for uploaded content
- **Rate Limiting**: Protection against abuse

### 6. Performance Standards

#### Memory Management
- **Stream Processing**: Large files processed in streams where possible
- **Cleanup**: Proper cleanup of temporary files and resources
- **Memory Limits**: Awareness of memory constraints for media processing
- **Garbage Collection**: Minimal object retention

#### Async/Await Patterns
- **Promise-based**: All async operations use Promise patterns
- **Error Propagation**: Proper async error handling
- **Concurrent Processing**: Parallel processing where beneficial
- **Timeout Handling**: Configurable timeouts for operations

```typescript
// Async processing pattern with timeout
async function processWithTimeout<T>(
  operation: () => Promise<T>,
  timeout: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timeout')), timeout);
  });
  
  return Promise.race([operation(), timeoutPromise]);
}
```

### 7. Testing Standards

#### Test Organization
- **Unit Tests**: Individual function and class testing
- **Integration Tests**: End-to-end MCP server testing
- **Test Setup**: Centralized test environment configuration
- **Mock Usage**: Appropriate mocking of external services

#### Test Coverage
- **Core Functions**: 100% coverage for utility functions
- **Error Paths**: Testing of error handling scenarios
- **Configuration**: Testing of configuration validation
- **Edge Cases**: Testing of boundary conditions

### 8. Documentation Standards

#### Code Documentation
- **JSDoc Comments**: Comprehensive function documentation
- **Type Annotations**: Clear type information
- **Usage Examples**: Example code in documentation
- **Architecture Notes**: High-level design documentation

#### API Documentation
- **Schema Documentation**: Clear description of input/output schemas
- **Tool Descriptions**: Comprehensive tool functionality descriptions
- **Integration Guides**: How to use the MCP server
- **Configuration Reference**: Complete configuration option documentation

## Development Workflow

### 1. Development Commands

```bash
# Development with hot reload
bun run dev

# Production build
bun run build

# Run production build
bun run start

# Run tests
bun test

# Type checking
bun run typecheck

# Interactive tool testing
bun run inspector
```

### 2. Code Quality Checks

- **TypeScript Compilation**: No compilation errors allowed
- **Test Passing**: All tests must pass before commits
- **Linting**: Code style consistency (relaxed for productivity)
- **Security Scanning**: Basic security checks on dependencies

### 3. Release Process

- **Semantic Versioning**: Automated version management
- **GitHub Actions**: Automated testing and release
- **Changelog**: Automated changelog generation
- **npm Publishing**: Automated package publishing

## Integration Patterns

### 1. MCP Client Integration

```javascript
// Example MCP client integration
const client = new McpClient();
await client.connect(stdio('bun', ['run', 'src/index.ts']));

const result = await client.callTool('eyes.analyze', {
  source: '/path/to/screenshot.png',
  type: 'image',
  analysis_type: 'ui_debug'
});
```

### 2. External Service Integration

```typescript
// Gemini API integration pattern
export class GeminiClient {
  constructor(private config: Config) {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  getModel(detailLevel: 'quick' | 'detailed'): GenerativeModel {
    const modelName = detailLevel === 'quick' 
      ? 'gemini-2.5-flash' 
      : this.config.gemini.model;
    return this.genAI.getGenerativeModel({ model: modelName });
  }
}
```

## Conclusion

The Human MCP codebase follows modern TypeScript best practices with a focus on modularity, type safety, and robust error handling. The architecture enables easy extension with new tools and processors while maintaining clean separation of concerns. The comprehensive configuration system and error handling patterns ensure reliable operation across different environments and use cases.