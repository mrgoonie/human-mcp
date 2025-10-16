# Playwright Screenshot Capture Tools Implementation Plan

**Date:** 2025-10-08
**Version:** 1.0
**Status:** Ready for Implementation

## Overview

This plan details the implementation of three Playwright-based screenshot capture tools for the Human MCP server. These tools will enable AI agents to capture screenshots of web pages programmatically, supporting full page, viewport, and element-specific captures. The implementation follows the existing hands tools architecture pattern and integrates seamlessly with the current codebase.

## Requirements

### Functional Requirements

1. **Full Page Screenshot Tool** - Capture entire scrollable page content
2. **Viewport Screenshot Tool** - Capture visible viewport area only
3. **Element Screenshot Tool** - Capture specific DOM elements by selector

### Non-Functional Requirements

- Follow existing MCP tool naming conventions (alphanumeric, underscores, hyphens only)
- Use centralized error handling from `utils/errors.ts`
- Support multiple output formats (PNG, JPEG)
- Return base64 encoded images or file paths
- Integrate with existing file storage system (local + optional R2 upload)
- Handle timeouts and browser lifecycle properly
- Support headless browser operation
- Maintain consistent response format with other hands tools

## Architecture Overview

### Component Structure

```
src/tools/hands/
├── index.ts                          # Tool registration (update)
├── schemas.ts                        # Zod validation schemas (update)
├── processors/
│   ├── playwright-screenshot.ts      # NEW: Screenshot processor
│   └── ...existing processors...
└── utils/
    ├── playwright-helpers.ts         # NEW: Playwright utilities
    └── ...existing utils...
```

### System Design

```
┌─────────────────┐
│   MCP Client    │
│   (AI Agent)    │
└────────┬────────┘
         │
         │ Tool Call
         ▼
┌─────────────────────────────────────┐
│  hands/index.ts                     │
│  - playwright_screenshot_fullpage   │
│  - playwright_screenshot_viewport   │
│  - playwright_screenshot_element    │
└────────┬────────────────────────────┘
         │
         │ Validate & Process
         ▼
┌─────────────────────────────────────┐
│  playwright-screenshot.ts           │
│  - launchBrowser()                  │
│  - captureFullPage()                │
│  - captureViewport()                │
│  - captureElement()                 │
└────────┬────────────────────────────┘
         │
         │ Browser Automation
         ▼
┌─────────────────────────────────────┐
│  Playwright Browser Engine          │
│  - Launch browser                   │
│  - Navigate to URL                  │
│  - Wait for load/selector           │
│  - Capture screenshot               │
│  - Return buffer                    │
└────────┬────────────────────────────┘
         │
         │ Save & Return
         ▼
┌─────────────────────────────────────┐
│  File Storage System                │
│  - Save base64 to file              │
│  - Upload to R2 (optional)          │
│  - Return paths/URLs                │
└─────────────────────────────────────┘
```

### Data Flow

1. **Input Validation** - Zod schemas validate tool parameters
2. **Browser Launch** - Playwright launches headless browser instance
3. **Page Navigation** - Navigate to target URL with configurable timeout
4. **Screenshot Capture** - Capture screenshot based on tool type
5. **Buffer Processing** - Convert screenshot buffer to base64
6. **File Storage** - Save to local filesystem and optionally upload to R2
7. **Response Formatting** - Return formatted MCP response with metadata

## Tool Specifications

### 1. playwright_screenshot_fullpage

**Description:** Capture a screenshot of the entire scrollable page

**Input Schema:**
```typescript
{
  url: string;                    // URL to navigate to
  wait_until?: "load" | "domcontentloaded" | "networkidle"; // Wait condition
  timeout?: number;               // Navigation timeout (ms)
  output_format?: "png" | "jpeg"; // Image format
  quality?: number;               // JPEG quality (0-100)
  viewport?: {                    // Optional viewport size
    width: number;
    height: number;
  };
}
```

**Output:**
```typescript
{
  screenshot: string;             // Base64 data URI
  format: string;                 // "png" | "jpeg"
  dimensions: {
    width: number;
    height: number;
  };
  captureTime: number;            // Milliseconds
  filePath?: string;              // Local file path
  fileName?: string;              // File name
  fileUrl?: string;               // R2 public URL
  fileSize?: number;              // File size in bytes
}
```

### 2. playwright_screenshot_viewport

**Description:** Capture a screenshot of the visible viewport area

**Input Schema:**
```typescript
{
  url: string;                    // URL to navigate to
  wait_until?: "load" | "domcontentloaded" | "networkidle";
  timeout?: number;               // Navigation timeout (ms)
  viewport?: {                    // Viewport dimensions
    width: number;                // Default: 1280
    height: number;               // Default: 720
  };
  output_format?: "png" | "jpeg";
  quality?: number;               // JPEG quality (0-100)
}
```

**Output:**
```typescript
{
  screenshot: string;             // Base64 data URI
  format: string;
  dimensions: {
    width: number;
    height: number;
  };
  captureTime: number;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}
```

### 3. playwright_screenshot_element

**Description:** Capture a screenshot of a specific DOM element

**Input Schema:**
```typescript
{
  url: string;                    // URL to navigate to
  selector: string;               // CSS selector or text selector
  selector_type?: "css" | "text" | "role"; // Selector type
  wait_until?: "load" | "domcontentloaded" | "networkidle";
  timeout?: number;               // Navigation timeout (ms)
  element_timeout?: number;       // Element wait timeout (ms)
  output_format?: "png" | "jpeg";
  quality?: number;               // JPEG quality (0-100)
  viewport?: {                    // Optional viewport size
    width: number;
    height: number;
  };
}
```

**Output:**
```typescript
{
  screenshot: string;             // Base64 data URI
  format: string;
  dimensions: {
    width: number;
    height: number;
  };
  captureTime: number;
  selector: string;               // Used selector
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}
```

## Dependencies

### New Dependencies to Install

```bash
bun add playwright @playwright/test
bun add -D @types/node  # If not already present
```

### Playwright Browser Installation

Playwright requires browser binaries to be installed. This will be handled during development setup:

```bash
# Install browser binaries (Chromium only for smaller footprint)
bunx playwright install chromium

# Or install all browsers
bunx playwright install
```

### Dependency Justification

- **playwright**: Core library for browser automation and screenshot capture
- **@playwright/test**: Provides additional utilities and type definitions
- No additional system dependencies required (Playwright bundles browser binaries)

## Implementation Steps

### Phase 1: Setup and Dependencies (30 minutes)

#### Step 1.1: Install Playwright Dependencies
```bash
cd /Users/duynguyen/www/human-mcp
bun add playwright @playwright/test
bunx playwright install chromium
```

#### Step 1.2: Update Package.json Scripts (Optional)
Add convenience script for browser installation:
```json
{
  "scripts": {
    "playwright:install": "playwright install chromium"
  }
}
```

### Phase 2: Create Core Processor (2-3 hours)

#### Step 2.1: Create Playwright Helpers Utility
**File:** `src/tools/hands/utils/playwright-helpers.ts`

**Responsibilities:**
- Browser instance management
- Page navigation with timeout handling
- Element selection and waiting
- Screenshot buffer to base64 conversion
- Viewport configuration
- Error handling for common Playwright errors

**Key Functions:**
```typescript
export async function launchBrowser(config?: BrowserConfig): Promise<Browser>
export async function navigateToPage(browser: Browser, url: string, options?: NavigationOptions): Promise<Page>
export async function waitForElement(page: Page, selector: string, selectorType: string, timeout?: number): Promise<Locator>
export async function screenshotToBase64(buffer: Buffer, format: string): Promise<string>
export async function closeBrowser(browser: Browser): Promise<void>
```

#### Step 2.2: Create Screenshot Processor
**File:** `src/tools/hands/processors/playwright-screenshot.ts`

**Responsibilities:**
- Implement three screenshot capture functions:
  - `captureFullPageScreenshot(options: FullPageOptions, config?: Config): Promise<ScreenshotResult>`
  - `captureViewportScreenshot(options: ViewportOptions, config?: Config): Promise<ScreenshotResult>`
  - `captureElementScreenshot(options: ElementOptions, config?: Config): Promise<ScreenshotResult>`
- Browser lifecycle management (launch, close, cleanup)
- Integration with file storage system
- Error handling and timeout management
- Metadata collection (dimensions, timing, etc.)

**Implementation Pattern:**
```typescript
export async function captureFullPageScreenshot(
  options: FullPageScreenshotOptions,
  config?: Config
): Promise<ScreenshotResult> {
  const startTime = Date.now();
  let browser: Browser | undefined;

  try {
    // Launch browser
    browser = await launchBrowser({ headless: true });

    // Navigate to page
    const page = await navigateToPage(browser, options.url, {
      waitUntil: options.waitUntil || "load",
      timeout: options.timeout || 30000
    });

    // Set viewport if specified
    if (options.viewport) {
      await page.setViewportSize(options.viewport);
    }

    // Capture full page screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: options.outputFormat || "png",
      quality: options.quality,
    });

    // Convert to base64
    const base64Data = screenshotBuffer.toString("base64");
    const mimeType = `image/${options.outputFormat || "png"}`;
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // Get dimensions
    const dimensions = { width: 0, height: 0 }; // Extract from buffer if possible

    const captureTime = Date.now() - startTime;

    // Save to file storage
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    if (config) {
      const savedFile = await saveBase64ToFile(
        base64Data,
        mimeType,
        config,
        {
          prefix: "playwright-fullpage",
          uploadToR2: config.cloudflare?.accessKey ? true : false
        }
      );

      filePath = savedFile.filePath;
      fileName = savedFile.fileName;
      fileUrl = savedFile.url;
      fileSize = savedFile.size;
    }

    return {
      screenshot: dataUri,
      format: options.outputFormat || "png",
      dimensions,
      captureTime,
      filePath,
      fileName,
      fileUrl,
      fileSize
    };
  } catch (error) {
    logger.error("Full page screenshot capture failed:", error);
    throw new ProcessingError(
      `Failed to capture full page screenshot: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    // Cleanup: Close browser
    if (browser) {
      await closeBrowser(browser).catch(err =>
        logger.warn("Failed to close browser:", err)
      );
    }
  }
}
```

### Phase 3: Define Schemas (30 minutes)

#### Step 3.1: Add Zod Schemas to schemas.ts
**File:** `src/tools/hands/schemas.ts`

Add the following schemas:

```typescript
// Playwright Screenshot Schemas
export const PlaywrightFullPageScreenshotInputSchema = z.object({
  url: z.string().url().describe("URL to navigate to"),
  wait_until: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("load").describe("Wait condition before capturing"),
  timeout: z.number().int().min(1000).max(120000).optional().default(30000).describe("Navigation timeout in milliseconds"),
  output_format: z.enum(["png", "jpeg"]).optional().default("png").describe("Output image format"),
  quality: z.number().int().min(0).max(100).optional().describe("JPEG quality (0-100)"),
  viewport: z.object({
    width: z.number().int().min(320).max(3840).describe("Viewport width"),
    height: z.number().int().min(240).max(2160).describe("Viewport height")
  }).optional().describe("Optional viewport dimensions")
});

export type PlaywrightFullPageScreenshotInput = z.infer<typeof PlaywrightFullPageScreenshotInputSchema>;

export const PlaywrightViewportScreenshotInputSchema = z.object({
  url: z.string().url().describe("URL to navigate to"),
  wait_until: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("load"),
  timeout: z.number().int().min(1000).max(120000).optional().default(30000),
  viewport: z.object({
    width: z.number().int().min(320).max(3840).default(1280),
    height: z.number().int().min(240).max(2160).default(720)
  }).optional().default({ width: 1280, height: 720 }).describe("Viewport dimensions"),
  output_format: z.enum(["png", "jpeg"]).optional().default("png"),
  quality: z.number().int().min(0).max(100).optional()
});

export type PlaywrightViewportScreenshotInput = z.infer<typeof PlaywrightViewportScreenshotInputSchema>;

export const PlaywrightElementScreenshotInputSchema = z.object({
  url: z.string().url().describe("URL to navigate to"),
  selector: z.string().min(1).describe("CSS selector, text, or role to locate element"),
  selector_type: z.enum(["css", "text", "role"]).optional().default("css").describe("Type of selector"),
  wait_until: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("load"),
  timeout: z.number().int().min(1000).max(120000).optional().default(30000),
  element_timeout: z.number().int().min(1000).max(60000).optional().default(10000).describe("Timeout waiting for element"),
  output_format: z.enum(["png", "jpeg"]).optional().default("png"),
  quality: z.number().int().min(0).max(100).optional(),
  viewport: z.object({
    width: z.number().int().min(320).max(3840),
    height: z.number().int().min(240).max(2160)
  }).optional()
});

export type PlaywrightElementScreenshotInput = z.infer<typeof PlaywrightElementScreenshotInputSchema>;
```

### Phase 4: Register Tools (1 hour)

#### Step 4.1: Update hands/index.ts
**File:** `src/tools/hands/index.ts`

Add imports:
```typescript
import {
  PlaywrightFullPageScreenshotInputSchema,
  PlaywrightViewportScreenshotInputSchema,
  PlaywrightElementScreenshotInputSchema,
  type PlaywrightFullPageScreenshotInput,
  type PlaywrightViewportScreenshotInput,
  type PlaywrightElementScreenshotInput
} from "./schemas.js";
import {
  captureFullPageScreenshot,
  captureViewportScreenshot,
  captureElementScreenshot
} from "./processors/playwright-screenshot.js";
```

Register three tools (follow the existing pattern in the file):

```typescript
// Register playwright_screenshot_fullpage tool
server.registerTool(
  "playwright_screenshot_fullpage",
  {
    title: "Playwright Full Page Screenshot Tool",
    description: "Capture a screenshot of the entire scrollable page using Playwright",
    inputSchema: {
      url: z.string().url().describe("URL to navigate to"),
      wait_until: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("load").describe("Wait condition before capturing"),
      timeout: z.number().int().min(1000).max(120000).optional().default(30000).describe("Navigation timeout in milliseconds"),
      output_format: z.enum(["png", "jpeg"]).optional().default("png").describe("Output image format"),
      quality: z.number().int().min(0).max(100).optional().describe("JPEG quality (0-100)"),
      viewport: z.object({
        width: z.number().int().min(320).max(3840).describe("Viewport width"),
        height: z.number().int().min(240).max(2160).describe("Viewport height")
      }).optional().describe("Optional viewport dimensions")
    }
  },
  async (args) => {
    try {
      return await handlePlaywrightFullPageScreenshot(args, config);
    } catch (error) {
      const mcpError = handleError(error);
      logger.error(`Tool playwright_screenshot_fullpage error:`, mcpError);

      return {
        content: [{
          type: "text" as const,
          text: `Error: ${mcpError.message}`
        }],
        isError: true
      };
    }
  }
);

// Similar registration for viewport and element tools...
```

Add handler functions:
```typescript
async function handlePlaywrightFullPageScreenshot(args: unknown, config: Config) {
  const input = PlaywrightFullPageScreenshotInputSchema.parse(args);

  logger.info(`Capturing full page screenshot of: ${input.url}`);

  const result = await captureFullPageScreenshot({
    url: input.url,
    waitUntil: input.wait_until,
    timeout: input.timeout,
    outputFormat: input.output_format,
    quality: input.quality,
    viewport: input.viewport
  }, config);

  // Extract base64 data from data URI
  let base64Data: string | undefined;
  let mimeType: string | undefined;

  if (result.screenshot.startsWith('data:')) {
    const matches = result.screenshot.match(/data:([^;]+);base64,(.+)/);
    if (matches && matches[1] && matches[2]) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  const contextText = `✅ Full page screenshot captured successfully

**Screenshot Details:**
- URL: ${input.url}
- Format: ${result.format}
- Dimensions: ${result.dimensions.width}x${result.dimensions.height}
- Capture Time: ${result.captureTime}ms
- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}`;

  const formattedResponse = formatMediaResponse(
    {
      url: result.fileUrl,
      filePath: result.filePath,
      base64: base64Data,
      mimeType: mimeType,
      size: result.fileSize,
    },
    config,
    contextText
  );

  return {
    content: formattedResponse as any,
    isError: false
  };
}
```

### Phase 5: Testing Strategy (2 hours)

#### Step 5.1: Create Unit Tests
**File:** `tests/unit/playwright-screenshot.test.ts`

Test cases:
1. Browser launch and close
2. URL validation
3. Timeout handling
4. Invalid selector handling
5. Format conversion (buffer to base64)
6. Viewport configuration

#### Step 5.2: Create Integration Tests
**File:** `tests/integration/playwright-screenshot.test.ts`

Test cases:
1. Full page screenshot capture
2. Viewport screenshot capture
3. Element screenshot capture
4. File storage integration
5. R2 upload (if configured)
6. Error scenarios (network failures, invalid URLs, missing elements)

#### Step 5.3: Manual Testing Checklist
- [ ] Test with MCP Inspector
- [ ] Verify screenshot quality
- [ ] Test different viewport sizes
- [ ] Test element selectors (CSS, text, role)
- [ ] Test timeout behaviors
- [ ] Verify file storage and R2 uploads
- [ ] Test error handling

### Phase 6: Documentation (30 minutes)

#### Step 6.1: Update README
Add Playwright screenshot tools to the tools list with usage examples

#### Step 6.2: Add JSDoc Comments
Document all public functions with comprehensive JSDoc comments

#### Step 6.3: Create Usage Examples
Add example code showing how to use each tool

## Files to Modify/Create/Delete

### Files to Create

1. **`src/tools/hands/utils/playwright-helpers.ts`** (NEW)
   - Browser management utilities
   - Navigation and waiting helpers
   - Screenshot conversion utilities

2. **`src/tools/hands/processors/playwright-screenshot.ts`** (NEW)
   - Main screenshot processor
   - Three capture functions (fullpage, viewport, element)
   - Error handling and cleanup

3. **`tests/unit/playwright-screenshot.test.ts`** (NEW)
   - Unit tests for helpers and processors

4. **`tests/integration/playwright-screenshot.test.ts`** (NEW)
   - Integration tests for MCP tools

### Files to Modify

1. **`src/tools/hands/index.ts`**
   - Import new schemas and processors
   - Register three new tools
   - Add handler functions

2. **`src/tools/hands/schemas.ts`**
   - Add Zod schemas for three tools
   - Export types

3. **`package.json`**
   - Add `playwright` and `@playwright/test` dependencies
   - Optional: Add convenience script for browser installation

4. **`README.md`**
   - Document new screenshot tools
   - Add usage examples

5. **`.gitignore`** (if not already present)
   - Add Playwright browser cache paths

### Files to Delete

None

## Security Considerations

### Input Validation

1. **URL Validation**
   - Use Zod's `.url()` validator to ensure valid URLs
   - Consider implementing URL allowlist/blocklist if needed
   - Sanitize URLs to prevent SSRF attacks

2. **Selector Injection**
   - Validate CSS selectors to prevent injection attacks
   - Use Playwright's built-in selector validation
   - Limit selector complexity if needed

3. **Resource Limits**
   - Enforce maximum timeout values (30-120 seconds)
   - Limit viewport dimensions to reasonable ranges
   - Monitor memory usage for long-running operations

### Browser Security

1. **Headless Mode**
   - Always run browsers in headless mode
   - Disable unnecessary browser features
   - Run with minimal permissions

2. **Network Isolation**
   - Consider implementing network isolation if capturing sensitive sites
   - Use Playwright's network interception if needed

3. **Process Cleanup**
   - Ensure browser processes are properly terminated
   - Implement timeout-based cleanup for orphaned processes
   - Monitor for zombie processes

### Data Privacy

1. **Screenshot Storage**
   - Encrypt sensitive screenshots at rest (if needed)
   - Implement automatic cleanup for temporary files
   - Respect privacy requirements for captured content

2. **Logging**
   - Avoid logging sensitive URLs or selectors
   - Redact authentication tokens in logs
   - Implement secure log storage

## Performance Considerations

### Resource Management

1. **Browser Instance Pooling**
   - Consider implementing browser instance pool for high-volume usage
   - Current implementation: One browser per request (safer, simpler)
   - Future optimization: Reuse browser instances with proper isolation

2. **Memory Management**
   - Browser instances can consume 100-200MB of memory
   - Implement proper cleanup in finally blocks
   - Monitor memory usage and implement limits if needed

3. **Concurrent Operations**
   - Limit concurrent browser instances (e.g., max 5 concurrent)
   - Implement queue system for high-volume scenarios
   - Consider rate limiting per client

### Optimization Strategies

1. **Caching**
   - Cache screenshots for identical requests (optional)
   - Implement cache invalidation strategy
   - Use Redis or in-memory cache for high-traffic scenarios

2. **Image Compression**
   - Use appropriate JPEG quality settings (default: 80)
   - Consider WebP format for better compression (future)
   - Implement automatic format selection based on content

3. **Network Optimization**
   - Use `networkidle` wait condition sparingly (slower but more reliable)
   - Default to `load` or `domcontentloaded` for faster captures
   - Implement timeout tuning based on expected page load times

### Benchmarks (Expected)

- **Full Page Screenshot**: 2-5 seconds (typical)
- **Viewport Screenshot**: 1-3 seconds (typical)
- **Element Screenshot**: 1-3 seconds (typical)
- **Browser Launch**: 200-500ms (per instance)
- **Memory Per Browser**: 100-200MB

## Risks & Mitigations

### Risk 1: Browser Binary Size
**Impact:** High
**Probability:** High
**Description:** Playwright browser binaries are large (100-300MB per browser)

**Mitigation:**
- Install only Chromium browser (smallest footprint)
- Document browser installation in README
- Consider Docker image with pre-installed browsers for production
- Add post-install script to automate browser installation

### Risk 2: Browser Process Leaks
**Impact:** High
**Probability:** Medium
**Description:** Orphaned browser processes consuming resources

**Mitigation:**
- Implement robust cleanup in finally blocks
- Add process monitoring and automatic cleanup
- Use timeouts to prevent long-running processes
- Implement health check endpoint to monitor browser processes

### Risk 3: Network Timeouts
**Impact:** Medium
**Probability:** Medium
**Description:** Page load failures due to slow networks or unresponsive sites

**Mitigation:**
- Implement configurable timeout values
- Use appropriate wait conditions (load, domcontentloaded, networkidle)
- Add retry logic for transient failures
- Provide clear error messages for timeout scenarios

### Risk 4: Element Selection Failures
**Impact:** Medium
**Probability:** Medium
**Description:** Element not found or selector ambiguity

**Mitigation:**
- Support multiple selector types (CSS, text, role)
- Implement element waiting with timeout
- Provide clear error messages with suggestions
- Document selector best practices

### Risk 5: Memory Exhaustion
**Impact:** High
**Probability:** Low
**Description:** Multiple concurrent browser instances exhausting server memory

**Mitigation:**
- Implement concurrent browser limit
- Monitor memory usage and implement alerts
- Add queue system for request overflow
- Document resource requirements

### Risk 6: Security Vulnerabilities
**Impact:** High
**Probability:** Low
**Description:** SSRF attacks, malicious URL injection, or XSS in captured content

**Mitigation:**
- Implement URL validation and sanitization
- Consider URL allowlist/blocklist for production
- Run browsers with minimal permissions
- Sandbox browser processes
- Document security best practices

## TODO Tasks

### Setup Phase
- [ ] Install Playwright dependencies (`bun add playwright @playwright/test`)
- [ ] Install Chromium browser (`bunx playwright install chromium`)
- [ ] Update package.json with playwright:install script
- [ ] Add Playwright cache paths to .gitignore

### Implementation Phase
- [ ] Create `src/tools/hands/utils/playwright-helpers.ts`
  - [ ] Implement `launchBrowser()` function
  - [ ] Implement `navigateToPage()` function
  - [ ] Implement `waitForElement()` function
  - [ ] Implement `screenshotToBase64()` function
  - [ ] Implement `closeBrowser()` function
  - [ ] Add comprehensive error handling
  - [ ] Add JSDoc documentation

- [ ] Create `src/tools/hands/processors/playwright-screenshot.ts`
  - [ ] Implement `captureFullPageScreenshot()` function
  - [ ] Implement `captureViewportScreenshot()` function
  - [ ] Implement `captureElementScreenshot()` function
  - [ ] Add browser lifecycle management
  - [ ] Integrate with file storage system
  - [ ] Add metadata collection
  - [ ] Add comprehensive error handling
  - [ ] Add JSDoc documentation

- [ ] Update `src/tools/hands/schemas.ts`
  - [ ] Add `PlaywrightFullPageScreenshotInputSchema`
  - [ ] Add `PlaywrightViewportScreenshotInputSchema`
  - [ ] Add `PlaywrightElementScreenshotInputSchema`
  - [ ] Export all schema types

- [ ] Update `src/tools/hands/index.ts`
  - [ ] Import new schemas and processors
  - [ ] Register `playwright_screenshot_fullpage` tool
  - [ ] Register `playwright_screenshot_viewport` tool
  - [ ] Register `playwright_screenshot_element` tool
  - [ ] Implement `handlePlaywrightFullPageScreenshot()` handler
  - [ ] Implement `handlePlaywrightViewportScreenshot()` handler
  - [ ] Implement `handlePlaywrightElementScreenshot()` handler

### Testing Phase
- [ ] Create `tests/unit/playwright-screenshot.test.ts`
  - [ ] Test browser launch and close
  - [ ] Test URL validation
  - [ ] Test timeout handling
  - [ ] Test format conversion
  - [ ] Test viewport configuration

- [ ] Create `tests/integration/playwright-screenshot.test.ts`
  - [ ] Test full page screenshot capture
  - [ ] Test viewport screenshot capture
  - [ ] Test element screenshot capture
  - [ ] Test file storage integration
  - [ ] Test error scenarios

- [ ] Run `bun run typecheck` and fix any type errors
- [ ] Run `bun test` and verify all tests pass
- [ ] Test with MCP Inspector (`bun run inspector`)
  - [ ] Test full page screenshot tool
  - [ ] Test viewport screenshot tool
  - [ ] Test element screenshot tool
  - [ ] Verify file storage and R2 uploads
  - [ ] Test error handling

### Documentation Phase
- [ ] Update README.md
  - [ ] Add Playwright screenshot tools to tools list
  - [ ] Add installation instructions
  - [ ] Add usage examples
  - [ ] Document configuration options

- [ ] Add JSDoc comments to all public functions
- [ ] Create usage examples in examples/ directory (optional)
- [ ] Update CHANGELOG.md with new features

### Deployment Phase
- [ ] Run final integration tests
- [ ] Verify build succeeds (`bun run build`)
- [ ] Test production build (`bun run start`)
- [ ] Update version in package.json
- [ ] Create git commit with changes
- [ ] Tag release (if applicable)

## Configuration Options

### Environment Variables

No new environment variables required. The tools will use existing configuration:

- `FETCH_TIMEOUT` - Used for navigation timeout (default: 60000ms)
- `CLOUDFLARE_CDN_*` - Used for R2 upload (if configured)
- Standard file storage configuration

### Optional Configuration (Future Enhancement)

Consider adding these environment variables in future iterations:

```bash
# Playwright-specific configuration
PLAYWRIGHT_BROWSER_TYPE=chromium        # chromium, firefox, webkit
PLAYWRIGHT_HEADLESS=true                # Run in headless mode
PLAYWRIGHT_MAX_CONCURRENT=5             # Max concurrent browser instances
PLAYWRIGHT_BROWSER_TIMEOUT=30000        # Browser launch timeout
PLAYWRIGHT_DEFAULT_VIEWPORT_WIDTH=1280  # Default viewport width
PLAYWRIGHT_DEFAULT_VIEWPORT_HEIGHT=720  # Default viewport height
```

## Success Criteria

### Functional Success Criteria

- [ ] All three screenshot tools are implemented and registered
- [ ] Tools follow MCP naming conventions
- [ ] Screenshots are captured correctly for all three modes
- [ ] Base64 encoding works properly
- [ ] File storage integration works (local + R2)
- [ ] Error handling covers all failure scenarios
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Type checking passes without errors

### Quality Success Criteria

- [ ] Code follows existing patterns in the codebase
- [ ] JSDoc documentation is comprehensive
- [ ] Error messages are clear and actionable
- [ ] Performance meets benchmarks (< 5 seconds for full page)
- [ ] Memory usage is reasonable (< 200MB per browser)
- [ ] Security considerations are addressed
- [ ] Tools work with MCP Inspector

### User Experience Success Criteria

- [ ] Tools are easy to use with clear parameter names
- [ ] Response format is consistent with other hands tools
- [ ] Error messages guide users to fix issues
- [ ] Documentation is clear and includes examples
- [ ] Tools handle edge cases gracefully

## Rollback Plan

If issues arise during implementation:

1. **Revert Changes:**
   ```bash
   git checkout -- src/tools/hands/
   git checkout -- tests/
   ```

2. **Uninstall Dependencies:**
   ```bash
   bun remove playwright @playwright/test
   ```

3. **Clean Browser Binaries:**
   ```bash
   rm -rf ~/.cache/ms-playwright
   ```

4. **Restore Package.json:**
   ```bash
   git checkout -- package.json bun.lockb
   ```

## Future Enhancements

### Phase 2 Enhancements (Post-MVP)

1. **Browser Instance Pooling**
   - Implement reusable browser instance pool
   - Add connection limits and queue system
   - Improve performance for high-volume usage

2. **Additional Screenshot Options**
   - Add clip area support for partial screenshots
   - Support multiple elements in single screenshot
   - Add annotation/markup capabilities

3. **Advanced Selectors**
   - Support XPath selectors
   - Add chained selector support
   - Implement selector validation and suggestions

4. **Video Recording**
   - Add video recording capability
   - Support screen recording for user flows
   - Implement video format options

5. **Network Controls**
   - Add request interception
   - Support custom headers
   - Implement cookie management

6. **Performance Monitoring**
   - Add page performance metrics
   - Collect lighthouse scores
   - Track Core Web Vitals

## References

### Playwright Documentation
- [Playwright Homepage](https://playwright.dev/)
- [Screenshot API](https://playwright.dev/docs/screenshots)
- [Page API](https://playwright.dev/docs/api/class-page)
- [Locator API](https://playwright.dev/docs/api/class-locator)
- [Browser Contexts](https://playwright.dev/docs/browser-contexts)

### Codebase References
- Existing hands tools pattern: `src/tools/hands/index.ts`
- Jimp processor pattern: `src/tools/hands/processors/jimp-processor.ts`
- Schema patterns: `src/tools/hands/schemas.ts`
- Error handling: `src/utils/errors.ts`
- File storage: `src/utils/file-storage.js`

### External Resources
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Zod Documentation](https://zod.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---

## Implementation Notes

This plan follows the YANGI (You Aren't Gonna Need It), KISS (Keep It Simple, Stupid), and DRY (Don't Repeat Yourself) principles. The implementation is designed to:

1. **Keep It Simple:** One browser instance per request for simplicity and safety
2. **Follow Patterns:** Reuse existing patterns from hands tools
3. **Security First:** Implement proper cleanup and timeout handling
4. **Future-Proof:** Design allows for future enhancements without breaking changes

The estimated total implementation time is **6-8 hours** for a complete implementation including testing and documentation.
