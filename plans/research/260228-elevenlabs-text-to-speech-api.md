# Research Report: ElevenLabs Text-to-Speech REST API

**Research Date:** 2026-02-28
**Researcher:** Claude Opus 4.6
**Purpose:** Provide implementation-ready technical reference for building a direct HTTP client integration with the ElevenLabs TTS API (no SDK).

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Methodology](#research-methodology)
3. [Authentication](#1-authentication)
4. [TTS Endpoints](#2-tts-endpoints)
5. [Available Models](#3-available-models)
6. [Voices](#4-voices)
7. [Request Parameters](#5-request-parameters-full-reference)
8. [Response Format](#6-response-format)
9. [Rate Limits and Concurrency](#7-rate-limits-and-concurrency)
10. [Character and Text Limits](#8-character-and-text-limits)
11. [Language Support](#9-language-support)
12. [Pricing Summary](#10-pricing-summary)
13. [Implementation Recommendations](#implementation-recommendations)
14. [Code Examples](#code-examples)
15. [Common Pitfalls](#common-pitfalls)
16. [Resources and References](#resources-and-references)
17. [Unresolved Questions](#unresolved-questions)

---

## Executive Summary

ElevenLabs provides a REST API for converting text to speech with multiple models, voices, and output formats. Authentication uses the `xi-api-key` header. The primary TTS endpoint is `POST /v1/text-to-speech/{voice_id}` (non-streaming) and `POST /v1/text-to-speech/{voice_id}/stream` (streaming via chunked transfer encoding). Both endpoints accept the same request body and return audio bytes.

Key models include **Eleven v3** (newest, 70+ languages, audio tags for emotion control), **Eleven Flash v2.5** (ultra-low latency ~75ms, 32 languages), **Eleven Turbo v2.5** (balanced quality/speed, 32 languages), and **Eleven Multilingual v2** (high quality, 29 languages). Character limits per request vary by model: 40,000 for Flash/Turbo v2.5, 10,000 for Multilingual v2, and 3,000 for v3.

Concurrency limits range from 2 (Free) to 15 (Scale/Business). The default output format is `mp3_44100_128`, with support for MP3, PCM, WAV, Opus, u-law, and a-law at various sample rates and bitrates. The API returns binary audio data (`application/octet-stream`) on success.

---

## Research Methodology

- **Sources consulted:** 15+ (official ElevenLabs docs, help center, blog posts, third-party guides, LLM-friendly endpoint specs)
- **Date range of materials:** 2024 to February 2026
- **Key search terms:** ElevenLabs API, text-to-speech, REST endpoint, authentication, models, voice_settings, output_format, rate limits, character limits, language support
- **Primary authoritative sources:** elevenlabs.io/docs/api-reference/*, help.elevenlabs.io, elevenlabs.io/blog

---

## 1. Authentication

### API Key Authentication (Primary)

All API requests require the `xi-api-key` HTTP header.

| Header | Value |
|--------|-------|
| `xi-api-key` | `<your-api-key>` |

**How to obtain:** Generate an API key from the ElevenLabs dashboard at https://elevenlabs.io. Each key can have:
- **Scope restrictions** -- limit which endpoints are accessible
- **Custom credit quotas** -- control consumption per key

**Security:** The API key is a secret. Never expose it in client-side code or public repositories.

### Alternative: Single-Use Tokens

For client-side usage where exposing the API key is unacceptable, ElevenLabs supports single-use tokens:
- Valid for a limited time
- Suitable for browser-based or mobile applications
- Passed via `token` query parameter instead of header

### Server URLs

| Region | Base URL |
|--------|----------|
| Default | `https://api.elevenlabs.io` |
| US | `https://api.us.elevenlabs.io` |
| EU (residency) | `https://api.eu.residency.elevenlabs.io` |
| India (residency) | `https://api.in.residency.elevenlabs.io` |

---

## 2. TTS Endpoints

### Non-Streaming: Create Speech

Converts text to speech and returns the complete audio file.

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

- **Content-Type:** `application/json`
- **Response:** Complete binary audio file (`application/octet-stream`)
- Waits for full generation before returning the response

### Streaming: Stream Speech

Converts text to speech and returns audio as a chunked stream.

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream
```

- **Content-Type:** `application/json`
- **Response:** Chunked transfer encoding of raw audio bytes
- Audio playback can begin before full generation completes
- Reduces time-to-first-audio significantly

**Both endpoints accept identical path parameters, query parameters, and request bodies.** The only difference is the response delivery mechanism.

---

## 3. Available Models

### Active Models

| Model ID | Name | Languages | Max Chars/Request | Latency | Quality | Credit Cost |
|----------|------|-----------|-------------------|---------|---------|-------------|
| `eleven_v3` | Eleven v3 | 70+ | 3,000 | Medium | Highest | 1 credit/char |
| `eleven_flash_v2_5` | Eleven Flash v2.5 | 32 | 40,000 | Ultra-low (~75ms) | High | 0.5 credits/char |
| `eleven_turbo_v2_5` | Eleven Turbo v2.5 | 32 | 40,000 | Low | High | 0.5 credits/char |
| `eleven_multilingual_v2` | Eleven Multilingual v2 | 29 | 10,000 | Medium | Very High | 1 credit/char |
| `eleven_flash_v2` | Eleven Flash v2 | 32 | 40,000 | Ultra-low | High | 0.5 credits/char |
| `eleven_turbo_v2` | Eleven Turbo v2 | 32 | 30,000 | Low | High | 0.5 credits/char |
| `eleven_monolingual_v1` | Eleven Monolingual v1 | 1 (English) | 10,000 | Medium | Good | 1 credit/char |
| `eleven_multilingual_v1` | Eleven Multilingual v1 | ~10 | 10,000 | Medium | Good | 1 credit/char |

### Model Selection Guide

- **Best overall quality + emotion control:** `eleven_v3` -- supports audio tags like `[excited]`, `[whispers]`, `[sighs]` inline with text for directing emotional delivery. Also supports multi-speaker dialogue mode.
- **Best for real-time/low-latency:** `eleven_flash_v2_5` -- generates speech in under 75ms, ideal for conversational AI and real-time applications.
- **Best balance quality/speed:** `eleven_turbo_v2_5` -- good quality with low latency, supports 32 languages.
- **Best quality for standard TTS:** `eleven_multilingual_v2` -- most life-like, emotionally rich speech for 29 languages. **Default model** when `model_id` is not specified.
- **Deprecated/Legacy:** `eleven_turbo_v2` (use Flash v2 instead), `eleven_monolingual_v1`, `eleven_multilingual_v1`.

### Eleven v3 Audio Tags (Unique Feature)

Audio tags are inline directives in square brackets that v3 interprets:
```
[excited] I can't believe we won the championship! [sighs] It's been such a long journey.
```
Tags can be emotions (`[excited]`, `[sad]`), actions (`[whispers]`, `[sighs]`), or sound effects (`[gunshot]`, `[clapping]`).

**Limitation:** Professional Voice Clones (PVCs) are not fully optimized for v3 yet. Use Instant Voice Clones (IVC) or designed voices with v3.

---

## 4. Voices

### List Voices Endpoint

```
GET https://api.elevenlabs.io/v2/voices
```

**Headers:**
```
xi-api-key: <your-api-key>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_size` | integer | 10 | Max voices returned (max: 100) |
| `next_page_token` | string | - | Pagination token from previous response |
| `search` | string | - | Filter by name, description, labels, category |
| `sort` | string | - | Sort by `created_at_unix` or `name` |
| `sort_direction` | string | - | `asc` or `desc` |
| `voice_type` | string | - | `personal`, `community`, `default`, `workspace`, `non-default`, `saved` |
| `category` | string | - | `premade`, `cloned`, `generated`, `professional` |
| `fine_tuning_state` | string | - | `draft`, `queued`, `fine_tuning`, `fine_tuned`, `failed`, `delayed` |
| `collection_id` | string | - | Filter by collection |
| `include_total_count` | boolean | true | Include total count in response |
| `voice_ids` | string | - | Lookup specific voice IDs (max 100, comma-separated) |

**Response (200):**

```json
{
  "voices": [
    {
      "voice_id": "JBFqnCBsd6RMkjVDRZzb",
      "name": "Rachel",
      "category": "premade",
      "labels": { "accent": "american", "gender": "female", "age": "young" },
      "description": "...",
      "preview_url": "https://...",
      "settings": { "stability": 0.5, "similarity_boost": 0.75 },
      "fine_tuning": { ... },
      "samples": [ ... ],
      "verified_languages": [ ... ],
      "available_for_tiers": [ ... ],
      "sharing": { ... },
      "safety_control": null,
      "is_owner": false,
      "created_at_unix": 1234567890
    }
  ],
  "has_more": true,
  "total_count": 150,
  "next_page_token": "abc123..."
}
```

### Get Single Voice

```
GET https://api.elevenlabs.io/v1/voices/{voice_id}
```

### Finding Voice IDs

1. **Via API:** Call the List Voices endpoint above
2. **Via Website:** Voice Lab in the ElevenLabs dashboard shows voice IDs
3. **Pre-made voices:** ElevenLabs provides ~10,000+ community and pre-made voices

### Voice Categories

| Category | Description |
|----------|-------------|
| `premade` | ElevenLabs-provided voices, immediately available |
| `cloned` | Instant Voice Clones from user audio samples |
| `professional` | Professional Voice Clones (higher quality, requires training) |
| `generated` | Voices created via Voice Design |

---

## 5. Request Parameters (Full Reference)

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `voice_id` | string | **Yes** | ID of the voice to use |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `output_format` | string | `mp3_44100_128` | Audio output format (see Output Formats below) |
| `optimize_streaming_latency` | integer | - | 0-4: higher = more optimization, potentially lower quality. **Deprecated** in favor of model-based latency. |
| `enable_logging` | boolean | `true` | Set `false` for zero-retention mode (enterprise only) |

### Request Body (JSON)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | **Yes** | - | Text to convert to speech |
| `model_id` | string | No | `eleven_multilingual_v2` | Model identifier (see Models section) |
| `language_code` | string | No | - | ISO 639-1 language code (e.g., `en`, `es`, `fr`). Auto-detected if omitted. |
| `voice_settings` | object | No | - | Per-request voice parameter overrides |
| `pronunciation_dictionary_locators` | array | No | - | Max 3 pronunciation dictionary locators |
| `seed` | integer | No | - | Range: 0-4294967295. For deterministic output. |
| `previous_text` | string | No | - | Text context before current chunk (for continuity) |
| `next_text` | string | No | - | Text context after current chunk (for continuity) |
| `previous_request_ids` | array | No | - | Max 3 request IDs for conditioning on prior audio |
| `next_request_ids` | array | No | - | Max 3 request IDs for conditioning on future audio |
| `use_pvc_as_ivc` | boolean | No | `false` | Use PVC as IVC fallback for lower latency |
| `apply_text_normalization` | string | No | `auto` | Options: `auto`, `on`, `off` |
| `apply_language_text_normalization` | boolean | No | `false` | Language-specific normalization (e.g., Japanese); increases latency |

### Voice Settings Object

```json
{
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0.0,
  "use_speaker_boost": true,
  "speed": 1.0
}
```

| Field | Type | Range | Default | Description |
|-------|------|-------|---------|-------------|
| `stability` | float | 0.0 - 1.0 | ~0.5 | Higher = more consistent/monotonic; Lower = more expressive/variable |
| `similarity_boost` | float | 0.0 - 1.0 | ~0.75 | Higher = closer to original voice; Lower = more creative variation |
| `style` | float | 0.0+ | 0.0 | Style exaggeration. Higher = more expressive but may reduce stability. Recommended: keep under 0.5 |
| `use_speaker_boost` | boolean | - | true | Boosts similarity to original speaker. Increases latency slightly. |
| `speed` | float | 0.5 - 2.0 | 1.0 | Speech speed multiplier. 1.0 = normal speed. |

**Note:** Voice settings override stored voice defaults. If omitted, the voice's saved settings are used.

---

## 6. Response Format

### Success Response (HTTP 200)

- **Content-Type:** `application/octet-stream`
- **Body:** Raw binary audio data in the requested `output_format`

For the **non-streaming** endpoint, the entire audio file is returned at once.
For the **streaming** endpoint, audio is delivered via chunked transfer encoding.

### Error Responses

| HTTP Status | Meaning |
|-------------|---------|
| 401 | Invalid/missing API key, or quota exceeded |
| 422 | Validation error (invalid parameters, text too long, etc.) -- returns JSON with details |
| 429 | Rate limit or concurrency limit exceeded |

### Output Format Options

Format pattern: `codec_samplerate_bitrate`

**MP3 Formats:**

| Format | Sample Rate | Bitrate | Tier Required |
|--------|-------------|---------|---------------|
| `mp3_22050_32` | 22.05 kHz | 32 kbps | Free |
| `mp3_24000_48` | 24 kHz | 48 kbps | Free |
| `mp3_44100_32` | 44.1 kHz | 32 kbps | Free |
| `mp3_44100_64` | 44.1 kHz | 64 kbps | Free |
| `mp3_44100_96` | 44.1 kHz | 96 kbps | Free |
| `mp3_44100_128` | 44.1 kHz | 128 kbps | Free (**default**) |
| `mp3_44100_192` | 44.1 kHz | 192 kbps | Creator+ |

**PCM Formats (S16LE, raw):**

| Format | Sample Rate | Tier Required |
|--------|-------------|---------------|
| `pcm_8000` | 8 kHz | Free |
| `pcm_16000` | 16 kHz | Free |
| `pcm_22050` | 22.05 kHz | Free |
| `pcm_24000` | 24 kHz | Free |
| `pcm_32000` | 32 kHz | Free |
| `pcm_44100` | 44.1 kHz | Pro+ |
| `pcm_48000` | 48 kHz | Pro+ |

**WAV Formats:**

| Format | Sample Rate | Tier Required |
|--------|-------------|---------------|
| `wav_8000` | 8 kHz | Free |
| `wav_16000` | 16 kHz | Free |
| `wav_22050` | 22.05 kHz | Free |
| `wav_24000` | 24 kHz | Free |
| `wav_32000` | 32 kHz | Free |
| `wav_44100` | 44.1 kHz | Pro+ |
| `wav_48000` | 48 kHz | Pro+ |

**Opus Formats:**

| Format | Sample Rate | Bitrate |
|--------|-------------|---------|
| `opus_48000_32` | 48 kHz | 32 kbps |
| `opus_48000_64` | 48 kHz | 64 kbps |
| `opus_48000_96` | 48 kHz | 96 kbps |
| `opus_48000_128` | 48 kHz | 128 kbps |
| `opus_48000_192` | 48 kHz | 192 kbps |

**Legacy/Telephony Formats:**

| Format | Sample Rate | Use Case |
|--------|-------------|----------|
| `ulaw_8000` | 8 kHz | Twilio-compatible |
| `alaw_8000` | 8 kHz | Telephony systems |

---

## 7. Rate Limits and Concurrency

### Concurrency Limits (Concurrent Parallel Requests)

| Plan | Concurrent TTS Requests |
|------|------------------------|
| Free | 2 |
| Starter | 3 |
| Creator | 5 |
| Pro | 10 |
| Scale | 15 |
| Business | 15 |
| Enterprise | Custom (contact sales) |

### Rate Limit Behavior

- Exceeding concurrency returns **HTTP 429**
- Recommended handling: exponential backoff with retry
- A concurrency limit of 5 can typically support ~100 simultaneous audio broadcasts
- For higher limits, contact ElevenLabs Enterprise department

### Response Headers for Rate Limiting

When you receive a 429, implement exponential backoff:
```
Wait 1s -> retry -> Wait 2s -> retry -> Wait 4s -> retry -> ...
```

---

## 8. Character and Text Limits

### Per-Request Limits (API)

| Model | Max Characters per Request |
|-------|---------------------------|
| `eleven_flash_v2_5` | 40,000 |
| `eleven_turbo_v2_5` | 40,000 |
| `eleven_flash_v2` | 40,000 |
| `eleven_turbo_v2` | 30,000 |
| `eleven_multilingual_v2` | 10,000 |
| `eleven_multilingual_v1` | 10,000 |
| `eleven_monolingual_v1` | 10,000 |
| `eleven_v3` | 3,000 |

### Website Limits (for reference)

| Plan | Max Characters per Generation |
|------|-------------------------------|
| Free | 2,500 |
| Paid | 5,000 |

### Monthly Credit Quotas

| Plan | Monthly Credits | Price |
|------|----------------|-------|
| Free | 10,000 | $0 |
| Starter | 30,000 | $5/mo |
| Creator | 100,000 | $22/mo |
| Pro | 500,000 | $99/mo |
| Scale | 2,000,000 | $330/mo |
| Business | Custom | Custom |

**Note:** Website and API share the same monthly quota. The per-request limits differ.

---

## 9. Language Support

### By Model

| Model | Language Count | Notes |
|-------|---------------|-------|
| `eleven_v3` | 70+ | Most extensive support |
| `eleven_flash_v2_5` | 32 | All v2 languages + 3 additional |
| `eleven_turbo_v2_5` | 32 | Same as Flash v2.5 |
| `eleven_multilingual_v2` | 29 | Core multilingual support |
| `eleven_monolingual_v1` | 1 | English only |

### Multilingual v2 / Flash v2.5 / Turbo v2.5 Language List (29-32 languages)

Arabic, Bulgarian, Chinese, Croatian, Czech, Danish, Dutch, English, Filipino, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Malay, Norwegian, Polish, Portuguese, Romanian, Russian, Slovak, Spanish, Swedish, Tamil, Thai, Turkish, Ukrainian, Vietnamese

### Eleven v3 Language List (70+ languages)

All of the above plus: Afrikaans, Armenian, Assamese, Azerbaijani, Belarusian, Bengali, Bosnian, Catalan, Cebuano, Chichewa, Estonian, Galician, Georgian, Gujarati, Hausa, Icelandic, Irish, Javanese, Kannada, Kazakh, Kirghiz, Latvian, Lingala, Lithuanian, Luxembourgish, Macedonian, Malayalam, and more.

### Language Code Usage

Pass `language_code` (ISO 639-1) in the request body to explicitly set the language. If omitted, the model auto-detects the language from the input text. Auto-detection works well for most cases but explicit codes improve reliability for short texts or mixed-language content.

---

## 10. Pricing Summary

### Credit Costs by Model

| Model | Credits per Character |
|-------|-----------------------|
| v1 models (English, Multilingual) | 1 credit/char |
| Multilingual v2 | 1 credit/char |
| Eleven v3 | 1 credit/char |
| Flash v2 / Flash v2.5 | 0.5 credits/char |
| Turbo v2 / Turbo v2.5 | 0.5 credits/char |

### Overage Pricing (Creator+ with usage-based billing enabled)

When you exhaust your monthly quota, additional usage is billed per 1,000 characters. The per-character overage rate decreases on higher-tier plans.

---

## Implementation Recommendations

### Quick Start: Minimal TTS Request

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers:
  xi-api-key: <your-api-key>
  Content-Type: application/json

Body:
{
  "text": "Hello world",
  "model_id": "eleven_flash_v2_5"
}
```

Response: Raw MP3 audio bytes (default format `mp3_44100_128`).

### Recommended Model Selection Strategy

1. **For real-time/conversational:** Use `eleven_flash_v2_5` (lowest latency, 0.5 credits/char)
2. **For high-quality narration:** Use `eleven_multilingual_v2` (best quality, 1 credit/char)
3. **For emotional/expressive content:** Use `eleven_v3` (audio tags, 1 credit/char, but 3k char limit)
4. **For cost optimization:** Use `eleven_flash_v2_5` (half the credit cost)

### Long Text Strategy

For texts exceeding the per-request character limit:
1. Split text at sentence or paragraph boundaries
2. Use `previous_text` and `next_text` fields for prosodic continuity across chunks
3. Use `previous_request_ids` / `next_request_ids` for audio-conditioned continuity
4. Concatenate resulting audio chunks

---

## Code Examples

### cURL: Basic TTS (Non-Streaming)

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb" \
  -H "xi-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of the ElevenLabs API.",
    "model_id": "eleven_flash_v2_5",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true,
      "speed": 1.0
    }
  }' \
  --output output.mp3
```

### cURL: Streaming TTS

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb/stream?output_format=mp3_44100_128" \
  -H "xi-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This audio will stream back in chunks.",
    "model_id": "eleven_flash_v2_5"
  }' \
  --output streamed_output.mp3
```

### cURL: List Voices

```bash
curl -X GET "https://api.elevenlabs.io/v2/voices?page_size=20&category=premade" \
  -H "xi-api-key: your_api_key_here"
```

### TypeScript/Node.js: Direct HTTP Client

```typescript
interface ElevenLabsVoiceSettings {
  stability: number;        // 0.0 - 1.0
  similarity_boost: number; // 0.0 - 1.0
  style?: number;           // 0.0+
  use_speaker_boost?: boolean;
  speed?: number;           // 0.5 - 2.0
}

interface ElevenLabsTTSRequest {
  text: string;
  model_id?: string;
  language_code?: string;
  voice_settings?: ElevenLabsVoiceSettings;
  pronunciation_dictionary_locators?: Array<{
    pronunciation_dictionary_id: string;
    version_id: string;
  }>;
  seed?: number;
  previous_text?: string;
  next_text?: string;
  previous_request_ids?: string[];
  next_request_ids?: string[];
  apply_text_normalization?: "auto" | "on" | "off";
}

async function textToSpeech(
  voiceId: string,
  request: ElevenLabsTTSRequest,
  apiKey: string,
  outputFormat: string = "mp3_44100_128",
  stream: boolean = false
): Promise<ArrayBuffer> {
  const endpoint = stream ? "stream" : "";
  const path = endpoint
    ? `/v1/text-to-speech/${voiceId}/stream`
    : `/v1/text-to-speech/${voiceId}`;

  const url = `https://api.elevenlabs.io${path}?output_format=${outputFormat}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
  }

  return response.arrayBuffer();
}

// Usage:
const audioBuffer = await textToSpeech(
  "JBFqnCBsd6RMkjVDRZzb",
  {
    text: "Hello from the ElevenLabs API!",
    model_id: "eleven_flash_v2_5",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  },
  process.env.ELEVENLABS_API_KEY!
);
```

### TypeScript: Streaming with Chunked Processing

```typescript
async function streamTextToSpeech(
  voiceId: string,
  text: string,
  apiKey: string,
  onChunk: (chunk: Uint8Array) => void
): Promise<void> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(value);
  }
}
```

---

## Common Pitfalls

1. **Not specifying `model_id`** -- defaults to `eleven_multilingual_v2` (1 credit/char). If cost is a concern, explicitly use `eleven_flash_v2_5` (0.5 credits/char).
2. **Exceeding character limits** -- silently truncated or returns 422. Always check text length against the model's limit before sending.
3. **Ignoring `output_format` tier restrictions** -- `mp3_44100_192` requires Creator+, `pcm_44100`/`wav_44100` requires Pro+. Lower tiers get 422 errors.
4. **Not handling 429 rate limits** -- implement exponential backoff. Concurrency limits are strict.
5. **Using v3 with Professional Voice Clones** -- PVCs not fully optimized for v3; clone quality may be lower than v2 models.
6. **Shared quota confusion** -- API and website share the same monthly credit pool.
7. **Large text without chunking** -- for long documents, split at natural boundaries and use `previous_text`/`next_text` for prosodic continuity.

---

## Resources and References

### Official Documentation
- [API Reference - Introduction](https://elevenlabs.io/docs/api-reference/introduction)
- [API Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [Create Speech (TTS Convert)](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Stream Speech](https://elevenlabs.io/docs/api-reference/text-to-speech/stream)
- [Models Overview](https://elevenlabs.io/docs/overview/models)
- [List Voices](https://elevenlabs.io/docs/api-reference/voices/search)
- [Streaming Guide](https://elevenlabs.io/docs/api-reference/streaming)
- [Text to Speech Overview](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)

### Help Center Articles
- [What models do you offer?](https://help.elevenlabs.io/hc/en-us/articles/17883183930129)
- [Rate Limits / Request Limits](https://help.elevenlabs.io/hc/en-us/articles/14312733311761)
- [Character Limits](https://help.elevenlabs.io/hc/en-us/articles/13298164480913)
- [Supported Languages](https://help.elevenlabs.io/hc/en-us/articles/13313366263441)
- [Audio Formats](https://help.elevenlabs.io/hc/en-us/articles/15754340124305)
- [Finding Voice IDs](https://help.elevenlabs.io/hc/en-us/articles/14599760033937)

### Blog Posts
- [Eleven v3 Launch](https://elevenlabs.io/blog/eleven-v3)
- [v3 Audio Tags](https://elevenlabs.io/blog/v3-audiotags)
- [PCM Output Format](https://elevenlabs.io/blog/pcm-output-format)

### Third-Party Guides
- [ElevenLabs API in 2025 - Webfuse Guide](https://www.webfuse.com/blog/elevenlabs-api-in-2025-the-ultimate-guide-for-developers)
- [Handling Rate Limits Gracefully](https://prosperasoft.com/blog/voice-synthesis/elevenlabs/elevenlabs-api-rate-limits/)
- [ElevenLabs Pricing Breakdown 2026](https://flexprice.io/blog/elevenlabs-pricing-breakdown)

### Pricing
- [API Pricing](https://elevenlabs.io/pricing/api)
- [General Pricing](https://elevenlabs.io/pricing)

---

## Unresolved Questions

1. **Exact v3 character limit** -- Multiple sources indicate 3,000 characters for v3, but this may have changed since v3 exited alpha. Verify against the latest docs.
2. **Rate limit reset window** -- The exact time window for rate limit resets (per second vs per minute) is not documented publicly. The docs only specify concurrency (parallel request) limits.
3. **Opus/WAV tier restrictions** -- MP3 192kbps and PCM/WAV 44.1kHz+ have documented tier restrictions. Opus format tier restrictions are not explicitly documented.
4. **v3 credit cost confirmation** -- Most sources indicate 1 credit/char for v3, but this should be verified as v3 moves from alpha to GA.
5. **`optimize_streaming_latency` deprecation status** -- This parameter is marked as deprecated but still accepted. Unclear when it will be fully removed.
