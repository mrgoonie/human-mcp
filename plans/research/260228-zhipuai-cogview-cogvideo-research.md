# Research Report: ZhipuAI / GLM / Z.AI Multimedia API Capabilities

**Date:** 2026-02-28
**Researcher:** Claude Opus 4.6
**Sources consulted:** 25+
**Date range of materials:** 2024 - February 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Overview](#platform-overview)
3. [Authentication & Base URLs](#authentication--base-urls)
4. [CogView - Image Generation](#cogview---image-generation)
5. [GLM-Image - Image Generation](#glm-image---image-generation)
6. [CogVideoX - Video Generation](#cogvideox---video-generation)
7. [GLM Vision Models - Image Understanding](#glm-vision-models---image-understanding)
8. [GLM-TTS - Text-to-Speech](#glm-tts---text-to-speech)
9. [GLM-ASR - Speech-to-Text](#glm-asr---speech-to-text)
10. [Pricing Summary](#pricing-summary)
11. [SDKs & Packages](#sdks--packages)
12. [OpenAI Compatibility](#openai-compatibility)
13. [Implementation Recommendations](#implementation-recommendations)
14. [Resources & References](#resources--references)

---

## Executive Summary

ZhipuAI (Z.AI) offers a comprehensive multimedia AI platform with APIs for image generation (CogView-4, GLM-Image), video generation (CogVideoX-3), vision/image understanding (GLM-4.6V series), text-to-speech (GLM-TTS), and speech-to-text (GLM-ASR-2512). The platform provides two base URLs: `https://open.bigmodel.cn/api/paas/v4` (China/legacy) and `https://api.z.ai/api/paas/v4` (international/new). The API is OpenAI-compatible for chat completions, making integration straightforward.

Key findings: CogView-4 costs only $0.01/image. CogVideoX-3 supports up to 4K resolution at $0.20/video. GLM-4.6V-Flash is entirely free. GLM-TTS provides 7 built-in voices with streaming support. An official Node.js SDK (`zhipuai-sdk-nodejs-v4`) exists but has limited multimedia support -- for image/video/audio operations, direct HTTP calls are recommended.

---

## Platform Overview

ZhipuAI (branded as Z.AI internationally) is a Chinese AI company that operates an open API platform offering:

| Category | Models | Count |
|----------|--------|-------|
| Text/LLM | GLM-5, GLM-4.7, GLM-4.6, GLM-4.5 series | 11+ |
| Vision/VLM | GLM-4.6V, GLM-4.5V, GLM-OCR | 5 |
| Image Generation | CogView-4, GLM-Image | 2 |
| Video Generation | CogVideoX-3, ViduQ1, Vidu2 | 3 |
| Audio (ASR) | GLM-ASR-2512 | 1 |
| Audio (TTS) | GLM-TTS | 1 |

---

## Authentication & Base URLs

### Base URLs

| Purpose | URL |
|---------|-----|
| Standard (International) | `https://api.z.ai/api/paas/v4` |
| Standard (China/Legacy) | `https://open.bigmodel.cn/api/paas/v4` |
| Coding Plan | `https://api.z.ai/api/coding/paas/v4` |

### Authentication

Two methods supported:

**1. API Key (Simple)**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**2. JWT Token (Advanced)**
API keys follow a two-part format `{id}.{secret}`. Use PyJWT or equivalent to generate a JWT token from these components for enhanced security.

### Getting an API Key

1. Register at [Z.AI Open Platform](https://z.ai/model-api) or [bigmodel.cn](https://open.bigmodel.cn/)
2. Top up account via billing page
3. Generate API key from API Keys management page

---

## CogView - Image Generation

### Overview

CogView-4 is Z.AI's latest open-source text-to-image model (6B parameters). Supports native Chinese and English input, bilingual text rendering in generated images. Based on Diffusion Transformer architecture.

### API Endpoint

```
POST https://api.z.ai/api/paas/v4/images/generations
```
or (China):
```
POST https://open.bigmodel.cn/api/paas/v4/images/generations
```

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | string | Yes | - | `cogview-4-250304` or `cogview-4` |
| `prompt` | string | Yes | - | Text description, bilingual CN/EN, any length |
| `size` | string | No | `1024x1024` | Image dimensions (see supported sizes) |
| `quality` | string | No | `standard` | `standard` (5-10s) or `hd` (~20s) |
| `user_id` | string | No | - | End-user ID, 6-128 chars |

### Supported Sizes (CogView-4)

**Recommended enum values:**
- `1024x1024` (default, 1:1)
- `768x1344` (portrait)
- `864x1152` (portrait)
- `1344x768` (landscape)
- `1152x864` (landscape)
- `1440x720` (wide)
- `720x1440` (tall)

**Custom sizes:**
- Width and height: 512px - 2048px
- Must be divisible by 16
- Maximum pixel count: 2^21 px (2,097,152 pixels)

### Response Format

```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://... (temporary link, expires in 30 days)"
    }
  ],
  "content_filter": [
    {
      "role": "user",
      "level": 3
    }
  ]
}
```

Content filter levels: 0 (most severe) to 3 (least severe / safe).

### Example: cURL

```bash
curl -X POST "https://api.z.ai/api/paas/v4/images/generations" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cogview-4-250304",
    "prompt": "A serene mountain landscape at sunset with a lake reflection",
    "size": "1344x768"
  }'
```

### Example: Python

```python
from zai import ZaiClient

client = ZaiClient(api_key="YOUR_API_KEY")
response = client.images.generations(
    model="cogview-4-250304",
    prompt="A serene mountain landscape at sunset"
)
print(response.data[0].url)
```

### Example: Node.js (Direct HTTP)

```javascript
const response = await fetch('https://api.z.ai/api/paas/v4/images/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'cogview-4-250304',
    prompt: 'A serene mountain landscape at sunset',
    size: '1024x1024'
  })
});
const data = await response.json();
// data.data[0].url contains the image URL
```

### Available CogView Models

| Model ID | Notes |
|----------|-------|
| `cogview-4-250304` | Latest CogView-4 release |
| `cogview-4` | Alias for latest CogView-4 |
| `cogview-3-flash` | Older, faster model (legacy) |

### Pricing

**$0.01 per image**

---

## GLM-Image - Image Generation

### Overview

GLM-Image is a 16B parameter hybrid model (9B autoregressive + 7B DiT diffusion decoder). Excels at knowledge-intensive and complex instruction scenarios. Industry-leading text rendering in images (91.16% word accuracy on CVTG-2K).

### API Endpoint

Same endpoint as CogView:
```
POST https://api.z.ai/api/paas/v4/images/generations
```

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | string | Yes | - | `glm-image` |
| `prompt` | string | Yes | - | Text description |
| `size` | string | No | `1280x1280` | Image dimensions |
| `quality` | string | No | `hd` | `hd` or `standard` |
| `user_id` | string | No | - | End-user ID |

### Supported Sizes (GLM-Image)

**Recommended:**
- `1280x1280` (default, 1:1)
- `1568x1056` (3:2 landscape)
- `1056x1568` (2:3 portrait)
- `1472x1088` (~4:3 landscape)
- `1088x1472` (~3:4 portrait)
- `1728x960` (16:9 wide)
- `960x1728` (9:16 tall)

**Custom sizes:**
- Width and height: 1024px - 2048px
- Must be divisible by 32
- Maximum pixel count: 2^22 px (4,194,304 pixels)

### Example

```bash
curl -X POST "https://api.z.ai/api/paas/v4/images/generations" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-image",
    "prompt": "A poster with the text HELLO WORLD in bold letters",
    "size": "1280x1280"
  }'
```

### Pricing

**$0.015 per image** (2 free generations included)

### When to Use GLM-Image vs CogView-4

| Feature | GLM-Image | CogView-4 |
|---------|-----------|-----------|
| Text rendering in images | Excellent (91% accuracy) | Good |
| Chinese text in images | Yes | Yes (first open-source) |
| Knowledge-intensive prompts | Better | Good |
| Cost | $0.015/image | $0.01/image |
| Resolution range | 1024-2048px | 512-2048px |
| Parameter count | 16B | 6B |

---

## CogVideoX - Video Generation

### Overview

CogVideoX-3 is Z.AI's latest video generation model. Supports text-to-video, image-to-video, and first+last frame interpolation. Up to 4K resolution (3840x2160), optional AI audio, 5-10 second duration.

### API Endpoint (Async - Submit Task)

```
POST https://api.z.ai/api/paas/v4/videos/generations
```

### API Endpoint (Retrieve Result)

```
GET https://api.z.ai/api/paas/v4/async-result/{id}
```

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | string | Yes | - | `cogvideox-3` |
| `prompt` | string | No* | - | Text description, max 512 chars |
| `image_url` | string/array | No* | - | Image URL(s) or base64. PNG/JPEG/JPG, max 5MB. 1-2 images (first/last frames) |
| `quality` | string | No | `speed` | `speed` (faster, lower quality) or `quality` (slower, higher quality) |
| `with_audio` | boolean | No | `false` | Generate AI sound effects |
| `size` | string | No | - | Resolution (see supported sizes) |
| `fps` | integer | No | `30` | Frame rate: `30` or `60` |
| `duration` | integer | No | `5` | Video length in seconds: `5` or `10` |
| `request_id` | string | No | - | Tracking identifier |
| `user_id` | string | No | - | End-user ID, 6-128 chars |

*Either `prompt` or `image_url` required (or both).

**Note:** First+last frame mode only works with `quality: "speed"`.

### Supported Resolutions

| Size | Aspect Ratio |
|------|-------------|
| `1280x720` | 16:9 |
| `720x1280` | 9:16 |
| `1024x1024` | 1:1 |
| `1920x1080` | 16:9 HD |
| `1080x1920` | 9:16 HD |
| `2048x1080` | ~2:1 ultrawide |
| `3840x2160` | 16:9 4K |

### Submit Response

```json
{
  "model": "cogvideox-3",
  "id": "task_order_id_here",
  "request_id": "user_request_id",
  "task_status": "PROCESSING"
}
```

### Poll for Result

```
GET https://api.z.ai/api/paas/v4/async-result/{id}
Authorization: Bearer YOUR_API_KEY
```

**Response when complete:**
```json
{
  "model": "cogvideox-3",
  "task_status": "SUCCESS",
  "video_result": [
    {
      "url": "https://... (video file URL)",
      "cover_image_url": "https://... (thumbnail URL)"
    }
  ],
  "request_id": "..."
}
```

**Task status values:**
- `PROCESSING` - Still generating
- `SUCCESS` - Complete, video_result available
- `FAIL` - Error occurred

### Example: Text-to-Video

```bash
# Step 1: Submit task
curl -X POST "https://api.z.ai/api/paas/v4/videos/generations" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cogvideox-3",
    "prompt": "A cat playing with a ball in a sunny garden",
    "quality": "quality",
    "with_audio": true,
    "size": "1920x1080",
    "fps": 30,
    "duration": 5
  }'

# Step 2: Poll for result (use the "id" from step 1)
curl "https://api.z.ai/api/paas/v4/async-result/TASK_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Example: Image-to-Video

```json
{
  "model": "cogvideox-3",
  "image_url": "https://example.com/photo.jpg",
  "prompt": "Make the scene come alive with gentle movement",
  "quality": "quality",
  "with_audio": true,
  "size": "1920x1080",
  "fps": 30
}
```

### Example: First & Last Frame Interpolation

```json
{
  "model": "cogvideox-3",
  "image_url": [
    "https://example.com/first-frame.jpg",
    "https://example.com/last-frame.jpg"
  ],
  "prompt": "Smooth transition between the two scenes",
  "quality": "speed",
  "with_audio": true,
  "size": "1920x1080",
  "fps": 30
}
```

### Example: Node.js Polling Implementation

```javascript
async function generateVideo(apiKey, prompt) {
  // Submit
  const submitRes = await fetch('https://api.z.ai/api/paas/v4/videos/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'cogvideox-3',
      prompt,
      quality: 'quality',
      with_audio: true,
      size: '1920x1080',
      fps: 30,
      duration: 5
    })
  });
  const { id } = await submitRes.json();

  // Poll
  while (true) {
    const pollRes = await fetch(`https://api.z.ai/api/paas/v4/async-result/${id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const result = await pollRes.json();

    if (result.task_status === 'SUCCESS') {
      return result.video_result[0]; // { url, cover_image_url }
    }
    if (result.task_status === 'FAIL') {
      throw new Error('Video generation failed');
    }
    await new Promise(r => setTimeout(r, 5000)); // wait 5s
  }
}
```

### Pricing

**$0.20 per video** (CogVideoX-3)

---

## GLM Vision Models - Image Understanding

### Overview

GLM-4.6V is Z.AI's flagship vision-language model (VLM). 128K context window, supports image/video/text/file inputs. Features native function calling for multimodal tool use. The GLM-4.6V-Flash variant is entirely free.

### API Endpoint

Uses the standard chat completions endpoint:
```
POST https://api.z.ai/api/paas/v4/chat/completions
```

### Available Vision Models

| Model | Context | Input Types | Cost (per 1M tokens) | Notes |
|-------|---------|-------------|----------------------|-------|
| `glm-4.6v` | 128K | Image, Video, Text, File | $0.30 in / $0.90 out | Flagship, highest perf |
| `glm-4.6v-FlashX` | 128K | Image, Video, Text, File | $0.04 in / $0.40 out | Lightweight, fast |
| `glm-4.6v-Flash` | 128K | Image, Video, Text, File | **FREE** | Lightweight, free |
| `glm-4.5v` | 128K | Image, Video, Text, File | $0.60 in / $1.80 out | Previous gen |

### Message Format for Vision

The content field uses an array format to mix text and media:

```json
{
  "model": "glm-4.6v",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/photo.jpg"
          }
        },
        {
          "type": "text",
          "text": "Describe what you see in this image."
        }
      ]
    }
  ]
}
```

### Supported Content Types in Messages

| Type | Format | Constraints |
|------|--------|-------------|
| `text` | `{"type": "text", "text": "..."}` | Standard text |
| `image_url` | `{"type": "image_url", "image_url": {"url": "..."}}` | JPEG/PNG, <5MB, max 6000x6000px |
| `video_url` | `{"type": "video_url", "video_url": {"url": "..."}}` | MP4/MKV/MOV, <200MB (glm-4.6v/4.5v only) |
| `file_url` | `{"type": "file_url", "file_url": {"url": "..."}}` | PDF/TXT/Word/JSONL/XLSX/PPTX, max 50 files |

### Image Input Methods

**1. Via URL:**
```json
{
  "type": "image_url",
  "image_url": {
    "url": "https://example.com/image.jpg"
  }
}
```

**2. Via Base64:**
```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/jpeg;base64,/9j/4AAQ..."
  }
}
```

**Note:** `glm-4.6v-Flash` does NOT support base64 encoding. Use URL method only.

### Example: Analyze Image (Node.js)

```javascript
const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-4.6v',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: 'https://example.com/photo.jpg' }
        },
        {
          type: 'text',
          text: 'Describe this image in detail.'
        }
      ]
    }],
    max_tokens: 1024
  })
});
const data = await response.json();
// data.choices[0].message.content contains the description
```

### Example: Image with Base64 (Python)

```python
import base64
from zai import ZaiClient

def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

client = ZaiClient(api_key="YOUR_API_KEY")
b64 = encode_image("photo.jpg")

response = client.chat.completions.create(
    model="glm-4.6v",
    messages=[{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            {"type": "text", "text": "What is in this image?"}
        ]
    }]
)
print(response.choices[0].message.content)
```

### Chat Completions Full Parameter Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | glm-5 | Model identifier |
| `messages` | array | Required | Conversation with roles: user, system, assistant, tool |
| `stream` | boolean | false | Enable SSE streaming |
| `temperature` | number | 0.6-1.0 | Range [0.0, 1.0], controls randomness |
| `top_p` | number | 0.6-0.95 | Range [0.01, 1.0], nucleus sampling |
| `max_tokens` | integer | - | Output limit: 16K-128K depending on model |
| `tools` | array | - | Function definitions for tool calling |
| `tool_choice` | string | auto | Tool selection strategy |
| `do_sample` | boolean | true | Disable to override temperature/top_p |
| `response_format` | object | text | `text` or `json_object` |
| `stop` | array | - | Single stop word |
| `thinking` | object | - | Chain-of-thought (GLM-4.5+) |
| `request_id` | string | - | Tracking identifier |
| `user_id` | string | - | 6-128 chars |

### Response Format

```json
{
  "id": "task_id",
  "request_id": "...",
  "created": 1234567890,
  "model": "glm-4.6v",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "The image shows..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

---

## GLM-TTS - Text-to-Speech

### Overview

GLM-TTS is an industrial-grade TTS system. Two-stage architecture: LLM converts text to speech tokens (prosody/emotion), then Flow Matching model generates audio waveforms. Zero-shot voice cloning with 3-10 seconds of prompt audio.

### API Endpoint

```
POST https://open.bigmodel.cn/api/paas/v4/audio/speech
```

**Note:** As of Feb 2026, TTS may not yet be available on the `api.z.ai` domain. Use `open.bigmodel.cn` endpoint.

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | string | Yes | - | `glm-tts` |
| `input` | string | Yes | - | Text to synthesize, max 1024 chars |
| `voice` | string | Yes | - | Voice/speaker selection |
| `response_format` | string | No | `pcm` | `wav` or `pcm` |
| `speed` | number | No | `1.0` | Range [0.5, 2.0] |
| `volume` | number | No | `5` | Range (0, 10] |
| `stream` | boolean | No | `false` | Enable streaming mode |
| `encode_format` | string | No | - | `base64` or `hex` (streaming only) |
| `watermark_enabled` | boolean | No | - | Add AI content watermark |

### Available Voices

| Voice ID | Description |
|----------|-------------|
| `tongtong` | Default voice |
| `xiaochen` | - |
| `chuichui` | - |
| `jam` | - |
| `kazi` | - |
| `douji` | - |
| `luodo` | - |

### Response Format

**Non-streaming:** Returns JSON with audio data:
```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://... (audio file URL)"
    }
  ]
}
```

**Streaming:** Returns PCM audio chunks. First-frame latency ~400ms. Sample rate: 24000Hz.

### Example: cURL

```bash
curl -X POST "https://open.bigmodel.cn/api/paas/v4/audio/speech" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-tts",
    "input": "Hello, how is the weather today?",
    "voice": "tongtong",
    "response_format": "wav",
    "speed": 1.0,
    "volume": 5
  }'
```

### Example: Node.js

```javascript
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/audio/speech', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-tts',
    input: 'Hello, this is a test of text to speech.',
    voice: 'tongtong',
    response_format: 'wav',
    speed: 1.0,
    volume: 5
  })
});
const data = await response.json();
// data.data[0].url contains the audio file URL
```

### Pricing

Pricing not explicitly listed on Z.AI pricing page. Third-party proxy indicates ~$0.03 per 1000 characters.

---

## GLM-ASR - Speech-to-Text

### Overview

GLM-ASR-2512 is Z.AI's speech recognition model. Supports Mandarin (with dialects), English (multiple accents), French, German, Japanese, Korean, Spanish, Arabic, and more. Character Error Rate as low as 0.0717.

### API Endpoint

```
POST https://api.z.ai/api/paas/v4/audio/transcriptions
```

### Request Parameters (multipart/form-data)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | string | Yes | - | `glm-asr-2512` |
| `file` | binary | Yes* | - | Audio file, .wav or .mp3, max 25MB, max 30s |
| `file_base64` | string | No* | - | Base64-encoded audio (alternative to file) |
| `stream` | boolean | No | `false` | Enable streaming transcription |
| `prompt` | string | No | - | Previous context for long-form, <8000 chars |
| `hotwords` | array | No | - | Domain vocabulary, max 100 items |
| `request_id` | string | No | - | Tracking ID |
| `user_id` | string | No | - | 6-128 chars |

*Either `file` or `file_base64` required.

### Response Format

**Non-streaming:**
```json
{
  "id": "task_id",
  "created": 1234567890,
  "request_id": "...",
  "model": "glm-asr-2512",
  "text": "The complete transcribed content of the audio"
}
```

**Streaming (SSE):**
```json
{"type": "transcript.text.delta", "delta": "partial text..."}
{"type": "transcript.text.done", "delta": "final text"}
```

### Pricing

**$0.03 per 1M tokens** (~$0.0024/minute)

---

## Pricing Summary

| Model | Type | Price |
|-------|------|-------|
| **CogView-4** | Image generation | $0.01 / image |
| **GLM-Image** | Image generation | $0.015 / image |
| **CogVideoX-3** | Video generation | $0.20 / video |
| **ViduQ1** | Video generation (theatrical) | $0.40 / video |
| **GLM-4.6V** | Vision understanding | $0.30 in / $0.90 out per 1M tokens |
| **GLM-4.6V-FlashX** | Vision understanding | $0.04 in / $0.40 out per 1M tokens |
| **GLM-4.6V-Flash** | Vision understanding | **FREE** |
| **GLM-TTS** | Text-to-speech | ~$0.03 / 1K chars |
| **GLM-ASR-2512** | Speech-to-text | $0.03 / 1M tokens (~$0.0024/min) |

Free tiers: GLM-4.7-Flash and GLM-4.5-Flash (text) are free. GLM-4.6V-Flash (vision) is free.

---

## SDKs & Packages

### Official SDKs

| SDK | Package | Install |
|-----|---------|---------|
| Python (Z.AI) | `zai-sdk` | `pip install zai-sdk` |
| Python (Legacy) | `zhipuai` | `pip install zhipuai` |
| Node.js | `zhipuai-sdk-nodejs-v4` | `npm install zhipuai-sdk-nodejs-v4` |
| Java | `ai.z.openapi:zai-sdk` | Maven/Gradle |

### Node.js SDK Details

**Package:** `zhipuai-sdk-nodejs-v4`
**GitHub:** https://github.com/MetaGLM/zhipuai-sdk-nodejs-v4
**Requirements:** Node.js 14+
**Dependencies:** axios, jsonwebtoken

```javascript
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';

const ai = new ZhipuAI({
  apiKey: 'your_api_key',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  timeout: 30000,
  cacheToken: true
});

// Chat completions
const result = await ai.createCompletions({
  model: 'glm-4',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false
});

// Image generation
const imgResult = await ai.createImages({
  model: 'cogview-4-250304',
  prompt: 'A beautiful landscape'
});
```

**Limitation:** The Node.js SDK primarily documents chat completions. For image generation, video generation, and audio operations, direct HTTP calls are more reliable. The SDK may have `createImages` and `createEmbeddings` methods, but video and audio methods are not well-documented.

### Vercel AI SDK Provider

**Package:** `zhipu-ai-provider`
**Install:** `npm i zhipu-ai-provider`

```typescript
import { zhipu } from 'zhipu-ai-provider';

// Uses ZHIPU_API_KEY env var by default
const { text } = await generateText({
  model: zhipu('glm-4-plus'),
  prompt: 'Why is the sky blue?'
});

// Custom configuration (Z.AI endpoint)
import { createZhipu } from 'zhipu-ai-provider';
const zhipuCustom = createZhipu({
  baseURL: 'https://api.z.ai/api/paas/v4',
  apiKey: 'your-api-key'
});
```

**Note:** The Vercel AI SDK provider supports text and embedding models. It does not support image/video/audio operations.

---

## OpenAI Compatibility

ZhipuAI's chat completions API is OpenAI-compatible. To migrate from OpenAI:

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_ZHIPUAI_KEY',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4'
  // or: 'https://api.z.ai/api/paas/v4'
});

// Works with standard OpenAI chat completions
const response = await client.chat.completions.create({
  model: 'glm-4.6v',
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: 'https://example.com/img.jpg' } },
      { type: 'text', text: 'What is this?' }
    ]
  }]
});

// Image generation also works
const image = await client.images.generate({
  model: 'cogview-4-250304',
  prompt: 'A landscape painting'
});
```

**Compatible operations:**
- Chat completions (text + vision)
- Image generation
- Embeddings

**NOT compatible via OpenAI SDK:**
- Video generation (async/polling pattern)
- TTS (different response format)
- ASR (multipart/form-data)

---

## Implementation Recommendations

### For a Node.js/TypeScript Project

1. **Use direct HTTP calls** for image, video, and audio APIs (the Node.js SDK lacks comprehensive multimedia support)
2. **Use the OpenAI SDK** for chat completions and vision tasks (simpler, well-documented)
3. **Implement polling helper** for async video generation
4. **Download generated media promptly** -- image URLs expire after 30 days

### Recommended Architecture

```
ZhipuAI API Client
├── Chat/Vision (OpenAI SDK compatible)
│   ├── GLM-4.6V (image understanding)
│   ├── GLM-4.6V-Flash (free tier)
│   └── GLM-5 / GLM-4.7 (text only)
├── Image Generation (direct HTTP)
│   ├── CogView-4 ($0.01/img)
│   └── GLM-Image ($0.015/img, better text)
├── Video Generation (direct HTTP + polling)
│   └── CogVideoX-3 ($0.20/video)
├── TTS (direct HTTP)
│   └── GLM-TTS (7 voices)
└── ASR (direct HTTP, multipart)
    └── GLM-ASR-2512
```

### Common Pitfalls

1. **Two base URLs**: `open.bigmodel.cn` (China) vs `api.z.ai` (international). TTS may only work on `open.bigmodel.cn` currently.
2. **Async video generation**: Do not expect synchronous response. Must poll `async-result/{id}`.
3. **GLM-4.6V-Flash lacks base64**: Only accepts image URLs, not base64-encoded images.
4. **Image URL expiry**: Generated image URLs expire after 30 days. Download and store.
5. **CogVideoX first+last frame**: Only works with `quality: "speed"` mode, not `quality: "quality"`.
6. **Model naming inconsistency**: Some models use dots (glm-4.6v), others use dashes (cogview-4-250304). Always check exact model ID.

---

## Resources & References

### Official Documentation
- [Z.AI Developer Documentation](https://docs.z.ai/guides/overview/overview) -- English, international
- [Zhipu AI Open Platform (bigmodel.cn)](https://open.bigmodel.cn/dev/api) -- Chinese, requires JS
- [Z.AI Pricing](https://docs.z.ai/guides/overview/pricing)
- [Z.AI Quick Start](https://docs.z.ai/guides/overview/quick-start)

### API References
- [Image Generation API](https://docs.z.ai/api-reference/image/generate-image)
- [Video Generation API](https://docs.z.ai/api-reference/video/generate-video)
- [Video Result Retrieval](https://docs.z.ai/api-reference/video/get-video-status)
- [Chat Completions API](https://docs.z.ai/api-reference/llm/chat-completion)
- [Audio Transcription API](https://docs.z.ai/api-reference/audio/audio-transcriptions)
- [CogView-4 Guide](https://docs.z.ai/guides/image/cogview-4)
- [GLM-Image Guide](https://docs.z.ai/guides/image/glm-image)
- [CogVideoX-3 Guide](https://docs.z.ai/guides/video/cogvideox-3)
- [GLM-4.6V Guide](https://docs.z.ai/guides/vlm/glm-4.6v)

### GitHub Repositories
- [Node.js SDK](https://github.com/MetaGLM/zhipuai-sdk-nodejs-v4) -- `zhipuai-sdk-nodejs-v4`
- [Python SDK (Legacy)](https://github.com/MetaGLM/zhipuai-sdk-python-v4) -- `zhipuai`
- [Python SDK (Z.AI)](https://github.com/zai-org/z-ai-sdk-python) -- `zai-sdk`
- [Vercel AI SDK Provider](https://github.com/Xiang-CH/zhipu-ai-provider) -- `zhipu-ai-provider`
- [CogView4 (open source model)](https://github.com/zai-org/CogView4)
- [CogVideo (open source model)](https://github.com/zai-org/CogVideo)
- [GLM-V (open source model)](https://github.com/zai-org/GLM-V)
- [GLM-Image (open source model)](https://github.com/zai-org/GLM-Image)
- [GLM-TTS (open source model)](https://github.com/zai-org/GLM-TTS)
- [GLM Cookbook (examples)](https://github.com/MetaGLM/glm-cookbook)

### Community Resources
- [Vercel AI SDK Zhipu Provider Docs](https://ai-sdk.dev/providers/community-providers/zhipu)
- [Spring AI ZhipuAI Integration](https://docs.spring.io/spring-ai/reference/api/image/zhipuai-image.html)
- [Portkey ZhipuAI Integration](https://portkey.ai/docs/integrations/llms/zhipu)
- [Zhipu Image MCP Server](https://playbooks.com/mcp/nanguangchou/zhipu_image_mcp)

---

## Unresolved Questions

1. **TTS on api.z.ai**: The `docs.z.ai` site does not document a TTS endpoint. TTS may only be available via `open.bigmodel.cn/api/paas/v4/audio/speech`. Needs verification.
2. **Node.js SDK multimedia**: The SDK's `createImages` method exists but video/audio methods are undocumented. May need to inspect SDK source for full API surface.
3. **GLM-TTS pricing**: Not listed on the official Z.AI pricing page. Third-party sources suggest ~$0.03/1K chars but this needs confirmation.
4. **Rate limits**: No documented rate limits found for any API. May need to contact ZhipuAI support or test empirically.
5. **Voice cloning via API**: GLM-TTS supports zero-shot voice cloning locally, but API parameters for custom voice prompts are not documented in the cloud API.
