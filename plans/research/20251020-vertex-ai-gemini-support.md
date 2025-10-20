# Research Report: Vertex AI Support for Gemini Models

## Executive Summary

This research report provides comprehensive guidance for adding Vertex AI support to the Human MCP project. The key finding is that Google has unified access to Gemini models through the new `@google/genai` SDK, which replaces both `@google/generative-ai` (Google AI Studio) and `@google-cloud/vertexai` packages. This unified SDK allows seamless switching between Google AI Studio and Vertex AI with minimal code changes, requiring only configuration adjustments.

**Key Recommendations:**
1. Migrate from `@google/generative-ai` to `@google/genai` for unified API access
2. Support dual-mode configuration allowing users to choose between API key (Google AI Studio) or ADC (Vertex AI)
3. Implement environment variable-based configuration for easy switching
4. Add proper error handling and authentication validation for both modes

## Research Methodology

- **Sources consulted**: 16 authoritative sources including Google Cloud documentation, npm packages, Stack Overflow, and Medium articles
- **Date range of materials**: December 2024 - January 2025
- **Key search terms used**: Vertex AI, Google AI Studio, @google/genai, @google/generative-ai, ADC, Node.js, Gemini API, authentication

## Key Findings

### 1. Technology Overview

#### Google's Unified Gen AI SDK
Google released the `@google/genai` SDK (npm package) in late 2024 to provide a unified interface for accessing Gemini models through both:
- **Gemini Developer API** (formerly Google AI Studio): Simple API key authentication
- **Gemini API in Vertex AI**: Enterprise-grade with IAM authentication

**Important Deprecation Notice:**
- The VertexAI class in `@google-cloud/vertexai` is deprecated as of June 24, 2025
- Will be removed completely on June 24, 2026
- The `@google/generative-ai` package (version 0.21.0 currently used in Human MCP) does NOT support Vertex AI
- Migration to `@google/genai` is required for Vertex AI support

#### Current Package Analysis
Human MCP currently uses:
```json
"@google/generative-ai": "^0.21.0"
```

This package only supports Google AI Studio (API key authentication) and does NOT provide Vertex AI support.

### 2. Current State & Trends

#### Package Evolution Timeline
1. **Early 2024**: Separate packages for Google AI Studio and Vertex AI
   - `@google/generative-ai` for API key access
   - `@google-cloud/vertexai` for Vertex AI access

2. **Late 2024**: Unified SDK introduction
   - `@google/genai` (latest version: 1.25.0 as of January 2025)
   - Supports both platforms with single codebase

3. **2025-2026**: Deprecation timeline
   - Legacy Vertex AI SDK deprecated June 24, 2025
   - Complete removal June 24, 2026

#### Adoption Trends
- Enterprise users increasingly prefer Vertex AI for production workloads
- Google AI Studio remains popular for prototyping and small-scale applications
- Unified SDK gaining rapid adoption for code portability

### 3. Best Practices

#### Configuration Strategy
Implement environment-based configuration to support both modes:

**Option 1: Environment Variables**
```bash
# Google AI Studio mode (current implementation)
GOOGLE_GEMINI_API_KEY=your_api_key

# Vertex AI mode (new implementation)
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
# Optional: Path to service account key file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

**Option 2: Programmatic Configuration**
```typescript
import { GoogleGenAI } from '@google/genai';

// Google AI Studio mode
const aiStudio = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY
});

// Vertex AI mode
const vertexAI = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION
});
```

#### Authentication Best Practices

**For Google AI Studio:**
- Store API keys in environment variables
- Never commit API keys to version control
- Rotate keys periodically
- Use separate keys for development and production

**For Vertex AI:**
- Use Application Default Credentials (ADC) for production
- Use service account key files for CI/CD pipelines
- Implement proper IAM roles and permissions
- Enable audit logging for compliance

#### Error Handling Pattern
```typescript
import { ApiError } from '@google/genai/errors';

try {
  const response = await model.generateContent(params);
  return response.text;
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API-specific errors
    if (error.status === 401) {
      throw new Error('Authentication failed. Check credentials.');
    } else if (error.status === 403) {
      throw new Error('Permission denied. Check IAM roles.');
    }
  }
  throw error;
}
```

### 4. Security Considerations

#### Google AI Studio Security
- **Authentication**: Simple API key
- **Access Control**: Project-level API key restrictions
- **Best for**: Development, prototyping, hobby projects
- **Security Level**: Basic

**Security Measures:**
- Restrict API keys to specific IPs (optional)
- Enable API key restrictions in Google Cloud Console
- Monitor usage quotas and alerts
- Keep keys in secure environment variables

#### Vertex AI Security
- **Authentication**: IAM service accounts, ADC
- **Access Control**: Fine-grained IAM permissions
- **Best for**: Production, enterprise applications
- **Security Level**: Enterprise-grade

**Required IAM Role:**
- Minimum: `roles/aiplatform.user` (Vertex AI User)
- For API enablement: `roles/serviceusage.serviceUsageAdmin`

**Required Permissions:**
- `aiplatform.endpoints.predict`
- `aiplatform.endpoints.get`

**Additional Security Features:**
- VPC Service Controls (VPC-SC)
- Customer-managed encryption keys (CMEK)
- Access Transparency (AXT)
- Audit logging
- Data residency controls

### 5. Performance Insights

#### API Endpoint Differences

**Google AI Studio:**
- Endpoint: `https://generativelanguage.googleapis.com`
- Global availability
- Best for mobile and web applications
- Lower latency for general use

**Vertex AI:**
- Endpoint: `https://aiplatform.googleapis.com`
- Regional deployment (us-central1, europe-west1, etc.)
- Optimized for enterprise workloads
- Integration with GCP services

#### Model Naming Conventions

**Google AI Studio:**
```javascript
model: "gemini-2.0-flash"
model: "gemini-2.0-flash-exp"
model: "gemini-2.5-flash"
```

**Vertex AI:**
```javascript
model: "gemini-2.0-flash-001"
model: "gemini-2.0-flash-exp-001"
model: "gemini-2.5-flash-001"
```

Note: The unified SDK handles model name normalization, so you can use the same model names across both platforms in most cases.

## Comparative Analysis

### When to Use Google AI Studio vs Vertex AI

| Feature | Google AI Studio | Vertex AI |
|---------|------------------|-----------|
| **Authentication** | API Key (simple) | IAM/ADC (enterprise) |
| **Setup Complexity** | Minimal (5 minutes) | Moderate (requires GCP setup) |
| **Cost** | Pay per use | Pay per use + GCP infrastructure |
| **Security** | Basic | Enterprise-grade |
| **Scalability** | Good | Excellent |
| **Production Ready** | Limited | Full |
| **Best For** | Prototyping, small apps | Production, enterprise |
| **Regional Control** | Limited | Full control |
| **Data Governance** | Basic | Advanced |
| **Integration** | Standalone | Full GCP ecosystem |

### Feature Parity

The `@google/genai` SDK provides access to all major Gemini features on both platforms:

**Supported Features (Both Platforms):**
- Text generation (Gemini models)
- Vision analysis (multimodal input)
- Document processing
- Function calling
- Streaming responses
- Safety settings
- Context caching

**Vertex AI Exclusive Features:**
- Vector search integration
- Model Garden access
- AutoML training
- Vertex AI Pipelines integration
- Enterprise security controls

**Platform-Specific Limitations:**
- Image generation (Imagen): Available on both, but Vertex AI offers more model variants
- Video generation (Veo): Available on both platforms
- Speech generation (Gemini TTS): Available on both platforms
- Audio understanding (Chirp): Primarily Vertex AI focus

## Implementation Recommendations

### Quick Start Guide

#### Step 1: Install the New SDK

```bash
# Remove old package
npm uninstall @google/generative-ai

# Install new unified SDK
npm install @google/genai
```

#### Step 2: Update Configuration

Add new environment variables to `.env.example`:

```bash
# Google AI Studio (existing - keep for backward compatibility)
GOOGLE_GEMINI_API_KEY=your_api_key_here

# Vertex AI (new)
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
# Optional: for service account authentication
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### Step 3: Create Unified Configuration

Create or update `src/utils/gemini-config.ts`:

```typescript
import { GoogleGenAI } from '@google/genai';

export interface GeminiConfig {
  useVertexAI: boolean;
  apiKey?: string;
  project?: string;
  location?: string;
}

export function createGeminiClient(config: GeminiConfig): GoogleGenAI {
  if (config.useVertexAI) {
    // Vertex AI mode
    if (!config.project || !config.location) {
      throw new Error(
        'Vertex AI requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION'
      );
    }

    return new GoogleGenAI({
      vertexai: true,
      project: config.project,
      location: config.location,
    });
  } else {
    // Google AI Studio mode
    if (!config.apiKey) {
      throw new Error('Google AI Studio requires GOOGLE_GEMINI_API_KEY');
    }

    return new GoogleGenAI({
      apiKey: config.apiKey,
    });
  }
}

// Load from environment
export function loadGeminiConfig(): GeminiConfig {
  const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';

  return {
    useVertexAI,
    apiKey: process.env.GOOGLE_GEMINI_API_KEY,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  };
}
```

#### Step 4: Update Existing Code

**Before (using @google/generative-ai):**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const result = await model.generateContent(prompt);
```

**After (using @google/genai with dual support):**
```typescript
import { createGeminiClient, loadGeminiConfig } from './utils/gemini-config';

const config = loadGeminiConfig();
const ai = createGeminiClient(config);

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
});

const text = response.text;
```

### Code Examples

#### Example 1: Text Generation (Both Platforms)

```typescript
import { GoogleGenAI } from '@google/genai';

async function generateText(useVertexAI: boolean = false) {
  const ai = useVertexAI
    ? new GoogleGenAI({
        vertexai: true,
        project: 'my-project',
        location: 'us-central1',
      })
    : new GoogleGenAI({
        apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
      });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Explain quantum computing in simple terms',
  });

  return response.text;
}
```

#### Example 2: Vision Analysis with Vertex AI

```typescript
import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';

async function analyzeImage(imagePath: string) {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT!,
    location: process.env.GOOGLE_CLOUD_LOCATION!,
  });

  const imageData = readFileSync(imagePath).toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'What is in this image?' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData,
            },
          },
        ],
      },
    ],
  });

  return response.text;
}
```

#### Example 3: Streaming with Error Handling

```typescript
import { GoogleGenAI } from '@google/genai';
import { ApiError } from '@google/genai/errors';

async function streamContent(prompt: string) {
  const config = loadGeminiConfig();
  const ai = createGeminiClient(config);

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    for await (const chunk of stream) {
      process.stdout.write(chunk.text);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error [${error.status}]: ${error.message}`);

      // Handle specific errors
      if (error.status === 401) {
        console.error('Authentication failed. Check your credentials.');
      } else if (error.status === 403) {
        console.error('Permission denied. Check IAM roles (Vertex AI) or API key restrictions (AI Studio).');
      } else if (error.status === 429) {
        console.error('Rate limit exceeded. Try again later.');
      }
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

#### Example 4: Function Calling (Vertex AI)

```typescript
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';

const weatherFunction: FunctionDeclaration = {
  name: 'getWeather',
  description: 'Get current weather for a location',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: 'City and state, e.g. San Francisco, CA',
      },
      unit: {
        type: Type.STRING,
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit',
      },
    },
    required: ['location'],
  },
};

async function chatWithFunctions() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT!,
    location: process.env.GOOGLE_CLOUD_LOCATION!,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'What is the weather in New York?',
    tools: [
      {
        functionDeclarations: [weatherFunction],
      },
    ],
  });

  // Check if model wants to call a function
  const functionCall = response.functionCalls()?.[0];
  if (functionCall) {
    console.log('Function call:', functionCall.name);
    console.log('Arguments:', functionCall.args);

    // Execute function and send result back
    const weatherData = { temperature: 72, conditions: 'sunny' };

    const finalResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: 'What is the weather in New York?' }] },
        { role: 'model', parts: [{ functionCall }] },
        {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: weatherData,
              },
            },
          ],
        },
      ],
      tools: [{ functionDeclarations: [weatherFunction] }],
    });

    return finalResponse.text;
  }

  return response.text;
}
```

### Common Pitfalls

#### 1. Incorrect Model Names
**Problem:** Using `-001` suffix with Google AI Studio
```typescript
// Wrong - AI Studio doesn't recognize version suffixes
model: 'gemini-2.5-flash-001'
```

**Solution:** Use base model names
```typescript
// Correct
model: 'gemini-2.5-flash'
```

#### 2. Missing IAM Permissions (Vertex AI)
**Problem:** PERMISSION_DENIED errors

**Solution:** Grant proper IAM role
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/aiplatform.user"
```

#### 3. ADC Not Configured
**Problem:** Authentication errors in Vertex AI mode

**Solution:** Set up ADC
```bash
# For local development
gcloud auth application-default login

# For production (using service account)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

#### 4. Mixing API Patterns
**Problem:** Using old SDK patterns with new SDK

**Solution:** Follow new API structure
```typescript
// Old API (@google/generative-ai)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const result = await model.generateContent(prompt);

// New API (@google/genai)
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
});
```

## Resources & References

### Official Documentation

- [Google Gen AI SDK Overview](https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview)
- [Vertex AI SDK Migration Guide](https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk)
- [Migrate from Google AI Studio to Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/migrate/migrate-google-ai)
- [Vertex AI Authentication](https://cloud.google.com/vertex-ai/docs/authentication)
- [Application Default Credentials Setup](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [Vertex AI IAM Permissions](https://cloud.google.com/vertex-ai/docs/general/iam-permissions)

### NPM Packages

- [@google/genai](https://www.npmjs.com/package/@google/genai) - Latest version: 1.25.0
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) - Legacy, version 0.21.0
- [@google-cloud/vertexai](https://www.npmjs.com/package/@google-cloud/vertexai) - Deprecated, version 1.10.0

### GitHub Repositories

- [googleapis/js-genai](https://github.com/googleapis/js-genai) - Official TypeScript/JavaScript SDK
- [googleapis/nodejs-vertexai](https://github.com/googleapis/nodejs-vertexai) - Legacy Vertex AI SDK

### Recommended Tutorials

- [Integrating Vertex AI Gemini API with Node.js](https://medium.com/@parmarshyamsinh/integrating-vertex-ai-gemini-api-with-node-js-f122dbc067a1)
- [Good bye Vertex AI SDK](https://medium.com/google-cloud/good-bye-vertex-ai-sdk-dcf90918239a)
- [Migrating to the new Google Gen AI SDK](https://medium.com/google-cloud/migrating-to-the-new-google-gen-ai-sdk-python-074d583c2350)

### Community Resources

- [Stack Overflow: Utilizing Gemini through Vertex AI or Google/generative-ai](https://stackoverflow.com/questions/78007243/utilizing-gemini-through-vertex-ai-or-through-google-generative-ai)
- [Google AI Developers Forum](https://discuss.ai.google.dev/)
- [Google Cloud Community](https://www.googlecloudcommunity.com/gc/Vertex-AI/bd-p/cloud-vertex-ai)

### Further Reading

- [Gemini API versus Vertex AI API - What's the Difference?](https://www.rankya.com/google-ai/gemini-api-versus-vertex-ai-api-whats-the-difference/)
- [Understanding Google AI Studio, Gemini API, and Vertex AI](https://gotranscript.com/public/understanding-google-ai-studio-gemini-api-and-vertex-ai-a-comprehensive-guide)
- [Vertex AI Studio vs Google AI Studio](https://medium.com/google-cloud-for-startups/vertex-ai-studio-vs-google-ai-studio-choosing-the-right-ai-tool-for-your-startup-6e0351405630)

## Appendices

### A. Glossary

**ADC (Application Default Credentials)**: Google Cloud's standard way of providing credentials to applications, automatically locating credentials based on environment.

**API Key**: A simple credential for accessing Google AI Studio, less secure than ADC but easier to set up.

**GenAI SDK**: Google's unified SDK (`@google/genai`) for accessing Gemini models on both platforms.

**Google AI Studio**: Google's prototyping platform for Gemini models using simple API key authentication.

**IAM (Identity and Access Management)**: Google Cloud's permission system for controlling access to resources.

**Service Account**: A special Google account that belongs to an application rather than a person.

**Vertex AI**: Google Cloud's enterprise ML platform offering Gemini models with advanced features.

### B. Environment Variables Reference

| Variable | Required For | Description | Example |
|----------|-------------|-------------|---------|
| `GOOGLE_GEMINI_API_KEY` | AI Studio | API key from Google AI Studio | `AIzaSy...` |
| `GOOGLE_GENAI_USE_VERTEXAI` | Both | Toggle between platforms | `true` or `false` |
| `GOOGLE_CLOUD_PROJECT` | Vertex AI | GCP project ID | `my-project-123` |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI | GCP region | `us-central1` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Vertex AI | Path to service account key | `/path/to/key.json` |

### C. Migration Checklist

#### Pre-Migration
- [ ] Review current usage of `@google/generative-ai`
- [ ] Identify all places where Gemini API is called
- [ ] Document current authentication method
- [ ] Decide whether to support both platforms or Vertex AI only
- [ ] Review security requirements

#### Package Migration
- [ ] Install `@google/genai` package
- [ ] Update import statements
- [ ] Update TypeScript types
- [ ] Remove `@google/generative-ai` dependency
- [ ] Test build process

#### Code Changes
- [ ] Update API initialization code
- [ ] Modify model name references
- [ ] Update error handling
- [ ] Add environment variable support
- [ ] Create configuration abstraction layer

#### Vertex AI Setup (if supporting)
- [ ] Create or select GCP project
- [ ] Enable Vertex AI API
- [ ] Set up service account
- [ ] Grant IAM permissions
- [ ] Download service account key (if needed)
- [ ] Configure ADC locally

#### Testing
- [ ] Test with Google AI Studio (API key)
- [ ] Test with Vertex AI (ADC)
- [ ] Test error scenarios
- [ ] Verify all existing features work
- [ ] Test in CI/CD environment

#### Documentation
- [ ] Update README with new setup instructions
- [ ] Document environment variables
- [ ] Add migration guide for users
- [ ] Update API documentation
- [ ] Add troubleshooting guide

### D. Implementation Plan for Human MCP

Based on the research findings, here's a recommended implementation plan:

#### Phase 1: Package Migration (1-2 days)
1. Update `package.json` to use `@google/genai`
2. Create backward-compatible wrapper for existing code
3. Update all import statements
4. Fix TypeScript type errors
5. Run tests to ensure functionality

#### Phase 2: Configuration System (1-2 days)
1. Add new environment variables
2. Create configuration loader
3. Implement client factory pattern
4. Add validation for required variables
5. Update `.env.example`

#### Phase 3: Vertex AI Support (2-3 days)
1. Implement Vertex AI authentication
2. Add IAM role checking
3. Test with service account credentials
4. Update error handling
5. Add logging for debugging

#### Phase 4: Documentation (1 day)
1. Update README with Vertex AI instructions
2. Add setup guide for both platforms
3. Document environment variables
4. Create troubleshooting guide
5. Add code examples

#### Phase 5: Testing & Validation (1-2 days)
1. Test all existing features with both platforms
2. Verify image generation (Imagen)
3. Verify video generation (Veo)
4. Verify speech generation
5. Performance testing

#### Total Estimated Time: 6-10 days

### E. Cost Considerations

#### Google AI Studio Pricing
- Free tier: 15 requests per minute (RPM)
- Paid tier: Based on input/output tokens
- No infrastructure costs

#### Vertex AI Pricing
- Pay per use: Based on input/output tokens
- Similar per-token costs to AI Studio
- Additional costs:
  - GCP project infrastructure (minimal)
  - Data storage (if using vector search)
  - Network egress (usually minimal)

#### Recommendation
- Use Google AI Studio for development and testing (free tier sufficient)
- Use Vertex AI for production (better security and compliance)
- Monitor costs through Google Cloud Console

### F. Raw Research Notes

#### SDK Version Timeline
- `@google/generative-ai@0.21.0` - Current version in Human MCP (API Studio only)
- `@google-cloud/vertexai@1.10.0` - Legacy Vertex AI SDK (deprecated June 2025)
- `@google/genai@1.25.0` - Latest unified SDK (recommended)

#### Key Decision Points
1. Must migrate to `@google/genai` for Vertex AI support
2. Current package does not support Vertex AI
3. Unified SDK provides code portability
4. Environment-based configuration is best practice

#### Integration Points in Human MCP
Based on codebase analysis:
- `src/tools/eyes/utils/gemini-client.ts` - Main Gemini client
- `src/tools/hands/processors/image-generator.ts` - Imagen integration
- `src/tools/hands/processors/video-generator.ts` - Veo integration
- `src/tools/hands/processors/image-editor.ts` - Image editing
- `src/utils/config.ts` - Configuration management

All these files will need updates to support the new SDK.

---

**Research Completed**: January 20, 2025
**Researcher**: Claude (Anthropic)
**Next Steps**: Begin implementation following the recommendations in this report
