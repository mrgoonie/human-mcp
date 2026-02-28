# Human MCP - Codebase Structure, Architecture & Code Standards

## Project Architecture

### High-Level Architecture

Human MCP follows a modular, event-driven architecture built around the Model Context Protocol (MCP). The system is designed as a server that exposes multimodal analysis capabilities through standardized MCP tools.

#### Current Architecture (v2.16.0 - Multi-Provider Multi-Modal Complete)
```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────────────────────┐
│   MCP Client    │◄──►│    Human MCP         │◄──►│  AI Provider Services (4 Providers) │
│   (AI Agent)    │    │    Server (v2.16.0)  │    │ ┌─────────────────────────────────┐ │
└─────────────────┘    │                      │    │ │ Google Gemini (Primary)         │ │
                       │  ┌─────────────────┐ │    │ │ • Gemini 3.1 Pro/Flash Vision  │ │
                       │  │ Eyes (Vision) ✅│ │    │ │ • Imagen 3.1/3 Flash/Nano      │ │
                       │  │ • Multi-Provider│ │    │ │ • Veo 3.0 Video                │ │
                       │  │ • Documents ✅  │ │    │ │ • Gemini Speech                │ │
                       │  └─────────────────┘ │    │ └─────────────────────────────────┘ │
                       │  ┌─────────────────┐ │    │ ┌─────────────────────────────────┐ │
                       │  │ Mouth (Speech)✅│ │    │ │ Minimax (Speech/Video/Music)    │ │
                       │  │ • 3 Providers   │ │    │ │ • Speech 2.6 HD/Turbo (300+)   │ │
                       │  └─────────────────┘ │    │ │ • Hailuo 2.3 Video             │ │
                       │  ┌─────────────────┐ │    │ │ • Music 2.5 (lyrics, vocals)   │ │
                       │  │ Hands (Create)✅│ │    │ └─────────────────────────────────┘ │
                       │  │ • Multi-Provider│ │    │ ┌─────────────────────────────────┐ │
                       │  │ • 17 Tools      │ │    │ │ ZhipuAI (Vision/Image/Video)    │ │
                       │  └─────────────────┘ │    │ │ • GLM-4.6V Vision              │ │
                       │  ┌─────────────────┐ │    │ │ • CogView-4 Image Gen          │ │
                       │  │ Brain (Think)✅ │ │    │ │ • CogVideoX-3 Video Gen        │ │
                       │  │ • 3 Tools       │ │    │ └─────────────────────────────────┘ │
                       │  └─────────────────┘ │    │ ┌─────────────────────────────────┐ │
                       └──────────────────────┘    │ │ ElevenLabs (Premium Audio)      │ │
                                                   │ │ • TTS (40+ voices, 70+ langs)  │ │
                                                   │ │ • Music API (10min tracks)     │ │
                                                   │ │ • Sound Effects (30s, looping) │ │
                                                   │ └─────────────────────────────────┘ │
                                                   └─────────────────────────────────────┘
```

#### Next Architecture Target (v3.0.0 - Q1 2025)

For complete architectural evolution and development phases, see **[Project Roadmap](project-roadmap.md)** - Target Architecture section.

The final phase completes all human sensory capabilities:
- **Phase 3**: Audio Processing (Ears - speech-to-text, audio analysis) - Only remaining phase (5 of 6 phases complete)

### Core Components

1. **MCP Server Layer**: Protocol implementation and tool registration
2. **Tool Layer**: Multi-modal capabilities across 5 complete phases (29 tools)
   - **Eyes Tools (5)**: Visual analysis (`eyes_analyze`, `eyes_compare`) + Document processing (`eyes_read_document`, `eyes_extract_data`, `eyes_summarize`)
     - Providers: Gemini Vision (default), ZhipuAI GLM-4.6V (alternate)
   - **Brain Tools (3)**: Advanced reasoning (`brain_think`, `brain_analyze`, `brain_reflect`)
   - **Mouth Tools (4)**: Speech generation (`mouth_speak`, `mouth_narrate`, `mouth_explain`, `mouth_customize`)
     - Providers: Gemini Speech (default), Minimax Speech 2.6 (alternate), ElevenLabs TTS (premium)
   - **Hands Tools (17)**: Content generation and editing
     - Image Gen (1): `gemini_gen_image` (Gemini Imagen 3.1/3 Flash/Nano, ZhipuAI CogView-4)
     - Video Gen (2): `gemini_gen_video`, `gemini_image_to_video` (Gemini Veo 3.0, Minimax Hailuo 2.3, ZhipuAI CogVideoX-3)
     - Music Gen (2): `minimax_gen_music`, `elevenlabs_gen_music`
     - SFX Gen (1): `elevenlabs_gen_sfx`
     - AI Image Editing (5): `gemini_edit_image`, `gemini_inpaint_image`, `gemini_outpaint_image`, `gemini_style_transfer_image`, `gemini_compose_images`
     - Jimp Processing (4): `jimp_crop_image`, `jimp_resize_image`, `jimp_rotate_image`, `jimp_mask_image`
     - Background Removal (1): `rmbg_remove_background`
     - Playwright Screenshot (3): `playwright_capture_screenshot`, `playwright_capture_fullpage`, `playwright_capture_element`
   - **Ears Tools**: Audio processing (planned Phase 3)
3. **Processing Layer**: Media, document, reasoning, and multi-provider processors with factory patterns
4. **Transport Layer**: STDIO and HTTP transports with SSE fallback
5. **Integration Layer**: Multi-provider AI services integration
   - **Primary**: Google Gemini (Vision, Document, Speech, Imagen 3.1/3/Nano, Veo 3.0, Reasoning)
   - **Alternates**: Minimax (Speech 2.6, Music 2.5, Hailuo 2.3), ZhipuAI (GLM-4.6V, CogView-4, CogVideoX-3), ElevenLabs (TTS, Music, SFX)
6. **Utility Layer**: Configuration, logging, error handling, validation, security, and provider routing

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
│   ├── project-roadmap.md    # Development roadmap and future vision
│   ├── project-overview-pdr.md # Project overview and requirements
│   ├── codebase-summary.md   # Generated codebase overview
│   └── codebase-structure-architecture-code-standards.md # This file
├── examples/                  # Usage examples and demonstrations
│   └── debugging-session.ts
├── src/                       # Source code
│   ├── index.ts              # Entry point - starts stdio server
│   ├── server.ts             # MCP server setup and initialization
│   ├── tools/                # MCP tools implementation (46 TypeScript files)
│   │   ├── eyes/             # Visual analysis and document processing
│   │   │   ├── index.ts      # Eyes tool registration
│   │   │   ├── schemas.ts    # Zod validation schemas
│   │   │   ├── types/        # TypeScript type definitions
│   │   │   │   └── document.ts # Document processing types
│   │   │   ├── processors/   # Media and document processors
│   │   │   │   ├── image.ts  # Image analysis
│   │   │   │   ├── video.ts  # Video processing
│   │   │   │   ├── gif.ts    # GIF frame extraction
│   │   │   │   ├── document.ts # Base document processor
│   │   │   │   ├── pdf.ts    # PDF processing
│   │   │   │   ├── word.ts   # Word document processing
│   │   │   │   ├── excel.ts  # Excel spreadsheet processing
│   │   │   │   ├── powerpoint.ts # PowerPoint presentation processing
│   │   │   │   ├── text.ts   # Text file processing
│   │   │   │   └── factory.ts # Document processor factory
│   │   │   └── utils/        # Tool-specific utilities
│   │   │       ├── gemini-provider.ts # Base Gemini provider interface
│   │   │       ├── formatters.ts    # Output formatting utilities
│   │   │       └── providers/      # Gemini API provider implementations
│   │   │           ├── google-ai-studio-provider.ts # Google AI Studio provider
│   │   │           └── vertex-ai-provider.ts # Vertex AI provider
│   │   ├── hands/            # Content generation and image editing tools
│   │   │   ├── index.ts      # Hands tool registration (16 tools total)
│   │   │   ├── schemas.ts    # Content generation and editing schemas
│   │   │   ├── processors/   # Generation and processing processors
│   │   │   │   ├── image-generator.ts  # Imagen API image generation
│   │   │   │   ├── video-generator.ts  # Veo 3.0 API video generation
│   │   │   │   ├── image-editor.ts     # Gemini-powered image editing (5 operations)
│   │   │   │   ├── jimp-processor.ts   # Jimp-based image manipulation (crop, resize, rotate, mask)
│   │   │   │   ├── playwright-screenshot.ts # Playwright-based screenshot capture
│   │   │   │   └── background-remover.ts # AI background removal (rmbg package)
│   │   │   └── utils/        # Image editing utilities
│   │   │       ├── jimp-helpers.ts     # Jimp helper functions and converters
│   │   │       ├── playwright-helpers.ts # Playwright utility functions
│   │   │       └── validation.ts       # Image editing parameter validation
│   │   └── mouth/            # Speech generation tools
│   │       ├── index.ts      # Mouth tool registration
│   │       ├── schemas.ts    # Speech generation schemas
│   │       ├── utils/        # Speech utilities
│   │       │   └── audio-export.ts # Audio file export functionality
│   │       └── processors/   # Speech processors
│   │           ├── speech-synthesis.ts    # Basic text-to-speech
│   │           ├── narration.ts          # Long-form narration
│   │           ├── code-explanation.ts   # Code explanation speech
│   │           └── voice-customization.ts # Voice customization
│   ├── transports/           # Transport layer implementations
│   │   ├── stdio/            # Standard I/O transport
│   │   └── http/             # HTTP transport with SSE fallback
│   ├── providers/            # Multi-provider AI integrations (v2.16.0 - 4 providers)
│   │   ├── minimax/          # Minimax provider implementations
│   │   │   ├── speech-provider.ts # Minimax Speech 2.6 HD/Turbo TTS (300+ voices)
│   │   │   ├── music-provider.ts  # Minimax Music 2.5 generation (lyrics, vocals, 4min)
│   │   │   └── video-provider.ts  # Minimax Hailuo 2.3 video generation
│   │   ├── zhipuai/          # ZhipuAI (Z.AI) provider implementations
│   │   │   ├── vision-provider.ts # GLM-4.6V vision analysis (images only)
│   │   │   ├── image-provider.ts  # CogView-4 / GLM-Image generation
│   │   │   └── video-provider.ts  # CogVideoX-3 video generation
│   │   └── elevenlabs/       # ElevenLabs provider implementations
│   │       ├── speech-provider.ts # ElevenLabs TTS (40+ voices, 70+ languages)
│   │       ├── music-provider.ts  # ElevenLabs Music API (10min tracks)
│   │       └── sfx-provider.ts    # ElevenLabs Sound Effects API (30s, looping)
│   ├── prompts/              # Pre-built debugging prompts
│   │   ├── index.ts          # Prompt registration
│   │   └── debugging-prompts.ts      # Debugging workflow templates
│   ├── resources/            # MCP resources (documentation)
│   │   ├── index.ts          # Resource registration
│   │   └── documentation.ts  # Tool documentation and examples
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Shared type definitions
│   └── utils/                # Core utilities and multi-provider clients
│       ├── config.ts         # Environment-based configuration with provider routing
│       ├── logger.ts         # Structured logging
│       ├── errors.ts         # Error handling and formatting
│       ├── gemini-client.ts  # Google Gemini API client (Vision, Imagen, Veo 3.0, Speech, Reasoning)
│       ├── minimax-client.ts # Minimax HTTP client (Speech 2.6, Music 2.5, Hailuo 2.3)
│       ├── zhipuai-client.ts # ZhipuAI HTTP client (GLM-4.6V, CogView-4, CogVideoX-3)
│       ├── elevenlabs-client.ts # ElevenLabs HTTP client (TTS, Music, SFX)
│       └── file-storage.ts   # File storage with audio/video/image MIME support and R2 upload
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
- **Transport Layer**: STDIO and HTTP transports with SSE fallback support
- **Tool Registration**: Dynamic multi-modal tool registration with schema validation
- **Resource Exposure**: Documentation and examples exposed as MCP resources

```typescript
// MCP Server Setup Pattern (v2.16.0 - Multi-Provider)
export async function createServer() {
  const config = loadConfig();  // Loads provider routing configuration
  const server = new McpServer({
    name: "human-mcp",
    version: "2.16.0",
  });

  // Register all human capability tools (29 total across 4 providers)
  await registerEyesTool(server, config);      // Visual analysis + document processing (5 tools)
  await registerBrainTools(server, config);   // Advanced reasoning (3 tools)
  await registerMouthTool(server, config);    // Speech generation (4 tools, 3 providers)
  await registerHandsTool(server, config);    // Content generation + editing (17 tools, 4 providers)
  // await registerEarsTool(server, config);  // Audio processing (Phase 3 - planned)

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
// Tool Registration Pattern (Multi-Provider Multi-Modal v2.16.0 - 29 tools)

// Eyes Tools - Visual Analysis + Document Processing (5 tools, 2 providers)
server.registerTool("eyes_analyze", {
  /* provider: gemini|zhipuai (vision only) */
}, async (args) => { /* Multi-provider routing */ });
server.registerTool("eyes_compare", { /* Gemini only */ }, async (args) => { /* ... */ });
server.registerTool("eyes_read_document", { /* Gemini only */ }, async (args) => { /* ... */ });
server.registerTool("eyes_extract_data", { /* Gemini only */ }, async (args) => { /* ... */ });
server.registerTool("eyes_summarize", { /* Gemini only */ }, async (args) => { /* ... */ });

// Brain Tools - Advanced Reasoning (3 tools, Gemini only)
server.registerTool("brain_think", { /* Gemini only */ }, async (args) => { /* ... */ });
server.registerTool("brain_analyze", { /* Gemini only */ }, async (args) => { /* ... */ });
server.registerTool("brain_reflect", { /* Gemini only */ }, async (args) => { /* ... */ });

// Mouth Tools - Speech Generation (4 tools, 3 providers)
server.registerTool("mouth_speak", {
  /* provider: gemini|minimax|elevenlabs */
}, async (args) => { /* Multi-provider routing with 300+ voices */ });
server.registerTool("mouth_narrate", { /* Multi-provider */ }, async (args) => { /* ... */ });
server.registerTool("mouth_explain", { /* Multi-provider */ }, async (args) => { /* ... */ });
server.registerTool("mouth_customize", { /* Multi-provider */ }, async (args) => { /* ... */ });

// Hands Tools - Content Generation + Editing (17 tools, 4 providers)

// Image Generation (1 tool, 2 providers: Gemini Imagen 3.1/3/Nano, ZhipuAI CogView-4)
server.registerTool("gemini_gen_image", {
  /* provider: gemini|zhipuai, models: imagen-3.1-pro|imagen-3-flash|nano-banana-2|cogview-4 */
}, async (args) => { /* Multi-provider routing */ });

// Video Generation (2 tools, 3 providers: Gemini Veo 3.0, Minimax Hailuo 2.3, ZhipuAI CogVideoX-3)
server.registerTool("gemini_gen_video", {
  /* provider: gemini|minimax|zhipuai */
}, async (args) => { /* Multi-provider routing */ });
server.registerTool("gemini_image_to_video", {
  /* provider: gemini|minimax|zhipuai */
}, async (args) => { /* Multi-provider image-to-video */ });

// Music Generation (2 tools, 2 providers: Minimax Music 2.5, ElevenLabs Music)
server.registerTool("minimax_gen_music", { /* Minimax Music 2.5, lyrics + vocals, 4min */ }, async (args) => { /* ... */ });
server.registerTool("elevenlabs_gen_music", { /* ElevenLabs Music API, text-to-music, 10min */ }, async (args) => { /* ... */ });

// Sound Effects Generation (1 tool, ElevenLabs only)
server.registerTool("elevenlabs_gen_sfx", { /* ElevenLabs SFX, 0.5-30s, looping */ }, async (args) => { /* ... */ });

// AI Image Editing - Gemini-powered (5 tools)
server.registerTool("gemini_edit_image", { /* 5 operations: inpaint, outpaint, style_transfer, object_manipulation, multi_image_compose */ }, async (args) => { /* ... */ });
server.registerTool("gemini_inpaint_image", { /* No mask required, text-based */ }, async (args) => { /* ... */ });
server.registerTool("gemini_outpaint_image", { /* Directional expansion */ }, async (args) => { /* ... */ });
server.registerTool("gemini_style_transfer_image", { /* Style from text/reference */ }, async (args) => { /* ... */ });
server.registerTool("gemini_compose_images", { /* Multi-image composition */ }, async (args) => { /* ... */ });

// Jimp Image Processing - Local manipulation (4 tools)
server.registerTool("jimp_crop_image", { /* 6 modes */ }, async (args) => { /* ... */ });
server.registerTool("jimp_resize_image", { /* 5 algorithms */ }, async (args) => { /* ... */ });
server.registerTool("jimp_rotate_image", { /* Any angle */ }, async (args) => { /* ... */ });
server.registerTool("jimp_mask_image", { /* Grayscale alpha */ }, async (args) => { /* ... */ });

// Playwright Screenshot Capture - Browser automation (3 tools)
server.registerTool("playwright_capture_screenshot", { /* Standard viewport */ }, async (args) => { /* ... */ });
server.registerTool("playwright_capture_fullpage", { /* Full scrollable page */ }, async (args) => { /* ... */ });
server.registerTool("playwright_capture_element", { /* CSS selector-based */ }, async (args) => { /* ... */ });

// Background Removal - AI-powered (1 tool, 3 quality levels)
server.registerTool("rmbg_remove_background", { /* U2Net+, ModNet, BRIAI */ }, async (args) => { /* ... */ });
```

### 3. Strategy Pattern for Media Processing

**Pattern**: Media Type Specific Processing
- **Image Processor**: Direct processing with Gemini Vision API
- **Video Processor**: Frame extraction using ffmpeg, then batch analysis
- **GIF Processor**: Frame extraction using Sharp, animation sequence analysis

```typescript
// Media Processing Strategy Pattern
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

### 4. Factory Pattern for Document Processing

**Pattern**: Document Processor Factory with Auto-Detection
- **Format Detection**: Automatic format detection from file content and extensions
- **Processor Creation**: Factory method creates appropriate processor for format
- **Unified Interface**: Common interface for all document processors

```typescript
// Document Processing Factory Pattern (v2.14.0)
class DocumentProcessorFactory {
  static create(format: DocumentFormat, geminiClient: GeminiClient): DocumentProcessor {
    switch (format) {
      case 'pdf': return new PDFProcessor(geminiClient);
      case 'docx': return new WordProcessor(geminiClient);
      case 'xlsx': return new ExcelProcessor(geminiClient);
      case 'pptx': return new PowerPointProcessor(geminiClient);
      case 'txt':
      case 'md': return new TextProcessor(geminiClient);
      default: throw new Error(`Unsupported document format: ${format}`);
    }
  }

  static detectFormat(source: string, buffer: Buffer): DocumentFormat {
    // Auto-detection logic based on file content and extension
  }
}

// Usage Pattern with Vertex AI or Google AI Studio provider
const processor = DocumentProcessorFactory.create(detectedFormat, geminiClient);
const result = await processor.process(source, options);
```

### 5. Image Editing Pipeline Architecture

#### 5.1 AI-Powered Image Editing (Gemini)

**Pattern**: Text-Based Conversational Editing Without Masks
- **Core Principle**: Gemini 2.5 Flash uses natural language descriptions instead of traditional masks
- **Operation Types**: Five distinct editing operations
  - **Inpainting**: Describe what to add/modify and where (no mask required)
  - **Outpainting**: Directional expansion with content generation
  - **Style Transfer**: Apply artistic styles from text or reference images
  - **Object Manipulation**: Move, resize, remove, replace, or duplicate objects
  - **Multi-Image Composition**: Combine up to 3 images with smart layouts
- **Input Processing**: Support for base64 data URIs, file paths, and URLs
- **Prompt Engineering**: Operation-specific prompt templates for optimal results
- **Multi-Image Support**: Primary image + optional style/mask/secondary images
- **Quality Control**: Three levels (draft/standard/high) with guidance scale (1.0-20.0) and strength (0.1-1.0)

```typescript
// Image Editing Pipeline Pattern
export async function editImage(
  geminiClient: GeminiClient,
  options: ImageEditingOptions,
  config?: Config
): Promise<ImageEditingResult> {
  // Process input image to correct format
  const processedInputImage = await processImageForEditing(options.inputImage);

  // Build operation-specific editing prompt
  const editingPrompt = buildEditingPrompt(options);

  // Build multi-image request content based on operation
  const requestContent = await buildRequestContent(options, processedInputImage, editingPrompt);

  // Generate edited image using Gemini API
  const response = await model.generateContent(requestContent);

  // Save to file storage with optional R2 upload
  const savedFile = await saveBase64ToFile(imageData, mimeType, config, {
    prefix: `edited-${options.operation}`,
    uploadToR2: shouldUploadToR2
  });

  return {
    editedImageData: resultData,
    format,
    operation: options.operation,
    processingTime,
    filePath,
    fileUrl,
    metadata: { prompt, operation, strength, guidanceScale, seed }
  };
}

// Operation-Specific Prompt Builder
function buildEditingPrompt(options: ImageEditingOptions): string {
  let prompt = options.prompt;

  switch (options.operation) {
    case "inpaint":
      prompt = `Edit the specified area of this image: ${prompt}`;
      if (options.maskPrompt) {
        prompt += `. Focus on the area described as: ${options.maskPrompt}`;
      }
      break;

    case "outpaint":
      prompt = `Expand this image ${options.expandDirection || 'in all directions'}: ${prompt}`;
      break;

    case "style_transfer":
      prompt = `Apply the following style to this image: ${prompt}`;
      break;

    case "object_manipulation":
      prompt = `${options.manipulationType || 'modify'} the ${options.targetObject}: ${prompt}`;
      break;

    case "multi_image_compose":
      prompt = `Compose multiple images together: ${prompt}`;
      if (options.compositionLayout) {
        prompt += `. Layout: ${options.compositionLayout}`;
      }
      break;
  }

  return prompt;
}

// Multi-Image Request Content Builder
async function buildRequestContent(
  options: ImageEditingOptions,
  processedInputImage: { data: string; mimeType: string },
  editingPrompt: string
): Promise<any[]> {
  const content: any[] = [
    { text: editingPrompt },
    { inlineData: { data: processedInputImage.data, mimeType: processedInputImage.mimeType } }
  ];

  // Add mask image for inpainting
  if (options.operation === "inpaint" && options.maskImage) {
    const processedMask = await processImageForEditing(options.maskImage);
    content.push({ inlineData: { data: processedMask.data, mimeType: processedMask.mimeType } });
  }

  // Add style reference for style transfer
  if (options.operation === "style_transfer" && options.styleImage) {
    const processedStyle = await processImageForEditing(options.styleImage);
    content.push({ inlineData: { data: processedStyle.data, mimeType: processedStyle.mimeType } });
  }

  // Add secondary images for composition
  if (options.operation === "multi_image_compose" && options.secondaryImages) {
    for (const secondaryImage of options.secondaryImages) {
      const processedSecondary = await processImageForEditing(secondaryImage);
      content.push({ inlineData: { data: processedSecondary.data, mimeType: processedSecondary.mimeType } });
    }
  }

  return content;
}
```

**Gemini Editing Use Cases**:
- **UI Debugging**: Edit screenshots to fix visual issues or test design variations
- **Design Iteration**: Quickly modify UI elements without manual editing tools
- **Content Enhancement**: Expand images, apply styles, or compose multiple screenshots
- **Accessibility Testing**: Modify UI elements to test different visual states
- **Documentation**: Create annotated screenshots with highlighted areas

#### 5.2 Jimp Image Processing

**Pattern**: Local, Fast, Deterministic Image Manipulation
- **Core Libraries**: Jimp v1 API for JavaScript/TypeScript image processing
- **Operations**: Four core image manipulation tools
  - **Crop**: Six modes (manual, center, top_left, top_right, bottom_left, bottom_right, aspect_ratio)
  - **Resize**: Five algorithms (nearestNeighbor, bilinear, bicubic, hermite, bezier)
  - **Rotate**: Any angle rotation with background color customization
  - **Mask**: Grayscale alpha masking (black=transparent, white=opaque)
- **Input Handling**: File paths, URLs, and base64 data URIs
- **Format Support**: PNG, JPEG, BMP output formats
- **Validation**: Comprehensive parameter validation for each operation

```typescript
// Jimp Processing Pattern
export async function cropImage(options: CropOptions, config?: Config): Promise<CropResult> {
  // Load image from any source
  const { image, originalFormat } = await loadJimpImage(options.inputImage);

  // Calculate crop region based on mode
  const cropRegion = calculateCropRegion(
    mode,
    originalWidth,
    originalHeight,
    options.width,
    options.height,
    options.aspectRatio
  );

  // Validate parameters
  validateCropParams({ x, y, width, height, imageWidth, imageHeight });

  // Perform operation using Jimp v1 API
  image.crop({ x: cropRegion.x, y: cropRegion.y, w: cropRegion.width, h: cropRegion.height });

  // Convert to base64 and optionally save to file/R2
  const croppedImage = await jimpToBase64(image, outputFormat, quality);

  return { croppedImage, format, dimensions, processingTime, filePath, fileUrl };
}
```

**Jimp Processing Use Cases**:
- **Precise Cropping**: Extract specific regions from screenshots or images
- **Image Resizing**: Scale images for different display sizes or reduce file size
- **Rotation**: Adjust image orientation or create rotated thumbnails
- **Transparency Masking**: Apply custom transparency patterns using grayscale masks
- **Batch Processing**: Fast, local processing without API calls

#### 5.3 Playwright Screenshot Capture

**Pattern**: Automated Browser Screenshot Capture with Headless Chrome
- **Core Library**: Playwright for Chromium browser automation
- **Screenshot Types**: Three capture modes
  - **Standard Screenshot**: Capture viewport or specific dimensions
  - **Full Page Screenshot**: Capture entire scrollable page content
  - **Element Screenshot**: Capture specific DOM element by CSS selector
- **Configuration Options**:
  - Viewport dimensions and device emulation
  - Wait conditions (networkidle, load, domcontentloaded)
  - JavaScript execution and cookie injection
  - Custom user agents and extra HTTP headers
- **Output Options**: PNG, JPEG, or WebP formats with quality control
- **Use Cases**: Web page capture, UI testing screenshots, visual regression testing

```typescript
// Playwright Screenshot Pattern
export async function captureScreenshot(
  options: PlaywrightScreenshotOptions,
  config?: Config
): Promise<PlaywrightScreenshotResult> {
  // Launch headless browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: options.viewport,
    userAgent: options.userAgent,
  });

  // Navigate to URL with optional wait conditions
  const page = await context.newPage();
  await page.goto(options.url, { waitUntil: options.waitUntil || 'networkidle' });

  // Execute custom JavaScript if provided
  if (options.executeScript) {
    await page.evaluate(options.executeScript);
  }

  // Capture screenshot based on type
  let screenshotBuffer: Buffer;
  if (options.captureType === 'element') {
    const element = await page.locator(options.selector);
    screenshotBuffer = await element.screenshot({ type: options.format });
  } else if (options.captureType === 'fullpage') {
    screenshotBuffer = await page.screenshot({ fullPage: true, type: options.format });
  } else {
    screenshotBuffer = await page.screenshot({ type: options.format });
  }

  await browser.close();

  return { screenshot, format, dimensions, processingTime, filePath };
}
```

**Playwright Screenshot Use Cases**:
- **Web Page Archival**: Capture full page screenshots of websites
- **UI Testing**: Generate screenshots for visual regression testing
- **Documentation**: Create visual documentation of web interfaces
- **Monitoring**: Capture periodic screenshots for change detection
- **Responsive Testing**: Test layouts across different viewport sizes

#### 5.4 Background Removal

**Pattern**: AI-Powered Segmentation with Multiple Models
- **Core Library**: rmbg package with three AI model options
  - **U2Net+ (fast)**: Lightweight model at 320px, quickest processing
  - **ModNet (balanced)**: Default model at 512px, balanced quality/speed
  - **BRIAI (high)**: Highest quality at 1024px, slower but most accurate
- **Output Options**: PNG with transparency or JPEG with custom background color
- **Quality Control**: Selectable quality level based on use case requirements

```typescript
// Background Removal Pattern
export async function removeImageBackground(
  options: BackgroundRemovalOptions,
  config?: Config
): Promise<BackgroundRemovalResult> {
  // Load and process input image
  const processedImage = await loadImageForProcessing(options.inputImage, { maxWidth: 2048 });

  // Select AI model based on quality setting
  const model = quality === "fast" ? createU2netpModel()
    : quality === "high" ? createBriaaiModel()
    : createModnetModel();

  // Remove background using AI
  const resultBuffer = await rmbg(imageBuffer, { model });

  // Handle output format (PNG with transparency or JPEG with background)
  if (outputFormat === "jpeg" && backgroundColor) {
    const background = new Jimp({ width, height, color: backgroundColor });
    background.composite(resultImage, 0, 0);
  }

  return { imageWithoutBackground, format, dimensions, processingTime, filePath };
}
```

**Background Removal Use Cases**:
- **Product Photography**: Remove backgrounds from product images for e-commerce
- **UI Element Extraction**: Isolate UI components from screenshots
- **Transparent Assets**: Create transparent PNGs from regular images
- **Composite Creation**: Prepare images for multi-layer compositions

### 6. Configuration-driven Architecture

**Pattern**: Environment-based Configuration with Validation
- **Schema Validation**: Zod schemas for runtime configuration validation
- **Environment Variables**: All configuration via environment variables (including provider selection)
- **Default Values**: Sensible defaults with override capability
- **Type Safety**: Full TypeScript typing for configuration objects
- **Provider Configuration**: Support for multiple AI service providers (Gemini, Minimax, ZhipuAI, ElevenLabs)

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