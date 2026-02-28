# Research Report: ZhipuAI (Z.AI) GLM API -- Multimodal Capabilities

> **Date:** 2026-02-28
> **Sources consulted:** 25+
> **Scope:** Image Generation, Video Generation, Vision/Image Analysis, Audio/Speech Generation
> **Focus:** REST API (direct HTTP calls), no SDK dependency

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [General API Structure](#general-api-structure)
- [1. Image Generation (CogView / GLM-Image)](#1-image-generation-cogview--glm-image)
- [2. Video Generation (CogVideoX-3 / Vidu)](#2-video-generation-cogvideox-3--vidu)
- [3. Image Analysis / Vision (GLM-4.6V)](#3-image-analysis--vision-glm-46v)
- [4. Audio / Speech Generation (GLM-TTS)](#4-audio--speech-generation-glm-tts)
- [5. Audio Transcription (GLM-ASR) -- Bonus](#5-audio-transcription-glm-asr----bonus)
- [Pricing Summary](#pricing-summary)
- [Error Codes and Rate Limits](#error-codes-and-rate-limits)
- [Implementation Recommendations](#implementation-recommendations)
- [Resources and References](#resources-and-references)

---

## Executive Summary

ZhipuAI (branded as Z.AI internationally) provides a comprehensive multimodal API platform accessible via REST endpoints. The platform offers image generation (CogView-4, GLM-Image), video generation (CogVideoX-3, Vidu series), vision/image analysis (GLM-4.6V family), and text-to-speech (GLM-TTS). All endpoints follow OpenAI-compatible patterns with Bearer token auth and JSON payloads.

Two equivalent base URLs exist: `https://api.z.ai/api/paas/v4/` (international) and `https://open.bigmodel.cn/api/paas/v4/` (China mainland). Both serve the same API. Pricing is competitive -- image generation starts at $0.01/image, video at $0.20/video, vision models have a free tier (GLM-4.6V-Flash), and TTS pricing is not yet publicly listed on the English docs.

Key architectural note: Image and video generation are **asynchronous** -- submit a generation request, receive a task ID, then poll a separate endpoint for results. Vision and TTS are **synchronous** (standard request-response, with optional streaming).

---

## General API Structure

### Base URLs

| Region | Base URL |
|--------|----------|
| International | `https://api.z.ai/api/paas/v4/` |
| China Mainland | `https://open.bigmodel.cn/api/paas/v4/` |

Both URLs are functionally equivalent. Use the international URL for overseas access.

### Authentication

**Method:** HTTP Bearer Token

```
Authorization: Bearer YOUR_API_KEY
```

API keys are created at:
- International: https://z.ai (account > API Keys)
- China: https://open.bigmodel.cn (account > API Keys)

There is also a JWT-based auth option (split API key into ID + secret, sign with HS256), but Bearer token is simpler and sufficient for most use cases.

### Common Headers

```http
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
Accept-Language: en-US,en
```

### Common Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `request_id` | string | Client-generated unique request ID (6-128 chars) |
| `user_id` | string | End-user ID for content moderation tracking (6-128 chars) |

---

## 1. Image Generation (CogView / GLM-Image)

### Endpoint

```
POST https://api.z.ai/api/paas/v4/images/generations
```

### Available Models

| Model ID | Description | Cost |
|----------|-------------|------|
| `cogview-4-250304` | CogView-4, latest text-to-image, bilingual (EN/CN), text rendering in images | $0.01/image |
| `glm-image` | GLM-Image, hybrid autoregressive + diffusion, best for posters/illustrations | $0.015/image |
| `cogview-3-flash` | Older, faster model | (legacy) |

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model ID: `cogview-4-250304`, `glm-image`, etc. |
| `prompt` | string | Yes | Text description of desired image (EN or CN) |
| `size` | string | No | Image dimensions (see size tables below) |
| `quality` | string | No | `"hd"` (high quality, ~20s) or `"standard"` (~5-10s). Default varies by model. |
| `user_id` | string | No | End-user identifier |

### Supported Sizes

**CogView-4 (`cogview-4-250304`):**
- Presets: `1024x1024` (default), `768x1344`, `864x1152`, `1344x768`, `1152x864`, `1440x720`, `720x1440`
- Custom: width & height between 512px-2048px, divisible by 16, max pixel count 2^21

**GLM-Image (`glm-image`):**
- Presets: `1280x1280` (default), `1568x1056`, `1056x1568`, `1472x1088`, `1088x1472`, `1728x960`, `960x1728`
- Custom: width & height between 512px-2048px, divisible by 32, max pixel count 2^22

### Example Request

```bash
curl -X POST "https://api.z.ai/api/paas/v4/images/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "cogview-4-250304",
    "prompt": "A futuristic cityscape at sunset with flying cars, photorealistic style",
    "size": "1024x1024"
  }'
```

### Response Format

```json
{
  "created": 1760335349,
  "data": [
    {
      "url": "https://sfile.chatglm.cn/testpath/some-image-id.png"
    }
  ],
  "content_filter": [
    {
      "role": "assistant",
      "level": 0
    }
  ]
}
```

### Important Notes

- **Image URLs expire after 30 days** -- download and store immediately
- `content_filter[].level`: 0 = most severe filtering triggered, higher = less severe
- Response is synchronous -- the image URL is returned directly in the response
- CogView-4 excels at rendering text within images (both EN and CN characters)

---

## 2. Video Generation (CogVideoX-3 / Vidu)

### Endpoint (Submit Generation)

```
POST https://api.z.ai/api/paas/v4/videos/generations
```

### Endpoint (Poll Results)

```
GET https://api.z.ai/api/paas/v4/async-result/{id}
```

### Available Models

| Model ID | Type | Description | Cost | Duration |
|----------|------|-------------|------|----------|
| `cogvideox-3` | Text/Image/Frame-to-Frame | Flagship video gen, up to 4K 60fps | $0.20/video | 5s or 10s |
| `viduq1-text` | Text-to-Video | High consistency + dynamism | $0.40/video | 5s |
| `viduq1-image` | Image-to-Video | Single image animation | $0.40/video | 5s |
| `viduq1-start-end` | Frame-to-Frame | Start + end frame interpolation | $0.40/video | 5s |
| `vidu2-image` | Image-to-Video | Single image animation | $0.20/video | 4s |
| `vidu2-start-end` | Frame-to-Frame | Start + end frame interpolation | $0.20/video | 4s |
| `vidu2-reference` | Reference-based | 1-3 reference images | $0.40/video | 4s |

### Request Parameters (CogVideoX-3)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | `"cogvideox-3"` |
| `prompt` | string | Yes* | Text description (max 512 chars). *Required for text-to-video. |
| `image_url` | string/array | No | Image URL or base64. Single image for img-to-video; array of 2 for frame-to-frame. |
| `quality` | string | No | `"quality"` or `"speed"` (default: `"speed"`) |
| `size` | string | No | Resolution (see table below) |
| `fps` | integer | No | Frame rate: `30` or `60` (default: `30`) |
| `duration` | integer | No | Video duration: `5` or `10` seconds (default: `5`) |
| `with_audio` | boolean | No | Include AI-generated sound effects (default: `false`) |
| `request_id` | string | No | Client request ID |
| `user_id` | string | No | End-user ID |

### CogVideoX-3 Supported Sizes

`1280x720`, `720x1280`, `1024x1024`, `1920x1080`, `1080x1920`, `2048x1080`, `3840x2160`

### Request Parameters (Vidu Models)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Vidu model ID |
| `prompt` | string | Yes* | Text description |
| `image_url` | string/array | Depends | Single URL, array of 2 (start-end), or array of 1-3 (reference) |
| `style` | string | No | `"general"` or `"anime"` (viduq1-text only, default: `"general"`) |
| `movement_amplitude` | string | No | `"auto"`, `"small"`, `"medium"`, `"large"` (default: `"auto"`) |
| `aspect_ratio` | string | No | `"16:9"`, `"9:16"`, `"1:1"` (default: `"16:9"`) |
| `with_audio` | boolean | No | Include background music (default: `false`) |

### Image Input Constraints

- Formats: `.png`, `.jpeg`, `.jpg`, `.webp`
- Max size: 50MB
- Can be URL or base64-encoded string

### Example: Text-to-Video (CogVideoX-3)

```bash
curl -X POST "https://api.z.ai/api/paas/v4/videos/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "cogvideox-3",
    "prompt": "A golden retriever running through a field of sunflowers in slow motion",
    "quality": "quality",
    "size": "1920x1080",
    "fps": 30,
    "duration": 5,
    "with_audio": true
  }'
```

### Example: Image-to-Video (CogVideoX-3)

```bash
curl -X POST "https://api.z.ai/api/paas/v4/videos/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "cogvideox-3",
    "image_url": "https://example.com/photo.jpg",
    "prompt": "The scene comes alive with gentle movement",
    "quality": "quality",
    "size": "1920x1080",
    "fps": 30,
    "with_audio": false
  }'
```

### Example: Frame-to-Frame (CogVideoX-3)

```bash
curl -X POST "https://api.z.ai/api/paas/v4/videos/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "cogvideox-3",
    "image_url": ["https://example.com/start.jpg", "https://example.com/end.jpg"],
    "prompt": "Smooth transition between frames",
    "quality": "quality",
    "size": "1920x1080",
    "fps": 30
  }'
```

### Submit Response (All Video Models)

```json
{
  "model": "cogvideox-3",
  "id": "task_id_string",
  "request_id": "your_request_id",
  "task_status": "PROCESSING"
}
```

### Polling for Results

```bash
curl -X GET "https://api.z.ai/api/paas/v4/async-result/{task_id}" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Poll Response (Success)

```json
{
  "model": "cogvideox-3",
  "task_status": "SUCCESS",
  "video_result": [
    {
      "url": "https://sfile.chatglm.cn/testpath/video.mp4",
      "cover_image_url": "https://sfile.chatglm.cn/testpath/cover.jpg"
    }
  ],
  "request_id": "your_request_id"
}
```

### Task Status Values

| Status | Meaning |
|--------|---------|
| `PROCESSING` | Generation in progress, keep polling |
| `SUCCESS` | Complete, video URL available |
| `FAIL` | Generation failed |

### Important Notes

- Video generation is **asynchronous** -- submit, get task ID, poll until done
- Video/cover URLs **expire after 30 days**
- Recommended poll interval: start at 10s, use exponential backoff
- CogVideoX-3 supports up to 4K (3840x2160) at 60fps
- `with_audio` adds AI-generated sound effects/music

---

## 3. Image Analysis / Vision (GLM-4.6V)

### Endpoint

```
POST https://api.z.ai/api/paas/v4/chat/completions
```

Uses the same chat completions endpoint as text models, but with multimodal content in messages.

### Available Models

| Model ID | Parameters | Context | Cost (Input/Output per 1M tokens) | Notes |
|----------|------------|---------|------|-------|
| `glm-4.6v` | 106B/12B MoE | 128K | $0.30 / $0.90 | Flagship, highest performance, function calling |
| `glm-4.6v-flashx` | 106B/12B MoE | 128K | $0.04 / $0.40 | Lightweight, fast, affordable |
| `glm-4.6v-flash` | 106B/12B MoE | 128K | **Free** | Completely free tier |
| `glm-4.5v` | 106B/12B MoE | 128K | $0.60 / $1.80 | Previous gen, still capable |

### Supported Input Modalities

- **Images** (via URL in message content)
- **Video** (via URL in message content)
- **Text** (standard text messages)
- **Files** (documents, PDFs)

### Output Modality

- **Text only** (analysis, descriptions, answers, coordinates)

### Request Format

```bash
curl -X POST "https://api.z.ai/api/paas/v4/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
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
            "text": "Describe what you see in this image in detail."
          }
        ]
      }
    ],
    "stream": false
  }'
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Vision model ID |
| `messages` | array | Yes | Array of message objects with multimodal content |
| `stream` | boolean | No | Enable streaming response (default: `false`) |
| `temperature` | float | No | Sampling temperature |
| `max_tokens` | integer | No | Max output tokens (up to 16K for GLM-4.5V) |
| `thinking` | object | No | Enable extended reasoning: `{"type": "enabled"}` |

### Message Content Types

```json
// Text content
{
  "type": "text",
  "text": "Your question here"
}

// Image via URL
{
  "type": "image_url",
  "image_url": {
    "url": "https://example.com/image.png"
  }
}
```

### Response Format

```json
{
  "id": "chatcmpl-xxxxx",
  "object": "chat.completion",
  "created": 1760335349,
  "model": "glm-4.6v",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The image shows a scenic mountain landscape with..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 1024,
    "completion_tokens": 256,
    "total_tokens": 1280
  }
}
```

### Key Capabilities

- **Scene understanding**: Describe images, identify objects, spatial reasoning
- **Multi-image analysis**: Send multiple images in one request for comparison
- **Object grounding**: Returns bounding box coordinates `[[xmin, ymin, xmax, ymax]]`
- **Video understanding**: Long video segmentation, event recognition
- **GUI tasks**: Screen reading, icon recognition, desktop operation assistance
- **Document parsing**: Charts, tables, long documents with visual elements
- **Function calling**: GLM-4.6V supports native tool use / function calling
- **Extended reasoning**: Enable `thinking` mode for step-by-step visual reasoning

### Example: Image Analysis with Thinking

```bash
curl -X POST "https://api.z.ai/api/paas/v4/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "glm-4.6v",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/chart.png"
            }
          },
          {
            "type": "text",
            "text": "Analyze this chart and provide the key insights."
          }
        ]
      }
    ],
    "thinking": {"type": "enabled"},
    "stream": false
  }'
```

### Important Notes

- Uses the standard chat completions endpoint (OpenAI-compatible pattern)
- Images are passed as URLs within the message content array
- `glm-4.6v-flash` is **completely free** -- excellent for development/testing
- Streaming is supported for all vision models
- Max output is 16K tokens for GLM-4.5V

---

## 4. Audio / Speech Generation (GLM-TTS)

### Endpoint

```
POST https://api.z.ai/api/paas/v4/audio/speech
```

> **Note:** TTS docs are currently more detailed on the Chinese docs site (`docs.bigmodel.cn`).
> The English `docs.z.ai` site does not yet have a dedicated TTS API reference page.

### Available Model

| Model ID | Description | Cost |
|----------|-------------|------|
| `glm-tts` | Industrial-grade TTS, zero-shot voice cloning, emotional expression | Not publicly listed on English docs |

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | `"glm-tts"` |
| `input` | string | Yes | Text to synthesize |
| `voice` | string | No | Voice character ID (default: `"female"`) |
| `speed` | float | No | Playback speed, range 0.5-2.0 (default: `1.0`) |
| `volume` | float | No | Volume level, range 0-10 (default: `1.0`) |
| `response_format` | string | No | Output format: `"wav"` or `"pcm"` |
| `stream` | boolean | No | Enable streaming response |
| `encode_format` | string | No | Encoding for streamed content: `"base64"` |

### Available Voices

| Voice ID | Description |
|----------|-------------|
| `tongtong` | Default female voice |
| `xiaochen` | Alternative voice |
| `chuichui` | Alternative voice |
| `jam` | Alternative voice |
| `kazi` | Alternative voice |
| `douji` | Alternative voice |
| `luodo` | Alternative voice |

### Supported Languages

- Chinese (primary, highest quality)
- English
- Chinese-English mixed text
- Sichuan and Northeastern Chinese dialects

### Example: Non-Streaming TTS

```bash
curl -X POST "https://api.z.ai/api/paas/v4/audio/speech" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "glm-tts",
    "input": "Hello, this is a test of the GLM text-to-speech system.",
    "voice": "tongtong",
    "speed": 1.0,
    "volume": 5,
    "response_format": "wav"
  }' \
  --output speech.wav
```

### Example: Streaming TTS

```bash
curl -X POST "https://api.z.ai/api/paas/v4/audio/speech" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "glm-tts",
    "input": "This is streaming text-to-speech output.",
    "voice": "tongtong",
    "speed": 1.0,
    "volume": 5,
    "response_format": "pcm",
    "stream": true,
    "encode_format": "base64"
  }'
```

### Key Characteristics

- **Sample rate:** 24000 Hz
- **First-frame latency:** ~400ms in streaming mode
- **Architecture:** LLM (text -> speech tokens) + Flow Matching (tokens -> audio waveform)
- **Voice cloning:** Capable of zero-shot voice cloning from ~3 seconds of reference audio
- **Emotional expression:** Automatically adjusts prosody/emotion based on text context

### Important Notes

- Non-streaming returns a complete audio file (WAV)
- Streaming returns base64-encoded PCM chunks via Server-Sent Events
- Chinese text quality is significantly better than English
- The `voice` parameter accepts voice IDs; `"female"` maps to `"tongtong"`
- Voice cloning capabilities may require additional API parameters (not fully documented in English docs)

---

## 5. Audio Transcription (GLM-ASR) -- Bonus

Included for completeness since it complements the TTS capability.

### Endpoint

```
POST https://api.z.ai/api/paas/v4/audio/transcriptions
```

### Model

| Model ID | Description | Cost |
|----------|-------------|------|
| `glm-asr-2512` | Speech-to-text, multilingual, streaming support | $0.03/M tokens (~$0.0024/min) |

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | binary | Yes* | Audio file (.wav/.mp3, max 25MB, max 30s) |
| `file_base64` | string | Alt* | Base64-encoded audio (alternative to `file`) |
| `model` | string | Yes | `"glm-asr-2512"` |
| `prompt` | string | No | Previous transcription context (max ~8000 chars) |
| `hotwords` | array | No | Domain-specific vocabulary (max 100 items) |
| `stream` | boolean | No | Streaming response (default: `false`) |

### Supported Languages

Chinese (Mandarin + dialects: Sichuanese, Cantonese, Min Nan, Wu), English (American, British accents), French, German, Japanese, Korean, Spanish, Arabic, and dozens more.

---

## Pricing Summary

| Capability | Model | Cost |
|------------|-------|------|
| **Image Gen** | cogview-4-250304 | $0.01 / image |
| **Image Gen** | glm-image | $0.015 / image |
| **Video Gen** | cogvideox-3 | $0.20 / video |
| **Video Gen** | vidu2-image, vidu2-start-end | $0.20 / video |
| **Video Gen** | vidu2-reference | $0.40 / video |
| **Video Gen** | viduq1-text, viduq1-image, viduq1-start-end | $0.40 / video |
| **Vision** | glm-4.6v | $0.30 in / $0.90 out per 1M tokens |
| **Vision** | glm-4.6v-flashx | $0.04 in / $0.40 out per 1M tokens |
| **Vision** | glm-4.6v-flash | **FREE** |
| **Vision** | glm-4.5v | $0.60 in / $1.80 out per 1M tokens |
| **TTS** | glm-tts | Not publicly listed (English docs) |
| **ASR** | glm-asr-2512 | $0.03 per 1M tokens |

All prices in USD.

---

## Error Codes and Rate Limits

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Parameter or file content error |
| 401 | Authentication failure or token expired |
| 404 | Feature unavailable or task not found |
| 429 | Rate limit exceeded, account issue, or balance exhausted |
| 434 | API permission denied (beta/restricted feature) |
| 435 | File exceeds 100MB limit |
| 500 | Server error |

### Business Error Codes

| Code | Category | Description |
|------|----------|-------------|
| 1000-1004 | Auth | Failed authentication, missing headers, invalid/expired tokens |
| 1110-1121 | Account | Inactive accounts, arrears, locked, irregular activity |
| 1210-1234 | API Call | Invalid parameters, non-existent models, missing fields |
| 1301 | Content | Potentially unsafe or sensitive content detected |
| 1302 | Rate | High concurrency usage |
| 1303 | Rate | High frequency usage |
| 1304 | Rate | Daily call limit reached |
| 1305 | Rate | Rate limit triggered |
| 1308 | Rate | Usage limit exhausted (returns reset timestamp) |
| 1310 | Rate | Weekly/monthly limits exceeded |

### Error Response Format

```json
{
  "error": {
    "code": 1305,
    "message": "Rate limit exceeded. Please retry after a short delay."
  }
}
```

### Rate Limit Notes

Specific numeric rate limits (RPM/TPM) are **not publicly documented**. The API returns error codes 1302-1310 when limits are hit. Recommended approach: implement exponential backoff retry logic.

---

## Implementation Recommendations

### Quick Start Checklist

1. Register at https://z.ai (international) or https://open.bigmodel.cn (China)
2. Create an API key in the dashboard
3. Use `https://api.z.ai/api/paas/v4/` as base URL
4. Set `Authorization: Bearer YOUR_API_KEY` header on all requests

### Recommended Models by Use Case

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| Image generation (general) | `cogview-4-250304` | Latest, best quality, cheapest |
| Image generation (text in images) | `cogview-4-250304` | Excellent EN/CN text rendering |
| Image generation (posters/illustrations) | `glm-image` | Better for complex layouts |
| Video from text | `cogvideox-3` | Flagship, up to 4K, 60fps |
| Video from image | `cogvideox-3` or `vidu2-image` | CogVideoX for quality, Vidu for cost |
| Video frame interpolation | `cogvideox-3` | Best start/end frame support |
| Image analysis (production) | `glm-4.6v` | Highest accuracy, function calling |
| Image analysis (budget) | `glm-4.6v-flashx` | Good balance of cost/quality |
| Image analysis (dev/testing) | `glm-4.6v-flash` | Free |
| Text-to-speech | `glm-tts` | Only option, good quality for CN |

### Async Workflow Pattern (Video Generation)

```
1. POST /videos/generations
   -> Returns { "id": "task_123", "task_status": "PROCESSING" }

2. Poll: GET /async-result/task_123
   -> { "task_status": "PROCESSING" }  // retry after delay

3. Poll: GET /async-result/task_123
   -> { "task_status": "SUCCESS", "video_result": [{"url": "...", "cover_image_url": "..."}] }

4. Download video from URL (expires in 30 days)
```

### Common Pitfalls

1. **Expired URLs**: Image and video URLs expire after 30 days. Download and store them immediately.
2. **Content filtering**: The API actively filters unsafe content. Error code 1301 means content was blocked.
3. **Size constraints**: Image dimensions must be divisible by 16 (CogView) or 32 (GLM-Image). Non-conforming sizes cause 400 errors.
4. **Video is async**: Unlike image generation (which returns URLs synchronously), video generation requires polling.
5. **Chinese-first TTS**: GLM-TTS quality is significantly better for Chinese text than English.
6. **No explicit rate limits published**: Implement exponential backoff; the API will tell you (via 1302-1305) when to slow down.

---

## Resources and References

### Official Documentation
- [Z.AI Developer Docs (English)](https://docs.z.ai/)
- [Z.AI API Reference - Introduction](https://docs.z.ai/api-reference/introduction)
- [Z.AI HTTP API Guide](https://docs.z.ai/guides/develop/http/introduction)
- [Zhipu AI Open Platform (Chinese)](https://open.bigmodel.cn/dev/api)
- [Z.AI Pricing](https://docs.z.ai/guides/overview/pricing)
- [Z.AI Error Codes](https://docs.z.ai/api-reference/api-code)

### Image Generation
- [CogView-4 Guide](https://docs.z.ai/guides/image/cogview-4)
- [GLM-Image Guide](https://docs.z.ai/guides/image/glm-image)
- [Generate Image API Reference](https://docs.z.ai/api-reference/image/generate-image)
- [CogView4 GitHub](https://github.com/zai-org/CogView4)

### Video Generation
- [CogVideoX-3 Guide](https://docs.z.ai/guides/video/cogvideox-3)
- [Generate Video API Reference](https://docs.z.ai/api-reference/video/generate-video)
- [Retrieve Video Result API](https://docs.z.ai/api-reference/video/get-video-status)
- [CogVideo GitHub](https://github.com/zai-org/CogVideo)

### Vision / Image Analysis
- [GLM-4.6V Guide](https://docs.z.ai/guides/vlm/glm-4.6v)
- [GLM-4.5V Guide](https://docs.z.ai/guides/vlm/glm-4.5v)
- [Chat Completion API Reference](https://docs.z.ai/api-reference/llm/chat-completion)

### Audio / TTS
- [GLM-TTS Guide (Chinese)](https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts)
- [GLM-TTS GitHub](https://github.com/zai-org/GLM-TTS)
- [GLM-TTS Demo](https://audio.z.ai/)
- [Audio Transcription API Reference](https://docs.z.ai/api-reference/audio/audio-transcriptions)

### SDKs (for reference only)
- [Python SDK](https://github.com/zai-org/z-ai-sdk-python)
- [Node.js SDK](https://github.com/MetaGLM/zhipuai-sdk-nodejs-v4)
- [Java SDK](https://github.com/MetaGLM/zhipuai-sdk-python-v4)

---

## Unresolved Questions

1. **GLM-TTS pricing**: Not listed on the English docs pricing page. May need to check the Chinese pricing page at `bigmodel.cn/pricing` or contact sales.
2. **Exact rate limits**: No numeric RPM/TPM values published. Only error codes indicate when limits are hit.
3. **Voice cloning API**: GLM-TTS supports zero-shot voice cloning, but the REST API parameters for providing reference audio are not documented in the English docs.
4. **Base64 image input for vision**: The docs show URL-based image submission for GLM-4.6V. Base64 encoding support is confirmed for video generation image inputs but not explicitly documented for vision models.
5. **GLM-TTS on `api.z.ai`**: The TTS endpoint is confirmed on `open.bigmodel.cn`. Whether `api.z.ai/api/paas/v4/audio/speech` is fully equivalent has not been independently verified, though all other endpoints are confirmed equivalent.
