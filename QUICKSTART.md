# Human MCP Quickstart Guide

Get up and running with Human MCP in less than 5 minutes!

## 🚀 Quick Installation

```bash
# 1. Clone and install
git clone https://github.com/human-mcp/human-mcp.git
cd human-mcp
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your GOOGLE_GEMINI_API_KEY

# 3. Start the server
bun run dev
```

## 📱 Configuration for Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/human-mcp/src/index.ts"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_actual_api_key_here"
      }
    }
  }
}
```

## 🔧 Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create a new project or use existing one
4. Copy your API key

## ✅ Test Your Installation

Try this in Claude Desktop:

```
Can you analyze this screenshot for UI bugs?
[Upload a screenshot]
```

Human MCP should analyze the image and provide detailed debugging insights!

## 🎯 Common Use Cases

### Debug UI Issues
```
Use the eyes_analyze tool with this screenshot:
- Type: image
- Analysis type: ui_debug  
- Detail level: detailed
```

### Analyze Error Recordings
```
Use the eyes_analyze tool with this screen recording:
- Type: video
- Analysis type: error_detection
- Focus on: the error sequence
```

### Check Accessibility
```
Use the eyes_analyze tool:
- Analysis type: accessibility
- Check accessibility: true
```

## 🆘 Troubleshooting

**"Tool not found"** → Restart Claude Desktop after config changes
**"API key error"** → Check your GOOGLE_GEMINI_API_KEY in .env or config
**"Permission denied"** → Make sure bun is installed and executable

## 📖 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Try the [example debugging session](examples/debugging-session.ts)
- Check out the [API documentation](src/resources/documentation.ts)

Happy debugging! 🐛✨