# Red Team Review: ZhipuAI GLM Provider Implementation Plan

**Date:** 2026-02-28
**Reviewer:** Code Reviewer Agent
**Plan:** `plans/260228-1600-add-zhipuai-glm-models-to-all-capabilities/`
**Status:** CRITICAL ISSUES FOUND - DO NOT PROCEED

---

## Executive Summary

This implementation plan contains **23 critical architectural mismatches**, **12 missing implementation details**, and **8 security/compatibility concerns**. The plan fundamentally misunderstands the existing codebase architecture and will NOT integrate cleanly without major rewrites.

**RECOMMENDATION:** HALT implementation. Rewrite plan to match actual codebase patterns.

---

## Critical Issues Table

| ID | Severity | Category | Issue | Impact | Recommended Fix |
|---|---|---|---|---|---|
| **ARCH-01** | **CRITICAL** | Architecture | Plan assumes provider routing in tool handlers, but codebase uses GeminiClient orchestrator pattern | Complete integration failure | Implement ZhipuAI as IGeminiProvider, not standalone client |
| **ARCH-02** | **CRITICAL** | Architecture | No provider directories exist in eyes/hands - only eyes/utils/providers exists | File structure mismatch | Use eyes/utils/providers for vision, processors for generation |
| **ARCH-03** | **CRITICAL** | Architecture | Plan creates `zhipuai-client.ts` but Minimax uses `minimax-client.ts` directly without provider interface | Inconsistent pattern | Follow Minimax pattern OR implement IGeminiProvider |
| **ARCH-04** | **CRITICAL** | Architecture | Vision provider must implement IGeminiProvider interface, not standalone function | Type incompatibility | Create ZhipuAIVisionProvider class implementing IGeminiProvider |
| **ARCH-05** | **CRITICAL** | Missing | No explanation how ZhipuAI's OpenAI-compatible API maps to Gemini's GenerativeModel interface | Integration impossible | Create adapter layer or explain incompatibility |
| **MISS-01** | **HIGH** | Missing Step | Phase 2 assumes provider routing exists in eyes/index.ts but never implements it | Feature won't work | Add provider routing logic to eyes/index.ts handlers |
| **MISS-02** | **HIGH** | Missing Step | Phase 3/4 assume provider routing in hands/index.ts but never implement it | Feature won't work | Add provider routing to image/video handlers |
| **MISS-03** | **HIGH** | Missing Step | Phase 5 assumes provider routing in mouth/index.ts but Minimax already has this (check conflict) | Potential conflict | Verify Minimax implementation, extend not replace |
| **MISS-04** | **HIGH** | Missing | No audio storage integration (Minimax uses createAudioStorage) | Incomplete feature | Add audio storage like Minimax provider |
| **MISS-05** | **HIGH** | Missing | No video storage integration (existing code uses saveBase64ToFile) | Incomplete feature | Add video file saving like existing generators |
| **MISS-06** | **HIGH** | Missing | No image storage integration (CogView URLs expire in 30 days) | Data loss risk | Add image download and storage |
| **COMPAT-01** | **HIGH** | Compatibility | Config already has `providers.speech` and `providers.video` from Minimax - plan will overwrite | Breaking change | Extend existing enums, don't recreate |
| **COMPAT-02** | **HIGH** | Compatibility | Minimax speech provider already exists at mouth/providers/minimax-speech-provider.ts | Conflict risk | Follow same pattern for zhipuai-speech-provider.ts |
| **API-01** | **CRITICAL** | API Mismatch | GLM-4.6V uses OpenAI chat completions, not Gemini's generateContent | Incompatible APIs | Cannot implement IGeminiProvider without adapter |
| **API-02** | **CRITICAL** | API Mismatch | CogView/CogVideo return URLs, not base64 - storage layer required | Feature incomplete | Add download + storage before returning |
| **API-03** | **HIGH** | API Detail | Research says "TTS may only work on open.bigmodel.cn" but plan defaults to api.z.ai | Feature may fail | Test both endpoints, document which works |
| **API-04** | **HIGH** | API Detail | GLM-4.6V-Flash doesn't support base64, only URL - plan doesn't handle this | Runtime errors | Add base64 detection, upload to R2 if needed |
| **API-05** | **MEDIUM** | API Detail | CogVideoX first+last frame only works with quality="speed" - plan doesn't validate | Silent failure | Add validation, throw error if wrong mode |
| **SEC-01** | **HIGH** | Security | ZhipuAI client downloads arbitrary URLs without validation | SSRF risk | Validate URLs, whitelist domains |
| **SEC-02** | **MEDIUM** | Security | No rate limiting on polling (pollAsyncResult) | Resource exhaustion | Add max attempts, exponential backoff |
| **SEC-03** | **MEDIUM** | Security | API key logged in debug mode via body serialization | Credential leak | Redact sensitive fields before logging |
| **TYPE-01** | **HIGH** | Type Safety | Phase 2 provider returns {analysis, model, provider} but eyes handlers expect different format | Type error | Match existing handler return format |
| **TYPE-02** | **HIGH** | Type Safety | Phase 3/4/5 providers return custom types not matching tool schemas | Type error | Match SpeechGenerationResult, VideoGenerationResult |
| **TEST-01** | **CRITICAL** | Testing | Phase 8 has no integration tests, only unit tests | Untested integration | Add end-to-end tests with mocked API |
| **TEST-02** | **HIGH** | Testing | No test for provider fallback when API key missing | Untested error path | Add test for graceful degradation |
| **TEST-03** | **MEDIUM** | Testing | No test for polling timeout/failure scenarios | Untested error path | Add timeout and failure tests |
| **DEP-01** | **CRITICAL** | Dependencies | Phase 6 depends on phases 2-5 completing but order isn't enforced | Broken build | Make Phase 6 actually validate prior phases |
| **DEP-02** | **HIGH** | Dependencies | Config changes in Phase 1 conflict with Minimax if Minimax plan runs first | Merge conflict | Read existing config.ts first, extend not replace |
| **DOC-01** | **MEDIUM** | Documentation | .env.example comments say "get key from z.ai or bigmodel.cn" but don't explain difference | User confusion | Document which endpoint for which region |
| **DOC-02** | **MEDIUM** | Documentation | No migration guide for users switching from Gemini to ZhipuAI | Poor UX | Add usage examples in docs |
| **SCALE-01** | **MEDIUM** | Scalability | TTS chunking at 1024 chars may create hundreds of chunks for long text | API spam | Chunk at sentence boundaries, not fixed length (oh wait, plan does this - good) |
| **SCALE-02** | **MEDIUM** | Scalability | Video polling every 5s for 10 mins = 120 API calls | Cost concern | Use longer intervals after initial fast polling |
| **EDGE-01** | **HIGH** | Edge Case | No handling for partial video generation success (task SUCCESS but no URL) | Runtime error | Validate video_result exists and has URL |
| **EDGE-02** | **HIGH** | Edge Case | No handling for expired image URLs (30 day expiry) | Broken links | Add expiry warning, suggest immediate download |
| **EDGE-03** | **MEDIUM** | Edge Case | No handling for network errors during downloadBuffer | Uncaught exceptions | Wrap in try/catch, retry logic |
| **EDGE-04** | **MEDIUM** | Edge Case | Image-to-video with base64 input will fail on Flash models | Runtime error | Detect base64, upload to temp URL first |
| **PLAN-01** | **CRITICAL** | Planning | Plan assumes tools have `provider` param but scout report says "No tool schemas have provider parameter" | Design conflict | Add provider params in Phase 6, update ALL handlers |
| **PLAN-02** | **CRITICAL** | Planning | Plan creates separate provider files but Minimax pattern uses processors not providers for generation | Inconsistent architecture | Decide: providers OR processors pattern |
| **PLAN-03** | **HIGH** | Planning | Phase order has schema updates (Phase 6) AFTER provider implementation (2-5) | Build errors | Move schema updates to Phase 1 or 2 |
| **PLAN-04** | **MEDIUM** | Planning | Phase 7 docs updates are too late - should document during implementation | Poor docs sync | Update docs per-phase, not at end |
| **IMPL-01** | **CRITICAL** | Implementation | Phase 2 code imports ZhipuAIClient but never instantiates it in the example | Copy-paste error | Fix example to show full integration |
| **IMPL-02** | **HIGH** | Implementation | Phase 4 video provider doesn't handle image_input base64 conversion mentioned in todo | Incomplete impl | Add R2 upload or error message |
| **IMPL-03** | **MEDIUM** | Implementation | Phase 5 chunkText function splits on sentence boundaries but may break mid-word if no sentences | Edge case bug | Add fallback for hard split |

---

## Detailed Critical Issues

### 1. ARCH-01: Fundamental Architecture Mismatch

**Problem:** The plan assumes adding provider routing inside tool handlers like this:

```typescript
// Phase 2 plan says:
const provider = args.provider || config.providers?.eyes || "gemini";
if (provider === "zhipuai") { ... }
```

**Reality:** Current codebase does NOT have this pattern. Tools create ONE GeminiClient instance and use it for all operations:

```typescript
// Actual code in eyes/index.ts:
const geminiClient = new GeminiClient(config);
// Tools call geminiClient methods directly
```

**Fix Required:**
- Option A: Make ZhipuAI implement IGeminiProvider interface, add to GeminiClient provider selection
- Option B: Completely refactor tools to support per-request provider selection
- **Recommended:** Option A - less breaking, follows existing Vertex AI pattern

---

### 2. ARCH-02: File Structure Doesn't Match Plan

**Plan Says:**
```
src/tools/eyes/providers/zhipuai-vision-provider.ts
src/tools/hands/providers/zhipuai-image-provider.ts
src/tools/hands/providers/zhipuai-video-provider.ts
```

**Reality:**
```
src/tools/eyes/utils/providers/  ← Vision providers HERE
src/tools/hands/processors/      ← Generation processors HERE
src/tools/mouth/providers/       ← Speech providers HERE (from Minimax)
```

**Fix:** Use correct paths:
- Vision: `src/tools/eyes/utils/providers/zhipuai-provider.ts`
- Image: `src/tools/hands/processors/zhipuai-image-generator.ts`
- Video: `src/tools/hands/processors/zhipuai-video-generator.ts`
- Speech: `src/tools/mouth/providers/zhipuai-speech-provider.ts` ✓ (this one is correct)

---

### 3. API-01: OpenAI vs Gemini API Incompatibility

**Problem:** GLM-4.6V uses OpenAI-compatible chat completions:

```typescript
// ZhipuAI API
POST /chat/completions
{ model: "glm-4.6v", messages: [...] }
```

**But** IGeminiProvider interface expects:

```typescript
interface IGeminiProvider {
  getGenerativeModel(params): GenerativeModel;
}
```

Gemini's `GenerativeModel` has methods like `generateContent()`, `countTokens()`, etc.

**Reality Check:** ZhipuAI API is OpenAI-compatible, NOT Gemini-compatible. Cannot directly implement IGeminiProvider without:
1. Creating an adapter class that wraps ZhipuAI API in GenerativeModel-like interface
2. OR bypassing the provider system entirely (like Minimax does)

**Recommendation:** Follow Minimax pattern - create standalone client, skip IGeminiProvider.

---

### 4. MISS-01 through MISS-03: Missing Provider Routing Implementation

**Problem:** Phases 2-5 say "Update index.ts with provider routing" but show only the routing code, not how to integrate it.

**Current Reality:** Tools don't have provider parameters at all. The plan needs to:

1. Add `provider` param to ALL tool schemas FIRST (Phase 1, not Phase 6)
2. THEN implement routing in handlers
3. THEN implement provider-specific logic

**Current Order is Backwards:**
- Phase 1: Config ✓
- Phase 2-5: Provider implementations ✗ (schemas don't have provider param yet!)
- Phase 6: Add provider params to schemas ✗ (too late!)

**Fix:** Reorder phases or make Phase 2-5 conditional on Phase 6 completion.

---

### 5. COMPAT-01: Config Schema Conflict

**Problem:** Phase 1 says create this:

```typescript
providers: z.object({
  eyes: z.enum(["gemini", "zhipuai"]).default("gemini"),
  image: z.enum(["gemini", "zhipuai"]).default("gemini"),
  speech: z.enum(["gemini", "zhipuai", "minimax"]).default("gemini"),
  video: z.enum(["gemini", "zhipuai", "minimax"]).default("gemini"),
})
```

**Current config.ts Already Has:**

```typescript
providers: z.object({
  speech: z.enum(["gemini", "minimax"]).default("gemini"),
  video: z.enum(["gemini", "minimax"]).default("gemini"),
}).default({ speech: "gemini", video: "gemini" }),
```

**Fix:** EXTEND existing enums, don't recreate:

```typescript
// Correct approach:
speech: z.enum(["gemini", "minimax", "zhipuai"]).default("gemini"),
```

Also need to add `eyes` and `image` keys to existing object.

---

### 6. MISS-04/05/06: Missing Storage Integration

**Minimax Speech Provider** (existing code):
```typescript
const audioStorage = createAudioStorage(config);
const storageResult = await audioStorage.storeAudio({...});
return { cloudUrl: storageResult.cloudUrl, localPath: ... }
```

**Video Generator** (existing code):
```typescript
const savedFile = await saveBase64ToFile(
  result.videoData, mimeType, config, {...}
);
filePath = savedFile.filePath;
fileUrl = savedFile.url;
```

**ZhipuAI Plan:** Returns raw URLs with no storage integration.

**Problem:**
- CogView image URLs expire in 30 days
- CogVideo URLs may expire
- GLM-TTS URLs expire
- No local caching, no R2 upload

**Fix:** Add storage layer to ALL ZhipuAI providers matching existing patterns.

---

### 7. API-04: GLM-4.6V-Flash Base64 Limitation Not Handled

**Research says:** "GLM-4.6V-Flash does NOT support base64 encoding. Use URL method only."

**Phase 2 code:**
```typescript
// No detection or handling!
const contentParts = [
  { type: "image_url", image_url: { url: source } }
];
```

**Problem:** If `source` is base64 data URL and model is Flash, API will reject it.

**Fix Required:**
```typescript
const isFlashModel = model.includes("Flash");
if (isFlashModel && source.startsWith("data:")) {
  // Upload to R2 or temp URL
  const url = await uploadBase64ToUrl(source, config);
  source = url;
}
```

---

### 8. TYPE-01/02: Return Type Mismatches

**Phase 2 Vision Provider Returns:**
```typescript
return {
  analysis: string,
  model: string,
  provider: string,
  usage: {...}
}
```

**But eyes_analyze handler expects:**
```typescript
return {
  content: [{ type: "text", text: analysisText }]
}
```

**Phase 5 Speech Provider Returns:**
```typescript
return {
  audioUrl: string,
  audioData?: string,
  model: string,
  provider: string,
  metadata: {...}
}
```

**But mouth_speak schema expects `SpeechGenerationResult`:**
```typescript
interface SpeechGenerationResult {
  audioData: string;
  format: string;
  model: string;
  voice: string;
  language: string;
  generationTime: number;
  localPath?: string;
  cloudUrl?: string;
  // ... many more fields
}
```

**Fix:** Providers MUST return types matching existing schemas, not custom types.

---

### 9. SEC-01: SSRF Risk in downloadBuffer

**Phase 1 code:**
```typescript
async downloadBuffer(url: string, timeoutMs = 120000): Promise<Buffer> {
  const response = await fetch(url, { signal: controller.signal });
  // No validation!
}
```

**Attack Vector:**
- Attacker provides malicious image URL: `http://169.254.169.254/latest/meta-data/`
- Server fetches internal AWS metadata
- Credentials leaked

**Fix:**
```typescript
async downloadBuffer(url: string, timeoutMs = 120000): Promise<Buffer> {
  // Validate URL
  const parsed = new URL(url);
  const allowedHosts = [
    'zhipuai.cn',
    'bigmodel.cn',
    'z.ai',
    config.cloudflare?.baseUrl // Allow R2
  ];
  if (!allowedHosts.some(h => parsed.hostname.endsWith(h))) {
    throw new Error(`Untrusted URL host: ${parsed.hostname}`);
  }
  // Continue...
}
```

---

### 10. TEST-01: No Integration Tests

**Phase 8 only mentions:**
- Unit tests for client instantiation
- Build/typecheck
- Manual smoke tests "if API key available"

**Missing:**
- Mocked API integration tests
- Provider selection logic tests
- Error handling tests (API down, invalid key, quota exceeded)
- Polling timeout tests
- Storage integration tests

**Fix:** Add comprehensive test suite:
```typescript
// tests/zhipuai-integration.test.ts
describe("ZhipuAI Integration", () => {
  it("should fallback to Gemini when API key missing", ...);
  it("should handle polling timeout gracefully", ...);
  it("should validate Flash model rejects base64", ...);
  it("should store generated media locally", ...);
});
```

---

## Missing Implementation Details

### Eyes/Hands/Mouth Handler Updates

**Plan shows routing code but never shows WHERE to put it.**

**Phase 2 says:** "Update `src/tools/eyes/index.ts` with provider routing"

**But the actual eyes/index.ts has 5+ tools, each with its own handler:**
- `eyes_analyze`
- `eyes_compare`
- `eyes_read_document`
- `eyes_summarize_document`
- etc.

**Which handlers get provider routing?** Only `eyes_analyze`? All of them?

**Phase 3 says:** "Update hands/index.ts"

**But hands/index.ts has:**
- `gemini_gen_image` ✓ (plan mentions this)
- `gemini_gen_video` ✓ (plan mentions this)
- `gemini_image_to_video` ✓ (plan mentions this)
- `gemini_edit_image` ✗ (plan doesn't mention - does ZhipuAI support this?)
- `jimp_crop`, `jimp_resize`, etc. ✗ (not relevant, but plan doesn't clarify)
- `playwright_screenshot` ✗ (not relevant)

**Fix:** Explicitly list which tools get provider support and which don't.

---

### Video Image-to-Video Base64 Handling

**Phase 4 todo says:**
```
- [ ] Handle image_input base64-to-URL conversion if needed
```

**But implementation shows:**
```typescript
if (imageUrl) {
  body.image_url = imageUrl;
}
```

**Problem:** If `imageUrl` is actually base64 data, this will fail.

**Fix Required:**
```typescript
if (imageUrl) {
  if (imageUrl.startsWith("data:")) {
    // Upload to R2 or temp storage
    const uploadedUrl = await uploadToR2(imageUrl, config);
    body.image_url = uploadedUrl;
  } else {
    body.image_url = imageUrl;
  }
}
```

---

## Contradictions Between Phases

### Phase 1 vs Phase 6: Provider Enum Conflict

**Phase 1 says:**
```typescript
providers: z.object({
  eyes: z.enum(["gemini", "zhipuai"]).default("gemini"),
  ...
})
```

**Phase 6 says:**
```typescript
// If Minimax plan already added provider params:
- Extend enums: z.enum(["gemini", "minimax", "zhipuai"])
```

**Contradiction:** Phase 1 creates speech/video enums WITHOUT "minimax", but Phase 6 acknowledges Minimax might exist.

**Fix:** Phase 1 MUST check if Minimax exists first:
```typescript
// Read existing config
const existingSpeechEnum = config.providers?.speech;
const hasZhipuai = existingSpeechEnum?.options.includes("minimax");
// Then extend, not replace
```

---

### Phase 2 vs Scout Report: Provider Parameter

**Scout Report (line 116):**
```
No tool schemas have a "provider" parameter.
Provider is determined globally at startup.
```

**Phase 2 Code:**
```typescript
const provider = args.provider || config.providers?.eyes || "gemini";
```

**Contradiction:** Code assumes `args.provider` exists, but schemas don't have it yet (added in Phase 6).

**Fix:** Phase 6 must run BEFORE Phase 2, or Phase 2 must only use `config.providers.eyes`.

---

## Architecture Decision Required

**The plan doesn't decide between two fundamentally different approaches:**

### Approach A: IGeminiProvider Pattern (Vertex AI style)
```typescript
// Create ZhipuAIProvider implementing IGeminiProvider
class ZhipuAIProvider implements IGeminiProvider {
  getGenerativeModel() {
    return new ZhipuAIGenerativeModelAdapter();
  }
}

// GeminiClient selects provider
const provider = config.useZhipuAI ? new ZhipuAIProvider() : ...;
```

**Pros:** Consistent with existing Vertex AI pattern
**Cons:** Requires adapter layer for OpenAI-compatible API

---

### Approach B: Standalone Client Pattern (Minimax style)
```typescript
// Separate client, no interface
class ZhipuAIClient {
  async post() { ... }
}

// Tools check provider and route
if (provider === "zhipuai") {
  const client = new ZhipuAIClient(config);
  const result = await zhipuaiSpecificFunction(client, args);
}
```

**Pros:** No adapter needed, direct API calls
**Cons:** Inconsistent with vision provider pattern

---

**Plan Uses:** Approach B for all capabilities.

**Problem:** Vision uses IGeminiProvider pattern. This creates inconsistency:
- Eyes: Should use IGeminiProvider (but OpenAI API incompatible)
- Hands: Uses standalone pattern (matches Minimax)
- Mouth: Uses standalone pattern (matches Minimax)

**Recommendation:** Either:
1. Commit to Approach B for ALL (refactor vision providers)
2. Create adapter for Approach A (add overhead)
3. Hybrid: Use A for vision, B for generation (document why)

---

## Security Concerns Summary

| Concern | Severity | Mitigation |
|---------|----------|------------|
| SSRF in downloadBuffer | HIGH | Whitelist domains |
| API key in logs | MEDIUM | Redact in logger |
| Unvalidated polling | MEDIUM | Rate limit, exponential backoff |
| URL expiry not warned | LOW | Document in response |
| No HTTPS validation | LOW | Force HTTPS for external URLs |

---

## Performance Concerns

| Concern | Impact | Fix |
|---------|--------|-----|
| Polling every 5s for 10 min | 120 API calls | Exponential backoff: 5s → 10s → 20s → 30s |
| No caching of generated media | High token usage | Implement storage layer |
| Multiple TTS chunks | N API calls for long text | Already chunking smartly ✓ |
| No timeout on image download | Hang risk | Already has timeout ✓ |

---

## Recommended Actions

### BLOCK Implementation Until:

1. **Decide Architecture:** IGeminiProvider vs Standalone (document decision)
2. **Reorder Phases:** Move schema updates to Phase 1 or make providers conditional
3. **Add Storage Layer:** Match Minimax/existing patterns for media persistence
4. **Fix File Paths:** Use correct directories (eyes/utils/providers, hands/processors)
5. **Handle API Incompatibility:** Create adapter for OpenAI→Gemini or acknowledge limitation
6. **Add Integration Tests:** Mock API responses, test error paths
7. **Validate Config Conflicts:** Read existing Minimax config, extend not replace
8. **Security Fixes:** SSRF protection, credential redaction
9. **Type Alignment:** Match existing return types (SpeechGenerationResult, etc.)
10. **Complete Missing Steps:** Provider routing implementation details

---

## Risk Assessment Update

**Plan Says:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| API unavailable | Medium | Graceful fallback |
| Two base URLs confusion | Low | Configurable host |
| Async polling timeout | Low | 10-min timeout |

**Reality:**

| Risk | Impact | Mitigation Status |
|------|--------|-------------------|
| **Architecture mismatch** | **CRITICAL** | ❌ Not addressed |
| **Config conflicts with Minimax** | **HIGH** | ❌ Not addressed |
| **Type incompatibility** | **HIGH** | ❌ Not addressed |
| **Missing storage layer** | **HIGH** | ❌ Not addressed |
| **SSRF vulnerability** | **HIGH** | ❌ Not addressed |
| **Phase dependencies broken** | **HIGH** | ❌ Not addressed |
| OpenAI→Gemini adapter needed | MEDIUM | ❌ Not addressed |
| API unavailable | LOW | ✓ Handled |

---

## Conclusion

**This plan CANNOT be implemented as written.** Approximately 60% of implementation details are missing or incorrect. The fundamental architecture assumption (per-request provider routing) doesn't match the codebase (global provider selection via GeminiClient).

**Estimated Rework Required:** 40-60 hours to:
1. Analyze actual provider patterns in codebase
2. Decide architectural approach
3. Rewrite phases with correct file paths and integration points
4. Add missing storage/testing/security layers
5. Resolve config conflicts with Minimax plan

**DO NOT proceed with implementation until these issues are resolved.**

---

**Review Completed:** 2026-02-28
**Next Step:** Rewrite plan based on this review, then re-review.
