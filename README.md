# Human MCP 👁️

> Bringing Human Capabilities to Coding Agents

Human MCP is a Model Context Protocol server that provides AI coding agents with human-like visual capabilities for debugging and understanding visual content like screenshots, recordings, and UI elements.

## Features

🎯 **Visual Analysis**
- Analyze screenshots for UI bugs and layout issues
- Process screen recordings to understand error sequences  
- Extract insights from GIFs and animations
- Compare visual changes between versions

🔍 **Specialized Analysis Types**
- **UI Debug**: Layout issues, rendering problems, visual bugs
- **Error Detection**: Visible errors, broken functionality, system failures
- **Accessibility**: Color contrast, WCAG compliance, readability
- **Performance**: Loading states, visual performance indicators
- **Layout**: Responsive design, positioning, visual hierarchy

🤖 **AI-Powered**
- Uses Google Gemini 2.0 Flash for fast, accurate analysis
- Detailed technical insights for developers
- Actionable recommendations for fixing issues
- Structured output with detected elements and coordinates

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/human-mcp/human-mcp.git
cd human-mcp

# Install dependencies  
bun install

# Copy environment template
cp .env.example .env

# Add your Gemini API key to .env
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

### Development

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Type checking
bun run typecheck
```

### Usage with MCP Clients

#### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/human-mcp/src/index.ts"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_api_key"
      }
    }
  }
}
```

#### Other MCP Clients

```bash
# Run with stdio transport
bun run src/index.ts

# Use MCP inspector for testing
bun run inspector
```

## Tools

### eyes.analyze

Comprehensive visual analysis for images, videos, and GIFs.

```json
{
  "source": "/path/to/screenshot.png",
  "type": "image", 
  "analysis_type": "ui_debug",
  "detail_level": "detailed",
  "specific_focus": "login form validation"
}
```

### eyes.compare

Compare two images to identify visual differences.

```json
{
  "source1": "/path/to/before.png",
  "source2": "/path/to/after.png",
  "comparison_type": "structural" 
}
```

## Example Use Cases

### Debugging UI Issues
```bash
# Analyze a screenshot for layout problems
{
  "source": "broken-layout.png",
  "type": "image",
  "analysis_type": "ui_debug"
}
```

### Error Investigation  
```bash
# Analyze screen recording of an error
{
  "source": "error-recording.mp4", 
  "type": "video",
  "analysis_type": "error_detection"
}
```

### Accessibility Audit
```bash
# Check accessibility compliance
{
  "source": "page-screenshot.png",
  "type": "image", 
  "analysis_type": "accessibility",
  "check_accessibility": true
}
```

## Prompts

Human MCP includes pre-built prompts for common debugging scenarios:

- `debug_ui_screenshot` - Analyze UI screenshots for issues
- `analyze_error_recording` - Debug errors in screen recordings  
- `accessibility_audit` - Perform accessibility audits
- `performance_visual_audit` - Analyze performance indicators
- `layout_comparison` - Compare layouts for differences

## Resources

Access built-in documentation:

- `humanmcp://docs/api` - Complete API reference
- `humanmcp://examples/debugging` - Real-world debugging examples

## Configuration

Environment variables:

```bash
# Required
GOOGLE_GEMINI_API_KEY=your_api_key

# Optional  
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
LOG_LEVEL=info
PORT=3000
MAX_REQUEST_SIZE=50MB
ENABLE_CACHING=true
CACHE_TTL=3600
```

## Architecture

```
Human MCP Server
├── Eyes Tool (Vision Understanding)
│   ├── Image Analysis
│   ├── Video Processing  
│   ├── GIF Frame Extraction
│   └── Visual Comparison
├── Debugging Prompts
└── Documentation Resources
```

## Supported Formats

**Images**: PNG, JPEG, WebP, GIF (static)  
**Videos**: MP4, WebM, MOV, AVI
**GIFs**: Animated GIF with frame extraction  
**Sources**: File paths, URLs, base64 data URLs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](humanmcp://docs/api)
- 💡 [Examples](humanmcp://examples/debugging)  
- 🐛 [Issues](https://github.com/human-mcp/human-mcp/issues)
- 💬 [Discussions](https://github.com/human-mcp/human-mcp/discussions)

---

**Human MCP** - Making visual debugging as natural as asking a human to look at your screen.