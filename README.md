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

- Node.js v18+ or [Bun](https://bun.sh) v1.2+
- Google Gemini API key

### Installation

Install Human MCP as an npm package:

```bash
# Using npm
npm install -g @goonnguyen/human-mcp

# Using bun (recommended)
bun install -g @goonnguyen/human-mcp

# Using pnpm
pnpm install -g @goonnguyen/human-mcp
```

### Environment Setup

Configure your Google Gemini API key:

```bash
# Option 1: Environment variable (recommended)
export GOOGLE_GEMINI_API_KEY="your_api_key_here"

# Option 2: Add to your shell profile
echo 'export GOOGLE_GEMINI_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

### Development (For Contributors)

If you want to contribute to Human MCP development:

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

Human MCP can be configured with various MCP clients for different development workflows. Follow the setup instructions for your preferred client below.

#### Claude Desktop

Claude Desktop is a desktop application that provides a user-friendly interface for interacting with MCP servers.

**Configuration Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration Example:**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Setup Steps:**
1. Install Human MCP globally: `npm install -g @goonnguyen/human-mcp`
2. Create or edit the Claude Desktop configuration file
3. Add the Human MCP server configuration (use the first example with `npx` for reliability)
4. Set your Google Gemini API key in environment variables or the config
5. Restart Claude Desktop

**Verification:**
- Look for the connection indicator in Claude Desktop
- Try using the `eyes_analyze` tool with a test image

#### Claude Code (CLI)

Claude Code is the official CLI for Claude that supports MCP servers for enhanced coding workflows.

**Configuration Location:**
- **All platforms**: `~/.config/claude/config.json`

**Configuration Example:**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Setup Steps:**
1. Install Claude Code CLI: `npm install -g @anthropic-ai/claude`
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Initialize configuration: `claude configure`
4. Edit the config file to add Human MCP server
5. Test connection: `claude --list-mcp-servers`

**Usage:**
```bash
# Start Claude Code with MCP servers
claude --enable-mcp

# Analyze a screenshot in your current project
claude "Analyze this screenshot for UI issues" --attach screenshot.png
```

#### Gemini CLI

While Gemini CLI doesn't directly support MCP, you can use Human MCP as a bridge to access visual analysis capabilities.

**Direct Usage:**

```bash
# Run Human MCP server directly (if globally installed)
human-mcp

# Or using npx (no global installation needed)
npx @goonnguyen/human-mcp
```

**Integration Example:**
```bash
# Create a wrapper script for Gemini CLI integration
#!/bin/bash
# gemini-visual-analysis.sh

# Set environment variables
export GOOGLE_GEMINI_API_KEY="your_api_key"

# Run Human MCP analysis
echo '{"source": "'$1'", "type": "image", "analysis_type": "ui_debug"}' | \
  npx @goonnguyen/human-mcp
```

#### MCP Coding Clients (Cline, Cursor, Windsurf)

These IDE extensions support MCP servers for enhanced AI-assisted coding with visual analysis capabilities.

##### Cline (VS Code Extension)

**Configuration Location:**
- VS Code Settings: `.vscode/settings.json` in your workspace
- Or Global Settings: VS Code → Preferences → Settings → Extensions → Cline

**Configuration Example:**

```json
{
  "cline.mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "cline.mcpServers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Setup Steps:**
1. Install Cline extension from VS Code Marketplace
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Open VS Code in your project directory
4. Add Human MCP configuration to workspace settings (use `npx` version for reliability)
5. Restart VS Code or reload the window
6. Open Cline panel and verify MCP connection

##### Cursor

**Configuration Location:**
- Cursor Settings: `.cursor/settings.json` in your workspace
- Or via Cursor → Settings → Extensions → MCP

**Configuration Example:**

```json
{
  "mcp.servers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "mcp.servers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Setup Steps:**
1. Install latest version of Cursor
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Open your project in Cursor
4. Configure MCP servers in settings (use `npx` version for reliability)
5. Enable MCP integration in Cursor preferences
6. Test visual analysis features

##### Windsurf

**Configuration Location:**
- Windsurf config: `~/.windsurf/mcp_servers.json`
- Or project-specific: `.windsurf/mcp_servers.json`

**Configuration Example:**

```json
{
  "servers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      },
      "timeout": 30000
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "servers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      },
      "timeout": 30000
    }
  }
}
```

**Setup Steps:**
1. Install Windsurf IDE
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Create MCP server configuration file
4. Add Human MCP server configuration (use `npx` version for reliability)
5. Restart Windsurf
6. Verify connection in MCP panel

### Environment Variable Setup

For all clients, ensure your Google Gemini API key is properly configured:

**Option 1: System Environment Variables (Recommended)**
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export GOOGLE_GEMINI_API_KEY="your_api_key_here"

# Reload your shell
source ~/.zshrc  # or ~/.bashrc
```

**Option 2: Client Configuration**
Include the API key directly in the MCP server configuration (as shown in examples above). This is the most reliable method for ensuring the key is available to the Human MCP server.

**Option 3: Global .env File (Advanced)**
```bash
# Create a global .env file (optional)
echo "GOOGLE_GEMINI_API_KEY=your_api_key_here" >> ~/.env

# Source it in your shell profile
echo "source ~/.env" >> ~/.zshrc
```

### Connection Verification

**Test Human MCP Server:**
```bash
# Test the server directly (if globally installed)
human-mcp

# Or using npx (no installation needed)
npx @goonnguyen/human-mcp

# For development/testing, use the MCP inspector from source
# (only if you have cloned the repository for development)
cd /path/to/human-mcp && bun run inspector
```

**Test with MCP Clients:**
1. Check client logs for connection status
2. Try using `eyes_analyze` tool with a test image
3. Verify API responses are returned correctly
4. Look for the Human MCP server in the client's MCP server list

### Troubleshooting

**Common Issues:**

1. **Connection Failed**
   - Verify Node.js/npm or Bun is installed and accessible
   - Ensure `@goonnguyen/human-mcp` package is installed
   - Check Google Gemini API key is valid and properly configured

2. **Package Not Found**
   - Install Human MCP globally: `npm install -g @goonnguyen/human-mcp`
   - Or use `npx @goonnguyen/human-mcp` without global installation
   - Verify package installation: `npm list -g @goonnguyen/human-mcp`

3. **Tool Not Found**
   - Restart the MCP client after configuration changes
   - Check Human MCP server logs for errors
   - Verify the server starts: `npx @goonnguyen/human-mcp`

4. **API Errors**
   - Validate Google Gemini API key
   - Check API quota and usage limits
   - Review network connectivity and firewall settings

5. **Permission Errors**
   - Check npm global installation permissions
   - Use `npx` instead of global installation if needed
   - Verify API key has necessary permissions

**Debug Steps:**
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run Human MCP with verbose output
npx @goonnguyen/human-mcp --verbose

# Check package installation
npm list -g @goonnguyen/human-mcp

# Test direct execution
human-mcp --version  # if globally installed

# Check MCP client logs
# (Location varies by client - check client documentation)
```

**Getting Help:**
- Check [Human MCP Issues](https://github.com/human-mcp/human-mcp/issues) 
- Review client-specific MCP documentation  
- Test package installation: `npx @goonnguyen/human-mcp --help`

## Tools

### eyes_analyze

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

### eyes_compare

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