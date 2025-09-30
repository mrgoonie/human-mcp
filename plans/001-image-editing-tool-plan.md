# Image Editing Tool Implementation Plan

## Executive Summary
This document outlines the comprehensive plan for implementing an Image Editing tool in the Human MCP Hands module. The tool will leverage Google Gemini 2.5 Flash Image API capabilities to provide advanced image editing features including inpainting, outpainting, style transfer, and object manipulation.

## Table of Contents
1. [API Research Summary](#api-research-summary)
2. [Implementation Approaches](#implementation-approaches)
3. [Architecture Design](#architecture-design)
4. [Implementation Plan](#implementation-plan)
5. [Testing Strategy](#testing-strategy)
6. [Risk Analysis](#risk-analysis)

---

## API Research Summary

### Gemini Image Editing Capabilities

#### Core Features
- **Text-and-Image-to-Image Editing**: Modify existing images using text prompts and optional reference images
- **Inpainting (Semantic Masking)**: Fill in missing or masked regions of an image
- **Outpainting**: Extend image boundaries with coherent content
- **Style Transfer**: Apply artistic styles from reference images
- **Multi-Image Composition**: Blend elements from multiple images
- **Object Manipulation**: Add, remove, or modify specific objects in images

#### Technical Specifications
- **Model**: Gemini 2.5 Flash Image (gemini-2.5-flash-image-preview)
- **Input Support**: Up to 3 images can be provided as input
- **Format Support**: PNG, JPEG, WebP, GIF (static frames)
- **Output**: Base64 encoded images or file paths
- **Pricing**: $0.039 per generated/edited image
- **Token Usage**: 1290 output tokens per image

#### Key API Parameters
- Text prompt for describing edits
- Source image (required)
- Mask image (optional, for targeted edits)
- Reference images (optional, for style transfer or composition)
- Aspect ratio control
- Seed for reproducibility

### Important Constraints
1. All generated images include a SynthID watermark
2. Maximum 3 input images per request
3. No direct mask generation API - masks must be provided externally
4. API calls use standard generateContent endpoint with image inputs

---

## Implementation Approaches

### Approach 1: Comprehensive Multi-Mode Tool
**Description**: A single, feature-rich tool that handles all editing modes (inpainting, outpainting, style transfer, etc.) through mode selection.

#### Pros
- Single entry point for all editing operations
- Consistent interface across all editing types
- Easier to maintain shared logic
- Reduced code duplication

#### Cons
- Complex schema with many optional parameters
- Potential for user confusion with numerous options
- Harder to optimize for specific use cases
- More challenging to test comprehensively

#### Implementation Details
```typescript
// Single tool with mode selection
gemini_edit_image({
  mode: "inpaint" | "outpaint" | "style_transfer" | "object_edit",
  source_image: string,
  prompt: string,
  mask_image?: string,
  reference_images?: string[],
  // ... other parameters
})
```

### Approach 2: Specialized Tools per Edit Type (RECOMMENDED)
**Description**: Multiple focused tools, each optimized for a specific editing operation.

#### Pros
- Clear, focused purpose for each tool
- Simpler schemas with relevant parameters only
- Better user experience with less confusion
- Easier to test and maintain
- Can optimize each tool for its specific use case
- Follows Anthropic's principles for writing tools for AI agents

#### Cons
- More tools to register and maintain
- Some code duplication across tools
- Requires clear documentation for tool selection

#### Implementation Details
```typescript
// Separate tools for each operation
gemini_edit_image_inpaint({ source_image, mask_image, prompt, ... })
gemini_edit_image_style({ source_image, style_reference, prompt, ... })
gemini_edit_image_remove({ source_image, object_to_remove, ... })
gemini_edit_image_compose({ images[], prompt, ... })
```

### Recommended Approach
**Approach 2 (Specialized Tools)** is recommended because:
1. Aligns with Anthropic's principles for clear, single-purpose tools
2. Provides better user experience with focused functionality
3. Easier for AI agents to select the right tool
4. Matches the existing pattern in the codebase (separate tools for image/video generation)

---

## Architecture Design

### Module Structure
```
src/tools/hands/
├── index.ts                      # Updated with new tool registrations
├── schemas.ts                    # Updated with image editing schemas
└── processors/
    ├── image-generator.ts        # Existing image generation
    ├── video-generator.ts        # Existing video generation
    └── image-editor.ts           # NEW: Image editing processor
```

### Schema Design

#### Base Image Editing Schema
```typescript
// schemas.ts additions
export const BaseImageEditingSchema = z.object({
  source_image: z.string().describe("Base64 encoded image or file path to edit"),
  prompt: z.string().min(1).describe("Description of the desired edit"),
  model: z.enum(["gemini-2.5-flash-image-preview"]).optional()
    .default("gemini-2.5-flash-image-preview"),
  output_format: z.enum(["base64", "file"]).optional().default("base64"),
  aspect_ratio: z.enum(["original", "1:1", "16:9", "9:16", "4:3", "3:4"])
    .optional().default("original"),
  seed: z.number().optional().describe("Random seed for reproducibility")
});

export const ImageInpaintingSchema = BaseImageEditingSchema.extend({
  mask_image: z.string().describe("Base64 encoded mask image (white=edit, black=preserve)"),
  mask_mode: z.enum(["inpaint", "outpaint"]).optional().default("inpaint")
});

export const ImageStyleTransferSchema = BaseImageEditingSchema.extend({
  style_reference: z.string().describe("Base64 encoded style reference image"),
  style_strength: z.number().min(0).max(1).optional().default(0.7)
    .describe("How strongly to apply the style (0-1)")
});

export const ImageObjectEditSchema = BaseImageEditingSchema.extend({
  edit_type: z.enum(["add", "remove", "replace"]).describe("Type of object edit"),
  object_description: z.string().optional()
    .describe("Description of object to add/remove/replace")
});

export const ImageCompositionSchema = z.object({
  images: z.array(z.string()).min(2).max(3)
    .describe("Array of base64 encoded images to compose"),
  prompt: z.string().describe("Description of how to compose the images"),
  model: z.enum(["gemini-2.5-flash-image-preview"]).optional()
    .default("gemini-2.5-flash-image-preview"),
  output_format: z.enum(["base64", "file"]).optional().default("base64"),
  blend_mode: z.enum(["natural", "overlay", "seamless"]).optional().default("natural")
});
```

### Processor Implementation

#### Core Image Editor Module
```typescript
// processors/image-editor.ts
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import { logger } from "@/utils/logger.js";
import type { Config } from "@/utils/config.js";

interface ImageEditOptions {
  sourceImage: string;
  prompt: string;
  maskImage?: string;
  referenceImages?: string[];
  model?: string;
  outputFormat?: string;
  aspectRatio?: string;
  seed?: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  filePrefix?: string;
}

interface ImageEditResult {
  imageData: string;
  format: string;
  model: string;
  editType: string;
  generationTime?: number;
  size?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export async function editImageWithInpainting(
  geminiClient: GeminiClient,
  options: ImageEditOptions,
  config?: Config
): Promise<ImageEditResult> {
  // Implementation for inpainting/outpainting
}

export async function editImageWithStyle(
  geminiClient: GeminiClient,
  options: ImageEditOptions,
  config?: Config
): Promise<ImageEditResult> {
  // Implementation for style transfer
}

export async function editImageObject(
  geminiClient: GeminiClient,
  options: ImageEditOptions,
  config?: Config
): Promise<ImageEditResult> {
  // Implementation for object editing
}

export async function composeImages(
  geminiClient: GeminiClient,
  options: ImageEditOptions,
  config?: Config
): Promise<ImageEditResult> {
  // Implementation for multi-image composition
}
```

### Tool Registration
```typescript
// index.ts updates
import {
  ImageInpaintingSchema,
  ImageStyleTransferSchema,
  ImageObjectEditSchema,
  ImageCompositionSchema
} from "./schemas.js";

import {
  editImageWithInpainting,
  editImageWithStyle,
  editImageObject,
  composeImages
} from "./processors/image-editor.js";

// Register gemini_edit_inpaint tool
server.registerTool(
  "gemini_edit_inpaint",
  {
    title: "Gemini Image Inpainting Tool",
    description: "Edit images using mask-based inpainting or outpainting",
    inputSchema: ImageInpaintingSchema
  },
  async (args) => {
    // Handler implementation
  }
);

// Register additional tools...
```

---

## Implementation Plan

### Phase 1: Foundation Setup (2 hours)
- [ ] Create `image-editor.ts` processor file
- [ ] Add image editing schemas to `schemas.ts`
- [ ] Create type definitions for edit options and results
- [ ] Set up base utility functions for image processing

### Phase 2: Core Editing Functions (4 hours)
- [ ] Implement `editImageWithInpainting` function
  - [ ] Handle source image loading (base64/file path)
  - [ ] Process mask image
  - [ ] Build Gemini API request with images
  - [ ] Handle response and extract edited image
- [ ] Implement `editImageWithStyle` function
  - [ ] Process style reference image
  - [ ] Apply style strength parameter
- [ ] Implement `editImageObject` function
  - [ ] Handle add/remove/replace operations
- [ ] Implement `composeImages` function
  - [ ] Handle multiple image inputs
  - [ ] Apply blend modes

### Phase 3: Tool Registration (2 hours)
- [ ] Register `gemini_edit_inpaint` tool
- [ ] Register `gemini_edit_style` tool
- [ ] Register `gemini_edit_object` tool
- [ ] Register `gemini_edit_compose` tool
- [ ] Add proper error handling for each tool

### Phase 4: Integration & Utilities (2 hours)
- [ ] Integrate with file storage system
- [ ] Add R2 upload support for edited images
- [ ] Implement image validation utilities
- [ ] Add format conversion helpers

### Phase 5: Testing & Documentation (2 hours)
- [ ] Write unit tests for each editing function
- [ ] Test with MCP inspector
- [ ] Create usage examples
- [ ] Update README with new tools

## Detailed Implementation Steps

### Step 1: Image Loading and Validation
```typescript
async function loadAndValidateImage(
  input: string,
  imageType: "source" | "mask" | "reference"
): Promise<{ data: string; mimeType: string }> {
  let imageData: string;
  let mimeType: string;

  // Check if input is base64
  if (input.startsWith('data:')) {
    const matches = input.match(/data:([^;]+);base64,(.+)/);
    if (!matches) throw new Error(`Invalid base64 format for ${imageType} image`);
    mimeType = matches[1];
    imageData = matches[2];
  }
  // Check if input is file path
  else if (input.startsWith('/') || input.startsWith('./')) {
    const fileContent = await fs.readFile(input);
    imageData = fileContent.toString('base64');
    mimeType = getMimeTypeFromPath(input);
  }
  // Assume raw base64
  else {
    imageData = input;
    mimeType = 'image/jpeg'; // Default
  }

  return { data: imageData, mimeType };
}
```

### Step 2: Gemini API Request Building
```typescript
async function buildEditRequest(
  sourceImage: ImageData,
  prompt: string,
  additionalImages?: ImageData[]
): Promise<GenerateContentRequest> {
  const parts: Part[] = [
    { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.data } }
  ];

  if (additionalImages) {
    for (const img of additionalImages) {
      parts.push({
        inlineData: { mimeType: img.mimeType, data: img.data }
      });
    }
  }

  parts.push({ text: prompt });

  return { contents: [{ parts }] };
}
```

### Step 3: Error Handling Pattern
```typescript
async function handleEditOperation<T>(
  operation: () => Promise<T>,
  operationType: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Image ${operationType} failed:`, error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Invalid or missing Google AI API key");
      }
      if (error.message.includes("quota")) {
        throw new Error("API quota exceeded. Please try again later");
      }
      if (error.message.includes("safety")) {
        throw new Error("Edit blocked due to safety policies");
      }
    }

    throw new Error(`Image ${operationType} failed: ${error}`);
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// tests/image-editor.test.ts
describe("Image Editor", () => {
  describe("Inpainting", () => {
    it("should edit image with mask", async () => {
      // Test implementation
    });

    it("should handle missing mask gracefully", async () => {
      // Test implementation
    });
  });

  describe("Style Transfer", () => {
    it("should apply style from reference image", async () => {
      // Test implementation
    });

    it("should respect style strength parameter", async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests with MCP Inspector
1. Test each tool with valid inputs
2. Test error cases (invalid images, missing parameters)
3. Test file saving and R2 upload
4. Test different image formats
5. Test large image handling

### Manual Testing Checklist
- [ ] Inpainting with various mask shapes
- [ ] Outpainting to extend images
- [ ] Style transfer with different art styles
- [ ] Object removal from complex scenes
- [ ] Multi-image composition
- [ ] Seed reproducibility
- [ ] File output formats
- [ ] Error message clarity

---

## Risk Analysis

### Technical Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API Rate Limiting | High | Medium | Implement retry logic with exponential backoff |
| Large Image Processing | Medium | High | Add image size validation and compression |
| Mask Format Incompatibility | Medium | Medium | Provide mask format conversion utilities |
| Memory Issues with Multiple Images | High | Low | Stream processing and cleanup |

### Implementation Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Complex Schema Validation | Medium | Medium | Comprehensive testing and clear error messages |
| Integration Conflicts | Low | Low | Follow existing patterns strictly |
| Performance Degradation | Medium | Medium | Add caching and optimize image loading |

### Business Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API Cost Overruns | High | Medium | Add usage tracking and limits |
| User Confusion | Medium | Medium | Clear documentation and examples |
| Feature Scope Creep | Medium | High | Stick to defined feature set |

---

## Success Criteria

### Functional Requirements
- [ ] All four editing modes working correctly
- [ ] Support for both base64 and file path inputs
- [ ] Proper error handling with clear messages
- [ ] File saving and R2 upload functionality
- [ ] Consistent with existing tool patterns

### Performance Requirements
- [ ] Image editing completes within 30 seconds
- [ ] Memory usage stays below 512MB
- [ ] Handles images up to 10MB
- [ ] Concurrent request handling

### Quality Requirements
- [ ] 90% test coverage
- [ ] Zero critical bugs
- [ ] Clear documentation
- [ ] TypeScript type safety
- [ ] Follows project coding standards

---

## TODO Checklist

### Pre-Implementation
- [x] Research Gemini Image Editing API
- [x] Analyze existing codebase structure
- [x] Design schemas and interfaces
- [x] Create implementation plan

### Implementation
- [ ] Set up image-editor.ts processor
- [ ] Implement core editing functions
- [ ] Add schema definitions
- [ ] Register MCP tools
- [ ] Integrate file storage
- [ ] Add error handling
- [ ] Implement validation utilities

### Testing
- [ ] Write unit tests
- [ ] Test with MCP inspector
- [ ] Perform integration testing
- [ ] Load testing with large images
- [ ] Edge case testing

### Documentation
- [ ] Update README
- [ ] Add usage examples
- [ ] Document API parameters
- [ ] Create troubleshooting guide

### Deployment
- [ ] Code review
- [ ] Performance optimization
- [ ] Security review
- [ ] Version bump
- [ ] Release notes

---

## Appendix

### Example Usage

#### Inpainting Example
```javascript
const result = await gemini_edit_inpaint({
  source_image: "base64_encoded_image",
  mask_image: "base64_encoded_mask",
  prompt: "Replace the damaged area with a beautiful garden",
  mask_mode: "inpaint"
});
```

#### Style Transfer Example
```javascript
const result = await gemini_edit_style({
  source_image: "path/to/photo.jpg",
  style_reference: "path/to/vangogh.jpg",
  prompt: "Apply Van Gogh's starry night style",
  style_strength: 0.8
});
```

#### Object Removal Example
```javascript
const result = await gemini_edit_object({
  source_image: "base64_encoded_image",
  edit_type: "remove",
  prompt: "Remove the car from the driveway",
  object_description: "red sedan car"
});
```

#### Multi-Image Composition Example
```javascript
const result = await gemini_edit_compose({
  images: [
    "base64_background",
    "base64_foreground_object",
    "base64_style_reference"
  ],
  prompt: "Compose the object into the background with matching lighting",
  blend_mode: "seamless"
});
```

### References
- [Google Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini 2.5 Flash Image Announcement](https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/)
- [Anthropic's Principles for Writing Tools](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [MCP SDK Documentation](https://modelcontextprotocol.io/docs)

---

*Document Version: 1.0*
*Created: 2025-01-29*
*Author: Technical Planning System*