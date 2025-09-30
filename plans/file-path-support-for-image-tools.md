# Implementation Plan: File Path Support for Image Tools

## Overview
This plan outlines the implementation of file path support for image handling tools in the Human MCP project. Currently, the `hands` tools only accept base64-encoded images, throwing an error "File path input not yet implemented" when users provide file paths. This implementation will enable direct file path input, reducing token usage and improving developer experience.

## Current State Analysis

### Affected Tools and Files

1. **Primary Image Editing Tool**
   - File: `/Users/duynguyen/www/human-mcp/src/tools/hands/processors/image-editor.ts`
   - Function: `processImageForEditing()` (line 175-200)
   - Current behavior: Throws error for file path inputs

2. **Image Generation Tools** (Secondary - for consistency)
   - File: `/Users/duynguyen/www/human-mcp/src/tools/hands/processors/image-generator.ts`
   - File: `/Users/duynguyen/www/human-mcp/src/tools/hands/processors/video-generator.ts`

3. **Tool Registrations**
   - File: `/Users/duynguyen/www/human-mcp/src/tools/hands/index.ts`
   - Tools affected:
     - `gemini_edit_image`
     - `gemini_inpaint_image`
     - `gemini_outpaint_image`
     - `gemini_style_transfer_image`
     - `gemini_compose_images`

### Existing Implementation Reference
The `eyes` tool already has a working implementation for handling file paths:
- File: `/Users/duynguyen/www/human-mcp/src/tools/eyes/processors/image.ts`
- Function: `loadImage()` (line 131-298)
- Features:
  - Detects input type (base64, URL, file path)
  - Reads files using `fs.promises`
  - Processes images with Sharp library
  - Handles Cloudflare R2 uploads for HTTP transport

## Requirements

### Functional Requirements
1. Accept file paths (absolute and relative) as input for all image parameters
2. Automatically detect input type (file path vs base64 vs URL)
3. Convert file paths to base64 for Gemini API consumption
4. Handle various image formats (PNG, JPEG, WebP, GIF, BMP, TIFF)
5. Process images to optimize size (resize if needed)
6. Maintain backward compatibility with existing base64 inputs

### Non-Functional Requirements
1. Performance: Efficient file reading and processing
2. Error handling: Clear error messages for invalid files or paths
3. Security: Validate file paths and prevent directory traversal
4. Memory efficiency: Stream large files when possible
5. Consistency: Use same patterns as existing `eyes` tool implementation

## Architecture

### Input Type Detection Strategy
```typescript
function detectInputType(input: string): 'base64' | 'url' | 'filepath' {
  if (input.startsWith('data:')) return 'base64';
  if (input.startsWith('http://') || input.startsWith('https://')) return 'url';
  return 'filepath';
}
```

### Processing Pipeline
1. **Input Detection** → Identify input type
2. **Validation** → Check file exists and is accessible
3. **Reading** → Load file content into memory
4. **Processing** → Resize/optimize with Sharp if needed
5. **Conversion** → Convert to base64 data URI
6. **Caching** → Optional caching for repeated use

## Implementation Approach

### Approach 1: Centralized Utility Function (Recommended)
Create a shared utility function that can be reused across all image processing tools.

**Pros:**
- Single source of truth for image loading logic
- Easier maintenance and testing
- Consistent behavior across all tools
- Reduces code duplication

**Cons:**
- Requires refactoring existing code
- May need to handle tool-specific requirements

### Approach 2: Tool-Specific Implementation
Implement file path handling separately in each processor.

**Pros:**
- No impact on other tools
- Can customize for specific tool needs
- Faster initial implementation

**Cons:**
- Code duplication
- Inconsistent behavior potential
- Higher maintenance burden
- More testing required

### Recommended Approach: Centralized Utility Function
Based on the existing pattern in the `eyes` tool and the need for consistency, we recommend creating a centralized utility function.

## Detailed Implementation Steps

### Phase 1: Create Utility Function

1. **Create new utility file**: `/Users/duynguyen/www/human-mcp/src/utils/image-loader.ts`
   ```typescript
   import fs from 'fs/promises';
   import sharp from 'sharp';
   import { ProcessingError } from './errors.js';
   import { logger } from './logger.js';

   export interface LoadedImage {
     data: string;      // base64 encoded data
     mimeType: string;  // MIME type of the image
     format?: string;   // Optional format indicator
   }

   export async function loadImageFromInput(
     input: string,
     options?: {
       maxWidth?: number;
       maxHeight?: number;
       quality?: number;
       fetchTimeout?: number;
     }
   ): Promise<LoadedImage> {
     // Implementation here
   }
   ```

2. **Implement input type detection**
   ```typescript
   function detectInputType(input: string): 'base64' | 'url' | 'filepath' {
     if (input.startsWith('data:')) return 'base64';
     if (input.startsWith('http://') || input.startsWith('https://')) return 'url';
     return 'filepath';
   }
   ```

3. **Implement file reading logic**
   ```typescript
   async function loadFromFilePath(filePath: string, options): Promise<LoadedImage> {
     try {
       const absolutePath = path.isAbsolute(filePath)
         ? filePath
         : path.resolve(process.cwd(), filePath);

       // Validate file exists
       const stats = await fs.stat(absolutePath);
       if (!stats.isFile()) {
         throw new ProcessingError(`Path is not a file: ${filePath}`);
       }

       // Read file
       const buffer = await fs.readFile(absolutePath);

       // Process with Sharp
       const processedImage = await sharp(buffer)
         .resize(options.maxWidth || 1024, options.maxHeight || 1024, {
           fit: 'inside',
           withoutEnlargement: true
         })
         .jpeg({ quality: options.quality || 85 })
         .toBuffer();

       return {
         data: processedImage.toString('base64'),
         mimeType: 'image/jpeg'
       };
     } catch (error) {
       if (error.code === 'ENOENT') {
         throw new ProcessingError(`File not found: ${filePath}`);
       }
       throw new ProcessingError(`Failed to load image file: ${error.message}`);
     }
   }
   ```

### Phase 2: Update Image Editor Processor

1. **Update imports in `image-editor.ts`**
   ```typescript
   import { loadImageFromInput } from '@/utils/image-loader.js';
   ```

2. **Replace `processImageForEditing` function**
   ```typescript
   async function processImageForEditing(inputImage: string): Promise<{ data: string; mimeType: string }> {
     try {
       const loadedImage = await loadImageFromInput(inputImage, {
         maxWidth: 1024,
         maxHeight: 1024,
         quality: 85
       });

       return {
         data: loadedImage.data,
         mimeType: loadedImage.mimeType
       };
     } catch (error) {
       throw new Error(`Failed to process input image: ${error.message}`);
     }
   }
   ```

### Phase 3: Update Schema Documentation

1. **Update schema descriptions in `schemas.ts`**
   ```typescript
   input_image: z.string().describe("File path, URL, or base64 encoded image"),
   mask_image: z.string().optional().describe("File path, URL, or base64 encoded mask image"),
   style_image: z.string().optional().describe("File path, URL, or base64 encoded reference image"),
   ```

2. **Update tool descriptions in `index.ts`**
   - Update all input descriptions to mention file path support

### Phase 4: Add Tests

1. **Create test file**: `/Users/duynguyen/www/human-mcp/tests/unit/image-loader.test.ts`
   ```typescript
   import { describe, it, expect } from 'bun:test';
   import { loadImageFromInput } from '@/utils/image-loader';

   describe('Image Loader', () => {
     it('should load image from file path', async () => {
       // Test implementation
     });

     it('should handle base64 input', async () => {
       // Test implementation
     });

     it('should handle URL input', async () => {
       // Test implementation
     });

     it('should throw error for non-existent file', async () => {
       // Test implementation
     });
   });
   ```

2. **Update existing tests**
   - Update `hands-tool.test.ts` to include file path testing

### Phase 5: Documentation Updates

1. **Update tool documentation**
   - Add examples with file paths
   - Document supported formats
   - Add migration guide for users

2. **Update README if necessary**
   - Mention file path support in features

## Files to Modify

### Core Implementation Files
1. **CREATE**: `/Users/duynguyen/www/human-mcp/src/utils/image-loader.ts` - New utility function
2. **MODIFY**: `/Users/duynguyen/www/human-mcp/src/tools/hands/processors/image-editor.ts` - Update `processImageForEditing()`
3. **MODIFY**: `/Users/duynguyen/www/human-mcp/src/tools/hands/schemas.ts` - Update input descriptions

### Optional Consistency Updates
4. **MODIFY**: `/Users/duynguyen/www/human-mcp/src/tools/hands/processors/image-generator.ts` - Add file path support for image inputs
5. **MODIFY**: `/Users/duynguyen/www/human-mcp/src/tools/hands/processors/video-generator.ts` - Add file path support for image inputs

### Test Files
6. **CREATE**: `/Users/duynguyen/www/human-mcp/tests/unit/image-loader.test.ts` - Unit tests for image loader
7. **MODIFY**: `/Users/duynguyen/www/human-mcp/tests/unit/hands-tool.test.ts` - Add file path tests

### Documentation Files
8. **MODIFY**: `/Users/duynguyen/www/human-mcp/src/tools/hands/index.ts` - Update tool descriptions

## Testing Strategy

### Unit Tests
1. **Image Loader Tests**
   - Test file path detection
   - Test file reading
   - Test base64 conversion
   - Test error handling
   - Test image optimization

2. **Integration Tests**
   - Test end-to-end image editing with file paths
   - Test all editing operations (inpaint, outpaint, etc.)
   - Test with various image formats
   - Test with large files

### Manual Testing
1. Test with MCP inspector (`bun run inspector`)
2. Test with various file paths:
   - Absolute paths
   - Relative paths
   - Paths with spaces
   - Non-existent files
   - Different image formats

### Performance Testing
1. Measure memory usage with large images
2. Test processing time for various image sizes
3. Verify no memory leaks

## Error Handling

### Expected Error Scenarios
1. **File not found**: Clear message with file path
2. **Invalid file format**: List supported formats
3. **Permission denied**: Suggest checking file permissions
4. **File too large**: Suggest reducing file size
5. **Corrupted file**: Suggest validating file integrity

### Error Message Format
```typescript
throw new ProcessingError(
  `Failed to load image from path: ${filePath}\n` +
  `Reason: ${specificReason}\n` +
  `Supported formats: PNG, JPEG, WebP, GIF, BMP, TIFF\n` +
  `You can also provide a base64 data URI or URL instead.`
);
```

## Security Considerations

1. **Path Traversal Prevention**
   - Validate and sanitize file paths
   - Use `path.resolve()` to get absolute paths
   - Check if resolved path is within allowed directories

2. **File Size Limits**
   - Implement maximum file size checks
   - Default: 10MB per image
   - Configurable via environment variables

3. **File Type Validation**
   - Check file extensions
   - Validate MIME types
   - Use Sharp's built-in format validation

## Migration Guide

### For End Users
```typescript
// Before (base64 only)
const imageData = fs.readFileSync('image.png').toString('base64');
await tool.call('gemini_edit_image', {
  input_image: `data:image/png;base64,${imageData}`,
  // ...
});

// After (direct file path)
await tool.call('gemini_edit_image', {
  input_image: './image.png',  // or '/absolute/path/to/image.png'
  // ...
});
```

### Backward Compatibility
- All existing base64 inputs will continue to work
- No breaking changes to API
- Transparent upgrade for users

## Risks and Mitigations

### Risk 1: Memory Issues with Large Files
- **Mitigation**: Implement streaming for files > 5MB
- **Mitigation**: Add configurable size limits
- **Mitigation**: Use Sharp's streaming API

### Risk 2: Performance Degradation
- **Mitigation**: Add caching for frequently used files
- **Mitigation**: Optimize Sharp processing parameters
- **Mitigation**: Implement lazy loading

### Risk 3: Cross-Platform Path Issues
- **Mitigation**: Use Node.js path module for all path operations
- **Mitigation**: Test on Windows, macOS, and Linux
- **Mitigation**: Handle both forward and backward slashes

## TODO Checklist

### Completed Tasks ✅
- [x] Create `/Users/duynguyen/www/human-mcp/src/utils/image-loader.ts` utility
- [x] Implement input type detection logic
- [x] Implement file path loading with Sharp processing
- [x] Update `processImageForEditing()` in image-editor.ts
- [x] Update schema descriptions in schemas.ts
- [x] Add Cloudflare R2 integration for HTTP transport
- [x] Handle Claude Desktop virtual paths
- [x] Add URL fetching support
- [x] Add error handling for edge cases

### High Priority (Must Fix Before Merge) ❌
- [ ] Add security validations (path traversal, file size) - **CRITICAL**
- [ ] Create unit tests for image loader utility - **CRITICAL**
- [ ] Fix error handling type preservation in image-editor.ts

### Medium Priority (Should Fix Soon) ⚠️
- [ ] Update integration tests for hands tools
- [ ] Add JSDoc documentation to image-loader functions
- [ ] Extract magic numbers to named constants
- [ ] Add debug logging at key decision points
- [ ] Test with MCP inspector

### Low Priority (Nice to Have) 📋
- [ ] Update tool descriptions in index.ts
- [ ] Test cross-platform compatibility (Windows, Linux)
- [ ] Update documentation with examples
- [ ] Performance testing with various file sizes
- [ ] Add format preservation option
- [ ] Optional: Update image-generator.ts for consistency
- [ ] Optional: Update video-generator.ts for consistency

### Code Review Status 📝
- **Review Date**: 2025-09-30
- **Review Report**: `/Users/duynguyen/www/human-mcp/plans/reports/001-code-review-file-path-support-report.md`
- **Overall Grade**: A- (Excellent with minor improvements needed)
- **Approval Status**: CONDITIONAL APPROVAL (pending high priority fixes)

## Success Criteria

1. All image editing tools accept file paths as input
2. File paths are automatically detected and processed
3. No regression in existing base64 functionality
4. Clear error messages for invalid inputs
5. Performance remains acceptable (< 1s for typical images)
6. All tests pass with 100% coverage for new code
7. Documentation is complete with examples

## Timeline Estimate

- **Phase 1 (Utility Creation)**: 2 hours
- **Phase 2 (Image Editor Update)**: 1 hour
- **Phase 3 (Schema Updates)**: 30 minutes
- **Phase 4 (Testing)**: 2 hours
- **Phase 5 (Documentation)**: 1 hour

**Total Estimated Time**: 6.5 hours

## Notes

- The implementation follows the existing pattern from the `eyes` tool for consistency
- Sharp library is already a dependency and proven to work well
- The centralized utility approach allows for future enhancements (caching, CDN upload, etc.)
- Consider adding progress callbacks for large file processing in future iterations