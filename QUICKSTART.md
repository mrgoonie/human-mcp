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
# Edit .env and add your API keys (only GOOGLE_GEMINI_API_KEY is required)

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
        "GOOGLE_GEMINI_API_KEY": "your_gemini_key",
        "MINIMAX_API_KEY": "optional_minimax_key",
        "ZHIPUAI_API_KEY": "optional_zhipuai_key",
        "ELEVENLABS_API_KEY": "optional_elevenlabs_key"
      }
    }
  }
}
```

## 🔧 Get Your API Keys

**Required:**
1. Visit [Google AI Studio](https://aistudio.google.com/) → Get `GOOGLE_GEMINI_API_KEY`

**Optional (unlock more providers):**
- [Minimax](https://platform.minimaxi.com/) → Speech 2.6, Music 2.5, Hailuo 2.3 Video
- [ZhipuAI](https://open.bigmodel.cn/) → GLM-4.6V Vision, CogView-4 Image, CogVideoX-3 Video
- [ElevenLabs](https://elevenlabs.io/) → TTS (70+ languages), Music, Sound Effects

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