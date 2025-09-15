# [Bug Fix] Comprehensive Test Infrastructure Fix Implementation Plan

**Date**: 2025-09-15  
**Type**: Bug Fix  
**Priority**: High  
**Context Tokens**: Addresses all test infrastructure issues including file system mocking, logger imports, missing test coverage, and code quality improvements

## Executive Summary
This plan addresses critical test infrastructure issues identified through debugging analysis. The main problems include Bun runtime incompatibility with file system mocking, logger import issues in integration tests, missing test coverage for vision processing tools, and minor code quality issues. All tests are currently passing but improvements are needed for robustness and maintainability.

## Issue Analysis
### Symptoms
- [x] Tests pass locally but have fragile mocking setup
- [x] Logger module mocking duplicated across test files
- [ ] Missing comprehensive test coverage for eyes_analyze and eyes_compare tools
- [ ] Unused variables in some test files
- [ ] SSE transport test has connection handling warnings

### Root Cause
The test infrastructure was initially designed without considering Bun's specific module mocking requirements and lacks centralized test utilities for common operations like mocking external dependencies.

### Evidence
- **Logs**: SSE transport shows "SSEServerTransport already started" warnings
- **Error Messages**: No current errors but potential for future failures
- **Affected Components**: All test files, particularly integration tests

## Context Links
- **Related Issues**: Test infrastructure improvements from debugging session
- **Recent Changes**: Plans 003 and 004 addressed initial test failures
- **Dependencies**: Bun test runner, MCP SDK, Google Gemini API

## Solution Design
### Approach
Implement a centralized test utilities module, enhance test coverage for vision tools, and improve code quality through proper cleanup and error handling.

### Changes Required
1. **Test Utilities** (`tests/utils/test-helpers.ts`): Create centralized mocking utilities
2. **Vision Tool Tests** (`tests/unit/eyes-analyze.test.ts`): Add comprehensive test cases
3. **Integration Tests** (`tests/integration/*.test.ts`): Use centralized utilities
4. **Test Setup** (`tests/setup.ts`): Enhanced global test configuration
5. **Code Quality** (`tests/**/*.test.ts`): Remove unused variables and improve cleanup

### Testing Changes
- [x] Update existing tests to use centralized utilities
- [ ] Add comprehensive test cases for vision processing
- [ ] Validate mock behavior consistency
- [ ] Add edge case and error scenario tests

## Implementation Steps

### Step 1: Create Centralized Test Utilities
**File**: `tests/utils/test-helpers.ts`
```typescript
import { mock } from "bun:test";

// Centralized logger mock
export function createLoggerMock() {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {})
  };
}

// Centralized Gemini client mock
export function createGeminiClientMock(responseText = 'Mock analysis result') {
  return mock(function() {
    return {
      getModel: mock(() => ({
        generateContent: mock(async () => ({
          response: {
            text: () => responseText
          }
        }))
      }))
    };
  });
}

// File system mock for Bun
export function createFileSystemMock() {
  const files = new Map<string, string | Buffer>();
  
  return {
    existsSync: mock((path: string) => files.has(path)),
    readFileSync: mock((path: string) => {
      if (!files.has(path)) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return files.get(path);
    }),
    writeFileSync: mock((path: string, content: string | Buffer) => {
      files.set(path, content);
    }),
    unlinkSync: mock((path: string) => {
      if (!files.has(path)) {
        throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
      }
      files.delete(path);
    }),
    mkdirSync: mock(() => {}),
    // Helper methods for testing
    _setFile: (path: string, content: string | Buffer) => files.set(path, content),
    _getFiles: () => files,
    _clear: () => files.clear()
  };
}

// HTTP response mock helper
export function createMockResponse() {
  const headers = new Map();
  let statusCode = 200;
  let body: any = null;
  
  return {
    status: mock((code: number) => {
      statusCode = code;
      return this;
    }),
    json: mock((data: any) => {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(data);
      return this;
    }),
    text: mock((data: string) => {
      headers.set('Content-Type', 'text/plain');
      body = data;
      return this;
    }),
    getStatus: () => statusCode,
    getBody: () => body,
    getHeaders: () => headers
  };
}

// Test data generators
export function createTestImageData() {
  return {
    base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    url: 'https://example.com/test-image.png',
    filePath: '/tmp/test-image.png'
  };
}

export function createTestVideoData() {
  return {
    url: 'https://example.com/test-video.mp4',
    filePath: '/tmp/test-video.mp4',
    frames: [
      'frame1_base64_data',
      'frame2_base64_data',
      'frame3_base64_data'
    ]
  };
}
```

### Step 2: Update Global Test Setup
**File**: `tests/setup.ts`
```typescript
import { beforeAll, afterAll, mock } from "bun:test";
import { createLoggerMock } from "./utils/test-helpers";

// Mock logger globally for all tests
mock.module("@/utils/logger", () => ({
  logger: createLoggerMock()
}));

// Mock file system operations for Bun
mock.module("fs", () => ({
  existsSync: mock(() => false),
  readFileSync: mock(() => Buffer.from("")),
  writeFileSync: mock(() => {}),
  unlinkSync: mock(() => {}),
  mkdirSync: mock(() => {})
}));

// Global test environment setup
beforeAll(() => {
  // Set required environment variables
  process.env.GOOGLE_GEMINI_API_KEY = "test-api-key";
  process.env.LOG_LEVEL = "error";
  process.env.NODE_ENV = "test";
  
  // Suppress console output during tests
  global.console = {
    ...console,
    log: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {})
  };
});

afterAll(() => {
  // Clean up environment variables
  delete process.env.GOOGLE_GEMINI_API_KEY;
  delete process.env.LOG_LEVEL;
  delete process.env.NODE_ENV;
  
  // Restore console
  global.console = console;
});
```

### Step 3: Enhance Vision Tool Tests
**File**: `tests/unit/eyes-analyze-enhanced.test.ts`
```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { registerEyesTool } from '@/tools/eyes/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '@/utils/config';
import { 
  createGeminiClientMock, 
  createTestImageData, 
  createTestVideoData 
} from '../utils/test-helpers';

// Mock dependencies
mock.module('@/tools/eyes/utils/gemini-client', () => ({
  GeminiClient: createGeminiClientMock()
}));

describe('Eyes Analyze Tool - Comprehensive Tests', () => {
  let server: McpServer;
  let toolHandler: any;

  beforeEach(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    const config = loadConfig();

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    await registerEyesTool(server, config);
    
    // Get the registered tool handler
    toolHandler = (server as any)._toolHandlers?.get('eyes_analyze');
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const result = await toolHandler({});
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('required');
    });

    it('should validate analysis type enum', async () => {
      const testData = createTestImageData();
      const result = await toolHandler({
        source: testData.url,
        analysisType: 'invalid_type'
      });
      expect(result.error).toBeDefined();
    });

    it('should validate detail level enum', async () => {
      const testData = createTestImageData();
      const result = await toolHandler({
        source: testData.url,
        detailLevel: 'invalid_level'
      });
      expect(result.error).toBeDefined();
    });
  });

  describe('Image Processing', () => {
    it('should process image from URL', async () => {
      const testData = createTestImageData();
      const result = await toolHandler({
        source: testData.url,
        analysisType: 'general'
      });
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result).toContain('Mock analysis result');
    });

    it('should process image from base64 data', async () => {
      const testData = createTestImageData();
      const result = await toolHandler({
        source: testData.base64,
        analysisType: 'ui_debug'
      });
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
    });

    it('should process image from file path', async () => {
      const testData = createTestImageData();
      
      // Mock file system
      mock.module('fs', () => ({
        existsSync: mock(() => true),
        readFileSync: mock(() => Buffer.from('fake image data'))
      }));
      
      const result = await toolHandler({
        source: testData.filePath,
        analysisType: 'accessibility'
      });
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
    });
  });

  describe('Video Processing', () => {
    it('should process video and extract frames', async () => {
      const testData = createTestVideoData();
      
      // Mock video processor
      mock.module('@/tools/eyes/processors/video', () => ({
        processVideo: mock(async () => ({
          analysis: 'Video analysis with 3 frames',
          frameCount: 3,
          duration: '10s'
        }))
      }));
      
      const result = await toolHandler({
        source: testData.url,
        analysisType: 'error_detection',
        videoFrameCount: 3
      });
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
    });

    it('should handle video processing errors gracefully', async () => {
      mock.module('@/tools/eyes/processors/video', () => ({
        processVideo: mock(async () => {
          throw new Error('FFmpeg not available');
        })
      }));
      
      const result = await toolHandler({
        source: 'https://example.com/video.mp4',
        analysisType: 'general'
      });
      
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('FFmpeg');
    });
  });

  describe('Custom Prompts', () => {
    it('should use custom prompt when provided', async () => {
      const testData = createTestImageData();
      const customPrompt = 'Find all buttons in this UI';
      
      const result = await toolHandler({
        source: testData.url,
        analysisType: 'general',
        customPrompt
      });
      
      expect(result.error).toBeUndefined();
      // Verify the custom prompt was used (would need to check mock calls)
    });

    it('should combine analysis type with custom prompt', async () => {
      const testData = createTestImageData();
      
      const result = await toolHandler({
        source: testData.url,
        analysisType: 'ui_debug',
        customPrompt: 'Focus on navigation elements',
        specificFocus: 'header'
      });
      
      expect(result.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mock.module('@/tools/eyes/utils/gemini-client', () => ({
        GeminiClient: mock(function() {
          return {
            getModel: mock(() => ({
              generateContent: mock(async () => {
                throw new Error('Network timeout');
              })
            }))
          };
        })
      }));
      
      const result = await toolHandler({
        source: 'https://example.com/image.png',
        analysisType: 'general'
      });
      
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Network');
    });

    it('should handle invalid source formats', async () => {
      const result = await toolHandler({
        source: 'not-a-valid-source',
        analysisType: 'general'
      });
      
      expect(result.error).toBeDefined();
    });
  });
});
```

### Step 4: Add Eyes Compare Tool Tests
**File**: `tests/unit/eyes-compare.test.ts`
```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { registerEyesTool } from '@/tools/eyes/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '@/utils/config';
import { createGeminiClientMock, createTestImageData } from '../utils/test-helpers';

describe('Eyes Compare Tool Tests', () => {
  let server: McpServer;
  let toolHandler: any;

  beforeEach(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    const config = loadConfig();

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    await registerEyesTool(server, config);
    toolHandler = (server as any)._toolHandlers?.get('eyes_compare');
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe('Image Comparison', () => {
    it('should compare two images for pixel differences', async () => {
      const testData = createTestImageData();
      
      const result = await toolHandler({
        image1: testData.url,
        image2: 'https://example.com/image2.png',
        comparisonType: 'pixel'
      });
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
    });

    it('should compare images for structural differences', async () => {
      const testData = createTestImageData();
      
      const result = await toolHandler({
        image1: testData.base64,
        image2: testData.url,
        comparisonType: 'structural'
      });
      
      expect(result.error).toBeUndefined();
    });

    it('should compare images for semantic differences', async () => {
      const result = await toolHandler({
        image1: '/path/to/image1.png',
        image2: '/path/to/image2.png',
        comparisonType: 'semantic',
        focusAreas: ['navigation', 'content']
      });
      
      expect(result.error).toBeUndefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing images gracefully', async () => {
      const result = await toolHandler({
        image1: '/non/existent/image.png',
        image2: '/another/missing/image.png',
        comparisonType: 'pixel'
      });
      
      expect(result.error).toBeDefined();
    });

    it('should validate comparison type', async () => {
      const testData = createTestImageData();
      
      const result = await toolHandler({
        image1: testData.url,
        image2: testData.url,
        comparisonType: 'invalid_type'
      });
      
      expect(result.error).toBeDefined();
    });
  });
});
```

### Step 5: Update Integration Tests
**File**: `tests/integration/server-enhanced.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "@/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("MCP Server Integration - Enhanced", () => {
  let server: McpServer;
  
  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    server = await createServer();
  });
  
  afterAll(async () => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    // Proper cleanup
    if (server && typeof server.close === 'function') {
      await server.close();
    }
  });
  
  describe("Server Initialization", () => {
    it("should create server successfully", () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });
    
    it("should register all required tools", () => {
      // Check that tools are registered
      const handlers = (server as any)._toolHandlers;
      expect(handlers).toBeDefined();
      expect(handlers.has('eyes_analyze')).toBe(true);
      expect(handlers.has('eyes_compare')).toBe(true);
    });
    
    it("should register prompts", () => {
      const prompts = (server as any)._promptHandlers;
      expect(prompts).toBeDefined();
      expect(prompts.size).toBeGreaterThan(0);
    });
    
    it("should register resources", () => {
      const resources = (server as any)._resourceHandlers;
      expect(resources).toBeDefined();
    });
  });
  
  describe("Tool Execution", () => {
    it("should execute eyes_analyze tool", async () => {
      const handler = (server as any)._toolHandlers.get('eyes_analyze');
      const result = await handler({
        source: 'https://example.com/test.png',
        analysisType: 'general'
      });
      
      expect(result).toBeDefined();
      // Result will have error due to mocked Gemini, but structure should be correct
      expect(result).toHaveProperty('result');
    });
  });
});
```

### Step 6: Fix SSE Transport Test Issues
**File**: `tests/integration/sse-transport-fixed.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { TestServerManager } from "../utils/test-server-manager";

describe("SSE Transport Integration - Fixed", () => {
  let serverManager: TestServerManager;
  let serverUrl: string;
  
  beforeAll(async () => {
    serverManager = new TestServerManager();
    serverUrl = await serverManager.start({
      enableSse: true,
      stateless: false
    });
  });
  
  afterAll(async () => {
    await serverManager.stop();
  });
  
  describe("SSE Connection Management", () => {
    it("should establish SSE connection correctly", async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      
      // Properly close the connection
      response.body?.cancel();
    });
    
    it("should handle session lifecycle properly", async () => {
      // Create session
      const sseResponse = await fetch(`${serverUrl}/sse`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        }
      });
      
      // Extract session ID from response
      const reader = sseResponse.body?.getReader();
      const { value } = await reader?.read() || {};
      const text = new TextDecoder().decode(value);
      const sessionMatch = text.match(/sessionId: ([\w-]+)/);
      const sessionId = sessionMatch?.[1];
      
      expect(sessionId).toBeDefined();
      
      // Clean up properly
      reader?.cancel();
      sseResponse.body?.cancel();
    });
  });
});
```

### Step 7: Add Test Coverage Report Script
**File**: `package.json` (update scripts section)
```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/unit/",
    "test:integration": "bun test tests/integration/",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "test:ci": "bun test --bail"
  }
}
```

### Step 8: Create Test Documentation
**File**: `tests/README.md`
```markdown
# Test Infrastructure Documentation

## Overview
This directory contains all tests for the Human MCP project, organized into unit and integration tests.

## Structure
```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # End-to-end integration tests
├── utils/          # Test utilities and helpers
├── setup.ts        # Global test setup
└── README.md       # This file
```

## Running Tests

### All Tests
```bash
bun test
```

### Unit Tests Only
```bash
bun test:unit
```

### Integration Tests Only
```bash
bun test:integration
```

### With Coverage
```bash
bun test:coverage
```

### Watch Mode
```bash
bun test:watch
```

## Writing Tests

### Using Test Helpers
```typescript
import { 
  createLoggerMock, 
  createGeminiClientMock,
  createTestImageData 
} from '../utils/test-helpers';

// Use the helpers in your tests
const logger = createLoggerMock();
const geminiClient = createGeminiClientMock('Custom response');
const testImage = createTestImageData();
```

### Mocking Modules
All module mocking should be done using Bun's `mock.module()`:

```typescript
import { mock } from "bun:test";

mock.module("@/utils/logger", () => ({
  logger: createLoggerMock()
}));
```

### Test Best Practices
1. Always clean up resources in `afterEach` or `afterAll`
2. Use descriptive test names that explain what is being tested
3. Test both success and error scenarios
4. Mock external dependencies to ensure tests are deterministic
5. Keep tests focused on a single aspect of functionality

## Common Issues and Solutions

### Issue: Module not found errors
**Solution**: Ensure path aliases are correctly configured in `tsconfig.json`

### Issue: Tests hanging or timing out
**Solution**: Check for unclosed connections or unresolved promises

### Issue: Flaky tests
**Solution**: Ensure all async operations are properly awaited and mocked

## CI/CD Integration
Tests are automatically run in GitHub Actions on:
- Every push to main branch
- Every pull request
- Manual workflow dispatch

The CI pipeline runs tests in this order:
1. Type checking
2. Unit tests
3. Integration tests
4. Build verification
```

## Verification Plan
### Test Cases
- [ ] All unit tests pass consistently
- [ ] All integration tests pass without warnings
- [ ] Test coverage meets minimum threshold (80%)
- [ ] No unused variables or imports in test files
- [ ] Proper cleanup in all test suites

### Rollback Plan
If the changes cause test failures:
1. Revert to previous test setup: `git revert <commit-hash>`
2. Restore original mock implementations
3. Re-run tests to verify stability

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Mock incompatibility with Bun updates | Medium | Pin Bun version in CI, test with multiple versions |
| Test flakiness due to async operations | High | Implement proper cleanup and timeout handling |
| Missing edge case coverage | Medium | Regular code review and coverage analysis |

## TODO Checklist
- [x] Create `tests/utils/test-helpers.ts` with centralized utilities (COMPLETED - Created mock-helpers.ts and test-data-generators.ts)
- [x] Update `tests/setup.ts` with enhanced global configuration (COMPLETED - Enhanced with global mocks)
- [x] Create comprehensive vision tool tests in `tests/unit/eyes-analyze-enhanced.test.ts` (COMPLETED - Created eyes-analyze.test.ts)
- [ ] Add eyes_compare tool tests in `tests/unit/eyes-compare.test.ts` (PENDING)
- [x] Update integration tests to use centralized helpers (COMPLETED - Updated SSE transport test)
- [ ] Fix SSE transport test connection handling (CRITICAL - Test failures need immediate attention)
- [ ] Update package.json with new test scripts (PENDING)
- [ ] Create test documentation in `tests/README.md` (PENDING)
- [x] Run full test suite to verify all changes (COMPLETED - 3 tests failing, needs fixes)
- [ ] Update CI/CD workflow if needed (PENDING)
- [ ] Document test best practices for future contributors (PENDING)
- [ ] Set up test coverage reporting (PENDING)
- [x] Review and remove any unused test code (COMPLETED - Cleaned up unused variables)
- [ ] Verify tests pass in CI environment (BLOCKED - Critical test failures)
- [ ] Create follow-up plan for continuous test improvement (PENDING)

## CRITICAL ISSUES IDENTIFIED
1. **SSE Transport Test Failures**: Tests expecting 400 status codes are receiving 200
2. **Port Management Issues**: Test server manager cannot find available ports
3. **Mock Strategy Inconsistencies**: Mixed mocking approaches causing potential conflicts

## IMMEDIATE ACTION REQUIRED
- Fix SSE transport API behavior or test expectations
- Improve port availability checking in test-server-manager.ts
- Standardize mocking strategy across all test files

## Implementation Priority
1. **Phase 1 - Foundation** (Immediate)
   - Create test utilities and helpers
   - Update global test setup
   - Fix existing test issues

2. **Phase 2 - Coverage** (Next Sprint)
   - Add comprehensive vision tool tests
   - Implement eyes_compare tests
   - Enhance integration test coverage

3. **Phase 3 - Quality** (Following Sprint)
   - Add test coverage reporting
   - Implement performance benchmarks
   - Create automated test quality checks

## Success Metrics
- Zero test failures in CI/CD pipeline (CURRENT: 3 failures - NEEDS FIX)
- Test execution time under 2 minutes (CURRENT: ~450ms - EXCELLENT)
- Code coverage above 80% (CURRENT: ~65% - NEEDS IMPROVEMENT)
- No flaky tests over a 30-day period (CURRENT: Port management issues causing flakiness)
- Clear documentation for all test utilities (CURRENT: Missing documentation)

## CURRENT STATUS: PARTIALLY COMPLETE
**Grade: B+ (Good with Critical Issues)**
- ✅ Excellent architectural foundation with centralized utilities
- ✅ Proper TypeScript interfaces and type safety
- ✅ Clean code practices and organization
- ❌ Critical test failures blocking CI/CD
- ❌ Port management reliability issues
- ❌ Missing comprehensive test coverage for vision tools

## Notes
- All test improvements should maintain backward compatibility
- Focus on reliability over speed initially
- Ensure tests work both locally and in CI environment
- Consider adding visual regression tests in future iterations