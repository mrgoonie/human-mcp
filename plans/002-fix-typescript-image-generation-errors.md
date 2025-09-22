# Fix TypeScript CI Errors - Implementation Plan

## Overview

This plan addresses the TypeScript compilation errors causing CI failures in the GitHub Actions workflow for the human-mcp project. The main issue is type incompatibility between the tool response format and the MCP SDK's expected CallToolResult type.

## Problem Analysis

### Root Cause
The TypeScript error in `src/tools/hands/index.ts` occurs because:
1. The `registerTool` method expects a callback that returns `CallToolResult | Promise<CallToolResult>`
2. The `CallToolResult` type requires content array items with specific types (text, image, audio, resource)
3. For image content blocks, both `data` and `mimeType` fields must be strings (not `undefined`)
4. The current implementation conditionally sets these fields as `string | undefined`

### Error Location
```
src/tools/hands/index.ts(35,5): error TS2345
```
The error occurs when registering the `gemini_gen_image` tool, specifically in the return type of the callback function.

## Requirements

### Functional Requirements
1. Fix all TypeScript compilation errors to pass CI
2. Maintain backward compatibility with existing tool functionality
3. Ensure proper type safety throughout the codebase
4. Comply with MCP SDK v1.17.4 type requirements

### Technical Requirements
1. All image content blocks must have non-undefined `data` and `mimeType` fields
2. Tool callbacks must return proper `CallToolResult` types
3. Error responses must follow MCP error handling patterns
4. Type assertions must be avoided in favor of proper type safety

## Architecture

### Current Architecture Issues
```typescript
// Current problematic code pattern
return {
  content: [
    {
      type: "image" as const,
      data: base64Data,      // Could be undefined
      mimeType: mimeType     // Could be undefined
    }
  ],
  isError: false
};
```

### Proposed Solution Architecture
```typescript
// Proposed fix pattern
return {
  content: [
    {
      type: "image" as const,
      data: base64Data || "",      // Always a string
      mimeType: mimeType || "image/png"  // Always a string with fallback
    }
  ],
  isError: false
};
```

## Implementation Approaches

### Approach 1: Safe Type Guards with Validation (Recommended)
**Pros:**
- Ensures runtime safety with compile-time guarantees
- Clear error handling for invalid data
- No silent failures
- Follows TypeScript best practices

**Cons:**
- Requires more code changes
- Slightly more complex implementation

**Implementation:**
```typescript
// Validate and ensure non-undefined values before creating response
if (!base64Data || !mimeType) {
  // Return text-only response if image data is invalid
  return {
    content: [{
      type: "text" as const,
      text: `Error: Invalid image data format`
    }],
    isError: true
  };
}

// Safe to use since we validated above
return {
  content: [
    {
      type: "image" as const,
      data: base64Data,  // Guaranteed string
      mimeType: mimeType  // Guaranteed string
    }
  ],
  isError: false
};
```

### Approach 2: Default Values with Fallbacks
**Pros:**
- Simple implementation
- Minimal code changes
- Always returns valid types

**Cons:**
- May hide actual errors
- Could return invalid/empty image data
- Less explicit error handling

**Implementation:**
```typescript
return {
  content: [
    {
      type: "image" as const,
      data: base64Data || "",
      mimeType: mimeType || "application/octet-stream"
    }
  ],
  isError: false
};
```

### Recommended Approach: Approach 1
We recommend using the safe type guard approach as it provides better error handling, clearer intent, and follows TypeScript best practices for type safety.

## Implementation Steps

### Phase 1: Fix Image Generation Tool Response (Priority 1)

#### Step 1: Update handleImageGeneration function
**File:** `/Users/duynguyen/www/human-mcp/src/tools/hands/index.ts`
**Lines:** 152-173

**Changes:**
1. Add validation for base64Data and mimeType extraction
2. Return text-only error response if image data is invalid
3. Ensure all return paths have valid types

```typescript
async function handleImageGeneration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = ImageGenerationInputSchema.parse(args) as ImageGenerationInput;
  const { prompt, model, output_format, negative_prompt, style, aspect_ratio, seed } = input;

  logger.info(`Generating image with prompt: "${prompt}" using model: ${model}`);

  const generationOptions = {
    prompt,
    model: model || "gemini-2.5-flash-image-preview",
    outputFormat: output_format || "base64",
    negativePrompt: negative_prompt,
    style,
    aspectRatio: aspect_ratio || "1:1",
    seed,
    fetchTimeout: config.server.fetchTimeout
  };

  const result = await generateImage(geminiClient, generationOptions);

  // Return image as proper MCP content type instead of JSON text
  if (result.imageData.startsWith('data:')) {
    // Extract MIME type and base64 data from data URI
    const matches = result.imageData.match(/data:([^;]+);base64,(.+)/);
    if (matches && matches[1] && matches[2]) {
      const mimeType = matches[1];
      const base64Data = matches[2];

      return {
        content: [
          {
            type: "image" as const,
            data: base64Data,
            mimeType: mimeType
          },
          {
            type: "text" as const,
            text: `✅ Image generated successfully using ${result.model}\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Size: ${result.size}\n- Generation Time: ${result.generationTime}ms\n- Timestamp: ${new Date().toISOString()}`
          }
        ],
        isError: false
      };
    }
  }

  // Fallback to text format if data URI parsing fails
  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Image generated successfully!\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Size: ${result.size}\n- Generation Time: ${result.generationTime}ms\n\n**Note:** Image data could not be properly formatted for display.`
      }
    ],
    isError: false
  };
}
```

#### Step 2: Update Error Handlers
**File:** `/Users/duynguyen/www/human-mcp/src/tools/hands/index.ts`
**Lines:** 35-50, 72-87, 109-124

Ensure all error handlers return valid `CallToolResult` types with proper content arrays.

### Phase 2: Verify Other Tool Implementations

#### Step 3: Check Video Generation Tools
Review `handleVideoGeneration` and `handleImageToVideoGeneration` functions to ensure they return valid types.

#### Step 4: Check Eyes Tools
Review `/Users/duynguyen/www/human-mcp/src/tools/eyes/` for similar type issues.

#### Step 5: Check Brain Tools
Review `/Users/duynguyen/www/human-mcp/src/tools/brain/` for similar type issues.

#### Step 6: Check Mouth Tools
Review `/Users/duynguyen/www/human-mcp/src/tools/mouth/` for similar type issues.

### Phase 3: Testing and Validation

#### Step 7: Run TypeScript Compiler
```bash
bun run typecheck
```

#### Step 8: Run Tests
```bash
bun test
```

#### Step 9: Build Project
```bash
bun run build
```

## Testing Strategy

### Unit Tests
1. Test image generation with valid data URI
2. Test image generation with invalid data URI
3. Test error handling scenarios
4. Test fallback responses

### Integration Tests
1. Test tool registration with MCP server
2. Test tool invocation through MCP protocol
3. Test error propagation

### Type Tests
1. Verify all tool callbacks return valid `CallToolResult`
2. Verify no TypeScript errors in strict mode
3. Verify proper type inference

## Risk Analysis

### Risks
1. **Breaking Changes:** Changes might affect existing integrations
   - **Mitigation:** Ensure backward compatibility by maintaining text fallbacks

2. **Runtime Errors:** Type fixes might not catch all runtime issues
   - **Mitigation:** Add comprehensive validation and error handling

3. **Performance Impact:** Additional validation might slow responses
   - **Mitigation:** Keep validation lightweight and optimize regex patterns

### Dependencies
- No new dependencies required
- Existing MCP SDK v1.17.4 compatibility maintained

## Success Criteria

1. ✅ All TypeScript compilation errors resolved
2. ✅ CI/CD pipeline passes all checks
3. ✅ All existing tests pass
4. ✅ No regression in tool functionality
5. ✅ Proper error messages for edge cases

## Rollback Plan

If issues arise after implementation:
1. Revert to previous commit
2. Apply minimal type assertions as temporary fix
3. Re-evaluate approach and implement alternative solution

## Timeline

- **Immediate (15 minutes):** Fix critical TypeScript errors in hands/index.ts
- **Short-term (30 minutes):** Verify and fix any related issues in other tools
- **Testing (15 minutes):** Run full test suite and validate changes

## TODO Checklist

- [ ] Fix handleImageGeneration function type issues
- [ ] Update error handlers to return valid CallToolResult
- [ ] Verify video generation tool responses
- [ ] Check eyes tools for similar issues
- [ ] Check brain tools for similar issues
- [ ] Check mouth tools for similar issues
- [ ] Run TypeScript compiler locally
- [ ] Run test suite
- [ ] Create pull request with fixes
- [ ] Monitor CI/CD pipeline

## Notes

- The issue is specific to the MCP SDK's strict type requirements for content blocks
- The fix ensures all image content blocks have valid, non-undefined string values
- This pattern should be applied consistently across all tools that return image content
