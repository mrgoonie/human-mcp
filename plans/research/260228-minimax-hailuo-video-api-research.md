# Research Report: Minimax Hailuo Video Generation API

**Date:** 2026-02-28
**Researcher:** Claude Opus 4.6
**Sources consulted:** 25+
**Date range of materials:** 2024-07 to 2026-02

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Methodology](#research-methodology)
3. [API Architecture Overview](#api-architecture-overview)
4. [Authentication](#authentication)
5. [Supported Models](#supported-models)
6. [Video Generation Modes](#video-generation-modes)
7. [Hailuo 2.3 vs 2.3 Fast](#hailuo-23-vs-23-fast)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Request/Response Formats](#requestresponse-formats)
10. [Async Workflow and Polling](#async-workflow-and-polling)
11. [Camera Controls](#camera-controls)
12. [Resolution, Duration, and Aspect Ratios](#resolution-duration-and-aspect-ratios)
13. [Rate Limits](#rate-limits)
14. [Pricing](#pricing)
15. [SDK/Package Ecosystem](#sdkpackage-ecosystem)
16. [Code Examples](#code-examples)
17. [Common Pitfalls](#common-pitfalls)
18. [Resources and References](#resources-and-references)

---

## Executive Summary

MiniMax provides a comprehensive video generation API through its Hailuo model family. The API follows an **asynchronous three-step pattern**: (1) submit a generation task, (2) poll for completion status, (3) retrieve the generated video file. The primary endpoint is `POST https://api.minimax.io/v1/video_generation` for all generation modes, with Bearer token authentication.

**Hailuo 2.3** is the latest production model supporting both text-to-video (T2V) and image-to-video (I2V), with resolutions up to 1080P and durations of 6s or 10s. **Hailuo 2.3 Fast** is a speed-optimized variant (I2V only) that costs ~50% less and generates faster, ideal for drafts and batch work. Both models support 15 camera movement commands via bracket syntax in prompts.

The API is straightforward to integrate. No official JavaScript/TypeScript SDK exists for direct REST usage, but MiniMax provides an official MCP (Model Context Protocol) package (`minimax-mcp-js`) and an unofficial Python library exists. Direct HTTP integration is the recommended approach for custom applications.

---

## Research Methodology

- **Primary sources:** Official MiniMax API documentation at `platform.minimax.io`
- **Secondary sources:** AIML API docs, fal.ai model pages, Kie.ai, Replicate, community blogs
- **Code references:** MiniMax-MCP-JS GitHub repository, community implementations
- **Key search terms:** "Minimax Hailuo API", "video-01 API", "Hailuo 2.3", "MiniMax video generation", "minimax-mcp-js"

---

## API Architecture Overview

```
                    Minimax Video Generation Flow
                    ==============================

  Client                        MiniMax API
    |                               |
    |  POST /v1/video_generation    |
    |------------------------------>|
    |  { model, prompt, ... }       |
    |                               |
    |  Response: { task_id }        |
    |<------------------------------|
    |                               |
    |  GET /v1/query/video_gen      |   (poll every 10s)
    |------------------------------>|
    |  { status: "Processing" }     |
    |<------------------------------|
    |           ...                 |
    |  GET /v1/query/video_gen      |
    |------------------------------>|
    |  { status: "Success",         |
    |    file_id: "..." }           |
    |<------------------------------|
    |                               |
    |  GET /v1/files/retrieve       |
    |------------------------------>|
    |  { file: { download_url } }   |
    |<------------------------------|
    |                               |
    |  GET download_url             |
    |------------------------------>|  (MP4 file, valid 9 hours)
    |  <video binary>               |
    |<------------------------------|
```

---

## Authentication

| Property | Value |
|----------|-------|
| Method | Bearer Token |
| Header | `Authorization: Bearer {MINIMAX_API_KEY}` |
| Key source (Global) | https://platform.minimax.io/user-center/basic-information/interface-key |
| Key source (China) | https://platform.minimaxi.com/user-center/basic-information/interface-key |
| API Host (Global) | `https://api.minimax.io` |
| API Host (China) | `https://api.minimaxi.chat` |

**Critical:** API keys are region-specific. Global keys must use `api.minimax.io`; China keys must use `api.minimaxi.chat`. Mismatching results in error code `2049` (Invalid API key).

---

## Supported Models

### Current Models (as of 2026-02)

| Model ID | Modes | Max Resolution | Max Duration | Notes |
|----------|-------|----------------|--------------|-------|
| `MiniMax-Hailuo-2.3` | T2V, I2V | 1080P | 10s (768P) / 6s (1080P) | Latest, best quality |
| `MiniMax-Hailuo-2.3-Fast` | I2V only | 1080P | 10s (768P) / 6s (1080P) | ~50% cheaper, faster |
| `MiniMax-Hailuo-02` | T2V, I2V, FL2V | 1080P | 10s (768P) / 6s (1080P) | Previous gen, supports first+last frame |
| `S2V-01` | Subject-ref | 720P | 6s | Face-consistent video from reference photo |
| `T2V-01-Director` | T2V | 720P | 6s | Legacy, camera control support |
| `T2V-01` | T2V | 720P | 6s | Legacy |
| `I2V-01-Director` | I2V | 720P | 6s | Legacy, camera control |
| `I2V-01-live` | I2V | 720P | 6s | Legacy, photo animation |
| `I2V-01` | I2V | 720P | 6s | Legacy |

### Model Evolution

```
T2V-01 / I2V-01  -->  Hailuo-02  -->  Hailuo 2.3  -->  Hailuo 2.3 Fast
   (720P, 6s)        (1080P, 10s)    (improved quality)  (speed optimized)
```

---

## Video Generation Modes

### 1. Text-to-Video (T2V)
Generate video from text prompt alone. Supported by Hailuo 2.3, Hailuo 02, T2V-01-Director, T2V-01.

### 2. Image-to-Video (I2V)
Provide a first frame image + optional text prompt. Supported by Hailuo 2.3, Hailuo 2.3 Fast, Hailuo 02, I2V-01-Director, I2V-01-live, I2V-01.

### 3. First-and-Last-Frame (FL2V)
Provide opening and closing frame images + optional prompt. Supported by Hailuo 02 only. If first and last frames differ in size, last frame is cropped to match first.

### 4. Subject-Reference (S2V)
Provide a face/character reference photo + prompt for identity-consistent video. Supported by S2V-01 only. Single reference image, `type: "character"` only.

---

## Hailuo 2.3 vs 2.3 Fast

| Feature | Hailuo 2.3 | Hailuo 2.3 Fast |
|---------|-----------|-----------------|
| **Generation Modes** | T2V + I2V | I2V only |
| **Quality** | Maximum visual fidelity | Strong visual quality, slightly reduced |
| **Speed** | Standard (4-5 min for 6s, 8-9 min for 10s) | Noticeably faster |
| **Cost** | Standard pricing | ~50% cheaper |
| **Resolution** | 768P, 1080P | 768P, 1080P |
| **Duration** | 6s, 10s | 6s, 10s |
| **Camera Controls** | 15 commands supported | 15 commands supported |
| **Best For** | Final/polished content, campaigns, cinematic shots | Drafts, previews, batch automation, storyboards |
| **Same Pipeline** | Yes | Yes (same architecture, optimized for speed) |

**Recommended Workflow:** Use 2.3 Fast for iteration/drafts, switch to 2.3 for final renders.

---

## API Endpoints Reference

### 1. Create Video Generation Task

```
POST https://api.minimax.io/v1/video_generation
Content-Type: application/json
Authorization: Bearer {API_KEY}
```

### 2. Query Task Status

```
GET https://api.minimax.io/v1/query/video_generation?task_id={TASK_ID}
Authorization: Bearer {API_KEY}
```

### 3. Retrieve File

```
GET https://api.minimax.io/v1/files/retrieve?file_id={FILE_ID}
Authorization: Bearer {API_KEY}
```

---

## Request/Response Formats

### Text-to-Video Request

```json
{
  "model": "MiniMax-Hailuo-2.3",
  "prompt": "A stylish woman walks down a Tokyo street filled with warm glowing neon and animated city signage. [Tracking shot]",
  "prompt_optimizer": true,
  "fast_pretreatment": false,
  "duration": 6,
  "resolution": "1080P",
  "callback_url": "https://your-server.com/webhook"
}
```

### Image-to-Video Request

```json
{
  "model": "MiniMax-Hailuo-2.3",
  "first_frame_image": "https://example.com/start-frame.jpg",
  "prompt": "The character starts walking forward through a busy market. [Push in]",
  "prompt_optimizer": true,
  "duration": 6,
  "resolution": "768P"
}
```

### Image-to-Video Request (Base64)

```json
{
  "model": "MiniMax-Hailuo-2.3-Fast",
  "first_frame_image": "data:image/jpeg;base64,/9j/4AAQ...",
  "prompt": "Camera slowly zooms out revealing the landscape",
  "duration": 6,
  "resolution": "768P"
}
```

### First-and-Last-Frame Request

```json
{
  "model": "MiniMax-Hailuo-02",
  "first_frame_image": "https://example.com/start.jpg",
  "last_frame_image": "https://example.com/end.jpg",
  "prompt": "Smooth transition from day to night",
  "duration": 6,
  "resolution": "768P"
}
```

### Subject-Reference Request

```json
{
  "model": "S2V-01",
  "prompt": "A person walking through a futuristic city",
  "subject_reference": [
    {
      "type": "character",
      "image": ["https://example.com/face-reference.jpg"]
    }
  ]
}
```

### Task Creation Response

```json
{
  "task_id": "176843862716480",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### Task Status Query Response (Success)

```json
{
  "task_id": "176843862716480",
  "status": "Success",
  "file_id": "176844028768320",
  "video_width": 1920,
  "video_height": 1080,
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### File Retrieve Response

```json
{
  "file": {
    "file_id": "176844028768320",
    "download_url": "https://cdn.minimax.io/..."
  },
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1002` | Rate limit exceeded |
| `1004` | Authentication failed |
| `1008` | Insufficient balance |
| `1026` | Sensitive input content detected |
| `1027` | Sensitive output content detected |
| `2013` | Invalid parameters |
| `2049` | Invalid API key |

---

## Async Workflow and Polling

### Task Status Values

| Status | Description |
|--------|-------------|
| `Preparing` | Initial preparation phase |
| `Queueing` | Waiting in queue |
| `Processing` | Actively generating video |
| `Success` | Task completed successfully |
| `Fail` | Task failed |

### Polling Best Practices

- **Recommended interval:** 10 seconds between polls
- **Expected generation times:**
  - 6-second video: ~4-5 minutes
  - 10-second video: ~8-9 minutes
  - 2.3 Fast: noticeably less than the above
- **Download URL validity:** 9 hours (32,400 seconds) from generation
- **Max timeout recommendation:** 15 minutes before considering task failed

### Callback/Webhook Alternative

Instead of polling, provide `callback_url` in the request:

1. MiniMax sends a POST with a `challenge` field for validation
2. Server must echo the challenge value within 3 seconds
3. After validation, MiniMax pushes status updates matching the query response format
4. Statuses pushed: `processing`, `success`, `failed`

---

## Camera Controls

### Supported Camera Commands (15 total)

Use `[command]` syntax within prompts. Supported on Hailuo 2.3, Hailuo 02, and Director models.

| Category | Commands |
|----------|----------|
| **Horizontal Movement** | `[Truck left]`, `[Truck right]` |
| **Horizontal Rotation** | `[Pan left]`, `[Pan right]` |
| **Depth Movement** | `[Push in]`, `[Pull out]` |
| **Vertical Movement** | `[Pedestal up]`, `[Pedestal down]` |
| **Vertical Rotation** | `[Tilt up]`, `[Tilt down]` |
| **Lens** | `[Zoom in]`, `[Zoom out]` |
| **Effect** | `[Shake]` |
| **Following** | `[Tracking shot]` |
| **Stationary** | `[Static shot]` |

### Usage Rules

- Combine up to **3 commands** per bracket for simultaneous execution: `[Pan left, Pedestal up, Zoom in]`
- Sequential movements: place commands at different points in the prompt
- Example: `"The character walks forward [Push in], then stops and looks up [Tilt up]"`

---

## Resolution, Duration, and Aspect Ratios

### Resolution x Duration Matrix

| Model | 512P | 720P | 768P | 1080P |
|-------|------|------|------|-------|
| **Hailuo 2.3** | -- | -- | 6s, 10s | 6s |
| **Hailuo 2.3 Fast** | -- | -- | 6s, 10s | 6s |
| **Hailuo 02** | 6s, 10s | -- | 6s, 10s | 6s |
| **S2V-01** | -- | 6s | -- | -- |
| **T2V-01** | -- | 6s | -- | -- |
| **I2V-01** | -- | 6s | -- | -- |

### Aspect Ratios

- For T2V: The model determines aspect ratio based on prompt content (defaults to 16:9 landscape)
- For I2V: Aspect ratio is determined by the input image
- **Supported input image ratios:** Between 2:5 and 5:2 (covers 16:9, 9:16, 1:1, 4:3, 3:4, etc.)
- **Common outputs:** 16:9 (landscape), 9:16 (portrait/mobile), 1:1 (square)

### Image Input Requirements

| Property | Requirement |
|----------|-------------|
| Formats | JPG, JPEG, PNG, WebP |
| Max file size | 20MB |
| Min dimension | Short side > 300px |
| Aspect ratio range | 2:5 to 5:2 |
| Input method | Public URL or Base64 Data URL |

### Video Output

| Property | Value |
|----------|-------|
| Format | MP4 |
| Frame rate | 25 FPS |
| Delivery | HTTP download URL (valid 9 hours) |

---

## Rate Limits

| Service | RPM (Requests Per Minute) |
|---------|---------------------------|
| Video Generation (all models) | **5 RPM** |
| Image Generation | 10 RPM |
| Text-to-Audio | 60 RPM |
| Text API | 500 RPM |

For higher limits, contact MiniMax business team at `api@minimax.io`.

---

## Pricing

### Direct MiniMax API (Unit-based)

| Configuration | Units Consumed |
|---------------|---------------|
| 768P, 6s | 1 unit |
| 768P, 10s | 2 units |
| 1080P, 6s | 2 units |
| 512P, 6s | 0.3 units |
| 512P, 10s | 0.5 units |

### Approximate USD Costs (via third-party platforms)

| Configuration | Hailuo 2.3 | Hailuo 2.3 Fast |
|---------------|-----------|-----------------|
| 768P, 6s | ~$0.25 | ~$0.15 |
| 768P, 10s | ~$0.52 | ~$0.26 |
| 1080P, 6s | ~$0.50 | ~$0.30 |

*Note: Pricing varies by platform. Hailuo 2.3 maintains price parity with Hailuo 02. Hailuo 2.3 Fast is ~50% cheaper.*

---

## SDK/Package Ecosystem

### Official Packages

| Package | Language | Purpose |
|---------|----------|---------|
| [`minimax-mcp-js`](https://www.npmjs.com/package/minimax-mcp-js) | JavaScript/TypeScript | MCP server for Claude Desktop integration; includes video generation |
| [MiniMax-MCP](https://github.com/MiniMax-AI/MiniMax-MCP) | Python | Official MCP server (Python version) |

### Unofficial/Third-party

| Package | Language | Purpose |
|---------|----------|---------|
| [`minimax-python`](https://github.com/jesuscopado/minimax-python) | Python | Unofficial Python client library |
| [fal.ai SDK](https://fal.ai/models/fal-ai/minimax/) | JS/Python | Third-party proxy with simplified API |
| [AIML API](https://aimlapi.com) | REST | Third-party unified API gateway |
| [Replicate](https://replicate.com/minimax/) | REST/JS/Python | Third-party model hosting |

### No Official REST SDK

MiniMax does not provide an official JavaScript or Python REST SDK for direct API usage. The `minimax-mcp-js` package is specifically for MCP integration. **For custom applications, use direct HTTP requests** (fetch, axios, or similar).

---

## Code Examples

### TypeScript/JavaScript - Complete Workflow

```typescript
import axios from "axios";
import * as fs from "fs";

const API_KEY = process.env.MINIMAX_API_KEY!;
const BASE_URL = "https://api.minimax.io/v1";
const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ---- Step 1: Create Video Generation Task ----

interface CreateTaskResponse {
  task_id: string;
  base_resp: { status_code: number; status_msg: string };
}

async function createTextToVideoTask(
  prompt: string,
  options: {
    model?: string;
    duration?: number;
    resolution?: string;
    promptOptimizer?: boolean;
  } = {}
): Promise<string> {
  const payload = {
    model: options.model ?? "MiniMax-Hailuo-2.3",
    prompt,
    prompt_optimizer: options.promptOptimizer ?? true,
    duration: options.duration ?? 6,
    resolution: options.resolution ?? "1080P",
  };

  const response = await axios.post<CreateTaskResponse>(
    `${BASE_URL}/video_generation`,
    payload,
    { headers: HEADERS }
  );

  if (response.data.base_resp.status_code !== 0) {
    throw new Error(
      `Task creation failed: ${response.data.base_resp.status_msg}`
    );
  }

  return response.data.task_id;
}

async function createImageToVideoTask(
  imageUrl: string,
  prompt?: string,
  options: {
    model?: string;
    duration?: number;
    resolution?: string;
  } = {}
): Promise<string> {
  const payload: Record<string, unknown> = {
    model: options.model ?? "MiniMax-Hailuo-2.3",
    first_frame_image: imageUrl,
    duration: options.duration ?? 6,
    resolution: options.resolution ?? "768P",
  };

  if (prompt) {
    payload.prompt = prompt;
  }

  const response = await axios.post<CreateTaskResponse>(
    `${BASE_URL}/video_generation`,
    payload,
    { headers: HEADERS }
  );

  if (response.data.base_resp.status_code !== 0) {
    throw new Error(
      `Task creation failed: ${response.data.base_resp.status_msg}`
    );
  }

  return response.data.task_id;
}

// ---- Step 2: Poll for Task Completion ----

type TaskStatus = "Preparing" | "Queueing" | "Processing" | "Success" | "Fail";

interface QueryTaskResponse {
  task_id: string;
  status: TaskStatus;
  file_id?: string;
  video_width?: number;
  video_height?: number;
  base_resp: { status_code: number; status_msg: string };
}

async function pollTaskStatus(
  taskId: string,
  pollIntervalMs: number = 10_000,
  maxAttempts: number = 90
): Promise<{ fileId: string; width: number; height: number }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await axios.get<QueryTaskResponse>(
      `${BASE_URL}/query/video_generation`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: { task_id: taskId },
      }
    );

    const { status, file_id, video_width, video_height } = response.data;

    console.log(
      `[Attempt ${attempt + 1}/${maxAttempts}] Status: ${status}`
    );

    if (status === "Success" && file_id) {
      return {
        fileId: file_id,
        width: video_width ?? 0,
        height: video_height ?? 0,
      };
    }

    if (status === "Fail") {
      throw new Error(
        `Video generation failed: ${response.data.base_resp.status_msg}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Polling timed out");
}

// ---- Step 3: Retrieve Download URL ----

interface FileRetrieveResponse {
  file: { file_id: string; download_url: string };
  base_resp: { status_code: number; status_msg: string };
}

async function getDownloadUrl(fileId: string): Promise<string> {
  const response = await axios.get<FileRetrieveResponse>(
    `${BASE_URL}/files/retrieve`,
    {
      headers: { Authorization: `Bearer ${API_KEY}` },
      params: { file_id: fileId },
    }
  );

  return response.data.file.download_url;
}

// ---- Step 4: Download Video File ----

async function downloadVideo(
  downloadUrl: string,
  outputPath: string
): Promise<void> {
  const response = await axios.get(downloadUrl, {
    responseType: "stream",
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// ---- Main Usage ----

async function generateVideo(): Promise<void> {
  // Text-to-Video example
  const taskId = await createTextToVideoTask(
    "A golden retriever playing fetch in a sunlit park. [Tracking shot]",
    { duration: 6, resolution: "1080P" }
  );

  console.log(`Task created: ${taskId}`);

  const { fileId, width, height } = await pollTaskStatus(taskId);
  console.log(`Video ready: ${width}x${height}, file: ${fileId}`);

  const downloadUrl = await getDownloadUrl(fileId);
  console.log(`Download URL: ${downloadUrl}`);

  await downloadVideo(downloadUrl, "./output.mp4");
  console.log("Video saved to ./output.mp4");
}

generateVideo().catch(console.error);
```

### Node.js with fetch (no dependencies)

```javascript
const API_KEY = process.env.MINIMAX_API_KEY;
const BASE = "https://api.minimax.io/v1";

async function minimaxVideoGenerate(prompt, options = {}) {
  // Step 1: Create task
  const createRes = await fetch(`${BASE}/video_generation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || "MiniMax-Hailuo-2.3",
      prompt,
      duration: options.duration || 6,
      resolution: options.resolution || "1080P",
      prompt_optimizer: options.promptOptimizer ?? true,
      ...(options.firstFrameImage && {
        first_frame_image: options.firstFrameImage,
      }),
    }),
  });

  const { task_id, base_resp } = await createRes.json();
  if (base_resp.status_code !== 0) {
    throw new Error(`Create failed: ${base_resp.status_msg}`);
  }

  // Step 2: Poll status
  let fileId;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 10000));

    const statusRes = await fetch(
      `${BASE}/query/video_generation?task_id=${task_id}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    const statusData = await statusRes.json();

    if (statusData.status === "Success") {
      fileId = statusData.file_id;
      break;
    }
    if (statusData.status === "Fail") {
      throw new Error("Generation failed");
    }
  }

  if (!fileId) throw new Error("Polling timed out");

  // Step 3: Get download URL
  const fileRes = await fetch(
    `${BASE}/files/retrieve?file_id=${fileId}`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  const fileData = await fileRes.json();

  return fileData.file.download_url;
}
```

### Python - Complete Example

```python
import os
import time
import requests

API_KEY = os.environ["MINIMAX_API_KEY"]
BASE_URL = "https://api.minimax.io/v1"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}


def generate_video(
    prompt: str,
    model: str = "MiniMax-Hailuo-2.3",
    duration: int = 6,
    resolution: str = "1080P",
    first_frame_image: str | None = None,
) -> str:
    """Generate video and return download URL."""

    # Step 1: Create task
    payload = {
        "model": model,
        "prompt": prompt,
        "duration": duration,
        "resolution": resolution,
        "prompt_optimizer": True,
    }
    if first_frame_image:
        payload["first_frame_image"] = first_frame_image

    resp = requests.post(
        f"{BASE_URL}/video_generation",
        headers=HEADERS,
        json=payload,
    )
    resp.raise_for_status()
    data = resp.json()

    if data["base_resp"]["status_code"] != 0:
        raise Exception(f"Create failed: {data['base_resp']['status_msg']}")

    task_id = data["task_id"]
    print(f"Task created: {task_id}")

    # Step 2: Poll status
    for attempt in range(90):
        time.sleep(10)
        resp = requests.get(
            f"{BASE_URL}/query/video_generation",
            headers={"Authorization": f"Bearer {API_KEY}"},
            params={"task_id": task_id},
        )
        result = resp.json()
        status = result.get("status")
        print(f"[{attempt+1}] Status: {status}")

        if status == "Success":
            file_id = result["file_id"]
            break
        elif status == "Fail":
            raise Exception("Video generation failed")
    else:
        raise Exception("Polling timed out")

    # Step 3: Retrieve download URL
    resp = requests.get(
        f"{BASE_URL}/files/retrieve",
        headers={"Authorization": f"Bearer {API_KEY}"},
        params={"file_id": file_id},
    )
    download_url = resp.json()["file"]["download_url"]
    print(f"Download URL: {download_url}")

    return download_url


if __name__ == "__main__":
    url = generate_video(
        "A cat sitting on a windowsill watching rain. [Static shot]",
        duration=6,
        resolution="1080P",
    )
    # Download the video
    video = requests.get(url)
    with open("output.mp4", "wb") as f:
        f.write(video.content)
    print("Saved to output.mp4")
```

---

## Common Pitfalls

### 1. Region/Key Mismatch
Global API keys **must** use `api.minimax.io`. China keys **must** use `api.minimaxi.chat`. Mixing them returns error `2049`.

### 2. Download URL Expiration
Download URLs expire after **9 hours**. Always download immediately or persist the URL with a TTL.

### 3. Hailuo 2.3 Fast is I2V Only
`MiniMax-Hailuo-2.3-Fast` does **not** support text-to-video. Attempting T2V with this model will return an error. Use `MiniMax-Hailuo-2.3` for T2V.

### 4. 1080P Duration Limit
At 1080P resolution, only 6-second videos are supported. For 10-second videos, use 768P resolution.

### 5. Rate Limit is Low
Video generation is limited to **5 RPM** (5 requests per minute). For batch processing, implement a queue with rate limiting.

### 6. Prompt Length
Prompts are limited to **2000 characters**. Camera commands count toward this limit.

### 7. First-Last Frame Model
First-and-last-frame mode (FL2V) is only supported by `MiniMax-Hailuo-02`, not by Hailuo 2.3.

### 8. Prompt Optimizer
`prompt_optimizer` defaults to `true` and rewrites your prompt for better results. Set to `false` for precise control, especially when using specific camera commands.

---

## Resources and References

### Official Documentation
- [MiniMax API Overview](https://platform.minimax.io/docs/api-reference/api-overview)
- [Video Generation Guide](https://platform.minimax.io/docs/guides/video-generation)
- [T2V API Reference](https://platform.minimax.io/docs/api-reference/video-generation-t2v)
- [I2V API Reference](https://platform.minimax.io/docs/api-reference/video-generation-i2v)
- [FL2V API Reference](https://platform.minimax.io/docs/api-reference/video-generation-fl2v)
- [S2V API Reference](https://platform.minimax.io/docs/api-reference/video-generation-s2v)
- [Query Task Status](https://platform.minimax.io/docs/api-reference/video-generation-query)
- [Rate Limits](https://platform.minimax.io/docs/guides/rate-limits)
- [Pricing](https://platform.minimax.io/docs/guides/pricing)

### Official Announcements
- [Video-01 API Release](https://www.minimax.io/news/video-generation-api)
- [Hailuo 2.3 Announcement](https://www.minimax.io/news/minimax-hailuo-23)
- [S2V-01 Release](https://www.minimax.io/news/s2v-01-release)

### Official SDKs/Tools
- [MiniMax-MCP-JS (npm)](https://www.npmjs.com/package/minimax-mcp-js)
- [MiniMax-MCP-JS (GitHub)](https://github.com/MiniMax-AI/MiniMax-MCP-JS)
- [MiniMax-MCP Python (GitHub)](https://github.com/MiniMax-AI/MiniMax-MCP)

### Third-Party Platforms
- [fal.ai MiniMax Models](https://fal.ai/models/fal-ai/minimax/)
- [Replicate MiniMax](https://replicate.com/minimax/)
- [AIML API Docs](https://docs.aimlapi.com/api-references/video-models/minimax/hailuo-02)
- [Kie.ai Hailuo 2.3 Guide](https://kie.ai/hailuo-2-3)

### Community Resources
- [Unofficial Python Library](https://github.com/jesuscopado/minimax-python)
- [MiniMax GitHub Topics](https://github.com/topics/minimax)

---

## Unresolved Questions

1. **Exact Hailuo 2.3 Fast generation time** -- no official benchmarks found; described only as "noticeably faster" than standard 2.3.
2. **T2V aspect ratio control** -- unclear whether text-to-video allows explicit aspect ratio specification or only infers from prompt. I2V inherits from input image.
3. **Webhook callback payload format** -- documented that it "matches the query response format" but exact JSON structure not found in official docs.
4. **Direct API pricing in USD** -- MiniMax uses a unit/credit system; exact USD-per-unit rate on the direct API (not third-party) not publicly documented. Contact `api@minimax.io`.
5. **Hailuo 2.3 Fast T2V support timeline** -- currently I2V only; no announced date for T2V support.
