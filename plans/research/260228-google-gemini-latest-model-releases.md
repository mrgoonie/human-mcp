# Research Report: Google Gemini Latest Model Releases (2025-2026)

**Date:** 2026-02-28
**Sources consulted:** 20+
**Date range of materials:** December 2025 to February 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Verification of Claimed Models](#verification-of-claimed-models)
3. [Model Registry: Exact IDs and Specifications](#model-registry)
4. [Capability Matrix](#capability-matrix)
5. [Nano Banana Image Generation Family](#nano-banana-family)
6. [API Compatibility and Migration Guide](#api-compatibility)
7. [Breaking Changes from Gemini 2.5](#breaking-changes)
8. [Additional Models Discovered](#additional-models)
9. [Deprecation Timeline](#deprecation-timeline)
10. [Resources and References](#resources)

---

## Executive Summary

All three models the user mentioned are **confirmed real and currently available**:

| User Claim | Actual Name | Model ID | Status |
|---|---|---|---|
| Gemini 3.1 | **Gemini 3.1 Pro** | `gemini-3.1-pro-preview` | Preview (Feb 19, 2026) |
| Gemini 3 Flash | **Gemini 3 Flash** | `gemini-3-flash-preview` | Preview (Dec 17, 2025) |
| Gemini Nano Banana 2 | **Nano Banana 2** | `gemini-3.1-flash-image-preview` | Preview (Feb 26, 2026) |

"Nano Banana" is indeed Google's official branding for their image generation model line. It is **not** a joke name. The Nano Banana family consists of three tiers: the original Nano Banana (`gemini-2.5-flash-image`), Nano Banana Pro (`gemini-3-pro-image-preview`), and Nano Banana 2 (`gemini-3.1-flash-image-preview`).

These models are **not** drop-in replacements for Gemini 2.5 Flash. There are breaking changes around thinking configuration (`thinking_level` replaces `thinking_budget`), temperature defaults, and media resolution handling. See the [Breaking Changes](#breaking-changes) section for details.

---

## Verification of Claimed Models

### 1. "Gemini 3.1" -- CONFIRMED (as Gemini 3.1 Pro)

- Official name: **Gemini 3.1 Pro**
- Released: February 19, 2026 (public preview)
- Announced via [Google Blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/)
- Model card: [DeepMind](https://deepmind.google/models/model-cards/gemini-3-1-pro/)
- ARC-AGI-2 benchmark: 77.1% (more than double Gemini 3 Pro's score)
- Knowledge cutoff: January 2025
- There is no "Gemini 3.1 Flash" text model at this time (only 3.1 Flash Image for Nano Banana 2)

### 2. "Gemini 3 Flash" -- CONFIRMED

- Official name: **Gemini 3 Flash**
- Released: December 17, 2025 (public preview)
- Announced via [Google Blog](https://blog.google/products/gemini/gemini-3-flash/)
- Now the default model in the Gemini app
- Outperforms Gemini 2.5 Pro on many benchmarks while being 3x faster
- GPQA Diamond: 90.4%, Humanity's Last Exam: 33.7% (without tools)
- Free tier available in Gemini API

### 3. "Gemini Nano Banana 2" -- CONFIRMED

- Official name: **Nano Banana 2** (technical name: Gemini 3.1 Flash Image)
- Released: February 26, 2026 (preview)
- Announced via [Google Blog](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/)
- [TechCrunch coverage](https://techcrunch.com/2026/02/26/google-launches-nano-banana-2-model-with-faster-image-generation/)
- Combines Nano Banana Pro quality with Flash-level speed
- "Nano Banana" is NOT a user confusion; it is Google's official brand name for their image generation model family

---

## Model Registry

### Gemini 3.1 Pro

| Property | Value |
|---|---|
| **Model ID** | `gemini-3.1-pro-preview` |
| **Alt Endpoint** | `gemini-3.1-pro-preview-customtools` (optimized for bash/custom tools) |
| **Status** | Public Preview |
| **Release Date** | February 19, 2026 |
| **Input Token Limit** | 1,048,576 (1M) |
| **Output Token Limit** | 65,536 |
| **Input Modalities** | Text, Code, Images, Audio, Video, PDF |
| **Output Modalities** | Text only |
| **Knowledge Cutoff** | January 2025 |
| **Temperature Range** | 0.0 - 2.0 (default 1.0) |
| **topP** | 0.0 - 1.0 (default 0.95) |
| **topK** | 64 (fixed) |
| **candidateCount** | 1 - 8 (default 1) |
| **Image Input** | Up to 3,000 images per prompt |
| **Video Input** | ~45 min (with audio), ~1 hr (without); max 10 videos |
| **Audio Input** | Up to 8.4 hours; single file |
| **PDF Input** | Up to 3,000 files, 3,000 pages/file, 50 MB/file |
| **Thinking** | Supported (MEDIUM level) |
| **Context Caching** | Implicit and Explicit |
| **Search Grounding** | Supported |
| **Code Execution** | Supported |
| **Function Calling** | Supported |
| **Structured Output** | Supported |
| **Computer Use** | Supported (built-in, no separate model needed) |
| **Live API** | NOT supported |
| **Batch API** | Supported |

### Gemini 3 Flash

| Property | Value |
|---|---|
| **Model ID** | `gemini-3-flash-preview` |
| **Status** | Public Preview |
| **Release Date** | December 17, 2025 |
| **Input Token Limit** | 1,048,576 (1M) |
| **Output Token Limit** | 65,536 |
| **Input Modalities** | Text, Code, Images, Audio, Video, PDF |
| **Output Modalities** | Text only |
| **Temperature Range** | Default 1.0 (below 1.0 may cause issues) |
| **Thinking** | Supported (minimal, low, medium, high) |
| **Context Caching** | Supported |
| **Search Grounding** | Supported |
| **Code Execution** | Supported (with images) |
| **Function Calling** | Supported (streaming, multimodal responses) |
| **Computer Use** | Supported (built-in) |
| **Batch API** | Supported |
| **Free Tier** | Available |

### Nano Banana 2 (Gemini 3.1 Flash Image)

| Property | Value |
|---|---|
| **Model ID** | `gemini-3.1-flash-image-preview` |
| **Status** | Preview |
| **Release Date** | February 26, 2026 |
| **Input Modalities** | Text, Images (up to 14 reference images) |
| **Output Modalities** | Text + Images |
| **Supported Aspect Ratios** | 1:1, 2:3, 3:2, 4:3, 3:4, 4:5, 5:4, 16:9, 9:16, 21:9, 1:4, 4:1, 1:8, 8:1 |
| **Image Sizes** | 512px, 1K, 2K, 4K |
| **Thinking** | Supported (minimal, high) |
| **Google Search Grounding** | Supported |
| **Google Image Search Grounding** | Supported (exclusive to Nano Banana 2) |
| **Text Rendering** | Advanced multilingual in-image text |
| **Character Consistency** | Up to 5 characters |
| **Object Consistency** | Up to 14 objects |
| **SynthID Watermark** | Yes (on all generated images) |

---

## Capability Matrix

### Text/Reasoning Models Comparison

| Capability | Gemini 2.5 Flash | Gemini 3 Flash | Gemini 3.1 Pro |
|---|---|---|---|
| **Model ID** | `gemini-2.5-flash` | `gemini-3-flash-preview` | `gemini-3.1-pro-preview` |
| **Status** | Stable (GA) | Preview | Preview |
| **Context Window** | 1M tokens | 1M tokens | 1M tokens |
| **Max Output** | 65,536 | 65,536 | 65,536 |
| **Text Input** | Yes | Yes | Yes |
| **Image Input** | Yes | Yes | Yes |
| **Video Input** | Yes | Yes | Yes |
| **Audio Input** | Yes | Yes | Yes |
| **PDF Input** | Yes | Yes | Yes |
| **Text Output** | Yes | Yes | Yes |
| **Image Output** | No (separate model) | No | No |
| **Thinking** | `thinking_budget` | `thinking_level` | `thinking_level` |
| **Computer Use** | Separate model needed | Built-in | Built-in |
| **Multimodal Fn Responses** | No | Yes | Yes |
| **Code Exec + Images** | No | Yes | Yes |
| **Streaming Fn Calling** | No | Yes | Yes |
| **Structured Output + Tools** | Limited | Yes | Yes |
| **Search Grounding** | Yes | Yes | Yes |
| **Context Caching** | Yes | Yes | Yes |
| **Batch API** | Yes | Yes | Yes |
| **Free Tier** | Yes | Yes | Unknown |

### Image Generation Models Comparison

| Capability | Nano Banana | Nano Banana Pro | Nano Banana 2 |
|---|---|---|---|
| **Model ID** | `gemini-2.5-flash-image` | `gemini-3-pro-image-preview` | `gemini-3.1-flash-image-preview` |
| **Status** | Stable (GA) | Preview | Preview |
| **Speed** | Fast | Slower (Pro-grade) | Fast (Flash-grade) |
| **Quality** | Good | Best | Near-Pro quality |
| **Text-to-Image** | Yes | Yes | Yes |
| **Image Editing** | Yes | Yes | Yes |
| **Multi-turn** | Yes | Yes | Yes |
| **Max Ref Images** | Limited | 14 | 14 |
| **Character Consistency** | Limited | Up to 5 | Up to 5 |
| **Search Grounding** | No | Yes | Yes |
| **Image Search Grounding** | No | No | Yes (exclusive) |
| **Thinking Mode** | No | Yes | Yes |
| **4K Output** | No | Yes | Yes |
| **Extended Aspect Ratios** | No | No | Yes (1:4, 4:1, 1:8, 8:1) |
| **In-image Text (Multilingual)** | Limited | Yes | Yes |
| **SynthID Watermark** | Yes | Yes | Yes |

---

## Nano Banana Family

Google's image generation model family, branded "Nano Banana," consists of three tiers:

### Nano Banana (Original)
- **Model ID:** `gemini-2.5-flash-image`
- **Released:** August 2025 (preview), October 2025 (GA)
- **Built on:** Gemini 2.5 Flash architecture
- **Best for:** General-purpose image generation at speed

### Nano Banana Pro
- **Model ID:** `gemini-3-pro-image-preview`
- **Released:** November 20, 2025
- **Built on:** Gemini 3 Pro architecture
- **Best for:** High-fidelity tasks requiring maximum factual accuracy, studio-quality precision

### Nano Banana 2
- **Model ID:** `gemini-3.1-flash-image-preview`
- **Released:** February 26, 2026
- **Built on:** Gemini 3.1 Flash architecture
- **Best for:** Rapid generation, precise instruction following, integrated image-search grounding
- **Unique feature:** Google Image Search Grounding (searches for reference images to improve generation accuracy)

---

## API Compatibility

### Are They Drop-In Replacements for Gemini 2.5 Flash?

**No.** These models are NOT simple drop-in replacements. There are several breaking changes that require code modifications.

### Migration Checklist (2.5 Flash -> 3 Flash or 3.1 Pro)

1. **Replace model ID string**
   - `gemini-2.5-flash` -> `gemini-3-flash-preview` or `gemini-3.1-pro-preview`

2. **Replace `thinking_budget` with `thinking_level`**
   - Cannot use both parameters simultaneously
   - Map: `thinking_budget=0` -> `thinking_level="minimal"`

3. **Remove/adjust temperature settings**
   - Default is now 1.0; values below 1.0 may cause looping or degraded output
   - Recommendation: remove explicit temperature config entirely

4. **Handle media resolution changes**
   - PDFs may consume more tokens at new defaults
   - Video may consume fewer tokens
   - Use `media_resolution` parameter to control explicitly if needed

5. **Update prompting style**
   - Remove chain-of-thought prompts (model handles reasoning internally)
   - Use more concise, direct instructions
   - Place questions after data contexts

6. **Handle thought signatures**
   - Even at `thinking_level="minimal"`, thought signatures are present
   - Ensure your parsing code handles them

### Python Code Example

**Before (Gemini 2.5 Flash):**
```python
from google import genai

client = genai.Client()
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Analyze this data",
    config={
        "temperature": 0.5,
        "thinking_config": {"thinking_budget": 1024}
    }
)
```

**After (Gemini 3 Flash):**
```python
from google import genai
from google.genai import types

client = genai.Client()
response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Analyze this data",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level="high")
        # temperature removed -- use default 1.0
    )
)
```

**Nano Banana 2 (Image Generation):**
```python
from google import genai
from google.genai import types

client = genai.Client()
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="A futuristic cityscape at sunset",
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K"
        )
    )
)
```

---

## Breaking Changes

### From Gemini 2.5 to Gemini 3 Series

| Change | Gemini 2.5 | Gemini 3 | Impact |
|---|---|---|---|
| **Thinking config** | `thinking_budget` (token count) | `thinking_level` (minimal/low/medium/high) | **Breaking** -- incompatible params |
| **Temperature** | Custom values common (0.0-0.5) | Default 1.0, below 1.0 causes issues | **Breaking** -- may cause looping |
| **Computer Use** | Requires separate model | Built-in | Simplifies code |
| **Image segmentation** | Supported | NOT supported | **Breaking** -- must stay on 2.5 |
| **Maps grounding** | Supported | NOT yet supported | **Breaking** for Maps users |
| **Built-in + Fn calling** | Could combine | Cannot combine | **Breaking** |
| **PDF token usage** | Lower | Higher (default resolution increased) | Cost increase |
| **Video token usage** | Higher | Lower | Cost decrease |
| **Multimodal fn responses** | Not supported | Supported | New capability |
| **Code exec + images** | Not supported | Supported | New capability |
| **`total_reasoning_tokens`** | Used in API | Renamed to `total_thought_tokens` | **Breaking** (Dec 2025) |

### Features NOT Available in Gemini 3 (Must Stay on 2.5)

- Image segmentation (pixel-level masks)
- Maps grounding
- Combining built-in tools with function calling in same request

---

## Additional Models Discovered

Beyond the three user-specified models, research uncovered:

| Model | ID | Notes |
|---|---|---|
| **Gemini 3 Pro** | `gemini-3-pro-preview` | Being deprecated March 9, 2026 (superseded by 3.1 Pro) |
| **Gemini 3 Deep Think** | Unknown | Enhanced reasoning for math/science; Ultra subscribers only |
| **Gemini 3.1 Pro CustomTools** | `gemini-3.1-pro-preview-customtools` | Optimized for bash and custom tool prioritization |
| **Veo 3.1** | `veo-3.1-generate-preview` | Video generation with 4K, portrait, templates |
| **Lyria 3** | `lyria-realtime-exp` | Music generation in Gemini app |
| **Gemini Robotics-ER 1.5** | `gemini-robotics-er-1.5-preview` | Robotics embodied reasoning |
| **Gemini 2.5 Flash Lite** | `gemini-2.5-flash-lite` | High-volume, cost-efficient |

---

## Deprecation Timeline

| Model | Deprecation Announced | Shutdown Date |
|---|---|---|
| `gemini-3-pro-preview` | Feb 26, 2026 | March 9, 2026 |
| `gemini-2.0-flash` | Feb 18, 2026 | June 1, 2026 |
| `gemini-2.0-flash-001` | Feb 18, 2026 | June 1, 2026 |
| `gemini-2.0-flash-lite` | Feb 18, 2026 | June 1, 2026 |
| `gemini-2.0-flash-lite-001` | Feb 18, 2026 | June 1, 2026 |

**Note:** `gemini-2.5-flash` and `gemini-2.5-pro` remain stable (GA) with no announced deprecation.

---

## Latest Alias Mappings

As of January 21, 2026:
- `gemini-pro-latest` -> `gemini-3-pro-preview` (will likely update to 3.1 Pro)
- `gemini-flash-latest` -> `gemini-3-flash-preview`

---

## Resources and References

### Official Documentation
- [Gemini API Models Reference](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API Changelog](https://ai.google.dev/gemini-api/docs/changelog)
- [Gemini 3 Developer Guide / Migration](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Image Generation with Nano Banana](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini 3 Flash on Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash)
- [Gemini 3.1 Pro on Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-1-pro)
- [Gemini 3.1 Pro Model Card](https://deepmind.google/models/model-cards/gemini-3-1-pro/)
- [Gemini Image Models (DeepMind)](https://deepmind.google/models/gemini-image/)

### Blog Posts and Announcements
- [Gemini 3.1 Pro Announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/)
- [Gemini 3 Flash Announcement](https://blog.google/products/gemini/gemini-3-flash/)
- [Nano Banana 2 Developer Guide](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/)
- [Nano Banana 2 Consumer Announcement](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/)
- [Gemini Drop February 2026](https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-february-2026/)

### News Coverage
- [Google Germinates Gemini 3.1 Pro (The Register)](https://www.theregister.com/2026/02/19/google_germinates_gemini_31_pro/)
- [9to5Google: Gemini 3.1 Pro](https://9to5google.com/2026/02/19/google-announces-gemini-3-1-pro-for-complex-problem-solving/)
- [TechCrunch: Gemini 3 Flash Launch](https://techcrunch.com/2025/12/17/google-launches-gemini-3-flash-makes-it-the-default-model-in-the-gemini-app/)
- [TechCrunch: Nano Banana 2 Launch](https://techcrunch.com/2026/02/26/google-launches-nano-banana-2-model-with-faster-image-generation/)
- [Android Central: Nano Banana 2](https://www.androidcentral.com/apps-software/google-announces-nano-banana-2)

---

## Unresolved Questions

1. Will `gemini-pro-latest` alias update to point to `gemini-3.1-pro-preview`? (Likely, but no announcement yet.)
2. When will Gemini 3 Flash and 3.1 Pro reach General Availability (GA/stable)? (Google says "soon" for 3.1 Pro.)
3. Will there be a `gemini-3.1-flash` text model? (Currently only 3.1 Flash Image exists.)
4. Pricing details for Gemini 3 Flash and 3.1 Pro are referenced but not fully enumerated in docs at this time.
5. Whether Gemini 3 Deep Think has a public API model ID or is consumer-app only.
