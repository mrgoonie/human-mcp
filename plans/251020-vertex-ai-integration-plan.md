# Vertex AI Integration Plan

**Date:** 2025-10-20
**Status:** Planning Phase
**Priority:** Medium
**Estimated Effort:** 4-6 hours

## Overview

This plan outlines the implementation for adding Vertex AI support to the Human MCP server. Currently, the project uses Google AI Studio (Gemini Developer API) with API key authentication. This enhancement will allow users to optionally use Google Cloud's Vertex AI instead, which provides enterprise-grade features, better quota management, and integration with GCP infrastructure.

### Key Objectives

1. Add optional Vertex AI support without breaking existing Google AI Studio functionality
2. Implement environment variable configuration for switching between providers
3. Maintain backward compatibility with existing installations
4. Support both authentication methods seamlessly
5. Update documentation and examples

## Requirements

### Functional Requirements

**FR-1: Environment Variable Configuration**
- Add `USE_VERTEX=1` flag to enable Vertex AI mode (default: disabled)
- Add `VERTEX_PROJECT_ID=YOUR-PROJECT-ID` for GCP project configuration
- Add `VERTEX_LOCATION=us-central1` for GCP region (default: us-central1)
- Maintain backward compatibility when these variables are not set

**FR-2: Authentication Support**
- Support Google AI Studio API key authentication (existing)
- Support Vertex AI authentication via:
  - Application Default Credentials (ADC) - `gcloud auth application-default login`
  - Service Account JSON file via `GOOGLE_APPLICATION_CREDENTIALS`
  - Custom GoogleAuthOptions via configuration

**FR-3: SDK Integration**
- Add `@google-cloud/vertexai` package as dependency
- Create abstraction layer to support both SDKs
- Maintain identical API surface for both providers

**FR-4: Feature Parity**
- All existing features must work with Vertex AI:
  - Visual analysis (eyes tools)
  - Document processing
  - Speech generation (mouth tools)
  - Image generation (hands tools)
  - Video generation (hands tools)
  - Advanced reasoning (brain tools)

### Non-Functional Requirements

**NFR-1: Performance**
- No performance degradation when using Google AI Studio
- Vertex AI should provide similar or better performance
- Lazy initialization to avoid unnecessary overhead

**NFR-2: Error Handling**
- Clear error messages indicating which provider is being used
- Helpful guidance when authentication fails
- Graceful fallback behavior when possible

**NFR-3: Security**
- Never log or expose API keys or service account credentials
- Follow GCP security best practices for Vertex AI
- Support all standard GCP authentication methods

**NFR-4: Documentation**
- Update README with Vertex AI setup instructions
- Provide examples for both authentication methods
- Include troubleshooting guide

## Architecture

### Current Architecture

```
┌─────────────────────┐
│   MCP Tools         │
│   (Eyes, Hands,     │
│    Mouth, Brain)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GeminiClient       │
│  (gemini-client.ts) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ GoogleGenerativeAI  │
│ (@google/           │
│  generative-ai)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Google AI Studio    │
│ (API Key Auth)      │
└─────────────────────┘
```

### Proposed Architecture

```
┌─────────────────────┐
│   MCP Tools         │
│   (Eyes, Hands,     │
│    Mouth, Brain)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  GeminiClient (Abstraction Layer)   │
│  - getModel()                        │
│  - analyzeContent()                  │
│  - processDocument()                 │
│  - generateSpeech()                  │
│  - generateImage()                   │
│  - generateVideo()                   │
└────────┬──────────────────┬──────────┘
         │                  │
         ▼                  ▼
┌──────────────────┐ ┌──────────────────┐
│ Google AI Studio │ │   Vertex AI      │
│   Provider       │ │    Provider      │
├──────────────────┤ ├──────────────────┤
│ - API Key Auth   │ │ - ADC Auth       │
│ - Simple Setup   │ │ - Service Acct   │
│ - Quick Start    │ │ - Custom Auth    │
└────────┬─────────┘ └────────┬─────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐ ┌──────────────────┐
│@google/          │ │@google-cloud/    │
│generative-ai     │ │vertexai          │
└──────────────────┘ └──────────────────┘
```

## Research Findings

### Key Differences: Vertex AI vs Google AI Studio

**Google AI Studio (Current Implementation)**
- Uses `@google/generative-ai` npm package
- Simple API key authentication via `GOOGLE_GEMINI_API_KEY`
- Quick setup for development and prototyping
- Free tier with rate limits
- No GCP project required
- Direct API endpoint: `generativelanguage.googleapis.com`

**Vertex AI**
- Uses `@google-cloud/vertexai` npm package
- Requires GCP project and location
- Multiple authentication methods (ADC, Service Account, Custom)
- Enterprise-grade quotas and SLAs
- Integration with GCP services (Monitoring, Logging, IAM)
- Endpoint format: `{location}-aiplatform.googleapis.com`
- Better for production deployments

### Authentication Comparison

| Feature | Google AI Studio | Vertex AI |
|---------|-----------------|-----------|
| Setup Complexity | Low | Medium |
| Authentication | API Key | ADC / Service Account / Custom |
| GCP Project Required | No | Yes |
| Environment Variables | `GOOGLE_GEMINI_API_KEY` | `VERTEX_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` |
| Initialization | `new GoogleGenerativeAI(apiKey)` | `new VertexAI({project, location, googleAuthOptions})` |
| Best For | Development, Prototyping | Production, Enterprise |

### SDK Initialization Examples

**Google AI Studio (Current)**
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```

**Vertex AI (New)**
```javascript
import { VertexAI } from "@google-cloud/vertexai";

// Option 1: Default authentication (ADC)
const vertexAI = new VertexAI({
  project: process.env.VERTEX_PROJECT_ID,
  location: process.env.VERTEX_LOCATION || "us-central1"
});

// Option 2: Custom authentication
const vertexAI = new VertexAI({
  project: process.env.VERTEX_PROJECT_ID,
  location: "us-central1",
  googleAuthOptions: {
    credentials: {
      client_email: process.env.CLIENT_EMAIL,
      private_key: process.env.PRIVATE_KEY
    }
  }
});

const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```

### API Compatibility

Both SDKs provide similar APIs for:
- `generateContent()` - Single response generation
- `generateContentStream()` - Streaming responses
- `startChat()` - Multi-turn conversations
- Model configuration (safetySettings, generationConfig, etc.)

**Key Differences:**
- Model names are identical between providers
- Request/response structures are compatible
- Safety settings and generation configs work the same
- File/media handling is identical (inline data, file URIs)

## Implementation Plan

### Phase 1: Configuration & Dependencies

**Step 1.1: Update package.json**

Add Vertex AI SDK as dependency:

```json
{
  "dependencies": {
    "@google-cloud/vertexai": "^1.7.0",
    "@google/generative-ai": "^0.21.0",
    // ... existing dependencies
  }
}
```

**Step 1.2: Update Configuration Schema**

File: `src/utils/config.ts`

Add Vertex AI configuration to ConfigSchema:

```typescript
const ConfigSchema = z.object({
  gemini: z.object({
    apiKey: z.string().optional(), // Make optional since Vertex AI doesn't need it
    model: z.string().default("gemini-2.5-flash"),
    imageModel: z.string().default("gemini-2.5-flash-image-preview"),
    // New Vertex AI fields
    useVertexAI: z.boolean().default(false),
    vertexProjectId: z.string().optional(),
    vertexLocation: z.string().default("us-central1"),
  }),
  // ... rest of config
});
```

Update `loadConfig()` function:

```typescript
export function loadConfig(): Config {
  // Check if using Vertex AI
  const useVertexAI = process.env.USE_VERTEX === "1" || process.env.USE_VERTEX === "true";

  return ConfigSchema.parse({
    gemini: {
      // API key is optional when using Vertex AI
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
      model: process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash",
      imageModel: process.env.GOOGLE_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview",
      // Vertex AI config
      useVertexAI,
      vertexProjectId: process.env.VERTEX_PROJECT_ID,
      vertexLocation: process.env.VERTEX_LOCATION || "us-central1",
    },
    // ... rest of config
  });
}
```

**Step 1.3: Update .env.example**

File: `.env.example`

Add Vertex AI configuration section:

```bash
# Gemini API Configuration
# Option 1: Google AI Studio (Default - Quick Start)
GOOGLE_GEMINI_API_KEY=your_api_key_here
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
GOOGLE_GEMINI_IMAGE_MODEL=gemini-2.5-flash-image-preview

# Option 2: Vertex AI (Enterprise - GCP Integration)
# Uncomment and configure to use Vertex AI instead of Google AI Studio
# USE_VERTEX=1
# VERTEX_PROJECT_ID=your-gcp-project-id
# VERTEX_LOCATION=us-central1

# Vertex AI Authentication Options:
# 1. Application Default Credentials (ADC): Run `gcloud auth application-default login`
# 2. Service Account: Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# 3. Custom Auth: Configure googleAuthOptions in code (advanced)

# ... rest of .env.example
```

### Phase 2: GeminiClient Refactoring

**Step 2.1: Create Provider Interface**

File: `src/tools/eyes/utils/gemini-provider.ts` (new file)

```typescript
import { GenerativeModel } from "@google/generative-ai";

/**
 * Provider interface for Gemini API
 * Abstracts Google AI Studio and Vertex AI implementations
 */
export interface IGeminiProvider {
  /**
   * Get a generative model for text/multimodal tasks
   */
  getGenerativeModel(params: {
    model: string;
    safetySettings?: any[];
    generationConfig?: any;
    systemInstruction?: any;
  }): GenerativeModel;

  /**
   * Get provider type
   */
  getProviderType(): "google-ai-studio" | "vertex-ai";

  /**
   * Get provider display name for logging
   */
  getProviderName(): string;
}
```

**Step 2.2: Implement Google AI Studio Provider**

File: `src/tools/eyes/utils/providers/google-ai-studio-provider.ts` (new file)

```typescript
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { IGeminiProvider } from "../gemini-provider.js";
import { APIError } from "@/utils/errors.js";
import { logger } from "@/utils/logger.js";

export class GoogleAIStudioProvider implements IGeminiProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new APIError("Google Gemini API key is required for Google AI Studio provider");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    logger.info("Initialized Google AI Studio provider");
  }

  getGenerativeModel(params: {
    model: string;
    safetySettings?: any[];
    generationConfig?: any;
    systemInstruction?: any;
  }): GenerativeModel {
    return this.genAI.getGenerativeModel({
      model: params.model,
      safetySettings: params.safetySettings,
      generationConfig: params.generationConfig,
      systemInstruction: params.systemInstruction,
    });
  }

  getProviderType(): "google-ai-studio" {
    return "google-ai-studio";
  }

  getProviderName(): string {
    return "Google AI Studio";
  }
}
```

**Step 2.3: Implement Vertex AI Provider**

File: `src/tools/eyes/utils/providers/vertex-ai-provider.ts` (new file)

```typescript
import { VertexAI } from "@google-cloud/vertexai";
import { GenerativeModel } from "@google/generative-ai";
import { IGeminiProvider } from "../gemini-provider.js";
import { APIError } from "@/utils/errors.js";
import { logger } from "@/utils/logger.js";

export class VertexAIProvider implements IGeminiProvider {
  private vertexAI: VertexAI;

  constructor(projectId: string, location: string = "us-central1", googleAuthOptions?: any) {
    if (!projectId) {
      throw new APIError("Vertex AI project ID is required. Set VERTEX_PROJECT_ID environment variable.");
    }

    try {
      this.vertexAI = new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: googleAuthOptions,
      });
      logger.info(`Initialized Vertex AI provider (project: ${projectId}, location: ${location})`);
    } catch (error) {
      logger.error("Failed to initialize Vertex AI provider:", error);
      throw new APIError(
        `Failed to initialize Vertex AI: ${error instanceof Error ? error.message : "Unknown error"}. ` +
        "Check your VERTEX_PROJECT_ID, authentication, and GCP permissions."
      );
    }
  }

  getGenerativeModel(params: {
    model: string;
    safetySettings?: any[];
    generationConfig?: any;
    systemInstruction?: any;
  }): GenerativeModel {
    return this.vertexAI.getGenerativeModel({
      model: params.model,
      safetySettings: params.safetySettings,
      generationConfig: params.generationConfig,
      systemInstruction: params.systemInstruction,
    }) as GenerativeModel;
  }

  getProviderType(): "vertex-ai" {
    return "vertex-ai";
  }

  getProviderName(): string {
    return "Vertex AI";
  }
}
```

**Step 2.4: Update GeminiClient to Use Providers**

File: `src/tools/eyes/utils/gemini-client.ts`

Key changes:

```typescript
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { IGeminiProvider } from "./gemini-provider.js";
import { GoogleAIStudioProvider } from "./providers/google-ai-studio-provider.js";
import { VertexAIProvider } from "./providers/vertex-ai-provider.js";
import type { Config } from "@/utils/config";
import { logger } from "@/utils/logger";
import { APIError } from "@/utils/errors";

export class GeminiClient {
  private provider: IGeminiProvider;
  private documentCache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(private config: Config) {
    // Initialize the appropriate provider based on configuration
    if (config.gemini.useVertexAI) {
      // Vertex AI mode
      if (!config.gemini.vertexProjectId) {
        throw new APIError(
          "Vertex AI mode enabled (USE_VERTEX=1) but VERTEX_PROJECT_ID is not set. " +
          "Please set VERTEX_PROJECT_ID environment variable."
        );
      }

      this.provider = new VertexAIProvider(
        config.gemini.vertexProjectId,
        config.gemini.vertexLocation
      );

      logger.info(`Using Vertex AI (project: ${config.gemini.vertexProjectId}, location: ${config.gemini.vertexLocation})`);
    } else {
      // Google AI Studio mode (default)
      if (!config.gemini.apiKey) {
        throw new APIError(
          "Google Gemini API key is required. Set GOOGLE_GEMINI_API_KEY environment variable. " +
          "Alternatively, enable Vertex AI by setting USE_VERTEX=1 and VERTEX_PROJECT_ID."
        );
      }

      this.provider = new GoogleAIStudioProvider(config.gemini.apiKey);
      logger.info("Using Google AI Studio");
    }
  }

  getModel(detailLevel: "quick" | "detailed"): GenerativeModel {
    const modelName = detailLevel === "detailed"
      ? this.config.gemini.model
      : "gemini-2.5-flash";

    return this.provider.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  getImageGenerationModel(modelName?: string): GenerativeModel {
    const imageModelName = modelName || this.config.gemini.imageModel || "gemini-2.5-flash-image-preview";

    return this.provider.getGenerativeModel({
      model: imageModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  getDocumentModel(): GenerativeModel {
    return this.provider.getGenerativeModel({
      model: this.config.documentProcessing.geminiModel,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  getSpeechModel(modelName?: string): GenerativeModel {
    const speechModelName = modelName || "gemini-2.5-flash-preview-tts";

    return this.provider.getGenerativeModel({
      model: speechModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  getVideoGenerationModel(modelName?: string): GenerativeModel {
    const videoModelName = modelName || "veo-3.0-generate-001";

    return this.provider.getGenerativeModel({
      model: videoModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  /**
   * Get provider information for logging and debugging
   */
  getProviderInfo(): { type: string; name: string } {
    return {
      type: this.provider.getProviderType(),
      name: this.provider.getProviderName()
    };
  }

  // ... rest of the methods remain unchanged ...
}
```

### Phase 3: Update Image & Video Generators

**Step 3.1: Update Image Generator Error Messages**

File: `src/tools/hands/processors/image-generator.ts`

Update error messages to reflect dual provider support:

```typescript
// Around line 161
if (error.message.includes("API key")) {
  throw new Error(
    "Authentication failed. " +
    "If using Google AI Studio: Check your GOOGLE_GEMINI_API_KEY environment variable. " +
    "If using Vertex AI: Verify your VERTEX_PROJECT_ID and GCP authentication (gcloud auth or service account)."
  );
}
```

**Step 3.2: Update Video Generator Error Messages**

File: `src/tools/hands/processors/video-generator.ts`

Similar updates to error messages around line 108:

```typescript
if (error.message.includes("API key")) {
  throw new Error(
    "Authentication failed. " +
    "If using Google AI Studio: Check your GOOGLE_GEMINI_API_KEY environment variable. " +
    "If using Vertex AI: Verify your VERTEX_PROJECT_ID and GCP authentication."
  );
}
```

**Step 3.3: Update Image Editor Error Messages**

File: `src/tools/hands/processors/image-editor.ts`

Update authentication error messages around line 174.

### Phase 4: Testing Strategy

**Step 4.1: Unit Tests**

Create test file: `tests/unit/vertex-ai-provider.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { VertexAIProvider } from "@/tools/eyes/utils/providers/vertex-ai-provider";
import { GoogleAIStudioProvider } from "@/tools/eyes/utils/providers/google-ai-studio-provider";

describe("Vertex AI Provider", () => {
  it("should throw error when project ID is missing", () => {
    expect(() => {
      new VertexAIProvider("", "us-central1");
    }).toThrow("Vertex AI project ID is required");
  });

  it("should initialize with valid project ID", () => {
    // This test requires proper GCP credentials
    // Skip in CI unless credentials are available
    if (!process.env.VERTEX_PROJECT_ID) {
      return;
    }

    const provider = new VertexAIProvider(
      process.env.VERTEX_PROJECT_ID,
      "us-central1"
    );

    expect(provider.getProviderType()).toBe("vertex-ai");
    expect(provider.getProviderName()).toBe("Vertex AI");
  });
});

describe("Google AI Studio Provider", () => {
  it("should throw error when API key is missing", () => {
    expect(() => {
      new GoogleAIStudioProvider("");
    }).toThrow("Google Gemini API key is required");
  });

  it("should initialize with valid API key", () => {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return;
    }

    const provider = new GoogleAIStudioProvider(process.env.GOOGLE_GEMINI_API_KEY);

    expect(provider.getProviderType()).toBe("google-ai-studio");
    expect(provider.getProviderName()).toBe("Google AI Studio");
  });
});
```

**Step 4.2: Integration Tests**

Create test file: `tests/integration/vertex-ai-integration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "bun:test";
import { GeminiClient } from "@/tools/eyes/utils/gemini-client";
import { loadConfig } from "@/utils/config";

describe("Vertex AI Integration Tests", () => {
  let geminiClient: GeminiClient;
  let config: any;

  beforeAll(() => {
    // These tests only run when VERTEX_PROJECT_ID is set
    if (!process.env.VERTEX_PROJECT_ID) {
      console.log("Skipping Vertex AI tests - VERTEX_PROJECT_ID not set");
      return;
    }

    // Temporarily enable Vertex AI for testing
    process.env.USE_VERTEX = "1";
    config = loadConfig();
    geminiClient = new GeminiClient(config);
  });

  it("should analyze content with Vertex AI", async () => {
    if (!process.env.VERTEX_PROJECT_ID) return;

    const model = geminiClient.getModel("quick");
    const result = await geminiClient.analyzeContent(
      model,
      "What is 2+2?",
      []
    );

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should report correct provider type", () => {
    if (!process.env.VERTEX_PROJECT_ID) return;

    const providerInfo = geminiClient.getProviderInfo();
    expect(providerInfo.type).toBe("vertex-ai");
    expect(providerInfo.name).toBe("Vertex AI");
  });
});
```

**Step 4.3: Manual Testing Checklist**

Create a testing checklist for manual validation:

1. **Google AI Studio Mode (Default)**
   - [ ] Set `GOOGLE_GEMINI_API_KEY` only
   - [ ] Test eyes_analyze tool
   - [ ] Test gemini_gen_image tool
   - [ ] Test gemini_gen_video tool
   - [ ] Test mouth_speak tool
   - [ ] Test brain_think tool
   - [ ] Verify error messages mention Google AI Studio

2. **Vertex AI Mode**
   - [ ] Set `USE_VERTEX=1` and `VERTEX_PROJECT_ID`
   - [ ] Test with Application Default Credentials (ADC)
   - [ ] Test with Service Account JSON file
   - [ ] Test all tools (eyes, hands, mouth, brain)
   - [ ] Verify error messages mention Vertex AI
   - [ ] Test with different regions (us-central1, europe-west1)

3. **Configuration Validation**
   - [ ] Test with missing `VERTEX_PROJECT_ID` when `USE_VERTEX=1`
   - [ ] Test with missing `GOOGLE_GEMINI_API_KEY` when using Google AI Studio
   - [ ] Test switching between providers
   - [ ] Verify logging shows correct provider

### Phase 5: Documentation Updates

**Step 5.1: Update README.md**

Add new section after "Getting Your Google Gemini API Key":

```markdown
### Choosing Your Gemini Provider

Human MCP supports two ways to access Google's Gemini models:

#### Option 1: Google AI Studio (Default - Recommended for Getting Started)

**Best for:** Quick start, development, prototyping

**Setup:**
1. Get your API key from [Google AI Studio](https://aistudio.google.com/)
2. Set environment variable: `GOOGLE_GEMINI_API_KEY=your_api_key`

**Pros:**
- Simple setup (just one API key)
- No GCP account required
- Free tier available
- Perfect for development and testing

#### Option 2: Vertex AI (Recommended for Production)

**Best for:** Production deployments, enterprise use, GCP integration

**Setup:**
1. Create a GCP project and enable Vertex AI API
2. Set up authentication:
   ```bash
   # Option A: Application Default Credentials (for local dev)
   gcloud auth application-default login

   # Option B: Service Account (for production)
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```
3. Set environment variables:
   ```bash
   export USE_VERTEX=1
   export VERTEX_PROJECT_ID=your-gcp-project-id
   export VERTEX_LOCATION=us-central1  # optional, defaults to us-central1
   ```

**Pros:**
- Enterprise-grade quotas and SLAs
- Better integration with GCP services
- Advanced IAM and security controls
- Usage tracking via Cloud Console
- Better for production workloads

**Configuration Example (Claude Desktop):**

```json
{
  "mcpServers": {
    "human-mcp-vertex": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "USE_VERTEX": "1",
        "VERTEX_PROJECT_ID": "your-gcp-project-id",
        "VERTEX_LOCATION": "us-central1"
      }
    }
  }
}
```

**Note:** With Vertex AI, you don't need `GOOGLE_GEMINI_API_KEY` - authentication is handled by GCP credentials.

#### Vertex AI Authentication Methods

**1. Application Default Credentials (ADC)** - Best for local development
```bash
gcloud auth application-default login
```

**2. Service Account** - Best for production
```bash
# Download service account JSON from GCP Console
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**3. Workload Identity** - Best for GKE deployments
- Automatically configured when running on GKE
- No credentials file needed
- Recommended for Kubernetes deployments

**Troubleshooting Vertex AI:**

If you encounter authentication errors:
1. Verify your GCP project ID: `gcloud config get-value project`
2. Check ADC status: `gcloud auth application-default print-access-token`
3. Ensure Vertex AI API is enabled: Visit [Vertex AI Console](https://console.cloud.google.com/vertex-ai)
4. Verify IAM permissions: Your account needs `Vertex AI User` role

**Cost Considerations:**

Both Google AI Studio and Vertex AI use the same Gemini models and pricing, but:
- Google AI Studio: Generous free tier for testing
- Vertex AI: Production-grade quotas, better for high-volume usage
```

**Step 5.2: Update Environment Configuration Section**

Update the "Environment Variable Setup" section:

```markdown
### Environment Variable Setup

#### For Google AI Studio (Default):
```bash
export GOOGLE_GEMINI_API_KEY="your_api_key_here"
```

#### For Vertex AI:
```bash
# Enable Vertex AI mode
export USE_VERTEX=1
export VERTEX_PROJECT_ID="your-gcp-project-id"
export VERTEX_LOCATION="us-central1"  # optional

# Authenticate (choose one method)
# Method 1: ADC (for local development)
gcloud auth application-default login

# Method 2: Service Account (for production)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```
```

**Step 5.3: Create Vertex AI Troubleshooting Guide**

Create new doc file: `docs/vertex-ai-setup.md`

```markdown
# Vertex AI Setup Guide

## Prerequisites

1. **GCP Account**: You need an active Google Cloud Platform account
2. **GCP Project**: Create or select a project to use
3. **Vertex AI API**: Enable the Vertex AI API in your project
4. **Billing**: Ensure billing is enabled for your project
5. **Permissions**: Your account needs appropriate IAM roles

## Step-by-Step Setup

### 1. Create GCP Project

```bash
# Create new project
gcloud projects create your-project-id --name="Human MCP Project"

# Set as default project
gcloud config set project your-project-id
```

### 2. Enable Vertex AI API

```bash
# Enable the Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Verify it's enabled
gcloud services list --enabled | grep aiplatform
```

### 3. Set Up Authentication

#### Option A: Application Default Credentials (Development)

```bash
# Login with your user account
gcloud auth application-default login

# Verify authentication
gcloud auth application-default print-access-token
```

#### Option B: Service Account (Production)

```bash
# Create service account
gcloud iam service-accounts create human-mcp-sa \
  --display-name="Human MCP Service Account"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:human-mcp-sa@your-project-id.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=human-mcp-sa@your-project-id.iam.gserviceaccount.com

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account-key.json"
```

### 4. Configure Human MCP

```bash
# Set environment variables
export USE_VERTEX=1
export VERTEX_PROJECT_ID="your-project-id"
export VERTEX_LOCATION="us-central1"
```

### 5. Test Connection

```bash
# Start Human MCP
npx @goonnguyen/human-mcp

# The logs should show:
# "Using Vertex AI (project: your-project-id, location: us-central1)"
```

## Common Issues

### Authentication Errors

**Error:** "Failed to initialize Vertex AI: Could not load the default credentials"

**Solution:**
```bash
# Run ADC login
gcloud auth application-default login

# Or set service account credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

### Permission Errors

**Error:** "Permission denied on resource project"

**Solution:**
```bash
# Grant necessary roles
gcloud projects add-iam-policy-binding your-project-id \
  --member="user:your-email@gmail.com" \
  --role="roles/aiplatform.user"
```

### API Not Enabled

**Error:** "API [aiplatform.googleapis.com] not enabled"

**Solution:**
```bash
# Enable the API
gcloud services enable aiplatform.googleapis.com
```

### Wrong Project

**Error:** "Project not found"

**Solution:**
```bash
# Check current project
gcloud config get-value project

# Set correct project
gcloud config set project your-correct-project-id
```

## Regional Considerations

Vertex AI is available in multiple regions. Common options:

- `us-central1` - Iowa, USA (default)
- `us-east4` - Virginia, USA
- `us-west1` - Oregon, USA
- `europe-west1` - Belgium
- `europe-west4` - Netherlands
- `asia-northeast1` - Tokyo, Japan
- `asia-southeast1` - Singapore

Choose a region close to your users or infrastructure for best performance.

```bash
export VERTEX_LOCATION="europe-west1"
```

## Cost Management

1. **Set up billing alerts** in GCP Console
2. **Monitor usage** via Cloud Console > Vertex AI > Dashboard
3. **Use quotas** to prevent unexpected charges
4. **Enable budget alerts** for your project

## Security Best Practices

1. **Use service accounts** for production deployments
2. **Enable audit logging** to track API usage
3. **Implement least privilege** IAM policies
4. **Rotate credentials** regularly
5. **Never commit credentials** to version control
6. **Use Secret Manager** for credential storage in production

## Switching Between Providers

You can easily switch between Google AI Studio and Vertex AI:

**To use Google AI Studio:**
```bash
unset USE_VERTEX
export GOOGLE_GEMINI_API_KEY="your_api_key"
```

**To use Vertex AI:**
```bash
export USE_VERTEX=1
export VERTEX_PROJECT_ID="your-project-id"
# GOOGLE_GEMINI_API_KEY is not needed
```

## Production Deployment

For production deployments:

1. **Use Vertex AI** instead of Google AI Studio
2. **Use service accounts** with minimal permissions
3. **Store credentials** in Secret Manager
4. **Enable monitoring** and alerting
5. **Set up quotas** to control costs
6. **Use specific regions** for data residency compliance
7. **Implement retry logic** and error handling
8. **Log all API calls** for debugging

## References

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [GCP Authentication](https://cloud.google.com/docs/authentication)
- [IAM Roles for Vertex AI](https://cloud.google.com/vertex-ai/docs/general/access-control)
```

### Phase 6: Files to Modify/Create/Delete

#### Files to Create:
1. `src/tools/eyes/utils/gemini-provider.ts` - Provider interface
2. `src/tools/eyes/utils/providers/google-ai-studio-provider.ts` - Google AI Studio implementation
3. `src/tools/eyes/utils/providers/vertex-ai-provider.ts` - Vertex AI implementation
4. `tests/unit/vertex-ai-provider.test.ts` - Unit tests
5. `tests/integration/vertex-ai-integration.test.ts` - Integration tests
6. `docs/vertex-ai-setup.md` - Vertex AI setup guide

#### Files to Modify:
1. `package.json` - Add @google-cloud/vertexai dependency
2. `src/utils/config.ts` - Add Vertex AI configuration
3. `.env.example` - Add Vertex AI environment variables
4. `src/tools/eyes/utils/gemini-client.ts` - Use provider abstraction
5. `src/tools/hands/processors/image-generator.ts` - Update error messages
6. `src/tools/hands/processors/video-generator.ts` - Update error messages
7. `src/tools/hands/processors/image-editor.ts` - Update error messages
8. `README.md` - Add Vertex AI documentation

#### Files to Delete:
None - this is a backward-compatible addition

## Security Considerations

1. **Credential Management**
   - Never log API keys or service account credentials
   - Use environment variables for configuration
   - Support GCP Secret Manager integration (future enhancement)
   - Validate credentials before use

2. **GCP Authentication**
   - Support Application Default Credentials (ADC)
   - Support Service Account key files
   - Support custom GoogleAuthOptions
   - Follow GCP security best practices

3. **Error Handling**
   - Don't expose sensitive information in error messages
   - Provide helpful guidance without revealing credentials
   - Log authentication attempts (without credentials)

4. **Access Control**
   - Document required IAM roles (Vertex AI User)
   - Support least-privilege principle
   - Recommend separate service accounts for different environments

## Performance Considerations

1. **Initialization**
   - Lazy-load provider on first use
   - Cache provider instances
   - Minimize authentication overhead

2. **API Calls**
   - Both providers should have similar performance
   - Vertex AI may have better quota limits
   - Consider regional latency for Vertex AI

3. **Cost Optimization**
   - Document cost differences
   - Recommend appropriate provider for use case
   - Provide usage tracking guidance

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Breaking changes to existing installations | High | Low | Maintain backward compatibility, make Vertex AI opt-in |
| Authentication complexity | Medium | Medium | Provide clear documentation and examples |
| SDK API differences | High | Low | Abstract common interface, test thoroughly |
| Increased dependency size | Low | High | Acceptable - Vertex AI SDK is well-maintained |
| Configuration errors | Medium | Medium | Validate configuration early, provide helpful errors |
| Cost surprises for users | Medium | Low | Document cost implications clearly |

## Rollback Plan

If issues arise after implementation:

1. **Immediate Rollback**: Revert commits related to Vertex AI integration
2. **Feature Flag**: Vertex AI is opt-in via `USE_VERTEX=1`, so existing users are unaffected
3. **Version Pinning**: Document last version without Vertex AI for users who need it
4. **Graceful Degradation**: If Vertex AI initialization fails, fall back to Google AI Studio if API key is available

## TODO Tasks

### Phase 1: Configuration & Dependencies
- [ ] Add `@google-cloud/vertexai` to package.json
- [ ] Update ConfigSchema in src/utils/config.ts
- [ ] Update loadConfig() function in src/utils/config.ts
- [ ] Add Vertex AI section to .env.example
- [ ] Run `bun install` to install dependencies
- [ ] Verify TypeScript types are working

### Phase 2: GeminiClient Refactoring
- [ ] Create IGeminiProvider interface
- [ ] Create providers directory structure
- [ ] Implement GoogleAIStudioProvider
- [ ] Implement VertexAIProvider
- [ ] Update GeminiClient constructor
- [ ] Update getModel() method
- [ ] Update getImageGenerationModel() method
- [ ] Update getDocumentModel() method
- [ ] Update getSpeechModel() method
- [ ] Update getVideoGenerationModel() method
- [ ] Add getProviderInfo() method
- [ ] Verify backward compatibility

### Phase 3: Update Processors
- [ ] Update image-generator.ts error messages
- [ ] Update video-generator.ts error messages
- [ ] Update image-editor.ts error messages
- [ ] Test all hands tools with both providers

### Phase 4: Testing
- [ ] Write unit tests for VertexAIProvider
- [ ] Write unit tests for GoogleAIStudioProvider
- [ ] Write integration tests for Vertex AI
- [ ] Run existing test suite
- [ ] Manual testing with Google AI Studio
- [ ] Manual testing with Vertex AI (ADC)
- [ ] Manual testing with Vertex AI (Service Account)
- [ ] Test error scenarios
- [ ] Test configuration validation

### Phase 5: Documentation
- [ ] Update README.md with provider comparison
- [ ] Add Vertex AI setup instructions to README
- [ ] Create docs/vertex-ai-setup.md
- [ ] Add troubleshooting guide
- [ ] Update MCP client configuration examples
- [ ] Document cost considerations
- [ ] Add authentication method examples

### Phase 6: Quality Assurance
- [ ] Run full test suite
- [ ] Verify TypeScript compilation
- [ ] Test with real GCP credentials
- [ ] Test all MCP tools with both providers
- [ ] Verify error messages are helpful
- [ ] Check logging output
- [ ] Review security practices
- [ ] Code review

### Phase 7: Release
- [ ] Update CHANGELOG.md
- [ ] Update version in package.json
- [ ] Create PR with all changes
- [ ] Get approval from maintainers
- [ ] Merge to main branch
- [ ] Tag release
- [ ] Publish to npm
- [ ] Announce feature

## Success Criteria

1. ✅ Vertex AI integration works seamlessly alongside Google AI Studio
2. ✅ All existing functionality works with both providers
3. ✅ Clear documentation for setup and troubleshooting
4. ✅ Comprehensive test coverage
5. ✅ No breaking changes for existing users
6. ✅ Performance is equivalent or better
7. ✅ Error messages are clear and actionable
8. ✅ Security best practices are followed

## Timeline Estimate

- **Phase 1**: Configuration & Dependencies - 30 minutes
- **Phase 2**: GeminiClient Refactoring - 1.5 hours
- **Phase 3**: Update Processors - 30 minutes
- **Phase 4**: Testing - 1.5 hours
- **Phase 5**: Documentation - 1 hour
- **Phase 6**: Quality Assurance - 45 minutes

**Total Estimated Time:** 5-6 hours

## Notes

- This is a non-breaking change - existing installations continue to work without modification
- Vertex AI is opt-in via `USE_VERTEX=1` environment variable
- Both providers use the same models and capabilities
- Provider abstraction allows for easy addition of other providers in the future
- Consider adding support for other regions and custom endpoints in future iterations

## References

- [Vertex AI Node.js SDK](https://github.com/googleapis/nodejs-vertexai)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Google AI Studio SDK](https://github.com/google/generative-ai-js)
- [GCP Authentication](https://cloud.google.com/docs/authentication)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
