# Research Report: ElevenLabs Sound Effects, Music Generation & Audio APIs

**Date:** 2026-02-28
**Researcher:** Claude Opus 4.6
**Sources consulted:** 15+
**Key search terms:** ElevenLabs API, sound effects, music generation, audio isolation, stem separation, REST API

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Common API Patterns](#common-api-patterns)
3. [Sound Effects Generation API](#sound-effects-generation-api)
4. [Music Generation API](#music-generation-api)
5. [Audio Isolation API](#audio-isolation-api)
6. [Stem Separation API](#stem-separation-api)
7. [Output Format Reference](#output-format-reference)
8. [Pricing](#pricing)
9. [Error Handling Reference](#error-handling-reference)
10. [Implementation Notes](#implementation-notes)
11. [Resources & References](#resources--references)

---

## Executive Summary

ElevenLabs provides four audio generation/processing REST APIs relevant to this research:

1. **Sound Effects** (`POST /v1/sound-generation`) -- text-to-sound-effects, up to 30s, with looping support via v2 model.
2. **Music Generation** (`POST /v1/music`, `/v1/music/stream`, `/v1/music/detailed`) -- full song composition from text prompts or structured composition plans, 3s to 10min, using `music_v1` model. Available in API since ~August 2025.
3. **Audio Isolation** (`POST /v1/audio-isolation`) -- removes background noise from uploaded audio, returns clean vocal track.
4. **Stem Separation** (`POST /v1/music/stem-separation`) -- splits audio into 2 or 6 stems, returns ZIP archive.

All endpoints share the same auth pattern (`xi-api-key` header), base URL (`https://api.elevenlabs.io`), and error response format. Audio is returned as binary `application/octet-stream` with configurable output formats.

---

## Common API Patterns

### Base URL

```
https://api.elevenlabs.io
```

Regional alternatives:
- `https://api.us.elevenlabs.io` (US)
- `https://api.eu.residency.elevenlabs.io` (EU data residency)
- `https://api.in.residency.elevenlabs.io` (India data residency)

### Authentication

All requests require the `xi-api-key` header:

```
xi-api-key: <YOUR_API_KEY>
```

- Keys are generated in ElevenLabs account settings
- Keys can be scoped to specific endpoints
- Keys can have credit quotas
- No OAuth or Bearer token support -- header key only
- Single-use tokens available for limited client-side use cases

### Rate Limits (Concurrency by Tier)

| Tier       | Concurrent Requests |
|------------|---------------------|
| Free       | 2                   |
| Starter    | 3                   |
| Creator    | 5                   |
| Pro        | 10                  |
| Scale      | 15                  |
| Business   | 15                  |

When concurrency limit is reached, subsequent requests queue with ~50ms added latency. Enterprise tiers can negotiate higher limits.

### Response Headers

- `x-character-count` -- character/credit costs for the request
- `request-id` -- unique request identifier for debugging

### Error Response Format

All errors return JSON with this structure:

```json
{
  "detail": {
    "type": "<error_type>",
    "code": "<specific_error_code>",
    "message": "<human_readable_description>",
    "request_id": "<unique_id>",
    "param": "<parameter_name_if_applicable>"
  }
}
```

For 422 validation errors, the format may be an array:

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "error description",
      "type": "value_error"
    }
  ]
}
```

See [Error Handling Reference](#error-handling-reference) for complete status code table.

---

## Sound Effects Generation API

### Endpoint

```
POST https://api.elevenlabs.io/v1/sound-generation
```

### Request

**Content-Type:** `application/json`

**Headers:**
| Header      | Required | Description                |
|-------------|----------|----------------------------|
| xi-api-key  | Yes      | API authentication key     |

**Query Parameters:**
| Parameter     | Type   | Required | Description                                                     |
|---------------|--------|----------|-----------------------------------------------------------------|
| output_format | string | No       | Audio format (default: `mp3_44100_128`). See format reference.  |

**Request Body (JSON):**

| Field             | Type    | Required | Default                      | Description                                                        |
|-------------------|---------|----------|------------------------------|--------------------------------------------------------------------|
| text              | string  | Yes      | --                           | Text prompt describing the sound effect                            |
| duration_seconds  | number  | No       | AI decides                   | Duration in seconds. Range: 0.5 - 30                               |
| prompt_influence  | number  | No       | 0.3                          | Adherence to prompt. Range: 0.0 - 1.0. Higher = more literal      |
| model_id          | string  | No       | `eleven_text_to_sound_v2`    | Model to use                                                       |
| loop              | boolean | No       | false                        | Create seamless loop. Only available with v2 model                 |

### Response

**Success (200):**
- Content-Type: `application/octet-stream`
- Body: Raw binary audio data in requested format

**Error (422):**
- Content-Type: `application/json`
- Body: Validation error details

### Example Request (cURL)

```bash
curl -X POST "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Heavy rain on a tin roof with distant thunder",
    "duration_seconds": 10,
    "prompt_influence": 0.5,
    "model_id": "eleven_text_to_sound_v2",
    "loop": false
  }' \
  --output rain_sfx.mp3
```

### Models

| Model ID                     | Features                           |
|------------------------------|------------------------------------|
| `eleven_text_to_sound_v2`    | Looping support, improved quality  |

### Best Practices

- Use detailed, descriptive prompts ("Glass shattering on concrete" not "glass break")
- Supported prompt types: Foley, ambient, cinematic, musical elements, technical audio terms
- For complex effects, generate components separately and combine
- Looping works best with ambient/continuous sounds
- WAV downloads of non-looping effects use 48kHz sample rate (industry standard)
- Max duration: 30 seconds

---

## Music Generation API

### Overview

ElevenLabs Music API (Eleven Music) generates full songs from text or structured composition plans. Uses model `music_v1`. Launched in API ~August 2025. Trained on licensed data and cleared for broad commercial use.

### Endpoints

There are three music endpoints:

| Endpoint                  | URL                                              | Description                              |
|---------------------------|--------------------------------------------------|------------------------------------------|
| Compose                   | `POST /v1/music`                                 | Generate song, returns full audio        |
| Stream                    | `POST /v1/music/stream`                          | Generate song, streams audio             |
| Compose Detailed          | `POST /v1/music/detailed`                        | Returns multipart (JSON metadata + audio)|
| Stem Separation           | `POST /v1/music/stem-separation`                 | Separate audio into stems (see below)    |

### Compose Endpoint

```
POST https://api.elevenlabs.io/v1/music
```

**Content-Type:** `application/json`

**Query Parameters:**
| Parameter     | Type   | Required | Description                                                |
|---------------|--------|----------|------------------------------------------------------------|
| output_format | string | No       | Audio format (default: `mp3_44100_128`). See format ref.   |

**Request Body (JSON) -- Two mutually exclusive modes:**

#### Mode 1: Simple Prompt

```json
{
  "prompt": "An upbeat electronic track with synth pads and a driving bass line",
  "music_length_ms": 120000,
  "model_id": "music_v1",
  "force_instrumental": true,
  "seed": 42
}
```

| Field               | Type    | Required | Default  | Description                                                      |
|---------------------|---------|----------|----------|------------------------------------------------------------------|
| prompt              | string  | Yes*     | --       | Text description of desired song. Mutually exclusive with composition_plan |
| music_length_ms     | integer | No       | AI decides | Duration in ms. Range: 3,000 - 600,000 (3s - 10min)           |
| model_id            | string  | No       | music_v1 | Currently only `music_v1`                                        |
| force_instrumental  | boolean | No       | false    | Ensure no vocals. Only works with prompt mode                    |
| seed                | integer | No       | random   | Random seed for reproducibility. NOT compatible with prompt mode |
| sign_with_c2pa      | boolean | No       | false    | C2PA content provenance signing (MP3 only)                       |
| store_for_inpainting| boolean | No       | false    | Store for later inpainting (enterprise only)                     |

#### Mode 2: Composition Plan

```json
{
  "composition_plan": {
    "positive_global_styles": ["epic orchestral", "cinematic"],
    "negative_global_styles": ["lo-fi", "acoustic"],
    "sections": [
      {
        "section_name": "Intro",
        "positive_local_styles": ["building tension", "strings"],
        "negative_local_styles": ["drums"],
        "duration_ms": 15000,
        "lines": []
      },
      {
        "section_name": "Verse 1",
        "positive_local_styles": ["full orchestra"],
        "negative_local_styles": [],
        "duration_ms": 30000,
        "lines": [
          "Through the mountains and the valleys",
          "We march toward the dawn"
        ]
      }
    ]
  },
  "model_id": "music_v1",
  "respect_sections_durations": true,
  "seed": 42
}
```

**Composition Plan (MusicPrompt) object:**

| Field                  | Type     | Description                                   |
|------------------------|----------|-----------------------------------------------|
| positive_global_styles | string[] | Desired stylistic directions for entire song  |
| negative_global_styles | string[] | Styles to avoid for entire song               |
| sections               | array    | Array of SongSection objects                  |

**SongSection object:**

| Field                 | Type     | Required | Description                                          |
|-----------------------|----------|----------|------------------------------------------------------|
| section_name          | string   | Yes      | Name of section (1-100 chars)                        |
| positive_local_styles | string[] | No       | Desired styles for this section                      |
| negative_local_styles | string[] | No       | Styles to avoid for this section                     |
| duration_ms           | integer  | No       | Duration in ms. Range: 3,000 - 120,000 (per section)|
| lines                 | string[] | No       | Lyrics (max 200 chars per line)                      |
| source_from           | object   | No       | Inpainting source (enterprise only)                  |

**Additional parameters for composition plan mode:**

| Field                      | Type    | Required | Default | Description                                  |
|----------------------------|---------|----------|---------|----------------------------------------------|
| respect_sections_durations | boolean | No       | true    | Enforce exact section durations              |
| seed                       | integer | No       | random  | Reproducibility seed (works in plan mode)    |

### Response

**Compose (200):**
- Content-Type: `application/octet-stream`
- Body: Raw binary audio

**Stream (200):**
- Content-Type: `application/octet-stream`
- Body: Streaming binary audio chunks

**Detailed (200):**
- Content-Type: `multipart/mixed`
- Body: JSON metadata part + binary audio part

**Error (422):**
- JSON validation error

### Example Request (cURL)

```bash
# Simple prompt mode
curl -X POST "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A chill lo-fi hip hop beat with vinyl crackle and soft piano",
    "music_length_ms": 60000,
    "model_id": "music_v1",
    "force_instrumental": true
  }' \
  --output lofi_track.mp3
```

```bash
# Streaming mode
curl -X POST "https://api.elevenlabs.io/v1/music/stream?output_format=mp3_44100_128" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Acoustic guitar folk song about traveling",
    "music_length_ms": 90000,
    "model_id": "music_v1"
  }' \
  --output folk_song.mp3
```

### Detailed Compose Endpoint

```
POST https://api.elevenlabs.io/v1/music/detailed
```

Same request body as `/v1/music`. Additional parameter:

| Field            | Type    | Required | Default | Description                          |
|------------------|---------|----------|---------|--------------------------------------|
| with_timestamps  | boolean | No       | false   | Returns word timing data in audio    |

Returns `multipart/mixed` response with JSON metadata and binary audio.

### Music Generation Specifications

- **Duration range:** 3 seconds to 5 minutes (10 minutes via API parameter)
- **Multilingual lyrics:** English, Spanish, German, Japanese, and more
- **Commercial use:** Cleared for film, TV, podcasts, social media, ads, gaming
- **Model:** `music_v1` (only model currently available)

---

## Audio Isolation API

### Overview

Removes background noise from audio files, isolating vocal tracks. Supports both standard and streaming responses.

### Standard Endpoint

```
POST https://api.elevenlabs.io/v1/audio-isolation
```

**Content-Type:** `multipart/form-data`

**Headers:**
| Header     | Required | Description            |
|------------|----------|------------------------|
| xi-api-key | Yes      | API authentication key |

**Request Body (multipart/form-data):**

| Field       | Type   | Required | Description                                                                      |
|-------------|--------|----------|----------------------------------------------------------------------------------|
| audio       | binary | Yes      | Audio file to process. Supports WAV, MP3, FLAC, OGG, AAC. Max 500MB, 1 hour.    |
| file_format | string | No       | `pcm_s16le_16` or `other`. PCM requires 16-bit, 16kHz, mono, little-endian input |
| preview_b64 | string | No       | Optional preview image (base64) for tracking                                     |

### Streaming Endpoint

```
POST https://api.elevenlabs.io/v1/audio-isolation/stream
```

Same parameters as standard endpoint. Returns streaming audio for lower latency.

### Response

**Success (200):**
- Content-Type: `application/octet-stream`
- Body: Clean audio with background noise removed

**Error (422):**
- JSON validation error

### Example Request (cURL)

```bash
curl -X POST "https://api.elevenlabs.io/v1/audio-isolation" \
  -H "xi-api-key: YOUR_API_KEY" \
  -F "audio=@noisy_recording.mp3" \
  --output clean_audio.mp3
```

### Specifications

- Max file size: 500MB
- Max duration: 1 hour
- Input formats: WAV, MP3, FLAC, OGG, AAC
- Credit cost: 1,000 characters per minute of audio processed
- Capabilities: Removes ambient noise, mic feedback, street sounds, reverb, interference

---

## Stem Separation API

### Endpoint

```
POST https://api.elevenlabs.io/v1/music/stem-separation
```

**Content-Type:** `multipart/form-data`

**Headers:**
| Header     | Required | Description            |
|------------|----------|------------------------|
| xi-api-key | Yes      | API authentication key |

**Query Parameters:**
| Parameter     | Type   | Required | Description                                     |
|---------------|--------|----------|-------------------------------------------------|
| output_format | string | No       | Audio format for output stems. See format ref.  |

**Request Body (multipart/form-data):**

| Field             | Type    | Required | Default        | Description                                             |
|-------------------|---------|----------|----------------|---------------------------------------------------------|
| file              | binary  | Yes      | --             | Audio file to separate                                  |
| stem_variation_id | string  | No       | `six_stems_v1` | `two_stems_v1` (vocals + instrumental) or `six_stems_v1` |
| sign_with_c2pa    | boolean | No       | false          | C2PA signing for MP3 output                             |

### Response

**Success (200):**
- Content-Type: `application/zip`
- Body: ZIP archive containing individual stem files

**Error (422):**
- JSON validation error

### Stem Variations

| Variation       | Output Stems                                                    |
|-----------------|-----------------------------------------------------------------|
| `two_stems_v1`  | Vocals, Instrumental                                            |
| `six_stems_v1`  | Vocals, Drums, Bass, Guitar, Piano/Keys, Other (6 stems total) |

### Example Request (cURL)

```bash
curl -X POST "https://api.elevenlabs.io/v1/music/stem-separation?output_format=mp3_44100_128" \
  -H "xi-api-key: YOUR_API_KEY" \
  -F "file=@song.mp3" \
  -F "stem_variation_id=six_stems_v1" \
  --output stems.zip
```

**Note:** This endpoint may have high latency depending on audio file length.

---

## Output Format Reference

All audio-producing endpoints support `output_format` query parameter. Format pattern: `codec_samplerate_bitrate`.

### Complete List (28 formats)

**MP3 (7):**
| Value             | Sample Rate | Bitrate | Tier Required |
|-------------------|-------------|---------|---------------|
| `mp3_22050_32`    | 22,050 Hz   | 32 kbps | Free          |
| `mp3_24000_48`    | 24,000 Hz   | 48 kbps | Free          |
| `mp3_44100_32`    | 44,100 Hz   | 32 kbps | Free          |
| `mp3_44100_64`    | 44,100 Hz   | 64 kbps | Free          |
| `mp3_44100_96`    | 44,100 Hz   | 96 kbps | Free          |
| `mp3_44100_128`   | 44,100 Hz   | 128 kbps| Free (default)|
| `mp3_44100_192`   | 44,100 Hz   | 192 kbps| Creator+      |

**Opus (5):**
| Value             | Sample Rate | Bitrate |
|-------------------|-------------|---------|
| `opus_48000_32`   | 48,000 Hz   | 32 kbps |
| `opus_48000_64`   | 48,000 Hz   | 64 kbps |
| `opus_48000_96`   | 48,000 Hz   | 96 kbps |
| `opus_48000_128`  | 48,000 Hz   | 128 kbps|
| `opus_48000_192`  | 48,000 Hz   | 192 kbps|

**PCM (7):**
| Value         | Sample Rate | Tier Required |
|---------------|-------------|---------------|
| `pcm_8000`    | 8,000 Hz    | Free          |
| `pcm_16000`   | 16,000 Hz   | Free          |
| `pcm_22050`   | 22,050 Hz   | Free          |
| `pcm_24000`   | 24,000 Hz   | Free          |
| `pcm_32000`   | 32,000 Hz   | Free          |
| `pcm_44100`   | 44,100 Hz   | Pro+          |
| `pcm_48000`   | 48,000 Hz   | Pro+          |

**WAV (6):**
| Value         | Sample Rate |
|---------------|-------------|
| `wav_8000`    | 8,000 Hz    |
| `wav_16000`   | 16,000 Hz   |
| `wav_22050`   | 22,050 Hz   |
| `wav_24000`   | 24,000 Hz   |
| `wav_44100`   | 44,100 Hz   |
| `wav_48000`   | 48,000 Hz   |

**Telephony (2):**
| Value        | Sample Rate | Use Case   |
|--------------|-------------|------------|
| `alaw_8000`  | 8,000 Hz    | Telephony  |
| `ulaw_8000`  | 8,000 Hz    | Twilio     |

---

## Pricing

### Sound Effects

| Mode                       | Cost                          |
|----------------------------|-------------------------------|
| Auto duration (AI decides) | 200 credits per generation    |
| Specified duration         | 40 credits per second         |

Example: 10-second SFX with specified duration = 400 credits.

### Music Generation

Music is billed per generation based on a fixed fiat price that translates to different credit amounts per plan tier. Cost scales with duration. Exact credits-per-minute vary by subscription plan. Before generation, the platform shows price-per-minute estimate; final cost based on actual generated duration.

**Note:** Only available to paid users.

### Audio Isolation

1,000 characters (credits) per minute of audio processed.

### Stem Separation

Pricing not explicitly documented; likely follows similar credit-based model.

### Subscription Tiers (Reference)

| Tier     | Credits/month | Price/month |
|----------|---------------|-------------|
| Free     | Limited       | $0          |
| Starter  | Varies        | ~$5         |
| Creator  | Varies        | ~$22        |
| Pro      | Varies        | ~$99        |
| Scale    | Varies        | ~$330       |
| Business | Custom        | Custom      |

*Note: Exact credit amounts and prices change frequently. Check [elevenlabs.io/pricing](https://elevenlabs.io/pricing) for current figures.*

---

## Error Handling Reference

### HTTP Status Codes

| Status | Type                  | Description                                      |
|--------|-----------------------|--------------------------------------------------|
| 200    | --                    | Success                                          |
| 400    | `validation_error`    | Invalid parameter values                         |
| 400    | `invalid_request`     | Malformed structure or missing required fields   |
| 401    | `authentication_error`| Invalid or missing API key                       |
| 402    | `payment_required`    | Insufficient credits                             |
| 403    | `authorization_error` | Authenticated but lacks permissions              |
| 404    | `not_found`           | Resource doesn't exist                           |
| 409    | `conflict`            | Request conflicts with current state             |
| 422    | `validation_error`    | Unprocessable entity (invalid body)              |
| 429    | `rate_limit_error`    | Rate/concurrency limit exceeded                  |
| 500    | `internal_error`      | Server error                                     |
| 503    | `service_unavailable` | Temporary outage                                 |

### Key Error Codes

**429 Error Sub-types:**
| Code                          | Cause                                   | Resolution                           |
|-------------------------------|-----------------------------------------|--------------------------------------|
| `rate_limit_exceeded`         | Too many requests in time window        | Exponential backoff retry            |
| `concurrent_limit_exceeded`   | Tier concurrency limit hit              | Queue requests or upgrade tier       |
| `system_busy`                 | Temporary platform congestion           | Retry with exponential backoff       |

**400 Error Sub-types:**
- `text_too_long` -- input text exceeds limit
- `invalid_parameters` -- parameter validation failed
- `missing_required_field` -- required field absent
- `invalid_audio_format` -- unsupported audio input
- `audio_too_long` -- audio exceeds max duration

**401 Error Sub-types:**
- `invalid_api_key`
- `missing_api_key`

**402 Error Sub-types:**
- `insufficient_credits`

### Recommended Error Handling Strategy

```
1. For 429 errors: Implement exponential backoff
   - Start with 1s delay, double on each retry, max 5 retries
   - Check error code to distinguish rate limit vs concurrency vs system_busy

2. For 402 errors: Check credit balance, alert user

3. For 422 errors: Log validation details, fix request parameters

4. For 500/503 errors: Retry with backoff, up to 3 attempts
```

---

## Implementation Notes

### Key Considerations for Direct HTTP Implementation

1. **Binary responses** -- Sound effects, music, and audio isolation all return raw binary audio. Save response body directly to file or stream to player.

2. **Long-running requests** -- Music generation (up to 10min tracks) and stem separation can take significant time. Use streaming endpoint (`/v1/music/stream`) when possible to get audio chunks earlier. Set generous HTTP timeouts.

3. **Mutually exclusive parameters** -- Music API's `prompt` and `composition_plan` cannot be used together. `seed` is not compatible with `prompt` mode.

4. **Output format defaults** -- If `output_format` is omitted, default is `mp3_44100_128` for most endpoints.

5. **Content-Type per endpoint:**
   - Sound Effects: `application/json` request body
   - Music: `application/json` request body
   - Audio Isolation: `multipart/form-data` (file upload)
   - Stem Separation: `multipart/form-data` (file upload)

6. **Regional endpoints** -- Use regional URLs for data residency compliance (EU, India).

7. **Tier gating** -- Some output formats (mp3_44100_192, pcm_44100, pcm_48000) require Creator or Pro tier.

---

## Resources & References

### Official Documentation
- [API Introduction](https://elevenlabs.io/docs/api-reference/introduction)
- [Sound Effects API Reference](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
- [Music Compose API Reference](https://elevenlabs.io/docs/api-reference/music/compose)
- [Music Stream API Reference](https://elevenlabs.io/docs/api-reference/music/stream)
- [Music Compose Detailed API Reference](https://elevenlabs.io/docs/api-reference/music/compose-detailed)
- [Stem Separation API Reference](https://elevenlabs.io/docs/api-reference/music/separate-stems)
- [Audio Isolation API Reference](https://elevenlabs.io/docs/api-reference/audio-isolation/convert)
- [Audio Isolation Stream API Reference](https://elevenlabs.io/docs/api-reference/audio-isolation/stream)
- [Authentication Docs](https://elevenlabs.io/docs/api-reference/authentication)
- [Error Messages Reference](https://elevenlabs.io/docs/eleven-api/resources/errors)

### Capability Overviews
- [Sound Effects Overview](https://elevenlabs.io/docs/overview/capabilities/sound-effects)
- [Music Overview](https://elevenlabs.io/docs/overview/capabilities/music)
- [Voice Isolator Overview](https://elevenlabs.io/docs/overview/capabilities/voice-isolator)

### Pricing
- [API Pricing](https://elevenlabs.io/pricing/api)
- [General Pricing](https://elevenlabs.io/pricing)

### Quickstarts
- [Sound Effects Quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/sound-effects)
- [Music Quickstart](https://elevenlabs.io/docs/developers/guides/cookbooks/music/quickstart)

### Blog
- [Eleven Music API Launch Announcement](https://elevenlabs.io/blog/eleven-music-now-available-in-the-api)

---

## Unresolved Questions

1. **Exact music generation credit cost** -- Documentation states cost varies by tier and is based on a "fixed fiat price" translating to different credit amounts per plan. No universal credits-per-minute figure found. Need to check account dashboard for tier-specific rates.

2. **Stem separation pricing** -- No explicit credit cost documented. Likely similar to other audio processing features.

3. **Sound Effects v1 model ID** -- Only v2 (`eleven_text_to_sound_v2`) was documented. If v1 exists, its model ID was not found in current docs.

4. **Music API availability for free tier** -- Search results indicate "only available to paid users" but the exact tier minimum was not confirmed.

5. **Detailed compose response structure** -- The `/v1/music/detailed` endpoint returns `multipart/mixed` but the exact JSON metadata schema within that response was not fully documented in the sources reviewed.
