# GitHub Actions CI Failure Fix Plan

## Overview

This plan addresses the CI failures in GitHub Actions run [#18089119355](https://github.com/mrgoonie/human-mcp/actions/runs/18089119355/job/51465486681) caused by brain tools registration naming mismatches.

## Problem Summary

The test suite is failing with 9 test failures, all related to brain tools not being registered with the expected names. The root cause is a single tool naming mismatch where the sequential thinking tool is registered with a different name than what the tests expect.

## Root Cause Analysis

### 1. Naming Mismatch
- **Tool**: Sequential Thinking Tool
- **Registered Name**: `mcp__reasoning__sequentialthinking`
- **Expected Name**: `mcp__sequential-thinking__sequentialthinking`
- **Location**: `/src/tools/brain/native/sequential-thinking.ts:118`

### 2. Impact
This single naming mismatch causes cascading test failures:
- Tool lookup returns `undefined`
- Schema validation tests fail
- Functional tests fail
- Error handling tests fail

## Implementation Approach

### Approach 1: Fix Tool Registration Name (Recommended) ✅

**Pros:**
- Minimal code change (1 line)
- Maintains test expectations
- Consistent with documentation
- No breaking changes for existing users

**Cons:**
- None identified

**Implementation:**
1. Update the tool registration name in sequential-thinking.ts
2. Run tests locally to verify fix
3. Commit and push changes

### Approach 2: Update Test Expectations

**Pros:**
- Keeps current implementation
- No changes to production code

**Cons:**
- Tests diverge from documentation
- Potential breaking changes if other components expect the original name
- More changes required (update all test references)

## Detailed Implementation Steps

### Step 1: Fix Tool Registration Name
**File:** `/Users/duynguyen/www/human-mcp/src/tools/brain/native/sequential-thinking.ts`
**Line:** 118

**Change From:**
```typescript
server.registerTool(
  "mcp__reasoning__sequentialthinking",
```

**Change To:**
```typescript
server.registerTool(
  "mcp__sequential-thinking__sequentialthinking",
```

### Step 2: Verify All Tool Names
Confirm these tools are registered correctly (already verified):
- ✅ `mcp__memory__store` - Line 230 in memory.ts
- ✅ `mcp__memory__recall` - Line 302 in memory.ts
- ✅ `brain_analyze_simple` - Line 404 in simple-reasoning.ts
- ✅ `brain_patterns_info` - Line 447 in simple-reasoning.ts
- ✅ `brain_reflect_enhanced` - Line 54 in index.ts

### Step 3: Run Tests Locally
```bash
# Run type checking
bun run typecheck

# Run unit tests
bun test tests/unit/brain-tools.test.ts

# Run full test suite
bun test
```

### Step 4: Commit Changes
```bash
git add src/tools/brain/native/sequential-thinking.ts
git commit -m "fix(brain-tools): correct sequential thinking tool registration name

- Change tool name from 'mcp__reasoning__sequentialthinking' to 'mcp__sequential-thinking__sequentialthinking'
- Fixes test failures in brain-tools.test.ts
- Aligns with expected naming convention in tests and documentation"
```

### Step 5: Push and Monitor CI
```bash
git push origin main
```

## Testing Strategy

### Unit Tests to Verify
1. **Tool Registration Tests**
   - `should register all native brain tools` ✓
   - `sequential thinking tool should have simplified schema` ✓
   - `memory tools should have simplified schemas` ✓
   - `simple reasoning tool should work with pattern-based analysis` ✓
   - `enhanced reflection tool should have simplified interface` ✓
   - `native tools should have fast response indicators` ✓
   - `brain tools should be properly categorized` ✓

2. **Functional Tests**
   - `sequential thinking tool should process thoughts` ✓
   - `memory store tool should create entities` ✓
   - `memory recall tool should search entities` ✓
   - `simple reasoning tool should perform analysis` ✓
   - `patterns info tool should list available patterns` ✓

3. **Error Handling Tests**
   - `sequential thinking should handle missing problem` ✓
   - `memory store should handle invalid action` ✓
   - `simple reasoning should handle invalid pattern` ✓

### Expected Test Results
All 91 tests should pass after the fix is applied.

## Risk Assessment

### Low Risk ✅
- Single line change
- No logic changes
- No API changes
- Tests provide comprehensive coverage

### Mitigation
- Run tests locally before pushing
- Monitor CI pipeline after push
- Rollback if unexpected issues arise

## Additional Improvements (Optional)

### 1. Add Tool Name Validation
Create a constant for tool names to prevent future mismatches:
```typescript
export const BRAIN_TOOL_NAMES = {
  SEQUENTIAL_THINKING: "mcp__sequential-thinking__sequentialthinking",
  MEMORY_STORE: "mcp__memory__store",
  MEMORY_RECALL: "mcp__memory__recall",
  // ...
} as const;
```

### 2. Add Integration Test
Create an integration test that validates all registered tool names:
```typescript
test("all brain tools use correct naming convention", async () => {
  const expectedNames = Object.values(BRAIN_TOOL_NAMES);
  for (const name of expectedNames) {
    expect(registeredTools.has(name)).toBe(true);
  }
});
```

## Timeline

- **Immediate Fix**: 5 minutes
- **Testing**: 10 minutes
- **CI Verification**: 5-10 minutes
- **Total**: ~20-25 minutes

## Success Criteria

1. ✅ All 91 tests pass
2. ✅ GitHub Actions CI pipeline succeeds
3. ✅ No regression in existing functionality
4. ✅ Tool names match documentation

## TODO Checklist

- [ ] Update tool registration name in sequential-thinking.ts
- [ ] Run `bun run typecheck` locally
- [ ] Run `bun test tests/unit/brain-tools.test.ts` locally
- [ ] Run full test suite `bun test`
- [ ] Commit changes with descriptive message
- [ ] Push to main branch
- [ ] Monitor GitHub Actions CI pipeline
- [ ] Verify all checks pass
- [ ] Update documentation if needed

## Conclusion

This is a straightforward fix for a simple naming mismatch. The single-line change will resolve all 9 test failures and restore the CI pipeline to working order. The recommended approach maintains backward compatibility and aligns with test expectations.