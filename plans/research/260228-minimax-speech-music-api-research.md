# Research Report: MiniMax AI APIs -- Speech Generation (Speed 2.6) & Music Generation (Music 2.5)

**Date:** 2026-02-28
**Sources consulted:** 15+
**Key search terms:** Minimax Speech API, Speed 2.6, Music 2.5, T2A v2, music_generation, minimax-mcp-js, minimax-speech-ts

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [1. Speech API (Speed 2.6)](#1-speech-api-speed-26)
  - [1.1 Endpoint & Authentication](#11-endpoint--authentication)
  - [1.2 Available Models](#12-available-models)
  - [1.3 Request Format](#13-request-format)
  - [1.4 Response Format](#14-response-format)
  - [1.5 Voices](#15-voices)
  - [1.6 Language Support](#16-language-support)
  - [1.7 Streaming](#17-streaming)
  - [1.8 Advanced Features](#18-advanced-features)
- [2. Music API (Music 2.5)](#2-music-api-music-25)
  - [2.1 Endpoint & Authentication](#21-endpoint--authentication)
  - [2.2 Request Format](#22-request-format)
  - [2.3 Response Format](#23-response-format)
  - [2.4 Structure Tags](#24-structure-tags)
  - [2.5 Capabilities](#25-capabilities)
- [3. Authentication & Account Setup](#3-authentication--account-setup)
- [4. Rate Limits](#4-rate-limits)
- [5. Pricing](#5-pricing)
- [6. SDKs & npm Packages](#6-sdks--npm-packages)
- [7. Code Examples](#7-code-examples)
- [8. Error Handling](#8-error-handling)
- [9. Comparative Analysis](#9-comparative-analysis)
- [10. Implementation Recommendations](#10-implementation-recommendations)
- [11. Common Pitfalls](#11-common-pitfalls)
- [Resources & References](#resources--references)
- [Unresolved Questions](#unresolved-questions)

---

## Executive Summary

MiniMax provides production-grade APIs for both text-to-speech (TTS) and AI music generation. The Speech API (models: `speech-2.6-hd` and `speech-2.6-turbo`) delivers high-quality voice synthesis with 300+ voices, 40+ language support, sub-250ms streaming latency, and rich voice control parameters. The Music API (`music-2.5` model) generates full-length songs (5+ minutes) from text prompts and lyrics with 14 structural tags and 100+ instruments.

Both APIs use REST endpoints with Bearer token authentication and return audio data in hex-encoded format (or URL). There is no official Node.js client SDK for direct API calls, but a community TypeScript SDK (`minimax-speech-ts`) covers the Speech API, and the official `minimax-mcp-js` package provides MCP server integration. For direct HTTP integration, raw `fetch`/`axios` calls are straightforward.

Pricing operates on a credit-based subscription model ranging from $5/month (100K credits) to $999/month (20M credits), with pay-as-you-go options at approximately $0.10 per song for music and ~$30-100 per 1M characters for speech.

---

## 1. Speech API (Speed 2.6)

### 1.1 Endpoint & Authentication

| Detail | Value |
|--------|-------|
| **HTTP Method** | `POST` |
| **Primary Endpoint** | `https://api.minimax.io/v1/t2a_v2` |
| **Low-Latency (US West)** | `https://api-uw.minimax.io/v1/t2a_v2` |
| **China Mainland** | `https://api.minimaxi.chat/v1/t2a_v2` (note extra "i") |
| **Authentication** | `Authorization: Bearer <API_KEY>` header |
| **Content-Type** | `application/json` |
| **Max Characters** | 10,000 per request |

**Important:** The China mainland endpoint (`api.minimaxi.chat`) and international endpoint (`api.minimax.io`) use different API keys. They must match.

### 1.2 Available Models

| Model | Type | Quality Focus | Languages | Latency |
|-------|------|--------------|-----------|---------|
| `speech-2.8-hd` | HD | Tonal nuances, highest quality | 40+ | Higher |
| `speech-2.8-turbo` | Turbo | Tonal nuances, fast | 40+ | Lower |
| `speech-2.6-hd` | HD | Strong prosody, high quality | 40 | Higher |
| `speech-2.6-turbo` | Turbo | Strong prosody, fast | 40 | Sub-250ms |
| `speech-02-hd` | HD | Superior rhythm, strong cloning | 24 | Higher |
| `speech-02-turbo` | Turbo | Fast response time | 24 | Lower |
| `speech-01-hd` | HD | Legacy | Limited | Higher |
| `speech-01-turbo` | Turbo | Legacy | Limited | Lower |

**Recommendation:** Use `speech-2.6-hd` for highest quality or `speech-2.6-turbo` for low-latency use cases. The `speech-2.8-*` models are the latest and focus on tonal nuances.

### 1.3 Request Format

```json
{
  "model": "speech-2.6-hd",
  "text": "The text to synthesize into speech.",
  "stream": false,
  "language_boost": "English",
  "output_format": "hex",
  "subtitle_enable": false,
  "voice_setting": {
    "voice_id": "English_Graceful_Lady",
    "speed": 1.0,
    "vol": 1.0,
    "pitch": 0,
    "emotion": "happy",
    "text_normalization": false,
    "latex_read": false
  },
  "audio_setting": {
    "sample_rate": 32000,
    "bitrate": 128000,
    "format": "mp3",
    "channel": 1,
    "force_cbr": false
  },
  "voice_modify": {
    "pitch": 0,
    "intensity": 0,
    "timbre": 0,
    "sound_effects": null
  }
}
```

#### Parameter Reference

**Top-Level Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | string | Yes | -- | Speech model version |
| `text` | string | Yes | -- | Text to convert (max 10,000 chars) |
| `stream` | boolean | No | `false` | Enable streaming output |
| `language_boost` | string | No | `null` | Force language pronunciation (see language list below) or `"auto"` |
| `output_format` | string | No | `"hex"` | `"url"` or `"hex"` (non-streaming only) |
| `subtitle_enable` | boolean | No | `false` | Generate subtitle/timestamp data |

**voice_setting Object:**

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `voice_id` | string | -- | Required | System voice ID or custom cloned voice ID |
| `speed` | float | 0.5 -- 2.0 | 1.0 | Speech speed multiplier |
| `vol` | float | (0, 10] | 1.0 | Volume level |
| `pitch` | integer | -12 to 12 | 0 | Pitch adjustment in semitones |
| `emotion` | string | see list | auto | Emotion preset |
| `text_normalization` | boolean | -- | false | Normalize abbreviations, numbers |
| `latex_read` | boolean | -- | false | Read LaTeX formulas |

**Emotion Options:** `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`, `calm`, `fluent`, `whisper`

**audio_setting Object:**

| Parameter | Type | Options | Default | Description |
|-----------|------|---------|---------|-------------|
| `sample_rate` | integer | 8000, 16000, 22050, 24000, 32000, 44100 | 32000 | Audio sample rate |
| `bitrate` | integer | 32000, 64000, 128000, 256000 | 128000 | Audio bitrate |
| `format` | string | `mp3`, `pcm`, `flac`, `wav` | `mp3` | Output audio format |
| `channel` | integer | 1, 2 | 1 | Mono (1) or Stereo (2) |
| `force_cbr` | boolean | -- | false | Force constant bitrate |

> **Note:** `wav` format is only supported in non-streaming mode.

**voice_modify Object (optional post-processing):**

| Parameter | Range | Effect |
|-----------|-------|--------|
| `pitch` | -100 to 100 | Deeper (negative) to brighter (positive) |
| `intensity` | -100 to 100 | Stronger (negative) to softer (positive) |
| `timbre` | -100 to 100 | Fuller (negative) to crisper (positive) |
| `sound_effects` | enum | `spacious_echo`, `auditorium_echo`, `lofi_telephone`, `robotic` |

### 1.4 Response Format

**Non-Streaming Response:**

```json
{
  "data": {
    "audio": "<hex-encoded audio data>",
    "subtitle_file": "<optional URL to subtitle file>",
    "status": 2
  },
  "extra_info": {
    "audio_length": 11124,
    "audio_sample_rate": 32000,
    "audio_size": 179926,
    "bitrate": 128000,
    "word_count": 163,
    "invisible_character_ratio": 0,
    "usage_characters": 163,
    "audio_format": "mp3",
    "audio_channel": 1
  },
  "trace_id": "<session-id>",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

**Status values:** `1` = in progress (streaming), `2` = completed

**Decoding hex audio to buffer:**

```javascript
const audioBuffer = Buffer.from(response.data.audio, "hex");
fs.writeFileSync("output.mp3", audioBuffer);
```

When `output_format` is `"url"`, the `audio` field contains a download URL instead of hex data. URL is valid for **9 hours** (32,400 seconds).

### 1.5 Voices

MiniMax provides **300+ system voices**. Some known voice IDs:

**English Voices:**
- `English_Graceful_Lady`
- `English_Insightful_Speaker`
- `English_radiant_girl`
- `English_Persuasive_Man`
- `English_Lucky_Robot`

**Chinese Voices:**
- `Chinese (Mandarin)_Lyrical_Voice`
- `Chinese (Mandarin)_HK_Flight_Attendant`
- `Chinese (Mandarin)_Reliable_Executive` (male)
- `Chinese (Mandarin)_News_Anchor` (female)
- `Chinese (Mandarin)_Warm_Bestie`

**Japanese Voices:**
- `Japanese_Whisper_Belle`

**Legacy Voice IDs:**
- `male-qn-qingse` (default in MCP JS)
- `Wise_Woman`, `Friendly_Person`, `Deep_Voice_Man`
- `audiobook_female_1`, `cute_boy`, `Charming_Lady`

**Voice List API:**
To get all available voices, use:
```
GET https://api.minimax.io/v1/voices
Authorization: Bearer <API_KEY>
```

**Custom Voices:**
- Voice cloning endpoint: `POST /v1/voice_clone` (accepts 10s-5min audio clips in MP3/M4A/WAV)
- Voice design endpoint: `POST /v1/voice_design` (generate from text description)
- Cloned/designed voices expire if unused within **168 hours** (7 days)

**Mixed Voices:**
You can blend up to 4 voices using `timbre_weights` parameter with weight values 1-100.

### 1.6 Language Support

40 languages supported by speech-2.6-* models:

Chinese, English, Arabic, Russian, Spanish, French, Portuguese, German, Turkish, Dutch, Ukrainian, Vietnamese, Indonesian, Japanese, Italian, Korean, Thai, Polish, Romanian, Greek, Czech, Finnish, Hindi, Bulgarian, Danish, Hebrew, Malay, Persian, Slovak, Swedish, Croatian, Filipino, Hungarian, Norwegian, Slovenian, Catalan, Nynorsk, Tamil, Afrikaans

> The speech-2.6-* models added Filipino, Tamil, and Persian over the previous speech-02 models (24 languages).

### 1.7 Streaming

Set `"stream": true` in the request body. The response is delivered as **Server-Sent Events (SSE)** -- not WebSocket.

Each SSE event contains:
```
data: {"data":{"audio":"<hex-chunk>","status":1},"base_resp":{"status_code":0,"status_msg":"success"}}
```

The final event has `status: 2`.

**Key streaming considerations:**
- Audio is returned in hex-encoded PCM chunks
- Use `stream_options.exclude_aggregated_audio` to avoid receiving the full audio again at the end
- Only `hex` output format is supported in streaming mode (not `url`)
- `wav` format is not supported in streaming mode
- First byte latency: ~200ms (speech-2.6-turbo on Together AI)

**Stream processing pattern (Node.js):**

```javascript
function processEventData(eventData) {
  const dataMatch = eventData.match(/^data:\s*(.+)$/m);
  if (!dataMatch) return null;

  const parsed = JSON.parse(dataMatch[1].trim());

  if (parsed.base_resp?.status_code !== 0) {
    throw new Error(parsed.base_resp?.status_msg || "Unknown API error");
  }

  if (parsed.data.status === 1 && parsed.data.audio) {
    return Buffer.from(parsed.data.audio, "hex");
  }

  return null;
}
```

### 1.8 Advanced Features

**Pause Control:**
Insert `<#x#>` in text to add pauses (x = 0.01 to 99.99 seconds).
```
"Hello. <#2.5#> Welcome to the presentation."
```

**Interjections (speech-2.8 models only):**
Natural interjections like `(laughs)`, `(sighs)`, `(coughs)`, `(breath)` are supported.

**Pronunciation Dictionary:**
Define custom pronunciations via `pronunciation_dict` parameter for domain-specific terms.

**Subtitle Generation:**
Set `subtitle_enable: true` to receive word-level timestamps.

**Async Long TTS:**
For texts exceeding 10,000 characters, use the async endpoint:
- Submit: `POST /v1/t2a_async`
- Poll: `GET /v1/t2a_async/{task_id}`
- Supports unlimited text length

---

## 2. Music API (Music 2.5)

### 2.1 Endpoint & Authentication

| Detail | Value |
|--------|-------|
| **HTTP Method** | `POST` |
| **Endpoint** | `https://api.minimax.io/v1/music_generation` |
| **Authentication** | `Authorization: Bearer <API_KEY>` header |
| **Content-Type** | `application/json` |
| **Model** | `music-2.5` (current), `music-2.0` (legacy), `music-1.5` (legacy) |

### 2.2 Request Format

```json
{
  "model": "music-2.5",
  "prompt": "Pop, melancholic, piano-driven ballad, perfect for a rainy night",
  "lyrics": "[Verse]\nSide by side, through thick and thin\nWith a laugh, we always win\n[Chorus]\nStorms may come, but we stay true\nFriends forever, me and you",
  "stream": false,
  "output_format": "hex",
  "audio_setting": {
    "sample_rate": 44100,
    "bitrate": 256000,
    "format": "mp3"
  }
}
```

#### Parameter Reference

| Parameter | Type | Required | Range | Description |
|-----------|------|----------|-------|-------------|
| `model` | string | Yes | `music-2.5` | Model version |
| `lyrics` | string | Yes | 1-3500 chars | Song lyrics with optional structure tags, `\n` for line breaks |
| `prompt` | string | Optional | 0-2000 chars | Music style/mood/scene description |
| `stream` | boolean | No | -- | Enable streaming (default: false) |
| `output_format` | string | No | `hex` / `url` | Output mode (default: hex) |
| `audio_setting.sample_rate` | integer | No | 16000/24000/32000/44100 | Default: 32000 |
| `audio_setting.bitrate` | integer | No | 32000/64000/128000/256000 | Default: 128000 |
| `audio_setting.format` | string | No | `mp3`/`wav`/`pcm` | Default: mp3 |

**Best quality settings:** `sample_rate: 44100`, `bitrate: 256000`

### 2.3 Response Format

```json
{
  "data": {
    "audio": "<hex-encoded audio or URL>",
    "status": 2
  },
  "extra_info": {
    "music_duration": 245.5,
    "audio_sample_rate": 44100,
    "audio_size": 4923456,
    "audio_channel": 2
  },
  "trace_id": "<session-id>",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

**Status values:** `1` = in progress, `2` = completed

**URL output:** When `output_format: "url"`, the audio field contains a download URL valid for **24 hours**.

**Streaming constraint:** Streaming mode supports only `hex` output format.

### 2.4 Structure Tags

Music 2.5 supports **14 structural tags** to control song arrangement:

| Tag | Purpose |
|-----|---------|
| `[Intro]` | Opening section |
| `[Verse]` | Main verse |
| `[Pre Chorus]` | Build-up before chorus |
| `[Chorus]` | Main hook/chorus |
| `[Post Chorus]` | After chorus section |
| `[Bridge]` | Transitional section |
| `[Interlude]` | Instrumental break |
| `[Outro]` | Closing section |
| `[Hook]` | Catchy repeating element |
| `[Build Up]` | Increasing intensity |
| `[Break]` | Pause or drop |
| `[Transition]` | Smooth connection between sections |
| `[Inst]` | Instrumental section |
| `[Solo]` | Solo performance section |

### 2.5 Capabilities

- **Maximum Duration:** 5+ minutes (vs 60s in earlier models)
- **Instruments:** 100+ instruments supported
- **Vocal Quality:** Natural vibrato, chest-to-head resonance transitions, integrated breathing patterns
- **Language Strengths:** Excellent Chinese/Cantonese vocal performance; strong English support
- **Content Filtering:** Sensitive content detection with status code `1026`

---

## 3. Authentication & Account Setup

### Step-by-Step Setup

1. Register at [MiniMax Platform](https://platform.minimax.io/login)
2. Navigate to **Account Management > API Keys**
3. Create a new API key (choose "Pay-as-you-go" for speech/music access)
4. Add funds via **Billing/Balance** page
5. Set environment variables:

```bash
export MINIMAX_API_KEY="your-api-key-here"
# International:
export MINIMAX_API_HOST="https://api.minimax.io"
# China Mainland:
# export MINIMAX_API_HOST="https://api.minimaxi.chat"
```

### API Key Regions

| Region | API Host | Key Source |
|--------|----------|-----------|
| International | `https://api.minimax.io` | [platform.minimax.io](https://platform.minimax.io) |
| China Mainland | `https://api.minimaxi.chat` | [platform.minimaxi.com](https://platform.minimaxi.com) |

> Keys and hosts must match their region. Using a China key with the international host (or vice versa) returns `invalid api key`.

### GroupId

Some older endpoints and the China mainland API require a `GroupId` as a query parameter:
```
POST https://api.minimaxi.chat/v1/t2a_v2?GroupId=<your-group-id>
```
The GroupId is found under **Account > Basic Information** on the platform. The international endpoint (`api.minimax.io`) does not require GroupId.

---

## 4. Rate Limits

### Speech API

| Resource | Limit |
|----------|-------|
| RPM (Requests Per Minute) | 60 (default) |
| TPM (Tokens Per Minute) | 20,000 |
| Voice Cloning RPM | 60 |
| Voice Design RPM | 20 |

### Music API

| Resource | Limit |
|----------|-------|
| RPM | 120 |
| Concurrent Connections (CONN) | 20 |

### Subscription Tier RPM Overrides (Speech)

| Tier | RPM |
|------|-----|
| Starter ($5/mo) | 10 |
| Standard ($30/mo) | 50 |
| Pro ($99/mo) | 200 |
| Scale ($249/mo) | 500 |
| Business ($999/mo) | 800 |
| Custom | Unlimited |

### Error Codes for Rate Limiting

| Code | Meaning |
|------|---------|
| `1002` | Rate limit exceeded (RPM) |
| `1039` | TPM rate limit exceeded |

Contact `api@minimax.io` for higher limits.

---

## 5. Pricing

### Subscription Plans (Audio)

| Tier | Monthly Cost | Credits/Month | RPM |
|------|-------------|---------------|-----|
| Starter | $5 | 100,000 | 10 |
| Standard | $30 | 300,000 | 50 |
| Pro | $99 | 1,100,000 | 200 |
| Scale | $249 | 3,300,000 | 500 |
| Business | $999 | 20,000,000 | 800 |
| Custom | Contact sales | Unlimited | Unlimited |

**Discounts:**
- 3-month plans: 10% off
- Yearly plans: 20% off

### Pay-As-You-Go Estimates

| Service | Approximate Cost |
|---------|-----------------|
| Speech TTS | ~$30-100 per 1M characters (varies by model) |
| Music Generation | ~$0.10 per song (~100K credits = 100 songs for \u00a536/~$5) |

### File Storage

- Total capacity: 100 GB
- Max file size: 512 MB
- Generated audio URLs valid: 9 hours (speech), 24 hours (music)

---

## 6. SDKs & npm Packages

### Official: minimax-mcp-js

MCP (Model Context Protocol) server implementation. Not a direct API client library.

```bash
npm install minimax-mcp-js
# or
pnpm add minimax-mcp-js
```

**GitHub:** [MiniMax-AI/MiniMax-MCP-JS](https://github.com/MiniMax-AI/MiniMax-MCP-JS)

**Features:**
- Text-to-Speech (`text_to_audio` tool)
- Music Generation (`music_generation` tool) -- uses `music-1.5` model (not 2.5 yet)
- Voice Cloning (`voice_clone` tool)
- Voice Design (`voice_design` tool)
- Image Generation, Video Generation
- Supports stdio, REST, and SSE transport modes

**Environment Variables:**
```bash
MINIMAX_API_KEY=<your-key>
MINIMAX_API_HOST=https://api.minimax.chat  # or https://api.minimaxi.chat
MINIMAX_RESOURCE_MODE=url  # or "local"
MINIMAX_MCP_BASE_PATH=~/Desktop
MINIMAX_TRANSPORT_MODE=stdio  # or "rest" or "sse"
```

**MCP Client Config (Claude Desktop):**
```json
{
  "mcpServers": {
    "minimax-mcp-js": {
      "command": "npx",
      "args": ["-y", "minimax-mcp-js"],
      "env": {
        "MINIMAX_API_HOST": "https://api.minimax.chat",
        "MINIMAX_API_KEY": "<your-key>",
        "MINIMAX_MCP_BASE_PATH": "/path/to/output"
      }
    }
  }
}
```

> **Important limitation:** The MCP JS package currently defaults to `music-1.5` for music generation and `speech-02-hd` for TTS. It does NOT yet support `music-2.5` or `speech-2.6-*` models out of the box (see `src/const/index.ts`).

### Community: minimax-speech-ts

Full TypeScript SDK for the Speech API specifically. Covers all HTTP endpoints.

```bash
npm install minimax-speech-ts
```

**GitHub:** [williamchong/minimax-speech-ts](https://github.com/williamchong/minimax-speech-ts)
**API Docs:** [williamchong.github.io/minimax-speech-ts](https://williamchong.github.io/minimax-speech-ts/)

**Features:**
- Full Speech HTTP API coverage
- Streaming with `ReadableStream<Buffer>`
- Voice cloning, voice design, async synthesis, voice management
- Typed error classes (MiniMaxAuthError, MiniMaxRateLimitError, MiniMaxValidationError)
- CamelCase API with automatic snake_case conversion
- Single runtime dependency: `eventsource-parser`
- Dual ESM/CJS output

### Other Packages

| Package | Description |
|---------|-------------|
| `minimax-mcp-tools` | Async MCP server with rate limiting |
| `mcp-minimax-music-server` | Community MCP server for music generation |
| `minimax` (npm) | Official SDK (limited documentation) |

### Third-Party API Providers

| Provider | Models | URL |
|----------|--------|-----|
| Together AI | speech-2.6-turbo | [together.ai/models/minimax-speech-2-6-turbo](https://www.together.ai/models/minimax-speech-2-6-turbo) |
| fal.ai | speech-02-hd, music v1.5/v2 | [fal.ai/models/fal-ai/minimax-music](https://fal.ai/models/fal-ai/minimax-music) |
| AI/ML API | speech-2.6-hd, speech-2.6-turbo, music-2.0 | [docs.aimlapi.com](https://docs.aimlapi.com) |
| Replicate | speech-02 models | [replicate.com](https://replicate.com/blog/minimax-text-to-speech) |
| Segmind | music-01 | [segmind.com](https://www.segmind.com/models/minimax-music-01/api) |

---

## 7. Code Examples

### 7.1 Speech: Non-Streaming (cURL)

```bash
curl -X POST "https://api.minimax.io/v1/t2a_v2" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "speech-2.6-hd",
    "text": "Hello world, welcome to the future of speech synthesis.",
    "stream": false,
    "voice_setting": {
      "voice_id": "English_Graceful_Lady",
      "speed": 1.0,
      "vol": 1.0,
      "pitch": 0
    },
    "audio_setting": {
      "sample_rate": 32000,
      "bitrate": 128000,
      "format": "mp3",
      "channel": 1
    }
  }'
```

### 7.2 Speech: Non-Streaming (Node.js with fetch)

```javascript
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

async function textToSpeech(text, voiceId = "English_Graceful_Lady") {
  const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "speech-2.6-hd",
      text,
      stream: false,
      voice_setting: {
        voice_id: voiceId,
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
    }),
  });

  const result = await response.json();

  if (result.base_resp.status_code !== 0) {
    throw new Error(`API Error: ${result.base_resp.status_msg}`);
  }

  // Decode hex audio to buffer
  const audioBuffer = Buffer.from(result.data.audio, "hex");
  return audioBuffer;
}

// Usage
const audio = await textToSpeech("Hello, world!");
fs.writeFileSync("output.mp3", audio);
```

### 7.3 Speech: URL Output Mode (Node.js)

```javascript
async function textToSpeechUrl(text) {
  const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "speech-2.6-turbo",
      text,
      stream: false,
      output_format: "url",
      voice_setting: {
        voice_id: "English_Insightful_Speaker",
        speed: 1.0,
      },
      audio_setting: {
        format: "mp3",
      },
    }),
  });

  const result = await response.json();
  // result.data.audio contains a download URL (valid for 9 hours)
  return result.data.audio;
}
```

### 7.4 Speech: Streaming (Node.js)

```javascript
async function textToSpeechStream(text) {
  const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "speech-2.6-turbo",
      text,
      stream: true,
      voice_setting: {
        voice_id: "English_Graceful_Lady",
        speed: 1.0,
      },
      audio_setting: {
        format: "mp3",
        sample_rate: 32000,
        bitrate: 128000,
      },
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let eventEndIndex = buffer.indexOf("\n\n");

    while (eventEndIndex !== -1) {
      const event = buffer.substring(0, eventEndIndex).trim();
      buffer = buffer.substring(eventEndIndex + 2);

      const dataMatch = event.match(/^data:\s*(.+)$/m);
      if (dataMatch) {
        const parsed = JSON.parse(dataMatch[1]);

        if (parsed.base_resp?.status_code !== 0) {
          throw new Error(parsed.base_resp?.status_msg);
        }

        if (parsed.data.status === 1 && parsed.data.audio) {
          chunks.push(Buffer.from(parsed.data.audio, "hex"));
        }
      }

      eventEndIndex = buffer.indexOf("\n\n");
    }
  }

  return Buffer.concat(chunks);
}
```

### 7.5 Speech: Using minimax-speech-ts SDK

```typescript
import { MiniMaxSpeech } from "minimax-speech-ts";
import fs from "fs";

const client = new MiniMaxSpeech({
  apiKey: process.env.MINIMAX_API_KEY!,
  // groupId: process.env.MINIMAX_GROUP_ID, // needed for China endpoint
});

// Non-streaming
const result = await client.synthesize({
  text: "Hello, this is a test.",
  model: "speech-02-hd",
  voiceSetting: {
    voiceId: "English_Graceful_Lady",
    speed: 1.0,
    pitch: 0,
    emotion: "neutral",
  },
  languageBoost: "English",
});
await fs.promises.writeFile("output.mp3", result.audio);

// Streaming
const stream = await client.synthesizeStream({
  text: "Hello, this is a streaming test.",
  voiceSetting: { voiceId: "English_Graceful_Lady" },
  streamOptions: { excludeAggregatedAudio: true },
});
// Use stream as ReadableStream<Buffer>
```

### 7.6 Music: Generate a Song (Node.js)

```javascript
async function generateMusic(prompt, lyrics) {
  const response = await fetch("https://api.minimax.io/v1/music_generation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "music-2.5",
      prompt,
      lyrics,
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: "mp3",
      },
    }),
  });

  const result = await response.json();

  if (result.base_resp.status_code !== 0) {
    throw new Error(`API Error: ${result.base_resp.status_msg}`);
  }

  const audioBuffer = Buffer.from(result.data.audio, "hex");
  return audioBuffer;
}

// Usage
const lyrics = `[Verse]
Walking through the rain tonight
City lights reflecting bright
Every step I take alone
Leading me back to you

[Chorus]
Come back to me, under the stars
No matter how near or far
Come back to me, through the dark
You are my guiding spark`;

const prompt = "Pop ballad, emotional, piano and strings, rainy city atmosphere";
const music = await generateMusic(prompt, lyrics);
fs.writeFileSync("song.mp3", music);
```

### 7.7 Music: URL Output Mode

```javascript
async function generateMusicUrl(prompt, lyrics) {
  const response = await fetch("https://api.minimax.io/v1/music_generation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "music-2.5",
      prompt,
      lyrics,
      output_format: "url",
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: "mp3",
      },
    }),
  });

  const result = await response.json();
  // result.data.audio is a URL, valid for 24 hours
  return result.data.audio;
}
```

---

## 8. Error Handling

### Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | Success | -- |
| `1000` | Unknown error | Retry with backoff |
| `1001` | Timeout | Retry |
| `1002` | Rate limit exceeded (RPM) | Wait and retry |
| `1004` | Authentication failed | Check API key |
| `1008` | Insufficient balance | Add funds |
| `1026` | Sensitive content flagged | Modify content |
| `1039` | TPM rate limit exceeded | Wait and retry |
| `1042` | Invalid characters > 10% | Clean input text |
| `2013` | Invalid input parameters | Fix request body |

### Recommended Error Handling Pattern

```javascript
async function callMinimaxApi(endpoint, body) {
  const response = await fetch(`https://api.minimax.io${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  const statusCode = result.base_resp?.status_code;

  switch (statusCode) {
    case 0:
      return result;
    case 1002:
    case 1039:
      // Rate limited -- implement exponential backoff
      throw new RateLimitError(result.base_resp.status_msg);
    case 1004:
      throw new AuthError("Invalid API key or authentication failure");
    case 1008:
      throw new InsufficientBalanceError("Account balance too low");
    case 1026:
      throw new ContentPolicyError("Content flagged by safety filter");
    default:
      throw new ApiError(`API Error ${statusCode}: ${result.base_resp?.status_msg}`);
  }
}
```

---

## 9. Comparative Analysis

### Speech API vs Competitors

| Feature | MiniMax Speech 2.6 | ElevenLabs | OpenAI TTS |
|---------|-------------------|------------|------------|
| Voices | 300+ | 100+ | 6 |
| Languages | 40 | 32 | ~50 |
| Streaming | SSE (hex) | WebSocket | SSE |
| Latency (turbo) | ~200ms | ~300ms | ~500ms |
| Voice Cloning | Yes (10s-5min) | Yes | No |
| Emotion Control | 9 presets | Style controls | No |
| Max Chars/Request | 10,000 | 5,000 | 4,096 |
| Pricing (approx) | ~$30-100/1M chars | ~$30-330/1M chars | $15-30/1M chars |
| Voice Mixing | Up to 4 voices | No | No |

### Music API vs Competitors

| Feature | MiniMax Music 2.5 | Suno v3.5 | Udio |
|---------|-------------------|-----------|------|
| Max Duration | 5+ min | ~4 min | ~15 min |
| Structure Tags | 14 | Limited | Limited |
| Instruments | 100+ | Undefined | Undefined |
| API Available | Yes (REST) | Yes (REST) | No public API |
| Vocal Quality | Studio-grade | Good | Good |
| Asian Language Vocals | Excellent | Limited | Limited |
| Pricing | ~$0.10/song | ~$0.05-0.10/song | N/A |
| Output Formats | mp3/wav/pcm | mp3 | mp3 |

---

## 10. Implementation Recommendations

### For a Node.js/TypeScript Integration

1. **Direct HTTP approach (recommended for maximum control):** Use native `fetch` or `axios` to call the REST endpoints directly. This gives full control over model selection, parameters, and response handling.

2. **For Speech-only:** Consider `minimax-speech-ts` for typed client with streaming support, error classes, and clean API design.

3. **For MCP integration:** Use `minimax-mcp-js` as an MCP server if building AI agent tools.

### Quick Start Checklist

- [ ] Create MiniMax account at [platform.minimax.io](https://platform.minimax.io)
- [ ] Generate API key (Pay-as-you-go plan)
- [ ] Add initial balance/credits
- [ ] Set `MINIMAX_API_KEY` environment variable
- [ ] Test with a simple non-streaming speech request
- [ ] Test with a simple music generation request
- [ ] Implement error handling with status code mapping
- [ ] Add rate limit retry logic with exponential backoff

### Architecture Considerations

```
+---------------------+
|   Your Application  |
+----------+----------+
           |
           v
+----------+----------+
|   API Client Layer  |  <-- fetch/axios or minimax-speech-ts
|   - Rate limiting   |
|   - Error handling  |
|   - Retry logic     |
+----------+----------+
           |
           v
+----------+----------+
|  MiniMax REST API   |
|  /v1/t2a_v2         |  <-- Speech
|  /v1/music_generation|  <-- Music
+---------------------+
```

### Key Integration Decisions

| Decision | Recommendation |
|----------|---------------|
| Output format | Use `output_format: "url"` for large files to avoid memory issues with hex decoding |
| Streaming | Use streaming for real-time/interactive use cases; non-streaming for batch |
| Model choice (speech) | `speech-2.6-turbo` for low latency, `speech-2.6-hd` for quality |
| Audio format | `mp3` for general use; `wav` for post-processing; `pcm` for real-time pipelines |
| Sample rate | 32000 for speech; 44100 for music (studio quality) |

---

## 11. Common Pitfalls

1. **Mismatched API host and key region.** International keys do not work with China mainland endpoints and vice versa. The China endpoint has an extra "i": `api.minimaxi.chat` vs `api.minimax.io`.

2. **Hex decoding assumption.** Audio data is returned as hex-encoded strings (not base64). Use `Buffer.from(data, "hex")`, not `Buffer.from(data, "base64")`.

3. **WAV not supported in streaming.** Only `mp3`, `pcm`, and `flac` work with `stream: true`.

4. **URL expiry.** Speech audio URLs expire after 9 hours. Music URLs expire after 24 hours. Download promptly or use hex mode.

5. **Cloned voice expiry.** Custom cloned/designed voices expire after 168 hours (7 days) of inactivity.

6. **MCP JS model versions.** The official `minimax-mcp-js` defaults to `speech-02-hd` and `music-1.5`, not the latest `speech-2.6-*` or `music-2.5` models. You must override model parameters or modify the source.

7. **Music lyrics required.** The `music-2.5` model requires lyrics (1-3500 chars). You cannot generate purely instrumental music without at least providing `[Inst]` tags with placeholder text.

8. **Rate limit differences.** Music API allows 120 RPM but only 20 concurrent connections. Speech API allows 60 RPM by default but this can be increased via subscription.

9. **Large audio hex strings.** A 5-minute song at 256kbps returns a hex string of ~20MB. For large files, prefer `output_format: "url"`.

10. **Content filtering.** Both APIs have content safety filters. Status code `1026` indicates content was flagged. This cannot be bypassed.

---

## Resources & References

### Official Documentation
- [MiniMax API Platform](https://platform.minimax.io/)
- [Speech T2A Introduction](https://platform.minimax.io/docs/api-reference/speech-t2a-intro)
- [Speech T2A HTTP Endpoint](https://platform.minimax.io/docs/api-reference/speech-t2a-http)
- [Music Generation API](https://platform.minimax.io/docs/api-reference/music-generation)
- [API Overview](https://platform.minimax.io/docs/api-reference/api-overview)
- [Rate Limits](https://platform.minimax.io/docs/guides/rate-limits)
- [Audio Subscription Pricing](https://platform.minimax.io/docs/guides/pricing-speech)
- [Quickstart Preparation](https://platform.minimax.io/docs/guides/quickstart-preparation)
- [Voice Management](https://platform.minimax.io/docs/api-reference/voice-management-get)

### GitHub Repositories
- [MiniMax-MCP-JS (Official)](https://github.com/MiniMax-AI/MiniMax-MCP-JS) -- Official MCP JavaScript implementation
- [MiniMax-MCP (Official Python)](https://github.com/MiniMax-AI/MiniMax-MCP) -- Official MCP Python implementation
- [minimax-speech-ts](https://github.com/williamchong/minimax-speech-ts) -- Community TypeScript SDK
- [mcp-minimax-music-server](https://github.com/falahgs/mcp-minimax-music-server) -- Community MCP music server

### npm Packages
- [minimax-mcp-js](https://www.npmjs.com/package/minimax-mcp-js)
- [minimax-speech-ts](https://www.npmjs.com/package/minimax-speech-ts)
- [minimax-mcp-tools](https://www.npmjs.com/package/minimax-mcp-tools)

### Third-Party Integrations
- [Together AI - MiniMax Speech 2.6 Turbo](https://www.together.ai/models/minimax-speech-2-6-turbo)
- [fal.ai - MiniMax Music](https://fal.ai/models/fal-ai/minimax-music)
- [AI/ML API - Speech 2.6 HD](https://docs.aimlapi.com/api-references/speech-models/voice-chat/minimax/speech-2.6-hd)
- [Pipecat - MiniMax TTS Service](https://docs.pipecat.ai/server/services/tts/minimax)
- [Pricing Comparison](https://pricepertoken.com/pricing-page/provider/minimax)

### Blog Posts & Tutorials
- [Handling Minimax TTS API: Basic HTTP and Streaming](https://blog.williamchong.cloud/code/2025/06/21/handling-minimax-tts-api-basic-and-streaming.html)
- [Minimax TTS API Update: TypeScript SDK](https://blog.williamchong.cloud/code/2026/02/12/minimax-tts-api-improvements-eventsource-parser-and-sdk.html)
- [Building AI Apps with MiniMax API](https://minimax-ai.chat/guide/building-ai-apps-with-minimax-api/)
- [MiniMax Music 2.5 Complete Guide](https://gaga.art/blog/minimax-music-2-5/)

### Community Resources
- [MiniMax GitHub Organization](https://github.com/minimax-ai)
- Sales / Support: api@minimax.io

---

## Unresolved Questions

1. **Exact per-character pricing for pay-as-you-go speech.** The documentation shows subscription credit tiers but does not publish a clear per-character rate for the pay-as-you-go plan. Third-party estimates range from $30-100 per 1M characters.

2. **Music 2.5 instrumental-only generation.** It is unclear whether `music-2.5` can generate purely instrumental tracks without any lyrics. The API requires the `lyrics` field (1-3500 chars). Using only `[Inst]` tags may work but is not documented.

3. **Music 2.5 in MCP JS.** The official `minimax-mcp-js` package defaults to `music-1.5`. Whether upgrading to `music-2.5` is a simple model string change or requires API differences is not confirmed.

4. **GroupId requirement on international endpoint.** Older documentation references GroupId as required; newer docs for `api.minimax.io` omit it. Need to verify whether GroupId is truly optional on international endpoints.

5. **WebSocket support for streaming.** The official documentation mentions WebSocket for streaming speech synthesis in the API overview, but the HTTP endpoint documentation only describes SSE. The exact WebSocket endpoint and protocol are not documented.

6. **Concurrent request limits for speech.** The music API documents a `CONN: 20` concurrent connection limit, but no equivalent is documented for the speech API.
