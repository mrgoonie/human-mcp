# Fix GitHub Actions TypeScript Compilation Errors - Implementation Plan

## Overview
The GitHub Actions CI pipeline is failing due to TypeScript compilation errors in the test files. The failure occurred in the "typecheck" step which runs `tsc --noEmit`. The root causes are related to API changes in the @modelcontextprotocol/sdk package and incorrect usage of Bun's mock API.

## Problem Analysis

### Root Causes Identified

1. **McpServer Constructor Mismatch**
   - Current code passes 2 arguments to McpServer constructor
   - The SDK v1.4.0+ only accepts 1 argument (configuration object)
   - The second "capabilities" argument is no longer supported in the constructor

2. **Bun Mock API Incompatibility**
   - Tests use `.mockClear()` method which doesn't exist in Bun's mock API
   - Bun uses `.mockReset()` or requires reassigning the mock

3. **TypeScript Literal Type Errors**
   - Tests use plain strings where specific enum literal types are required
   - No type assertions or proper typing for enum values

4. **Function Signature Mismatches**
   - Some mocked functions are called with incorrect number of arguments

## Affected Files

1. `/tests/e2e/hands-real-api.test.ts` - Line 97
2. `/tests/integration/hands-image-generation.test.ts` - Line 36
3. `/tests/unit/hands-schemas.test.ts` - Lines 47, 64, 81, 214, 215, 217, 218
4. `/tests/unit/hands-tool.test.ts` - Lines 84, 146

## Implementation Approach

### Approach 1: Minimal Fix (Recommended)
Fix only the compilation errors without changing the overall test structure.

**Pros:**
- Minimal changes to existing code
- Quick to implement
- Low risk of introducing new bugs
- Tests remain familiar to developers

**Cons:**
- Doesn't modernize test patterns
- May need updates if SDK changes again

### Approach 2: Full Test Refactor
Completely refactor tests to use latest patterns and best practices.

**Pros:**
- Modern test patterns
- Better maintainability
- More robust mocking

**Cons:**
- Time-consuming
- Higher risk of breaking existing functionality
- Requires extensive testing

**Recommendation:** Use Approach 1 for immediate fix, plan Approach 2 for future technical debt reduction.

## Detailed Implementation Steps

### Phase 1: Fix McpServer Constructor Issues

#### File: `/tests/e2e/hands-real-api.test.ts`
**Current (Line 91-97):**
```typescript
const server = new McpServer({
  name: 'test-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});
```

**Fix:**
```typescript
const server = new McpServer({
  name: 'test-server',
  version: '1.0.0'
});
// Note: capabilities are now set during server.connect() or via server configuration
```

#### File: `/tests/unit/hands-tool.test.ts`
**Current (Line 42-49):**
```typescript
server = new McpServer({
  name: 'test-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});
```

**Fix:**
```typescript
server = new McpServer({
  name: 'test-server',
  version: '1.0.0'
});
```

### Phase 2: Fix Bun Mock API Usage

#### File: `/tests/integration/hands-image-generation.test.ts`
**Current (Line 35-36):**
```typescript
mockGeminiModel.generateContent.mockClear();
mockGeminiClient.getImageGenerationModel.mockClear();
```

**Fix:**
```typescript
// Option 1: Use mockReset if available
if (typeof mockGeminiModel.generateContent.mockReset === 'function') {
  mockGeminiModel.generateContent.mockReset();
} else {
  // Option 2: Reassign the mock
  mockGeminiModel.generateContent = mock(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return TestDataGenerators.createMockGeminiImageGenerationResponse();
  });
}

// For the client mock - it's not a mock function, remove the line
// mockGeminiClient.getImageGenerationModel.mockClear(); // Remove this line
```

### Phase 3: Fix TypeScript Literal Type Issues

#### File: `/tests/unit/hands-schemas.test.ts`

**Issue 1 (Line 47):**
```typescript
expect(result.data.style).toBe(style);
```

**Fix:**
```typescript
expect(result.data.style).toBe(style as typeof result.data.style);
```

**Issue 2 (Line 64):**
```typescript
expect(result.data.aspect_ratio).toBe(ratio);
```

**Fix:**
```typescript
expect(result.data.aspect_ratio).toBe(ratio as typeof result.data.aspect_ratio);
```

**Issue 3 (Line 81):**
```typescript
expect(result.data.output_format).toBe(format);
```

**Fix:**
```typescript
expect(result.data.output_format).toBe(format as typeof result.data.output_format);
```

**Issue 4 (Lines 214-218):**
```typescript
model: expect.any(String),
output_format: expect.any(String),
// ... other fields
style: expect.any(String),
aspect_ratio: expect.any(String)
```

**Fix:**
```typescript
model: 'gemini-2.5-flash-image-preview',
output_format: expect.stringMatching(/^(base64|url)$/),
// ... other fields
style: expect.stringMatching(/^(photorealistic|artistic|cartoon|sketch|digital_art)$/),
aspect_ratio: expect.stringMatching(/^(1:1|16:9|9:16|4:3|3:4)$/)
```

### Phase 4: Fix Function Signature Issues

#### File: `/tests/unit/hands-tool.test.ts`

**Issue 1 (Line 84):**
```typescript
const result = await mockGenerateImage({
  prompt: 'Test prompt',
  // ... options
});
```

**Fix:**
Since mockGenerateImage is defined to accept arguments, this should work. The issue might be in how it's typed. Ensure the mock is properly typed:

```typescript
const mockGenerateImage = mock(async (options: any) => ({ // Add parameter type
  imageData: TestDataGenerators.createMockImageGenerationResponse().image,
  format: 'base64_data_uri',
  model: 'gemini-2.5-flash-image-preview',
  generationTime: Math.floor(Math.random() * 5000) + 1000,
  size: '1024x1024'
}));
```

**Issue 2 (Line 146):**
```typescript
await mockGenerateImage({});
```

**Fix:**
```typescript
await mockGenerateImage({} as any); // Add type assertion for test
```

## Testing Strategy

### Unit Tests
1. Run `bun run typecheck` to verify TypeScript compilation
2. Run `bun test tests/unit/` to verify unit tests pass
3. Run `bun test tests/integration/` to verify integration tests pass

### Integration Tests
1. Test McpServer initialization without errors
2. Verify tool registration works correctly
3. Ensure mock functions behave as expected

### E2E Tests
1. Skip if no API key is available (already implemented)
2. Verify real API calls work when key is present

## Risk Assessment

### Low Risk
- Removing the second argument from McpServer constructor
- Adding type assertions for literal types

### Medium Risk
- Changing mock reset strategy (thoroughly test mock behavior)

### Mitigation Strategies
1. Run tests locally before pushing
2. Create a feature branch for testing
3. Keep original code commented for quick rollback

## Verification Checklist

- [ ] All TypeScript compilation errors resolved
- [ ] `bun run typecheck` passes without errors
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No regression in functionality
- [ ] GitHub Actions CI pipeline passes

## Alternative Solutions

If the above fixes don't work:

1. **Downgrade SDK Version**: Pin @modelcontextprotocol/sdk to a specific version that matches the current code
2. **Update SDK and Refactor**: Upgrade to latest SDK and refactor all code to match new API
3. **Mock Module Differently**: Use different mocking strategy or library

## TODO Task List

- [ ] Fix McpServer constructor calls in test files
- [ ] Replace mockClear() with proper Bun mock methods
- [ ] Fix TypeScript literal type assertions
- [ ] Fix function signature mismatches
- [ ] Run typecheck locally to verify fixes
- [ ] Run all tests to ensure no regressions
- [ ] Create PR with fixes
- [ ] Monitor CI pipeline for successful build

## Notes

- The @modelcontextprotocol/sdk has changed its API between versions
- Bun's mock API differs from Jest's mock API
- Consider adding version pinning to package.json to prevent future breaking changes
- Document the SDK version requirements in README

## References

- [Model Context Protocol TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Bun Test Documentation](https://bun.sh/docs/test/mocks)
- [GitHub Actions Run Log](https://github.com/mrgoonie/human-mcp/actions/runs/17894368336/job/50878984914)