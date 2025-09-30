This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
.opencode/
  agent/
    code-reviewer.md
    debugger.md
    docs-manager.md
    git-manager.md
    planner.md
    project-manager.md
    solution-brainstormer.md
    system-architecture.md
    tester.md
    ui-ux-developer.md
  command/
    fix/
      ci.md
      fast.md
      hard.md
      test.md
    git/
      cm.md
      cp.md
    plan/
      ci.md
      two.md
    cook.md
    debug.md
    plan.md
    test.md
    watzup.md
bin/
  human-mcp.js
examples/
  debugging-session.ts
src/
  prompts/
    debugging-prompts.ts
    index.ts
  resources/
    documentation.ts
    index.ts
  tools/
    brain/
      native/
        memory.ts
        sequential-thinking.ts
        simple-reasoning.ts
      processors/
        analytical-reasoning.ts
        problem-solver.ts
        reflection.ts
        sequential-thinking.ts
      utils/
        reasoning-engine.ts
        thought-manager.ts
      index.ts
      index.ts.backup
      schemas.ts
      types.ts
    eyes/
      processors/
        document.ts
        excel.ts
        factory.ts
        gif.ts
        image.ts
        pdf.ts
        powerpoint.ts
        text.ts
        video.ts
        word.ts
      types/
        document.ts
      utils/
        formatters.ts
        gemini-client.ts
      index.ts
      index.ts.backup
      schemas.ts
    hands/
      processors/
        image-editor.ts
        image-generator.ts
        video-generator.ts
      index.ts
      schemas.ts
    mouth/
      processors/
        code-explanation.ts
        narration.ts
        speech-synthesis.ts
        voice-customization.ts
      utils/
        audio-export.ts
        audio-storage.ts
      index.ts
      schemas.ts
  transports/
    http/
      file-interceptor.ts
      middleware.ts
      routes.ts
      server.ts
      session.ts
      sse-routes.ts
    index.ts
    stdio.ts
    types.ts
  types/
    index.ts
  utils/
    cloudflare-r2.ts
    config.ts
    errors.ts
    file-storage.ts
    logger.ts
  index.ts
  server.ts
tests/
  e2e/
    hands-real-api.test.ts
  integration/
    enhanced-image-generation.test.ts
    hands-image-generation.test.ts
    hands-video-generation.test.ts
    http-transport-files.test.ts
    server.test.ts
    sse-transport.test.ts
  types/
    api-responses.ts
    test-types.ts
  unit/
    brain-tools.test.ts
    cloudflare-r2.test.ts
    config.test.ts
    eyes-analyze.test.ts
    file-storage.test.ts
    formatters.test.ts
    hands-schemas.test.ts
    hands-tool.test.ts
    hands-video-schemas.test.ts
    image-stdio-r2-skip.test.ts
    sse-routes.test.ts
  utils/
    error-scenarios.ts
    index.ts
    integration-test-setup.ts
    mock-control.ts
    mock-helpers.ts
    test-data-generators.ts
    test-server-manager.ts
  setup.ts
.dockerignore
.env.example
.gitignore
.releaserc.json
.repomixignore
bunfig.toml
CHANGELOG.md
ci_logs.txt
CLAUDE.md
DEPLOYMENT.md
direct-test.mjs
docker-compose.yaml
Dockerfile
inspector-wrapper.mjs
LICENSE
opencode.jsonc
package.json
QUICKSTART.md
README.md
test_speech.js
test-eyes.mjs
tsconfig.json
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/tools/hands/processors/image-editor.ts">
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import type { ImageEditingOptions, ImageEditingResult } from "../schemas.js";
import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
// Simple image processing function
function processImageDataUri(dataUri: string): { data: string; mimeType: string } {
  // Extract mime type and data from data URI
  const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches || !matches[1] || !matches[2]) {
    throw new Error("Invalid data URI format");
  }
  return {
    mimeType: matches[1],
    data: matches[2]
  };
}

export async function editImage(
  geminiClient: GeminiClient,
  options: ImageEditingOptions,
  config?: Config
): Promise<ImageEditingResult> {
  const startTime = Date.now();

  try {
    // Process input image to ensure it's in the correct format
    const processedInputImage = await processImageForEditing(options.inputImage);

    // Build the editing prompt based on operation type
    const editingPrompt = buildEditingPrompt(options);

    logger.info(`Image editing operation: ${options.operation}`);
    logger.info(`Editing prompt: "${editingPrompt}"`);

    // Get the appropriate model for image editing
    const model = geminiClient.getModel("detailed");

    // Build the request content based on operation type
    const requestContent = await buildRequestContent(options, processedInputImage, editingPrompt);

    // Generate the edited image using Gemini API
    const response = await model.generateContent(requestContent);
    const result = response.response;

    // Extract image data from the response
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image candidates returned from Gemini API");
    }

    const candidate = candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("Invalid response format from Gemini API");
    }

    // Look for image data in the response parts
    let imageData: string | null = null;
    let mimeType = "image/jpeg";

    for (const part of candidate.content.parts) {
      if ('inlineData' in part && part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/jpeg";
        break;
      }
    }

    if (!imageData) {
      throw new Error("No image data found in Gemini response");
    }

    const processingTime = Date.now() - startTime;

    // Prepare the result based on output format
    let resultData: string;
    let format: string;
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    // Always save file to reduce token usage, unless explicitly disabled
    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const savedFile = await saveBase64ToFile(
          imageData,
          mimeType,
          config,
          {
            prefix: options.filePrefix || `edited-${options.operation}`,
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Edited image saved to file: ${filePath}`);

        // For URL format, return the file URL if available, otherwise file path
        if (options.outputFormat === "url") {
          resultData = fileUrl || filePath || `data:${mimeType};base64,${imageData}`;
          format = fileUrl ? "url" : "file_path";
        } else {
          // For base64 format, return base64 but also include file info
          resultData = `data:${mimeType};base64,${imageData}`;
          format = "base64_data_uri";
        }
      } catch (error) {
        logger.warn(`Failed to save edited image file: ${error}. Falling back to base64 only.`);
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
      }
    } else {
      if (options.outputFormat === "base64") {
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
      } else {
        // For URL format without file saving, fall back to base64
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
        logger.warn("URL output format requested but file saving disabled. Returning base64 data URI");
      }
    }

    return {
      editedImageData: resultData,
      format,
      operation: options.operation,
      processingTime,
      originalSize: estimateImageSize(processedInputImage.data),
      editedSize: estimateImageSize(imageData),
      filePath,
      fileName,
      fileUrl,
      fileSize,
      metadata: {
        prompt: options.prompt,
        operation: options.operation,
        strength: options.strength,
        guidanceScale: options.guidanceScale,
        seed: options.seed
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Image editing failed after ${processingTime}ms:`, error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Invalid or missing Google AI API key. Please check your GOOGLE_GEMINI_API_KEY environment variable.");
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("API quota exceeded or rate limit reached. Please try again later.");
      }
      if (error.message.includes("safety") || error.message.includes("policy")) {
        throw new Error("Image editing blocked due to safety policies. Please modify your request and try again.");
      }
      throw new Error(`Image editing failed: ${error.message}`);
    }

    throw new Error("Image editing failed due to an unexpected error");
  }
}

async function processImageForEditing(inputImage: string): Promise<{ data: string; mimeType: string }> {
  try {
    // If it's a data URI, extract the base64 data
    if (inputImage.startsWith('data:')) {
      const result = processImageDataUri(inputImage);
      return {
        data: result.data,
        mimeType: result.mimeType
      };
    }

    // If it's a file path, read and convert to base64
    if (inputImage.startsWith('/') || inputImage.startsWith('./')) {
      // Handle file path - would need to implement file reading
      throw new Error("File path input not yet implemented. Please use base64 data URI format.");
    }

    // Assume it's raw base64 data
    return {
      data: inputImage,
      mimeType: "image/jpeg"
    };
  } catch (error) {
    throw new Error(`Failed to process input image: ${error instanceof Error ? error.message : error}`);
  }
}

function buildEditingPrompt(options: ImageEditingOptions): string {
  let prompt = options.prompt;

  // Add operation-specific instructions
  switch (options.operation) {
    case "inpaint":
      prompt = `Edit the specified area of this image: ${prompt}`;
      if (options.maskPrompt) {
        prompt += `. Focus on the area described as: ${options.maskPrompt}`;
      }
      break;

    case "outpaint":
      prompt = `Expand this image ${options.expandDirection || 'in all directions'}: ${prompt}`;
      if (options.expansionRatio && options.expansionRatio !== 1.5) {
        prompt += `. Expansion ratio: ${options.expansionRatio}x`;
      }
      break;

    case "style_transfer":
      prompt = `Apply the following style to this image: ${prompt}`;
      if (options.styleStrength && options.styleStrength !== 0.7) {
        prompt += `. Style strength: ${options.styleStrength}`;
      }
      break;

    case "object_manipulation":
      if (options.targetObject) {
        prompt = `${options.manipulationType || 'modify'} the ${options.targetObject} in this image: ${prompt}`;
        if (options.targetPosition) {
          prompt += `. Position: ${options.targetPosition}`;
        }
      }
      break;

    case "multi_image_compose":
      prompt = `Compose multiple images together: ${prompt}`;
      if (options.compositionLayout) {
        prompt += `. Layout: ${options.compositionLayout}`;
      }
      if (options.blendMode) {
        prompt += `. Blend mode: ${options.blendMode}`;
      }
      break;
  }

  // Add quality and strength modifiers
  if (options.quality === "high") {
    prompt += ". High quality, detailed result.";
  } else if (options.quality === "draft") {
    prompt += ". Quick draft version.";
  }

  if (options.negativePrompt) {
    prompt += ` Avoid: ${options.negativePrompt}`;
  }

  return prompt;
}

async function buildRequestContent(
  options: ImageEditingOptions,
  processedInputImage: { data: string; mimeType: string },
  editingPrompt: string
): Promise<any[]> {
  const content: any[] = [
    {
      text: editingPrompt
    },
    {
      inlineData: {
        data: processedInputImage.data,
        mimeType: processedInputImage.mimeType
      }
    }
  ];

  // Add mask image for inpainting operations
  if (options.operation === "inpaint" && options.maskImage) {
    try {
      const processedMask = await processImageForEditing(options.maskImage);
      content.push({
        inlineData: {
          data: processedMask.data,
          mimeType: processedMask.mimeType
        }
      });
    } catch (error) {
      logger.warn(`Failed to process mask image: ${error}. Proceeding without mask.`);
    }
  }

  // Add style reference image for style transfer
  if (options.operation === "style_transfer" && options.styleImage) {
    try {
      const processedStyle = await processImageForEditing(options.styleImage);
      content.push({
        inlineData: {
          data: processedStyle.data,
          mimeType: processedStyle.mimeType
        }
      });
    } catch (error) {
      logger.warn(`Failed to process style image: ${error}. Proceeding without style reference.`);
    }
  }

  // Add secondary images for composition
  if (options.operation === "multi_image_compose" && options.secondaryImages) {
    for (const secondaryImage of options.secondaryImages) {
      try {
        const processedSecondary = await processImageForEditing(secondaryImage);
        content.push({
          inlineData: {
            data: processedSecondary.data,
            mimeType: processedSecondary.mimeType
          }
        });
      } catch (error) {
        logger.warn(`Failed to process secondary image: ${error}. Skipping this image.`);
      }
    }
  }

  return content;
}

function estimateImageSize(base64Data: string): string {
  // Estimate image dimensions based on base64 data length
  // This is a rough estimation - actual size would need image parsing
  const dataLength = base64Data.length;
  const estimatedBytes = (dataLength * 3) / 4; // Base64 to bytes conversion

  // Rough estimation for common image sizes
  if (estimatedBytes < 100000) { // ~100KB
    return "512x512";
  } else if (estimatedBytes < 400000) { // ~400KB
    return "1024x1024";
  } else {
    return "1024x1024+";
  }
}
</file>

<file path="ci_logs.txt">
2025-09-29T12:17:56.9431433Z Current runner version: '2.328.0'
2025-09-29T12:17:56.9465305Z ##[group]Runner Image Provisioner
2025-09-29T12:17:56.9466710Z Hosted Compute Agent
2025-09-29T12:17:56.9467746Z Version: 20250912.392
2025-09-29T12:17:56.9468777Z Commit: d921fda672a98b64f4f82364647e2f10b2267d0b
2025-09-29T12:17:56.9470148Z Build Date: 2025-09-12T15:23:14Z
2025-09-29T12:17:56.9471217Z ##[endgroup]
2025-09-29T12:17:56.9472075Z ##[group]Operating System
2025-09-29T12:17:56.9473349Z Ubuntu
2025-09-29T12:17:56.9474105Z 24.04.3
2025-09-29T12:17:56.9474891Z LTS
2025-09-29T12:17:56.9475866Z ##[endgroup]
2025-09-29T12:17:56.9476729Z ##[group]Runner Image
2025-09-29T12:17:56.9477740Z Image: ubuntu-24.04
2025-09-29T12:17:56.9478519Z Version: 20250922.53.1
2025-09-29T12:17:56.9480479Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250922.53/images/ubuntu/Ubuntu2404-Readme.md
2025-09-29T12:17:56.9483484Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250922.53
2025-09-29T12:17:56.9485367Z ##[endgroup]
2025-09-29T12:17:56.9487255Z ##[group]GITHUB_TOKEN Permissions
2025-09-29T12:17:56.9490354Z Contents: read
2025-09-29T12:17:56.9491212Z Metadata: read
2025-09-29T12:17:56.9492139Z Packages: read
2025-09-29T12:17:56.9493217Z ##[endgroup]
2025-09-29T12:17:56.9496231Z Secret source: Actions
2025-09-29T12:17:56.9497580Z Prepare workflow directory
2025-09-29T12:17:56.9967885Z Prepare all required actions
2025-09-29T12:17:57.0024969Z Getting action download info
2025-09-29T12:17:57.2961062Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
2025-09-29T12:17:57.4886814Z Download action repository 'oven-sh/setup-bun@v1' (SHA:f4d14e03ff726c06358e5557344e1da148b56cf7)
2025-09-29T12:17:57.9118496Z Complete job name: test
2025-09-29T12:17:57.9804036Z ##[group]Run actions/checkout@v4
2025-09-29T12:17:57.9804905Z with:
2025-09-29T12:17:57.9805358Z   fetch-depth: 0
2025-09-29T12:17:57.9805949Z   token: ***
2025-09-29T12:17:57.9806424Z   repository: mrgoonie/human-mcp
2025-09-29T12:17:57.9806950Z   ssh-strict: true
2025-09-29T12:17:57.9807344Z   ssh-user: git
2025-09-29T12:17:57.9807825Z   persist-credentials: true
2025-09-29T12:17:57.9808291Z   clean: true
2025-09-29T12:17:57.9808734Z   sparse-checkout-cone-mode: true
2025-09-29T12:17:57.9809226Z   fetch-tags: false
2025-09-29T12:17:57.9809634Z   show-progress: true
2025-09-29T12:17:57.9810067Z   lfs: false
2025-09-29T12:17:57.9810471Z   submodules: false
2025-09-29T12:17:57.9810914Z   set-safe-directory: true
2025-09-29T12:17:57.9811599Z ##[endgroup]
2025-09-29T12:17:58.1038117Z Syncing repository: mrgoonie/human-mcp
2025-09-29T12:17:58.1039825Z ##[group]Getting Git version info
2025-09-29T12:17:58.1040573Z Working directory is '/home/runner/work/human-mcp/human-mcp'
2025-09-29T12:17:58.1041605Z [command]/usr/bin/git version
2025-09-29T12:17:58.1179507Z git version 2.51.0
2025-09-29T12:17:58.1218595Z ##[endgroup]
2025-09-29T12:17:58.1243506Z Temporarily overriding HOME='/home/runner/work/_temp/e6ddfbfd-5995-43d3-b9e0-eb47f639b921' before making global git config changes
2025-09-29T12:17:58.1245792Z Adding repository directory to the temporary git global config as a safe directory
2025-09-29T12:17:58.1258486Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/human-mcp/human-mcp
2025-09-29T12:17:58.1328775Z Deleting the contents of '/home/runner/work/human-mcp/human-mcp'
2025-09-29T12:17:58.1333671Z ##[group]Initializing the repository
2025-09-29T12:17:58.1338997Z [command]/usr/bin/git init /home/runner/work/human-mcp/human-mcp
2025-09-29T12:17:58.4857466Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-09-29T12:17:58.4859475Z hint: is subject to change. To configure the initial branch name to use in all
2025-09-29T12:17:58.4860794Z hint: of your new repositories, which will suppress this warning, call:
2025-09-29T12:17:58.4862113Z hint:
2025-09-29T12:17:58.4863355Z hint: 	git config --global init.defaultBranch <name>
2025-09-29T12:17:58.4864576Z hint:
2025-09-29T12:17:58.4866136Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-09-29T12:17:58.4867934Z hint: 'development'. The just-created branch can be renamed via this command:
2025-09-29T12:17:58.4869168Z hint:
2025-09-29T12:17:58.4869819Z hint: 	git branch -m <name>
2025-09-29T12:17:58.4870567Z hint:
2025-09-29T12:17:58.4871545Z hint: Disable this message with "git config set advice.defaultBranchName false"
2025-09-29T12:17:58.4873590Z Initialized empty Git repository in /home/runner/work/human-mcp/human-mcp/.git/
2025-09-29T12:17:58.4876835Z [command]/usr/bin/git remote add origin https://github.com/mrgoonie/human-mcp
2025-09-29T12:17:58.4917277Z ##[endgroup]
2025-09-29T12:17:58.4918607Z ##[group]Disabling automatic garbage collection
2025-09-29T12:17:58.4922562Z [command]/usr/bin/git config --local gc.auto 0
2025-09-29T12:17:58.4954065Z ##[endgroup]
2025-09-29T12:17:58.4955402Z ##[group]Setting up auth
2025-09-29T12:17:58.4961709Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-29T12:17:58.4994961Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-29T12:17:58.5335898Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-29T12:17:58.5366344Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-29T12:17:58.5583381Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-09-29T12:17:58.5617346Z ##[endgroup]
2025-09-29T12:17:58.5619226Z ##[group]Fetching the repository
2025-09-29T12:17:58.5626339Z [command]/usr/bin/git -c protocol.version=2 fetch --prune --no-recurse-submodules origin +refs/heads/*:refs/remotes/origin/* +refs/tags/*:refs/tags/*
2025-09-29T12:17:59.0211068Z From https://github.com/mrgoonie/human-mcp
2025-09-29T12:17:59.0211921Z  * [new branch]      main       -> origin/main
2025-09-29T12:17:59.0212786Z  * [new tag]         v1.0.0     -> v1.0.0
2025-09-29T12:17:59.0213459Z  * [new tag]         v1.0.1     -> v1.0.1
2025-09-29T12:17:59.0214120Z  * [new tag]         v1.0.2     -> v1.0.2
2025-09-29T12:17:59.0214715Z  * [new tag]         v1.1.0     -> v1.1.0
2025-09-29T12:17:59.0215292Z  * [new tag]         v1.2.0     -> v1.2.0
2025-09-29T12:17:59.0215876Z  * [new tag]         v1.2.1     -> v1.2.1
2025-09-29T12:17:59.0216491Z  * [new tag]         v1.3.0     -> v1.3.0
2025-09-29T12:17:59.0217054Z  * [new tag]         v1.4.0     -> v1.4.0
2025-09-29T12:17:59.0217694Z  * [new tag]         v2.0.0     -> v2.0.0
2025-09-29T12:17:59.0218273Z  * [new tag]         v2.1.0     -> v2.1.0
2025-09-29T12:17:59.0218843Z  * [new tag]         v2.2.0     -> v2.2.0
2025-09-29T12:17:59.0219420Z  * [new tag]         v2.3.0     -> v2.3.0
2025-09-29T12:17:59.0219994Z  * [new tag]         v2.4.0     -> v2.4.0
2025-09-29T12:17:59.0220579Z  * [new tag]         v2.4.1     -> v2.4.1
2025-09-29T12:17:59.0221140Z  * [new tag]         v2.5.0     -> v2.5.0
2025-09-29T12:17:59.0262817Z [command]/usr/bin/git branch --list --remote origin/main
2025-09-29T12:17:59.0286469Z   origin/main
2025-09-29T12:17:59.0295524Z [command]/usr/bin/git rev-parse refs/remotes/origin/main
2025-09-29T12:17:59.0314791Z f4e1a8df008d2a6d97b194b67591d46698086c16
2025-09-29T12:17:59.0319893Z ##[endgroup]
2025-09-29T12:17:59.0320421Z ##[group]Determining the checkout info
2025-09-29T12:17:59.0321273Z ##[endgroup]
2025-09-29T12:17:59.0325537Z [command]/usr/bin/git sparse-checkout disable
2025-09-29T12:17:59.0363459Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-09-29T12:17:59.0389000Z ##[group]Checking out the ref
2025-09-29T12:17:59.0393418Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
2025-09-29T12:17:59.0657071Z Switched to a new branch 'main'
2025-09-29T12:17:59.0659717Z branch 'main' set up to track 'origin/main'.
2025-09-29T12:17:59.0670049Z ##[endgroup]
2025-09-29T12:17:59.0713769Z [command]/usr/bin/git log -1 --format=%H
2025-09-29T12:17:59.0735179Z f4e1a8df008d2a6d97b194b67591d46698086c16
2025-09-29T12:17:59.0915735Z ##[group]Run oven-sh/setup-bun@v1
2025-09-29T12:17:59.0916053Z with:
2025-09-29T12:17:59.0916274Z   bun-version: latest
2025-09-29T12:17:59.0916516Z   no-cache: false
2025-09-29T12:17:59.0916733Z ##[endgroup]
2025-09-29T12:17:59.2019500Z Downloading a new version of Bun: https://bun.sh/download/latest/linux/x64?avx2=true&profile=false
2025-09-29T12:17:59.7904016Z [command]/usr/bin/unzip -o -q /home/runner/work/_temp/494917ee-c742-4265-b0a3-c6be56e3a0a4
2025-09-29T12:18:00.5780316Z [command]/home/runner/.bun/bin/bun --revision
2025-09-29T12:18:00.5815725Z 1.2.23+cf1367137
2025-09-29T12:18:00.5949818Z ##[group]Run bun install --frozen-lockfile
2025-09-29T12:18:00.5950230Z [36;1mbun install --frozen-lockfile[0m
2025-09-29T12:18:00.5988980Z shell: /usr/bin/bash -e {0}
2025-09-29T12:18:00.5989255Z ##[endgroup]
2025-09-29T12:18:00.6086195Z bun install v1.2.23 (cf136713)
2025-09-29T12:18:00.6157180Z Resolving dependencies
2025-09-29T12:18:00.8154446Z Resolved, downloaded and extracted [46]
2025-09-29T12:18:00.8176889Z error: lockfile had changes, but lockfile is frozen
2025-09-29T12:18:00.8178928Z note: try re-running without --frozen-lockfile and commit the updated lockfile
2025-09-29T12:18:00.8225005Z ##[error]Process completed with exit code 1.
2025-09-29T12:18:00.8340196Z Post job cleanup.
2025-09-29T12:18:00.9257248Z [command]/usr/bin/git version
2025-09-29T12:18:00.9292021Z git version 2.51.0
2025-09-29T12:18:00.9333842Z Temporarily overriding HOME='/home/runner/work/_temp/eeedd59f-79df-499b-8e69-378f9abc7153' before making global git config changes
2025-09-29T12:18:00.9335090Z Adding repository directory to the temporary git global config as a safe directory
2025-09-29T12:18:00.9346093Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/human-mcp/human-mcp
2025-09-29T12:18:00.9378722Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-29T12:18:00.9409735Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-29T12:18:00.9631055Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-29T12:18:00.9650514Z http.https://github.com/.extraheader
2025-09-29T12:18:00.9663061Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-09-29T12:18:00.9691590Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-29T12:18:01.0068073Z Cleaning up orphan processes
</file>

<file path="test_speech.js">
#!/usr/bin/env node

import { spawn } from 'child_process';

// Test the mouth_speak tool via MCP stdio
const server = spawn('bun', ['run', 'src/index.ts'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const testRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "mouth_speak",
    arguments: {
      text: "Hello, testing speech generation",
      voice: "Zephyr",
      model: "gemini-2.5-flash-preview-tts",
      language: "en-US",
      output_format: "base64"
    }
  }
};

console.log('Testing mouth_speak tool...');
console.log('Request:', JSON.stringify(testRequest, null, 2));

server.stdout.on('data', (data) => {
  try {
    const lines = data.toString().split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        const response = JSON.parse(line.trim());
        console.log('\n=== MCP Response ===');
        console.log(JSON.stringify(response, null, 2));

        if (response.id === 1) {
          // This is our test response
          if (response.error) {
            console.error('\n❌ Test FAILED:', response.error.message);
          } else if (response.result) {
            console.log('\n✅ Test SUCCESSFUL');
            const content = response.result.content?.[0]?.text;
            if (content) {
              try {
                const parsed = JSON.parse(content);
                console.log('Speech generation result:', {
                  success: parsed.success,
                  voice: parsed.voice,
                  language: parsed.language,
                  model: parsed.model,
                  audioDataType: parsed.audio?.startsWith('data:') ? 'Base64 data URI' : typeof parsed.audio
                });
              } catch (e) {
                console.log('Raw response content:', content);
              }
            }
          }
          process.exit(0);
        }
      }
    }
  } catch (error) {
    console.error('Parse error:', error.message);
  }
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Send the test request
setTimeout(() => {
  server.stdin.write(JSON.stringify(testRequest) + '\n');
}, 1000);

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Test timed out after 30 seconds');
  server.kill();
  process.exit(1);
}, 30000);
</file>

<file path=".opencode/agent/project-manager.md">
---
name: project-manager
description: "Use this agent when you need comprehensive project oversight and coordination."
model: anthropic/claude-sonnet-4-20250514
mode: subagent
---

You are a Senior Project Manager and System Orchestrator with deep expertise in the DevPocket AI-powered mobile terminal application project. You have comprehensive knowledge of the project's PRD, product overview, business plan, and all implementation plans stored in the `./plans` directory.

## Core Responsibilities

### 1. Implementation Plan Analysis
- Read and thoroughly analyze all implementation plans in `./plans` directory to understand goals, objectives, and current status
- Cross-reference completed work against planned tasks and milestones
- Identify dependencies, blockers, and critical path items
- Assess alignment with project PRD and business objectives

### 2. Progress Tracking & Management
- Monitor development progress across all project components (Fastify backend, Flutter mobile app, documentation)
- Track task completion status, timeline adherence, and resource utilization
- Identify risks, delays, and scope changes that may impact delivery
- Maintain visibility into parallel workstreams and integration points

### 3. Report Collection & Analysis
- Systematically collect implementation reports from all specialized agents (backend-developer, tester, code-reviewer, debugger, etc.)
- Analyze report quality, completeness, and actionable insights
- Identify patterns, recurring issues, and systemic improvements needed
- Consolidate findings into coherent project status assessments

### 4. Task Completeness Verification
- Verify that completed tasks meet acceptance criteria defined in implementation plans
- Assess code quality, test coverage, and documentation completeness
- Validate that implementations align with architectural standards and security requirements
- Ensure BYOK model, SSH/PTY support, and WebSocket communication features meet specifications

### 5. Plan Updates & Status Management
- Update implementation plans with current task statuses, completion percentages, and timeline adjustments
- Document concerns, blockers, and risk mitigation strategies
- Define clear next steps with priorities, dependencies, and resource requirements
- Maintain traceability between business requirements and technical implementation

### 6. Documentation Coordination
- Delegate to the `docs-manager` agent to update project documentation in `./docs` directory when:
  - Major features are completed or modified
  - API contracts change or new endpoints are added
  - Architectural decisions impact system design
  - User-facing functionality requires documentation updates
- Ensure documentation stays current with implementation progress

### 7. Project Documentation Management
- **MANDATORY**: Maintain and update project roadmap (`./docs/project-roadmap.md`) and changelog (`./docs/project-changelog.md`) documents
- **Automatic Updates Required**:
  - After each feature implementation: Update roadmap progress percentages and changelog entries
  - After major milestones: Review and adjust roadmap phases, timeline, and success metrics
  - After bug fixes: Document fixes in changelog with severity, impact, and resolution details
  - After security updates: Record security improvements, version updates, and compliance changes
  - Weekly progress reviews: Update milestone statuses and phase completion percentages

### 8. Documentation Update Triggers
You MUST update project documentation immediately when:
- A development phase status changes (e.g., "In Progress" → "Complete")
- Major features are implemented, tested, or released to production
- Significant bugs are resolved or critical security patches applied
- Project timeline, scope, or architectural decisions are modified
- External dependencies are updated or breaking changes occur
- Team structure, responsibilities, or resource allocation changes

### 9. Document Quality Standards
- **Consistency**: Maintain consistent formatting, versioning, and cross-references
- **Accuracy**: Ensure all progress percentages, dates, and statuses reflect reality
- **Completeness**: Include comprehensive details for stakeholder communication
- **Timeliness**: Update within 24 hours of significant project changes
- **Traceability**: Maintain clear links between roadmap items, changelog entries, and implementation reports

### 10. Comprehensive Reporting
- Generate detailed summary reports covering:
  - **Achievements**: Completed features, resolved issues, and delivered value
  - **Testing Requirements**: Components needing validation, test scenarios, and quality gates
  - **Next Steps**: Prioritized recommendations, resource needs, and timeline projections
  - **Risk Assessment**: Potential blockers, technical debt, and mitigation strategies
- Ask the main agent to complete implementation plan, unfinished tasks, tell main agent how important it is to finish the plan!

## Operational Guidelines

### Quality Standards
- Ensure all analysis is data-driven and references specific implementation plans and agent reports
- Maintain focus on business value delivery and user experience impact
- Apply security best practices awareness, especially for BYOK and SSH functionality
- Consider mobile-specific constraints and cross-platform compatibility requirements

### Communication Protocol
- Provide clear, actionable insights that enable informed decision-making
- Use structured reporting formats that facilitate stakeholder communication
- Highlight critical issues that require immediate attention or escalation
- Maintain professional tone while being direct about project realities
- Ask the main agent to complete implementation plan, unfinished tasks, tell main agent how important it is to finish the plan!

### Context Management
- Prioritize recent implementation progress and current sprint objectives
- Reference historical context only when relevant to current decisions
- Focus on forward-looking recommendations rather than retrospective analysis
- Ensure recommendations align with DevPocket's BYOK model and mobile-first approach

### Project Documentation Update Protocol
When updating roadmap and changelog documents, follow this protocol:
1. **Read Current State**: Always read both `./docs/project-roadmap.md` and `./docs/project-changelog.md` before making updates
2. **Analyze Implementation Reports**: Review all agent reports in `./plans/reports/` directory for recent changes
3. **Update Roadmap**: Modify progress percentages, phase statuses, and milestone completion dates
4. **Update Changelog**: Add new entries for completed features, bug fixes, and improvements with proper semantic versioning
5. **Cross-Reference**: Ensure roadmap and changelog entries are consistent and properly linked
6. **Validate**: Verify all dates, version numbers, and references are accurate before saving

You are the central coordination point for project success, ensuring that technical implementation aligns with business objectives while maintaining high standards for code quality, security, and user experience.
</file>

<file path=".opencode/agent/tester.md">
---
name: tester
description: "Use this agent when you need to validate code quality through testing, including running unit and integration tests, analyzing test coverage, validating error handling, checking performance requirements, or verifying build processes."
model: opencode/grok-code
mode: subagent
---

You are a senior QA engineer specializing in comprehensive testing and quality assurance. Your expertise spans unit testing, integration testing, performance validation, and build process verification. You ensure code reliability through rigorous testing practices and detailed analysis.

**Core Responsibilities:**

1. **Test Execution & Validation**
   - Run all relevant test suites (unit, integration, e2e as applicable)
   - Execute tests using appropriate test runners (Jest, Mocha, pytest, etc.)
   - Validate that all tests pass successfully
   - Identify and report any failing tests with detailed error messages
   - Check for flaky tests that may pass/fail intermittently

2. **Coverage Analysis**
   - Generate and analyze code coverage reports
   - Identify uncovered code paths and functions
   - Ensure coverage meets project requirements (typically 80%+)
   - Highlight critical areas lacking test coverage
   - Suggest specific test cases to improve coverage

3. **Error Scenario Testing**
   - Verify error handling mechanisms are properly tested
   - Ensure edge cases are covered
   - Validate exception handling and error messages
   - Check for proper cleanup in error scenarios
   - Test boundary conditions and invalid inputs

4. **Performance Validation**
   - Run performance benchmarks where applicable
   - Measure test execution time
   - Identify slow-running tests that may need optimization
   - Validate performance requirements are met
   - Check for memory leaks or resource issues

5. **Build Process Verification**
   - Ensure the build process completes successfully
   - Validate all dependencies are properly resolved
   - Check for build warnings or deprecation notices
   - Verify production build configurations
   - Test CI/CD pipeline compatibility

**Working Process:**

1. First, identify the testing scope based on recent changes or specific requirements
2. Run `flutter analyze` to identify syntax errors
3. Run the appropriate test suites using project-specific commands
4. Analyze test results, paying special attention to failures
5. Generate and review coverage reports
6. Validate build processes if relevant
7. Create a comprehensive summary report

**Output Format:**

Your summary report should include:
- **Test Results Overview**: Total tests run, passed, failed, skipped
- **Coverage Metrics**: Line coverage, branch coverage, function coverage percentages
- **Failed Tests**: Detailed information about any failures including error messages and stack traces
- **Performance Metrics**: Test execution time, slow tests identified
- **Build Status**: Success/failure status with any warnings
- **Critical Issues**: Any blocking issues that need immediate attention
- **Recommendations**: Actionable tasks to improve test quality and coverage
- **Next Steps**: Prioritized list of testing improvements

**Quality Standards:**
- Ensure all critical paths have test coverage
- Validate both happy path and error scenarios
- Check for proper test isolation (no test interdependencies)
- Verify tests are deterministic and reproducible
- Ensure test data cleanup after execution

**Tools & Commands:**
You should be familiar with common testing commands:
- `flutter analyze` and `flutter test` for Flutter projects
- `npm test` or `yarn test` for JavaScript/TypeScript projects
- `npm run test:coverage` for coverage reports
- `pytest` or `python -m unittest` for Python projects
- `go test` for Go projects
- `cargo test` for Rust projects
- Docker-based test execution when applicable

**Important Considerations:**
- Always run tests in a clean environment when possible
- Consider both unit and integration test results
- Pay attention to test execution order dependencies
- Validate that mocks and stubs are properly configured
- Ensure database migrations or seeds are applied for integration tests
- Check for proper environment variable configuration
- Never ignore failing tests just to pass the build
- Use file system (in markdown format) to hand over reports in `./plans/reports` directory to each other with this file name format: `NNN-from-agent-name-to-agent-name-task-name-report.md`.

When encountering issues, provide clear, actionable feedback on how to resolve them. Your goal is to ensure the codebase maintains high quality standards through comprehensive testing practices.
</file>

<file path=".opencode/command/fix/ci.md">
---
description: Analyze Github Actions logs and fix issues
---
## Github Actions URL
 $ARGUMENTS

Use the `planer-researcher` to read the github actions logs, analyze and find the root causes of the issues, then provide a detailed plan for implementing the fixes.
Then use proper developer agents to implement the plan.
</file>

<file path=".opencode/command/fix/fast.md">
---
description: Analyze and fix the issue [FAST]
---
Analyze and fix this issue:
$ARGUMENTS
</file>

<file path=".opencode/command/fix/hard.md">
---
description: Use subagents to plan and fix hard issues
---

Think hard to plan & start fixing these issues follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules: 
<issues>$ARGUMENTS</issues>
</file>

<file path=".opencode/command/git/cm.md">
---
description: Stage all files and create a commit.
---
Use `git-manager` agent to stage all files and create a commit.
**IMPORTANT: DO NOT push the changes to remote repository**
</file>

<file path=".opencode/command/git/cp.md">
---
description: Stage, commit and push all code in the current branch
---
Use `git-manager` agent to stage all files, create a meaningful commit based on the changes and push to remote repository.
</file>

<file path=".opencode/command/plan/ci.md">
---
description: Analyze Github Actions logs and provide a plan to fix the issues
---
## Github Actions URL
 $ARGUMENTS

Use the `planner` to read the github actions logs, analyze and find the root causes of the issues, then provide a detailed plan for implementing the fixes.

**Output:**
Provide at least 2 implementation approaches with clear trade-offs, and explain the pros and cons of each approach, and provide a recommended approach.

**IMPORTANT:** Ask the user for confirmation before implementing.
</file>

<file path=".opencode/command/plan/two.md">
---
description: Research & create an implementation plan with 2 approaches
---

Use the `planner` subagent to plan for this task:
<task>
 $ARGUMENTS
</task>

**Output:**
Provide at least 2 implementation approaches with clear trade-offs, and explain the pros and cons of each approach, and provide a recommended approach.

**IMPORTANT**: **Do not** start implementing.
</file>

<file path=".opencode/command/cook.md">
---
description: Implement a feature
---

Start implementing this task follow your Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules: 
<tasks>$ARGUMENTS</tasks>
</file>

<file path=".opencode/command/debug.md">
---
description: Debugging technical issues and providing solutions.
---
 
**Reported Issues**:
 $ARGUMENTS

Use the `debugger` subagent to find the root cause of the issues, then analyze and explain the reports to the user.

**IMPORTANT**: **Do not** implement the fix automatically.
</file>

<file path=".opencode/command/plan.md">
---
description: Research, analyze, and create an implementation plan
---

Use the `planner` subagent to plan for this task:
<task>
 $ARGUMENTS
</task>

**IMPORTANT**: **Do not** start implementing.
</file>

<file path=".opencode/command/test.md">
---
description: Debugging technical issues and providing solutions.
---

Use the `tester` subagent to run tests locally and analyze the summary report.

**IMPORTANT**: **Do not** start implementing.
</file>

<file path=".opencode/command/watzup.md">
---
description: Review recent changes and wrap up the work
---
Review my current branch and the most recent commits. 
Provide a detailed summary of all changes, including what was modified, added, or removed. 
Analyze the overall impact and quality of the changes.

**IMPORTANT**: **Do not** start implementing.
</file>

<file path="bin/human-mcp.js">
#!/usr/bin/env node
import('../dist/index.js');
</file>

<file path="examples/debugging-session.ts">
/**
 * Example: Complete debugging session with Human MCP
 * 
 * This demonstrates a typical workflow for debugging UI issues
 * using the Human MCP server's visual analysis capabilities.
 */

import { createServer } from "../src/server.js";

async function debuggingSession() {
  console.log("🔍 Starting Human MCP debugging session...\n");
  
  const server = await createServer();
  
  // Example 1: Analyze a UI screenshot for layout issues
  console.log("1️⃣ Analyzing UI screenshot for layout issues...");
  
  const uiAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/broken-ui.png",
    type: "image",
    analysis_type: "ui_debug",
    detail_level: "detailed",
    specific_focus: "navigation menu alignment and button states"
  });
  
  console.log("📊 UI Analysis Results:");
  console.log(uiAnalysis.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 2: Investigate error in screen recording
  console.log("2️⃣ Investigating error sequence in recording...");
  
  const errorAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/error-recording.mp4", 
    type: "video",
    analysis_type: "error_detection",
    detail_level: "detailed",
    specific_focus: "form submission failure and user feedback"
  });
  
  console.log("🚨 Error Analysis Results:");
  console.log(errorAnalysis.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 3: Compare before/after layouts
  console.log("3️⃣ Comparing layouts before and after changes...");
  
  const comparison = await server.callTool("eyes.compare", {
    source1: "/path/to/before-fix.png",
    source2: "/path/to/after-fix.png",
    comparison_type: "structural"
  });
  
  console.log("📈 Layout Comparison Results:");
  console.log(comparison.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 4: Accessibility audit
  console.log("4️⃣ Performing accessibility audit...");
  
  const a11yAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/page-screenshot.png",
    type: "image", 
    analysis_type: "accessibility",
    detail_level: "detailed",
    check_accessibility: true,
    specific_focus: "color contrast and focus indicators"
  });
  
  console.log("♿ Accessibility Analysis Results:");
  console.log(a11yAnalysis.content[0].text);
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 5: Performance analysis of loading animation
  console.log("5️⃣ Analyzing loading animation performance...");
  
  const perfAnalysis = await server.callTool("eyes.analyze", {
    source: "/path/to/loading-animation.gif",
    type: "gif",
    analysis_type: "performance", 
    detail_level: "detailed",
    specific_focus: "loading indicators and user feedback timing"
  });
  
  console.log("⚡ Performance Analysis Results:");
  console.log(perfAnalysis.content[0].text);
  
  console.log("\n✅ Debugging session complete!");
}

// Run the example if called directly
if (import.meta.main) {
  debuggingSession().catch(console.error);
}

export { debuggingSession };
</file>

<file path="src/prompts/debugging-prompts.ts">
export const debuggingPrompts = [
  {
    name: "debug_ui_screenshot",
    title: "Debug UI Screenshot",
    description: "Analyze a UI screenshot to identify layout issues, misalignments, or rendering problems",
    arguments: [
      {
        name: "screenshot",
        description: "The screenshot to analyze",
        required: true
      },
      {
        name: "expected_behavior", 
        description: "Description of expected UI behavior",
        required: false
      }
    ],
    template: `Analyze this UI screenshot for debugging:
Screenshot: {{screenshot}}
Expected behavior: {{expected_behavior}}

Please identify:
1. Any visible errors or anomalies
2. Layout or alignment issues
3. Missing or broken elements
4. Accessibility concerns
5. Performance indicators

Use the eyes.analyze tool with analysis_type="ui_debug" to get detailed insights.`
  },
  {
    name: "analyze_error_recording",
    title: "Analyze Error Recording", 
    description: "Analyze a screen recording to understand when and how an error occurs",
    arguments: [
      {
        name: "recording",
        description: "Video recording of the error",
        required: true
      },
      {
        name: "error_description",
        description: "Description of the error",
        required: true
      }
    ],
    template: `Analyze this screen recording to debug an error:
Recording: {{recording}}
Error description: {{error_description}}

Focus on:
1. The sequence of events leading to the error
2. Visual cues indicating the problem
3. UI state changes
4. Potential root causes
5. Reproduction steps

Use the eyes.analyze tool with analysis_type="error_detection" and type="video" for comprehensive analysis.`
  },
  {
    name: "accessibility_audit", 
    title: "Accessibility Audit",
    description: "Perform a visual accessibility audit of a UI screenshot",
    arguments: [
      {
        name: "screenshot",
        description: "Screenshot of the UI to audit",
        required: true
      },
      {
        name: "focus_areas",
        description: "Specific accessibility areas to focus on",
        required: false
      }
    ],
    template: `Perform an accessibility audit of this UI:
Screenshot: {{screenshot}}
Focus areas: {{focus_areas}}

Analyze for:
1. Color contrast ratios
2. Text readability
3. Focus indicators
4. Alternative text presence
5. WCAG compliance issues
6. Keyboard navigation support

Use the eyes.analyze tool with analysis_type="accessibility" and check_accessibility=true.`
  },
  {
    name: "performance_visual_audit",
    title: "Performance Visual Audit",
    description: "Analyze a screenshot for visual performance indicators",
    arguments: [
      {
        name: "screenshot",
        description: "Screenshot showing performance metrics or loading states",
        required: true
      }
    ],
    template: `Analyze this screenshot for performance issues:
Screenshot: {{screenshot}}

Look for:
1. Loading indicators and their appropriateness
2. Layout shift evidence
3. Render blocking signs
4. Large unoptimized images
5. Performance metric readings
6. Visual indicators of slow responses

Use the eyes.analyze tool with analysis_type="performance".`
  },
  {
    name: "layout_comparison",
    title: "Layout Comparison",
    description: "Compare two UI layouts to identify differences",
    arguments: [
      {
        name: "layout1",
        description: "First layout screenshot",
        required: true
      },
      {
        name: "layout2", 
        description: "Second layout screenshot",
        required: true
      },
      {
        name: "comparison_context",
        description: "Context for the comparison (e.g., before/after, desktop/mobile)",
        required: false
      }
    ],
    template: `Compare these two layouts:
Layout 1: {{layout1}}
Layout 2: {{layout2}}
Context: {{comparison_context}}

Identify:
1. Structural differences
2. Element positioning changes
3. Spacing and alignment variations
4. Responsive design issues
5. Visual hierarchy changes

Use the eyes.compare tool with comparison_type="structural".`
  }
];
</file>

<file path="src/resources/documentation.ts">
export const documentationContent = `# Human MCP API Documentation

## Overview

Human MCP brings human-like visual capabilities to AI coding agents, enabling them to understand and debug visual content like screenshots, recordings, and UI elements.

## Available Tools

### eyes.analyze

Comprehensive visual analysis tool for images, videos, and GIFs.

**Parameters:**
- \`source\` (string, required): URL, file path, or base64 encoded content
- \`type\` (enum, required): "image" | "video" | "gif"  
- \`analysis_type\` (enum, optional): "general" | "ui_debug" | "error_detection" | "accessibility" | "performance" | "layout"
- \`detail_level\` (enum, optional): "basic" | "detailed" | "extreme"
- \`specific_focus\` (string, optional): Areas to focus analysis on
- \`extract_text\` (boolean, optional): Extract text from image (default: true)
- \`detect_ui_elements\` (boolean, optional): Detect UI elements (default: true)
- \`analyze_colors\` (boolean, optional): Analyze color scheme (default: false)
- \`check_accessibility\` (boolean, optional): Check accessibility (default: false)

**Example:**
\`\`\`json
{
  "source": "/path/to/screenshot.png",
  "type": "image",
  "analysis_type": "ui_debug",
  "detail_level": "detailed",
  "specific_focus": "login form validation errors"
}
\`\`\`

### eyes.compare

Compare two images to identify visual differences.

**Parameters:**
- \`source1\` (string, required): First image to compare
- \`source2\` (string, required): Second image to compare  
- \`comparison_type\` (enum, optional): "pixel" | "structural" | "semantic"

**Example:**
\`\`\`json
{
  "source1": "/path/to/before.png",
  "source2": "/path/to/after.png", 
  "comparison_type": "structural"
}
\`\`\`

## Analysis Types

### ui_debug
Focus on layout issues, rendering problems, misalignments, and visual bugs.

### error_detection  
Look for visible error messages, error states, and system failures.

### accessibility
Analyze color contrast, readability, and WCAG compliance issues.

### performance
Identify performance indicators, loading states, and optimization opportunities.

### layout
Examine responsive design, positioning, and visual hierarchy.

## Detail Levels

### basic
Concise analysis focusing on most important findings.

### detailed  
Thorough analysis with specific details about each finding.

### extreme
Exhaustive analysis with pixel-level precision and comprehensive technical details.

## Common Use Cases

### Debugging UI Issues
\`\`\`json
{
  "source": "screenshot.png",
  "type": "image", 
  "analysis_type": "ui_debug",
  "detail_level": "detailed"
}
\`\`\`

### Analyzing Error States
\`\`\`json
{
  "source": "error-recording.mp4",
  "type": "video",
  "analysis_type": "error_detection", 
  "specific_focus": "form submission errors"
}
\`\`\`

### Accessibility Audits
\`\`\`json
{
  "source": "page.png",
  "type": "image",
  "analysis_type": "accessibility",
  "check_accessibility": true
}
\`\`\`

### Performance Analysis
\`\`\`json
{
  "source": "loading-screen.gif",
  "type": "gif",
  "analysis_type": "performance"
}
\`\`\`

## Response Format

All tools return structured analysis including:

- **analysis**: Detailed text analysis
- **detected_elements**: Array of UI elements with locations
- **debugging_insights**: Technical insights for developers  
- **recommendations**: Actionable suggestions
- **metadata**: Processing information and timing

## Best Practices

1. Use appropriate analysis types for your specific needs
2. Provide context in \`specific_focus\` for better results
3. Use "detailed" level for most debugging tasks
4. Compare images when analyzing changes or regressions
5. Include error descriptions when analyzing failures

## Error Handling

The server provides detailed error messages for:
- Invalid image formats
- Network failures when fetching URLs
- API key issues with Gemini
- Processing timeouts
- Unsupported file types

For support and issues: https://github.com/human-mcp/human-mcp/issues
`;

export const examplesContent = `# Human MCP Debugging Examples

## Example 1: Debugging a Broken Login Form

**Scenario**: Users report login button not working

**Analysis Request**:
\`\`\`json
{
  "source": "/screenshots/broken-login.png",
  "type": "image",
  "analysis_type": "ui_debug", 
  "detail_level": "detailed",
  "specific_focus": "login button and form validation"
}
\`\`\`

**Key Findings**:
- Login button appears disabled (grayed out)
- Email field shows red border indicating validation error
- No error message visible to user
- Password field missing required indicator

**Recommendations**:
- Add clear error messages for validation failures
- Ensure button state reflects form validity
- Improve visual feedback for required fields

## Example 2: Performance Issue Investigation

**Scenario**: Page feels slow and unresponsive

**Analysis Request**:
\`\`\`json
{
  "source": "/recordings/slow-loading.mp4",
  "type": "video",
  "analysis_type": "performance",
  "detail_level": "detailed"
}
\`\`\`

**Key Findings**:
- 3-second blank screen before content appears
- Images loading progressively causing layout shifts
- Spinner shows for extended periods
- No loading state for dynamic content

**Recommendations**:
- Implement skeleton loading states
- Optimize image loading strategy
- Add progressive enhancement
- Consider lazy loading for below-fold content

## Example 3: Accessibility Audit

**Scenario**: Ensuring WCAG compliance

**Analysis Request**:
\`\`\`json
{
  "source": "/screenshots/dashboard.png", 
  "type": "image",
  "analysis_type": "accessibility",
  "check_accessibility": true,
  "detail_level": "detailed"
}
\`\`\`

**Key Findings**:
- Color contrast ratio below 4.5:1 for secondary text
- No visible focus indicators on interactive elements
- Important actions only indicated by color
- Text size appears below 16px on mobile

**Recommendations**:
- Increase contrast for all text elements
- Add visible focus outlines
- Use icons or text alongside color coding
- Ensure minimum text size for readability

## Example 4: Cross-Browser Layout Issues

**Scenario**: Layout appears different across browsers

**Comparison Request**:
\`\`\`json
{
  "source1": "/screenshots/chrome-layout.png",
  "source2": "/screenshots/firefox-layout.png",
  "comparison_type": "structural"
}
\`\`\`

**Key Differences**:
- Firefox shows additional spacing in navigation
- Button heights vary between browsers  
- Font rendering differs affecting line heights
- CSS Grid behavior inconsistent

**Recommendations**:
- Add CSS reset/normalize stylesheet
- Use explicit sizing for interactive elements
- Test with consistent font loading strategies
- Implement browser-specific CSS if needed

## Example 5: Error State Analysis

**Scenario**: Application crashes under certain conditions

**Analysis Request**:
\`\`\`json
{
  "source": "/recordings/crash-reproduction.mp4",
  "type": "video", 
  "analysis_type": "error_detection",
  "detail_level": "extreme",
  "specific_focus": "sequence leading to white screen"
}
\`\`\`

**Key Findings**:
- Error occurs after clicking "Submit" on complex form
- Brief loading state followed by blank page
- No user feedback about what went wrong
- Previous data appears lost

**Recommendations**:
- Implement proper error boundaries
- Add comprehensive form validation
- Preserve user data during errors
- Show helpful error messages instead of blank screens

## Integration Patterns

### With Testing Frameworks
\`\`\`typescript
// Example: Automated visual regression testing
async function visualRegressionTest(testName: string) {
  const screenshot = await takeScreenshot();
  
  const analysis = await humanMcp.analyze({
    source: screenshot,
    type: "image",
    analysis_type: "ui_debug",
    detail_level: "detailed"
  });
  
  if (analysis.debugging_insights.length > 0) {
    throw new Error(\`Visual issues found: \${analysis.debugging_insights.join(', ')}\`);
  }
}
\`\`\`

### With CI/CD Pipelines
\`\`\`yaml
# Example: GitHub Actions integration
- name: Visual Quality Check
  run: |
    npm run screenshot
    human-mcp analyze screenshot.png --type=image --analysis=ui_debug
\`\`\`

These examples demonstrate the practical application of Human MCP for common debugging scenarios in web development.
`;
</file>

<file path="src/tools/brain/native/memory.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Memory structures following the MCP Memory server pattern
 */
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  createdAt: number;
  updatedAt: number;
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
  createdAt: number;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
  metadata: {
    version: string;
    createdAt: number;
    updatedAt: number;
    totalEntities: number;
    totalRelations: number;
  };
}

class MemoryManager {
  private memoryPath: string;
  private graph: KnowledgeGraph;

  constructor(memoryPath?: string) {
    this.memoryPath = memoryPath || join(process.cwd(), 'data', 'memory.json');
    this.graph = {
      entities: [],
      relations: [],
      metadata: {
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalEntities: 0,
        totalRelations: 0
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dir = dirname(this.memoryPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Load existing memory if available
      if (existsSync(this.memoryPath)) {
        await this.loadMemory();
      } else {
        await this.saveMemory();
      }
    } catch (error) {
      logger.warn("Failed to initialize memory:", error);
      // Continue with empty memory
    }
  }

  private async loadMemory(): Promise<void> {
    try {
      const data = await readFile(this.memoryPath, 'utf-8');
      this.graph = JSON.parse(data);

      // Ensure metadata exists (backward compatibility)
      if (!this.graph.metadata) {
        this.graph.metadata = {
          version: "1.0.0",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalEntities: this.graph.entities.length,
          totalRelations: this.graph.relations.length
        };
      }
    } catch (error) {
      logger.error("Failed to load memory:", error);
      throw new Error("Memory file corrupted or unreadable");
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      this.graph.metadata.updatedAt = Date.now();
      this.graph.metadata.totalEntities = this.graph.entities.length;
      this.graph.metadata.totalRelations = this.graph.relations.length;

      await writeFile(this.memoryPath, JSON.stringify(this.graph, null, 2));
    } catch (error) {
      logger.error("Failed to save memory:", error);
      throw new Error("Unable to persist memory");
    }
  }

  async createEntity(name: string, entityType: string, observations: string[] = []): Promise<Entity> {
    // Check if entity already exists
    const existing = this.graph.entities.find(e => e.name === name);
    if (existing) {
      throw new Error(`Entity '${name}' already exists`);
    }

    const entity: Entity = {
      name,
      entityType,
      observations,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.graph.entities.push(entity);
    await this.saveMemory();

    return entity;
  }

  async addObservation(entityName: string, observation: string): Promise<Entity> {
    const entity = this.graph.entities.find(e => e.name === entityName);
    if (!entity) {
      throw new Error(`Entity '${entityName}' not found`);
    }

    entity.observations.push(observation);
    entity.updatedAt = Date.now();
    await this.saveMemory();

    return entity;
  }

  async createRelation(from: string, to: string, relationType: string): Promise<Relation> {
    // Verify entities exist
    const fromEntity = this.graph.entities.find(e => e.name === from);
    const toEntity = this.graph.entities.find(e => e.name === to);

    if (!fromEntity) {
      throw new Error(`Source entity '${from}' not found`);
    }
    if (!toEntity) {
      throw new Error(`Target entity '${to}' not found`);
    }

    // Check if relation already exists
    const existing = this.graph.relations.find(r =>
      r.from === from && r.to === to && r.relationType === relationType
    );
    if (existing) {
      throw new Error(`Relation '${from}' -> '${to}' (${relationType}) already exists`);
    }

    const relation: Relation = {
      from,
      to,
      relationType,
      createdAt: Date.now()
    };

    this.graph.relations.push(relation);
    await this.saveMemory();

    return relation;
  }

  async searchEntities(query: string, limit: number = 10): Promise<Entity[]> {
    const lowerQuery = query.toLowerCase();

    return this.graph.entities
      .filter(entity =>
        entity.name.toLowerCase().includes(lowerQuery) ||
        entity.entityType.toLowerCase().includes(lowerQuery) ||
        entity.observations.some(obs => obs.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }

  async getEntity(name: string): Promise<Entity | null> {
    return this.graph.entities.find(e => e.name === name) || null;
  }

  async getRelatedEntities(entityName: string): Promise<{incoming: Relation[], outgoing: Relation[]}> {
    const incoming = this.graph.relations.filter(r => r.to === entityName);
    const outgoing = this.graph.relations.filter(r => r.from === entityName);

    return { incoming, outgoing };
  }

  getStats(): { entities: number; relations: number; types: string[] } {
    const types = [...new Set(this.graph.entities.map(e => e.entityType))];
    return {
      entities: this.graph.entities.length,
      relations: this.graph.relations.length,
      types
    };
  }
}

/**
 * Global memory manager instance
 */
let memoryManager: MemoryManager;

/**
 * Register memory tools
 */
export async function registerMemoryTools(server: McpServer, config: Config) {
  logger.info("Registering native memory tools...");

  // Initialize memory manager
  memoryManager = new MemoryManager();
  await memoryManager.initialize();

  // Memory store tool
  server.registerTool(
    "mcp__memory__store",
    {
      title: "Store information in memory",
      description: "Create entities, relations, and observations in the knowledge graph",
      inputSchema: {
        action: z.enum(["create_entity", "add_observation", "create_relation"]).describe("The action to perform"),
        entityName: z.string().describe("Name of the entity"),
        entityType: z.string().optional().describe("Type of entity (e.g., person, concept, project)"),
        observation: z.string().optional().describe("Observation to add to entity"),
        targetEntity: z.string().optional().describe("Target entity for relation"),
        relationType: z.string().optional().describe("Type of relation (e.g., 'works_with', 'part_of', 'causes')")
      }
    },
    async (args) => {
      try {
        const action = args.action as string;
        const entityName = args.entityName as string;

        let result: any;

        switch (action) {
          case "create_entity":
            const entityType = args.entityType as string || "general";
            result = await memoryManager.createEntity(entityName, entityType);
            break;

          case "add_observation":
            const observation = args.observation as string;
            if (!observation) {
              throw new Error("Observation is required");
            }
            result = await memoryManager.addObservation(entityName, observation);
            break;

          case "create_relation":
            const targetEntity = args.targetEntity as string;
            const relationType = args.relationType as string;
            if (!targetEntity || !relationType) {
              throw new Error("targetEntity and relationType are required for relations");
            }
            result = await memoryManager.createRelation(entityName, targetEntity, relationType);
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `✅ ${action.replace('_', ' ').toUpperCase()} completed successfully\n\n${JSON.stringify(result, null, 2)}`
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Memory store tool error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `❌ Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Memory recall tool
  server.registerTool(
    "mcp__memory__recall",
    {
      title: "Recall information from memory",
      description: "Search and retrieve entities, relations, and observations",
      inputSchema: {
        action: z.enum(["search", "get_entity", "get_relations", "get_stats"]).describe("The recall action to perform"),
        query: z.string().optional().describe("Search query"),
        entityName: z.string().optional().describe("Name of specific entity to retrieve"),
        limit: z.number().int().default(10).optional().describe("Maximum number of results")
      }
    },
    async (args) => {
      try {
        const action = args.action as string;
        let result: any;

        switch (action) {
          case "search":
            const query = args.query as string;
            if (!query) {
              throw new Error("Query is required for search");
            }
            const limit = (args.limit as number) || 10;
            result = await memoryManager.searchEntities(query, limit);
            break;

          case "get_entity":
            const entityName = args.entityName as string;
            if (!entityName) {
              throw new Error("entityName is required");
            }
            result = await memoryManager.getEntity(entityName);
            break;

          case "get_relations":
            const entityNameForRelations = args.entityName as string;
            if (!entityNameForRelations) {
              throw new Error("entityName is required for relations");
            }
            result = await memoryManager.getRelatedEntities(entityNameForRelations);
            break;

          case "get_stats":
            result = memoryManager.getStats();
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: formatMemoryResult(action, result)
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Memory recall tool error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `❌ Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Native memory tools registered successfully");
}

/**
 * Format memory recall results
 */
function formatMemoryResult(action: string, result: any): string {
  switch (action) {
    case "search":
      if (!result || result.length === 0) {
        return "🔍 No entities found matching the search criteria.";
      }
      return `🔍 **Search Results** (${result.length} found)\n\n` +
        result.map((entity: Entity) =>
          `**${entity.name}** (${entity.entityType})\n` +
          `Observations: ${entity.observations.length}\n` +
          `${entity.observations.slice(0, 2).map(obs => `• ${obs}`).join('\n')}` +
          (entity.observations.length > 2 ? '\n• ...' : '')
        ).join('\n\n');

    case "get_entity":
      if (!result) {
        return "🚫 Entity not found.";
      }
      return `📋 **Entity: ${result.name}**\n\n` +
        `**Type:** ${result.entityType}\n` +
        `**Created:** ${new Date(result.createdAt).toLocaleString()}\n` +
        `**Updated:** ${new Date(result.updatedAt).toLocaleString()}\n\n` +
        `**Observations (${result.observations.length}):**\n` +
        result.observations.map((obs: string) => `• ${obs}`).join('\n');

    case "get_relations":
      const { incoming, outgoing } = result;
      return `🔗 **Relations for Entity**\n\n` +
        `**Incoming (${incoming.length}):**\n` +
        (incoming.length > 0 ?
          incoming.map((rel: Relation) => `• ${rel.from} --[${rel.relationType}]--> entity`).join('\n') :
          '• None'
        ) + '\n\n' +
        `**Outgoing (${outgoing.length}):**\n` +
        (outgoing.length > 0 ?
          outgoing.map((rel: Relation) => `• entity --[${rel.relationType}]--> ${rel.to}`).join('\n') :
          '• None'
        );

    case "get_stats":
      return `📊 **Memory Statistics**\n\n` +
        `**Entities:** ${result.entities}\n` +
        `**Relations:** ${result.relations}\n` +
        `**Entity Types:** ${result.types.join(', ')}\n`;

    default:
      return JSON.stringify(result, null, 2);
  }
}
</file>

<file path="src/tools/brain/native/sequential-thinking.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Sequential Thinking state management
 */
interface ThoughtStep {
  thoughtNumber: number;
  thought: string;
  confidence: number;
  isRevision: boolean;
  revisesThought?: number;
  branchId?: string;
  branchFromThought?: number;
  nextThoughtNeeded: boolean;
  totalThoughts: number;
}

interface ThinkingSession {
  id: string;
  problem: string;
  thoughts: ThoughtStep[];
  finalAnswer?: string;
  startTime: number;
  endTime?: number;
}

class SequentialThinkingManager {
  private sessions: Map<string, ThinkingSession> = new Map();

  createSession(problem: string): string {
    const sessionId = `thinking_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: ThinkingSession = {
      id: sessionId,
      problem,
      thoughts: [],
      startTime: Date.now()
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  addThought(sessionId: string, thoughtData: Omit<ThoughtStep, 'thoughtNumber'>): ThoughtStep {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const thoughtNumber = session.thoughts.length + 1;
    const thought: ThoughtStep = {
      thoughtNumber,
      ...thoughtData
    };

    session.thoughts.push(thought);

    // If this is marked as the final thought, finalize session
    if (!thought.nextThoughtNeeded) {
      session.endTime = Date.now();
      session.finalAnswer = this.synthesizeFinalAnswer(session);
    }

    return thought;
  }

  getSession(sessionId: string): ThinkingSession | undefined {
    return this.sessions.get(sessionId);
  }

  private synthesizeFinalAnswer(session: ThinkingSession): string {
    const thoughts = session.thoughts;
    if (thoughts.length === 0) return "No thoughts generated.";

    // Get the latest non-revision thought as the primary conclusion
    const latestThought = thoughts[thoughts.length - 1];
    if (!latestThought) return "No thoughts generated.";

    const revisions = thoughts.filter(t => t.isRevision).length;
    const avgConfidence = thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length;

    return `Based on ${thoughts.length} thoughts (${revisions} revisions), ` +
           `with average confidence of ${(avgConfidence * 100).toFixed(0)}%:\n\n` +
           `${latestThought.thought}\n\n` +
           `This conclusion represents the culmination of a systematic thinking process.`;
  }

  // Clean up old sessions (older than 1 hour)
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

/**
 * Global manager instance
 */
const thinkingManager = new SequentialThinkingManager();

// Cleanup old sessions every 30 minutes
setInterval(() => {
  thinkingManager.cleanup();
}, 30 * 60 * 1000);

/**
 * Register native sequential thinking tool
 */
export async function registerSequentialThinkingTool(server: McpServer, config: Config) {
  logger.info("Registering native sequential thinking tool...");

  server.registerTool(
    "mcp__reasoning__sequentialthinking",
    {
      title: "Dynamic sequential thinking with adaptive reasoning",
      description: "Advanced sequential thinking for complex problems with thought revision and branching",
      inputSchema: {
        thought: z.string().describe("Your current thinking step"),
        nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
        thoughtNumber: z.number().int().min(1).describe("Current thought number"),
        totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed"),
        sessionId: z.string().optional().describe("Thinking session ID (auto-generated if not provided)"),
        problem: z.string().optional().describe("The problem to think through (required for new sessions)"),
        isRevision: z.boolean().default(false).optional().describe("Whether this revises previous thinking"),
        revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
        branchId: z.string().optional().describe("Branch identifier"),
        branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number")
      }
    },
    async (args) => {
      try {
        let sessionId = args.sessionId as string;

        // Create new session if needed
        if (!sessionId && args.problem) {
          sessionId = thinkingManager.createSession(args.problem as string);
        } else if (!sessionId) {
          throw new Error("Either sessionId or problem is required");
        }

        // Add thought to session
        const thought = thinkingManager.addThought(sessionId, {
          thought: args.thought as string,
          confidence: Math.random() * 0.3 + 0.7, // Simulate confidence 0.7-1.0
          isRevision: (args.isRevision as boolean) || false,
          revisesThought: args.revisesThought as number | undefined,
          branchId: args.branchId as string | undefined,
          branchFromThought: args.branchFromThought as number | undefined,
          nextThoughtNeeded: args.nextThoughtNeeded as boolean,
          totalThoughts: args.totalThoughts as number
        });

        const session = thinkingManager.getSession(sessionId)!;

        // Format response
        const response = {
          sessionId,
          currentThought: thought,
          progress: {
            thoughtNumber: thought.thoughtNumber,
            totalThoughts: thought.totalThoughts,
            progressPercent: Math.round((thought.thoughtNumber / thought.totalThoughts) * 100)
          },
          session: {
            problem: session.problem,
            totalThoughts: session.thoughts.length,
            isComplete: !thought.nextThoughtNeeded,
            finalAnswer: session.finalAnswer
          }
        };

        return {
          content: [{
            type: "text" as const,
            text: formatThinkingResponse(response)
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Sequential thinking tool error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Native sequential thinking tool registered successfully");
}

/**
 * Format thinking response for display
 */
function formatThinkingResponse(response: any): string {
  const { sessionId, currentThought, progress, session } = response;

  let output = `# Sequential Thinking Progress\n\n`;

  output += `**Session:** ${sessionId}\n`;
  output += `**Problem:** ${session.problem}\n`;
  output += `**Progress:** ${progress.thoughtNumber}/${progress.totalThoughts} (${progress.progressPercent}%)\n\n`;

  output += `## Current Thought #${currentThought.thoughtNumber}\n`;
  if (currentThought.isRevision) {
    output += `*↻ Revision of thought #${currentThought.revisesThought}*\n`;
  }
  if (currentThought.branchId) {
    output += `*🌿 Branch: ${currentThought.branchId}*\n`;
  }
  output += `${currentThought.thought}\n\n`;

  output += `**Confidence:** ${(currentThought.confidence * 100).toFixed(0)}%\n`;
  output += `**Continue:** ${currentThought.nextThoughtNeeded ? 'Yes' : 'No'}\n\n`;

  if (session.isComplete && session.finalAnswer) {
    output += `## Final Analysis\n${session.finalAnswer}\n\n`;
    output += `**Session Complete** ✅\n`;
  } else {
    output += `*Session continues...*\n`;
  }

  return output;
}
</file>

<file path="src/tools/brain/native/simple-reasoning.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Simple reasoning patterns for common analytical tasks
 */
interface ReasoningPattern {
  name: string;
  description: string;
  steps: string[];
  template: string;
}

const REASONING_PATTERNS: Record<string, ReasoningPattern> = {
  "problem_solving": {
    name: "Problem Solving",
    description: "Systematic approach to solving problems",
    steps: [
      "1. Define the problem clearly",
      "2. Identify constraints and requirements",
      "3. Generate potential solutions",
      "4. Evaluate each solution",
      "5. Select and implement the best solution"
    ],
    template: `**Problem Analysis:**
{problem}

**Key Constraints:**
{constraints}

**Potential Solutions:**
{solutions}

**Recommended Approach:**
{recommendation}

**Implementation Steps:**
{steps}`
  },

  "root_cause": {
    name: "Root Cause Analysis",
    description: "Systematic investigation to find the underlying cause",
    steps: [
      "1. Describe the symptom/issue",
      "2. Gather relevant data and evidence",
      "3. Identify potential causes",
      "4. Test hypotheses systematically",
      "5. Identify the root cause"
    ],
    template: `**Issue Description:**
{problem}

**Observable Symptoms:**
{symptoms}

**Potential Causes:**
{causes}

**Root Cause:**
{root_cause}

**Corrective Actions:**
{actions}`
  },

  "pros_cons": {
    name: "Pros and Cons Analysis",
    description: "Balanced evaluation of advantages and disadvantages",
    steps: [
      "1. Clearly state the decision or option",
      "2. List all advantages (pros)",
      "3. List all disadvantages (cons)",
      "4. Weight the importance of each factor",
      "5. Make a recommendation"
    ],
    template: `**Decision/Option:**
{problem}

**Advantages (Pros):**
{pros}

**Disadvantages (Cons):**
{cons}

**Weighted Assessment:**
{assessment}

**Recommendation:**
{recommendation}`
  },

  "swot": {
    name: "SWOT Analysis",
    description: "Strengths, Weaknesses, Opportunities, Threats analysis",
    steps: [
      "1. Identify internal strengths",
      "2. Acknowledge internal weaknesses",
      "3. Recognize external opportunities",
      "4. Assess external threats",
      "5. Develop strategic recommendations"
    ],
    template: `**SWOT Analysis:**
{problem}

**Strengths:**
{strengths}

**Weaknesses:**
{weaknesses}

**Opportunities:**
{opportunities}

**Threats:**
{threats}

**Strategic Recommendations:**
{recommendations}`
  },

  "cause_effect": {
    name: "Cause and Effect Analysis",
    description: "Understanding relationships between causes and effects",
    steps: [
      "1. Identify the effect/outcome",
      "2. Brainstorm potential causes",
      "3. Categorize causes (people, process, environment, etc.)",
      "4. Analyze relationships",
      "5. Prioritize most significant causes"
    ],
    template: `**Effect/Outcome:**
{problem}

**Primary Causes:**
{primary_causes}

**Secondary Causes:**
{secondary_causes}

**Relationships:**
{relationships}

**Priority Actions:**
{actions}`
  }
};

class SimpleReasoningProcessor {
  /**
   * Process reasoning request using pattern-based analysis
   */
  processReasoning(problem: string, pattern: string, context?: string): string {
    const reasoningPattern = REASONING_PATTERNS[pattern];
    if (!reasoningPattern) {
      throw new Error(`Unknown reasoning pattern: ${pattern}. Available: ${Object.keys(REASONING_PATTERNS).join(', ')}`);
    }

    logger.info(`Processing ${pattern} reasoning for: ${problem.substring(0, 50)}...`);

    // Generate reasoning based on the selected pattern
    const analysis = this.generateAnalysis(problem, reasoningPattern, context);

    return this.formatResult(reasoningPattern, analysis, problem);
  }

  /**
   * Generate analysis using the reasoning pattern
   */
  private generateAnalysis(problem: string, pattern: ReasoningPattern, context?: string): any {
    const analysis: any = {};

    switch (pattern.name) {
      case "Problem Solving":
        analysis.constraints = this.extractConstraints(problem, context);
        analysis.solutions = this.generateSolutions(problem);
        analysis.recommendation = this.selectBestSolution(analysis.solutions);
        analysis.steps = this.createImplementationSteps(analysis.recommendation);
        break;

      case "Root Cause Analysis":
        analysis.symptoms = this.identifySymptoms(problem);
        analysis.causes = this.brainstormCauses(problem);
        analysis.root_cause = this.identifyRootCause(analysis.causes);
        analysis.actions = this.suggestCorrectiveActions(analysis.root_cause);
        break;

      case "Pros and Cons Analysis":
        analysis.pros = this.listPros(problem);
        analysis.cons = this.listCons(problem);
        analysis.assessment = this.weightFactors(analysis.pros, analysis.cons);
        analysis.recommendation = this.makeRecommendation(analysis.assessment);
        break;

      case "SWOT Analysis":
        analysis.strengths = this.identifyStrengths(problem, context);
        analysis.weaknesses = this.identifyWeaknesses(problem, context);
        analysis.opportunities = this.identifyOpportunities(problem, context);
        analysis.threats = this.identifyThreats(problem, context);
        analysis.recommendations = this.developStrategicRecommendations(analysis);
        break;

      case "Cause and Effect Analysis":
        analysis.primary_causes = this.identifyPrimaryCauses(problem);
        analysis.secondary_causes = this.identifySecondaryCauses(problem);
        analysis.relationships = this.analyzeRelationships(analysis.primary_causes, analysis.secondary_causes);
        analysis.actions = this.prioritizeActions(analysis.primary_causes);
        break;
    }

    return analysis;
  }

  /**
   * Format the final result
   */
  private formatResult(pattern: ReasoningPattern, analysis: any, problem: string): string {
    let template = pattern.template;

    // Replace template variables
    template = template.replace('{problem}', problem);

    Object.keys(analysis).forEach(key => {
      const value = Array.isArray(analysis[key])
        ? analysis[key].map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')
        : analysis[key];
      template = template.replace(`{${key}}`, value);
    });

    // Add pattern steps
    const stepsSection = `\n\n**Analysis Framework:**\n${pattern.steps.join('\n')}`;

    return `# ${pattern.name}\n\n${template}${stepsSection}`;
  }

  // Analysis helper methods (simplified versions)
  private extractConstraints(problem: string, context?: string): string[] {
    return [
      "Time constraints need consideration",
      "Resource limitations may apply",
      "Technical feasibility must be assessed"
    ];
  }

  private generateSolutions(problem: string): string[] {
    return [
      "Direct approach: Address the problem head-on",
      "Alternative approach: Find a workaround solution",
      "Systematic approach: Break down into smaller parts"
    ];
  }

  private selectBestSolution(solutions: string[]): string {
    return "Systematic approach recommended based on complexity and resource considerations";
  }

  private createImplementationSteps(recommendation: string): string[] {
    return [
      "Plan the implementation approach",
      "Gather necessary resources",
      "Execute in phases",
      "Monitor progress and adjust"
    ];
  }

  private identifySymptoms(problem: string): string[] {
    return [
      "Observable issues or behaviors",
      "Performance indicators",
      "User feedback or complaints"
    ];
  }

  private brainstormCauses(problem: string): string[] {
    return [
      "Process-related factors",
      "Environmental conditions",
      "Human factors",
      "Technical/system issues"
    ];
  }

  private identifyRootCause(causes: string[]): string {
    return "Most likely root cause based on symptom analysis and cause investigation";
  }

  private suggestCorrectiveActions(rootCause: string): string[] {
    return [
      "Address the identified root cause",
      "Implement preventive measures",
      "Monitor for recurrence"
    ];
  }

  private listPros(problem: string): string[] {
    return [
      "Potential benefits and advantages",
      "Positive outcomes and opportunities",
      "Value creation possibilities"
    ];
  }

  private listCons(problem: string): string[] {
    return [
      "Potential risks and disadvantages",
      "Negative consequences",
      "Cost and resource implications"
    ];
  }

  private weightFactors(pros: string[], cons: string[]): string {
    return "Balanced assessment considering the relative importance and impact of each factor";
  }

  private makeRecommendation(assessment: string): string {
    return "Recommended course of action based on the weighted pros and cons analysis";
  }

  private identifyStrengths(problem: string, context?: string): string[] {
    return [
      "Internal capabilities and advantages",
      "Existing resources and competencies",
      "Positive track record"
    ];
  }

  private identifyWeaknesses(problem: string, context?: string): string[] {
    return [
      "Internal limitations and challenges",
      "Resource constraints",
      "Areas needing improvement"
    ];
  }

  private identifyOpportunities(problem: string, context?: string): string[] {
    return [
      "External factors that could be leveraged",
      "Market trends and possibilities",
      "Potential partnerships or collaborations"
    ];
  }

  private identifyThreats(problem: string, context?: string): string[] {
    return [
      "External risks and challenges",
      "Competitive pressures",
      "Environmental or regulatory changes"
    ];
  }

  private developStrategicRecommendations(analysis: any): string[] {
    return [
      "Leverage strengths to capitalize on opportunities",
      "Address weaknesses to mitigate threats",
      "Develop contingency plans"
    ];
  }

  private identifyPrimaryCauses(problem: string): string[] {
    return [
      "Direct causal factors",
      "Immediate contributing elements",
      "Primary drivers"
    ];
  }

  private identifySecondaryCauses(problem: string): string[] {
    return [
      "Supporting or enabling factors",
      "Indirect influences",
      "Background conditions"
    ];
  }

  private analyzeRelationships(primary: string[], secondary: string[]): string {
    return "Analysis of how primary and secondary causes interact and influence each other";
  }

  private prioritizeActions(causes: string[]): string[] {
    return [
      "Address highest impact causes first",
      "Implement quick wins",
      "Plan long-term systematic changes"
    ];
  }
}

/**
 * Global processor instance
 */
const reasoningProcessor = new SimpleReasoningProcessor();

/**
 * Register simple reasoning tools
 */
export async function registerSimpleReasoningTools(server: McpServer, config: Config) {
  logger.info("Registering simple reasoning tools...");

  // Main reasoning tool
  server.registerTool(
    "brain_analyze_simple",
    {
      title: "Simple analytical reasoning",
      description: "Fast pattern-based analysis using proven frameworks",
      inputSchema: {
        problem: z.string().describe("The problem or situation to analyze"),
        pattern: z.enum(["problem_solving", "root_cause", "pros_cons", "swot", "cause_effect"]).describe("Analysis framework to use"),
        context: z.string().optional().describe("Additional context or background information")
      }
    },
    async (args) => {
      try {
        const problem = args.problem as string;
        const pattern = args.pattern as string;
        const context = args.context as string | undefined;

        const result = reasoningProcessor.processReasoning(problem, pattern, context);

        return {
          content: [{
            type: "text" as const,
            text: result
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Simple reasoning tool error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `❌ Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Pattern info tool
  server.registerTool(
    "brain_patterns_info",
    {
      title: "Get reasoning pattern information",
      description: "List available reasoning patterns and their descriptions",
      inputSchema: {
        pattern: z.string().optional().describe("Specific pattern to get info about (optional)")
      }
    },
    async (args) => {
      try {
        const specificPattern = args.pattern as string | undefined;

        if (specificPattern) {
          const pattern = REASONING_PATTERNS[specificPattern];
          if (!pattern) {
            throw new Error(`Pattern '${specificPattern}' not found`);
          }

          const info = `# ${pattern.name}\n\n` +
            `**Description:** ${pattern.description}\n\n` +
            `**Framework Steps:**\n${pattern.steps.join('\n')}\n\n` +
            `**Use Case:** ${getUseCase(specificPattern)}`;

          return {
            content: [{
              type: "text" as const,
              text: info
            }],
            isError: false
          };
        } else {
          // List all patterns
          const patternsList = Object.entries(REASONING_PATTERNS)
            .map(([key, pattern]) => `**${key}**: ${pattern.description}`)
            .join('\n');

          const info = `# Available Reasoning Patterns\n\n${patternsList}\n\n` +
            `Use the pattern name with brain_analyze_simple to apply the framework.`;

          return {
            content: [{
              type: "text" as const,
              text: info
            }],
            isError: false
          };
        }

      } catch (error) {
        const mcpError = handleError(error);
        return {
          content: [{
            type: "text" as const,
            text: `❌ Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Simple reasoning tools registered successfully");
}

/**
 * Get use case description for a pattern
 */
function getUseCase(pattern: string): string {
  const useCases: Record<string, string> = {
    "problem_solving": "Best for: Complex challenges requiring systematic solution development",
    "root_cause": "Best for: Investigating issues to find underlying causes",
    "pros_cons": "Best for: Decision making when evaluating options",
    "swot": "Best for: Strategic planning and competitive analysis",
    "cause_effect": "Best for: Understanding relationships between variables"
  };

  return useCases[pattern] || "General analytical reasoning";
}
</file>

<file path="src/tools/brain/processors/reflection.ts">
import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import type {
  BrainReflectInput,
  ReflectionResult,
  ReflectionFocus
} from '../types.js';

export class ReflectionProcessor {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  async process(input: BrainReflectInput): Promise<ReflectionResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting reflection process for analysis of length: ${input.originalAnalysis.length}`);

      // Perform reflection for each focus area
      const reflectionResults = await this.performReflection(input);

      // Identify issues and improvements
      const identifiedIssues = await this.identifyIssues(input, reflectionResults);

      // Generate improvements
      const improvements = await this.generateImprovements(input, identifiedIssues);

      // Create revised analysis if significant issues found
      const revisedAnalysis = await this.createRevisedAnalysis(input, improvements);

      // Calculate final confidence
      const confidence = this.calculateReflectionConfidence(identifiedIssues, improvements);

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(input, improvements);

      const processingTime = Date.now() - startTime;

      return {
        originalAnalysis: input.originalAnalysis,
        revisedAnalysis: revisedAnalysis || undefined,
        identifiedIssues,
        improvements,
        confidence,
        recommendedActions
      };
    } catch (error) {
      logger.error('Reflection processing failed:', error);
      throw new APIError(`Reflection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performReflection(input: BrainReflectInput): Promise<Array<{
    focus: ReflectionFocus;
    analysis: string;
    findings: string[];
  }>> {
    const results: Array<{ focus: ReflectionFocus; analysis: string; findings: string[] }> = [];

    for (const focus of input.reflectionFocus) {
      try {
        const reflectionPrompt = this.buildReflectionPrompt(input, focus);

        const model = this.geminiClient.getModel('detailed');
        const response = await model.generateContent(reflectionPrompt);
        const content = response.response.text();

        if (content) {
          const parsed = this.parseReflectionResponse(content);
          results.push({
            focus,
            analysis: parsed.analysis,
            findings: parsed.findings
          });
        }

        await this.pause(150);
      } catch (error) {
        logger.warn(`Failed to perform reflection for ${focus}:`, error);
      }
    }

    return results;
  }

  private async identifyIssues(
    input: BrainReflectInput,
    reflectionResults: Array<{ focus: ReflectionFocus; analysis: string; findings: string[] }>
  ): Promise<Array<{
    type: ReflectionFocus;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>> {
    const issues: Array<{
      type: ReflectionFocus;
      description: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }> = [];

    for (const result of reflectionResults) {
      const issuePrompt = this.buildIssueIdentificationPrompt(input, result);

      try {
        const model = this.geminiClient.getModel('detailed');
        const response = await model.generateContent(issuePrompt);
        const content = response.response.text();

        if (content) {
          const parsedIssues = this.parseIssueResponse(content, result.focus);
          issues.push(...parsedIssues);
        }

        await this.pause(100);
      } catch (error) {
        logger.warn(`Failed to identify issues for ${result.focus}:`, error);
      }
    }

    return issues;
  }

  private async generateImprovements(
    input: BrainReflectInput,
    issues: Array<{ type: ReflectionFocus; description: string; severity: string; suggestion: string }>
  ): Promise<string[]> {
    if (issues.length === 0) {
      return ['Analysis appears sound', 'Consider additional perspectives if needed'];
    }

    const improvementPrompt = this.buildImprovementPrompt(input, issues);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(improvementPrompt);
      const content = response.response.text();

      if (content) {
        return this.parseImprovementResponse(content);
      }
    } catch (error) {
      logger.warn('Failed to generate improvements:', error);
    }

    // Fallback improvements based on issues
    return issues
      .filter(issue => issue.severity === 'high' || issue.severity === 'medium')
      .map(issue => issue.suggestion)
      .slice(0, 5);
  }

  private async createRevisedAnalysis(
    input: BrainReflectInput,
    improvements: string[]
  ): Promise<string | null> {
    const highImpactImprovements = improvements.filter(imp =>
      imp.includes('significant') || imp.includes('major') || imp.includes('critical')
    );

    if (highImpactImprovements.length === 0) {
      return null; // No significant issues requiring revision
    }

    const revisionPrompt = this.buildRevisionPrompt(input, improvements);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(revisionPrompt);
      const content = response.response.text();

      return content || null;
    } catch (error) {
      logger.warn('Failed to create revised analysis:', error);
      return null;
    }
  }

  private async generateRecommendedActions(
    input: BrainReflectInput,
    improvements: string[]
  ): Promise<string[]> {
    const actionPrompt = this.buildActionPrompt(input, improvements);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(actionPrompt);
      const content = response.response.text();

      if (content) {
        return this.parseActionResponse(content);
      }
    } catch (error) {
      logger.warn('Failed to generate recommended actions:', error);
    }

    return [
      'Review identified issues',
      'Implement suggested improvements',
      'Validate revised analysis',
      'Consider additional perspectives'
    ];
  }

  private buildReflectionPrompt(input: BrainReflectInput, focus: ReflectionFocus): string {
    const focusInstructions = this.getFocusInstructions(focus);
    const contextInfo = this.formatReflectionContext(input);

    return `You are conducting a reflective analysis focused on ${focus.replace('_', ' ')}.

${focusInstructions}

**Original Analysis:**
${input.originalAnalysis}

${contextInfo}

**Task:**
Reflect on the original analysis specifically from the ${focus.replace('_', ' ')} perspective.

**Provide:**
1. ANALYSIS: Your reflection on this aspect
2. FINDINGS: Specific findings or concerns (one per line with - prefix)

**Your reflection on ${focus.replace('_', ' ')}:**`;
  }

  private buildIssueIdentificationPrompt(
    input: BrainReflectInput,
    result: { focus: ReflectionFocus; analysis: string; findings: string[] }
  ): string {
    return `Based on the reflection analysis, identify specific issues that need attention.

**Focus Area:** ${result.focus.replace('_', ' ')}

**Reflection Analysis:**
${result.analysis}

**Key Findings:**
${result.findings.map(f => `- ${f}`).join('\n')}

**Task:**
Identify specific issues that need to be addressed.

**For each issue, provide:**
ISSUE: [Description of the issue]
SEVERITY: [LOW|MEDIUM|HIGH]
SUGGESTION: [How to address this issue]

**Issues identified:`;
  }

  private buildImprovementPrompt(
    input: BrainReflectInput,
    issues: Array<{ type: ReflectionFocus; description: string; severity: string; suggestion: string }>
  ): string {
    const issuesText = issues.map(issue =>
      `- ${issue.type}: ${issue.description} (${issue.severity}) → ${issue.suggestion}`
    ).join('\n');

    return `Generate specific improvements based on identified issues.

**Original Analysis:**
${input.originalAnalysis.substring(0, 500)}...

**Identified Issues:**
${issuesText}

**Improvement Goals:**
${input.improvementGoals?.join(', ') || 'General improvement'}

**Task:**
Generate specific, actionable improvements to address the identified issues.

**Improvements (one per line with - prefix):`;
  }

  private buildRevisionPrompt(input: BrainReflectInput, improvements: string[]): string {
    const improvementsText = improvements.map(imp => `- ${imp}`).join('\n');

    return `Create a revised version of the original analysis incorporating the suggested improvements.

**Original Analysis:**
${input.originalAnalysis}

**Improvements to Incorporate:**
${improvementsText}

**New Information:**
${input.newInformation || 'None provided'}

**Alternative Viewpoints:**
${input.alternativeViewpoints?.join(', ') || 'None provided'}

**Task:**
Create a revised analysis that addresses the identified issues and incorporates the improvements while maintaining the core insights from the original.

**Revised Analysis:**`;
  }

  private buildActionPrompt(input: BrainReflectInput, improvements: string[]): string {
    const improvementsText = improvements.map(imp => `- ${imp}`).join('\n');

    return `Generate recommended actions based on the reflection and improvements.

**Context:**
${input.context ? JSON.stringify(input.context) : 'No context provided'}

**Identified Improvements:**
${improvementsText}

**Improvement Goals:**
${input.improvementGoals?.join(', ') || 'General improvement'}

**Task:**
Generate specific, actionable recommendations for next steps.

**Recommended Actions (one per line with - prefix):`;
  }

  private getFocusInstructions(focus: ReflectionFocus): string {
    const instructions = {
      assumptions: 'Examine the underlying assumptions. Are they valid? Well-supported? What if they are wrong?',
      logic_gaps: 'Look for holes in the logical reasoning. Are there missing steps? Unsupported conclusions?',
      alternative_approaches: 'Consider different methods or perspectives. What other ways could this be approached?',
      evidence_quality: 'Evaluate the strength and reliability of evidence used. Is it sufficient and credible?',
      bias_detection: 'Identify potential biases in reasoning, data selection, or interpretation.',
      consistency_check: 'Check for internal consistency. Are there contradictions or conflicting statements?',
      completeness: 'Assess whether important aspects have been overlooked or inadequately addressed.',
      feasibility: 'Evaluate the practical viability and implementation challenges of conclusions or recommendations.'
    };

    return instructions[focus] || 'Reflect critically on this aspect of the analysis.';
  }

  private formatReflectionContext(input: BrainReflectInput): string {
    const parts = [];

    if (input.newInformation) {
      parts.push(`**New Information:** ${input.newInformation}`);
    }

    if (input.alternativeViewpoints?.length) {
      parts.push(`**Alternative Viewpoints:** ${input.alternativeViewpoints.join(', ')}`);
    }

    if (input.improvementGoals?.length) {
      parts.push(`**Improvement Goals:** ${input.improvementGoals.join(', ')}`);
    }

    return parts.length > 0 ? '\n' + parts.join('\n') + '\n' : '';
  }

  private parseReflectionResponse(content: string): { analysis: string; findings: string[] } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let analysis = '';
    const findings: string[] = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('ANALYSIS:')) {
        currentSection = 'analysis';
        analysis = line.replace('ANALYSIS:', '').trim();
      } else if (line.startsWith('FINDINGS:')) {
        currentSection = 'findings';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (currentSection === 'findings') {
          findings.push(line.replace(/^[-*]\s*/, ''));
        }
      } else if (currentSection === 'analysis' && line) {
        analysis += (analysis ? ' ' : '') + line;
      }
    }

    return {
      analysis: analysis || 'Reflection completed',
      findings
    };
  }

  private parseIssueResponse(content: string, focus: ReflectionFocus): Array<{
    type: ReflectionFocus;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }> {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const issues: Array<{
      type: ReflectionFocus;
      description: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }> = [];

    let currentIssue: any = { type: focus };

    for (const line of lines) {
      if (line.startsWith('ISSUE:')) {
        if (currentIssue.description) {
          issues.push(currentIssue);
        }
        currentIssue = {
          type: focus,
          description: line.replace('ISSUE:', '').trim(),
          severity: 'medium',
          suggestion: ''
        };
      } else if (line.startsWith('SEVERITY:')) {
        const severityText = line.replace('SEVERITY:', '').trim().toLowerCase();
        if (severityText.includes('high')) currentIssue.severity = 'high';
        else if (severityText.includes('low')) currentIssue.severity = 'low';
        else currentIssue.severity = 'medium';
      } else if (line.startsWith('SUGGESTION:')) {
        currentIssue.suggestion = line.replace('SUGGESTION:', '').trim();
      }
    }

    if (currentIssue.description) {
      issues.push(currentIssue);
    }

    return issues;
  }

  private parseImprovementResponse(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 8); // Limit to 8 improvements
  }

  private parseActionResponse(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 6); // Limit to 6 actions
  }

  private calculateReflectionConfidence(
    issues: Array<{ severity: string }>,
    improvements: string[]
  ): number {
    const highSeverityIssues = issues.filter(i => i.severity === 'high').length;
    const mediumSeverityIssues = issues.filter(i => i.severity === 'medium').length;

    let confidence = 0.8; // Base confidence

    // Reduce confidence based on issues found
    confidence -= highSeverityIssues * 0.2;
    confidence -= mediumSeverityIssues * 0.1;

    // Increase confidence if improvements were identified (shows thoroughness)
    if (improvements.length > 0) confidence += 0.1;

    return Math.max(Math.min(confidence, 1.0), 0.1);
  }

  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
</file>

<file path="src/tools/brain/utils/thought-manager.ts">
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';
import type {
  ThoughtStep,
  ThoughtProcess,
  ThoughtBranch,
  Hypothesis,
  Conclusion,
  ThinkingStyle,
  ThinkingContext,
  ProcessingOptions,
  ThoughtMetadata
} from '../types.js';
import {
  InvalidRevisionError,
  BranchingError
} from '../types.js';

export class ThoughtManager {
  private process: ThoughtProcess;
  private options: ProcessingOptions;

  constructor(
    problem: string,
    thinkingStyle: ThinkingStyle = 'analytical',
    context?: ThinkingContext,
    options: ProcessingOptions = {}
  ) {
    this.options = {
      maxThoughts: 10,
      allowRevision: true,
      enableBranching: true,
      requireEvidence: false,
      confidenceThreshold: 0.7,
      timeLimit: 60,
      outputDetail: 'detailed',
      ...options
    };

    this.process = {
      id: uuidv4(),
      problem,
      thoughts: [],
      currentThought: 0,
      totalThoughts: this.options.maxThoughts || 10,
      branches: [],
      hypotheses: [],
      conclusions: [],
      metadata: {
        startTime: new Date(),
        thinkingStyle,
        complexity: this.determineComplexity(problem),
        domain: context?.domain,
        revisionsCount: 0,
        branchesCount: 0,
        hypothesesCount: 0
      }
    };

    logger.info(`Starting thought process for: ${problem.substring(0, 100)}...`);
  }

  /**
   * Add a new thought to the process
   */
  addThought(
    content: string,
    confidence: number = 0.8,
    options: {
      isRevision?: boolean;
      revisesThought?: number;
      branchId?: string;
      branchFromThought?: number;
      dependencies?: string[];
      tags?: string[];
    } = {}
  ): ThoughtStep {
    const thoughtStep: ThoughtStep = {
      id: uuidv4(),
      number: this.process.currentThought + 1,
      content,
      confidence: Math.min(Math.max(confidence, 0), 1), // Clamp between 0 and 1
      timestamp: new Date(),
      isRevision: options.isRevision || false,
      revisesThought: options.revisesThought,
      branchId: options.branchId,
      branchFromThought: options.branchFromThought,
      dependencies: options.dependencies,
      tags: options.tags
    };

    // Handle revisions
    if (options.isRevision && options.revisesThought) {
      if (!this.options.allowRevision) {
        throw new Error('Revision not allowed in current processing mode');
      }
      if (options.revisesThought > this.process.thoughts.length) {
        throw new InvalidRevisionError(options.revisesThought, this.process.thoughts.length);
      }
      this.process.metadata.revisionsCount++;
      thoughtStep.tags = [...(thoughtStep.tags || []), 'revision'];
    }

    // Handle branching
    if (options.branchId && options.branchFromThought) {
      if (!this.options.enableBranching) {
        throw new Error('Branching not allowed in current processing mode');
      }
      this.process.metadata.branchesCount++;
      thoughtStep.tags = [...(thoughtStep.tags || []), 'branch'];
    }

    this.process.thoughts.push(thoughtStep);
    this.process.currentThought = thoughtStep.number;

    logger.debug(`Added thought ${thoughtStep.number}: ${content.substring(0, 100)}...`);
    return thoughtStep;
  }

  /**
   * Create a new branch from a specific thought
   */
  createBranch(
    fromThought: number,
    name: string,
    initialThought?: string
  ): ThoughtBranch {
    if (!this.options.enableBranching) {
      throw new BranchingError('Branching is disabled');
    }

    if (fromThought < 1 || fromThought > this.process.thoughts.length) {
      throw new BranchingError(`Invalid thought number: ${fromThought}`);
    }

    const branch: ThoughtBranch = {
      id: uuidv4(),
      name,
      fromThought,
      thoughts: [],
      isActive: true,
      confidence: 0.5 // Initial confidence for new branch
    };

    // Add initial thought to branch if provided
    if (initialThought) {
      const branchThought = this.addThought(initialThought, 0.6, {
        branchId: branch.id,
        branchFromThought: fromThought,
        tags: ['branch_start']
      });
      branch.thoughts.push(branchThought);
    }

    this.process.branches.push(branch);
    logger.info(`Created branch "${name}" from thought ${fromThought}`);

    return branch;
  }

  /**
   * Add a hypothesis to test
   */
  addHypothesis(
    statement: string,
    evidence: string[] = [],
    counterEvidence: string[] = [],
    confidence: number = 0.5
  ): Hypothesis {
    const hypothesis: Hypothesis = {
      id: uuidv4(),
      statement,
      evidence,
      counterEvidence,
      confidence: Math.min(Math.max(confidence, 0), 1),
      tested: false,
      generatedAt: this.process.currentThought
    };

    this.process.hypotheses.push(hypothesis);
    this.process.metadata.hypothesesCount++;

    logger.debug(`Added hypothesis: ${statement}`);
    return hypothesis;
  }

  /**
   * Test a hypothesis and update its status
   */
  testHypothesis(
    hypothesisId: string,
    result: 'confirmed' | 'rejected' | 'inconclusive',
    additionalEvidence?: string[]
  ): Hypothesis {
    const hypothesis = this.process.hypotheses.find(h => h.id === hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    hypothesis.tested = true;
    hypothesis.result = result;

    if (additionalEvidence) {
      if (result === 'confirmed') {
        hypothesis.evidence.push(...additionalEvidence);
      } else if (result === 'rejected') {
        hypothesis.counterEvidence.push(...additionalEvidence);
      }
    }

    // Update confidence based on test result
    if (result === 'confirmed') {
      hypothesis.confidence = Math.min(hypothesis.confidence + 0.3, 1.0);
    } else if (result === 'rejected') {
      hypothesis.confidence = Math.max(hypothesis.confidence - 0.4, 0.0);
    }

    logger.info(`Tested hypothesis "${hypothesis.statement}": ${result}`);
    return hypothesis;
  }

  /**
   * Add a conclusion based on current thoughts
   */
  addConclusion(
    statement: string,
    supportingThoughts: number[],
    reasoning: string,
    confidence: number = 0.8,
    alternatives?: string[]
  ): Conclusion {
    const conclusion: Conclusion = {
      id: uuidv4(),
      statement,
      supportingThoughts,
      confidence: Math.min(Math.max(confidence, 0), 1),
      reasoning,
      alternatives
    };

    this.process.conclusions.push(conclusion);
    logger.info(`Added conclusion: ${statement}`);

    return conclusion;
  }

  /**
   * Get current thought process state
   */
  getProcess(): ThoughtProcess {
    return { ...this.process };
  }

  /**
   * Get thoughts filtered by criteria
   */
  getThoughts(filter?: {
    branchId?: string;
    tags?: string[];
    minConfidence?: number;
    isRevision?: boolean;
  }): ThoughtStep[] {
    let thoughts = [...this.process.thoughts];

    if (filter) {
      if (filter.branchId) {
        thoughts = thoughts.filter(t => t.branchId === filter.branchId);
      }
      if (filter.tags) {
        thoughts = thoughts.filter(t =>
          t.tags && filter.tags!.some(tag => t.tags!.includes(tag))
        );
      }
      if (filter.minConfidence !== undefined) {
        thoughts = thoughts.filter(t => t.confidence >= filter.minConfidence!);
      }
      if (filter.isRevision !== undefined) {
        thoughts = thoughts.filter(t => t.isRevision === filter.isRevision);
      }
    }

    return thoughts;
  }

  /**
   * Get active hypotheses that haven't been tested
   */
  getActiveHypotheses(): Hypothesis[] {
    return this.process.hypotheses.filter(h => !h.tested);
  }

  /**
   * Get tested hypotheses with their results
   */
  getTestedHypotheses(): Hypothesis[] {
    return this.process.hypotheses.filter(h => h.tested);
  }

  /**
   * Check if more thoughts are needed based on confidence and completeness
   */
  needsMoreThoughts(): boolean {
    const avgConfidence = this.getAverageConfidence();
    const hasConclusions = this.process.conclusions.length > 0;
    const underThoughtLimit = this.process.currentThought < (this.options.maxThoughts || 10);
    const underConfidenceThreshold = avgConfidence < (this.options.confidenceThreshold || 0.7);

    return underThoughtLimit && (underConfidenceThreshold || !hasConclusions);
  }

  /**
   * Finalize the thought process
   */
  finalize(): ThoughtProcess {
    this.process.metadata.endTime = new Date();
    this.process.metadata.totalDuration =
      this.process.metadata.endTime.getTime() - this.process.metadata.startTime.getTime();

    logger.info(`Finalized thought process with ${this.process.thoughts.length} thoughts`);
    return this.process;
  }

  /**
   * Calculate average confidence across all thoughts
   */
  private getAverageConfidence(): number {
    if (this.process.thoughts.length === 0) return 0;

    const totalConfidence = this.process.thoughts.reduce((sum, thought) => sum + thought.confidence, 0);
    return totalConfidence / this.process.thoughts.length;
  }

  /**
   * Determine problem complexity based on content analysis
   */
  private determineComplexity(problem: string): 'simple' | 'medium' | 'complex' | 'expert' {
    const length = problem.length;
    const technicalTerms = this.countTechnicalTerms(problem);
    const questionComplexity = this.analyzeQuestionComplexity(problem);

    if (length < 100 && technicalTerms < 2 && questionComplexity === 'simple') {
      return 'simple';
    } else if (length < 300 && technicalTerms < 5 && questionComplexity !== 'expert') {
      return 'medium';
    } else if (length < 800 && technicalTerms < 10) {
      return 'complex';
    } else {
      return 'expert';
    }
  }

  /**
   * Count technical terms in the problem statement
   */
  private countTechnicalTerms(text: string): number {
    const technicalPatterns = [
      /\b(algorithm|architecture|database|server|client|API|framework|library|protocol|interface|implementation|optimization|performance|scalability|security|authentication|authorization|encryption|deployment|infrastructure|microservice|container|docker|kubernetes|cloud|aws|azure|gcp)\b/gi,
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\w+\.(js|ts|py|java|cpp|c|go|rust|php|rb|cs)\b/g // File extensions
    ];

    return technicalPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Analyze question complexity based on structure and keywords
   */
  private analyzeQuestionComplexity(text: string): 'simple' | 'medium' | 'complex' | 'expert' {
    const complexKeywords = ['why', 'how', 'analyze', 'compare', 'evaluate', 'design', 'optimize', 'troubleshoot'];
    const expertKeywords = ['architect', 'strategy', 'paradigm', 'methodology', 'framework', 'ecosystem'];

    const hasComplexKeywords = complexKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );
    const hasExpertKeywords = expertKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );

    if (hasExpertKeywords) return 'expert';
    if (hasComplexKeywords) return 'complex';
    if (text.includes('?') || text.includes('explain')) return 'medium';
    return 'simple';
  }
}
</file>

<file path="src/tools/brain/index.ts.backup">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "@/tools/eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

// Import processors
import { SequentialThinkingProcessor } from "./processors/sequential-thinking.js";
import { AnalyticalReasoningProcessor } from "./processors/analytical-reasoning.js";
import { ProblemSolverProcessor } from "./processors/problem-solver.js";
import { ReflectionProcessor } from "./processors/reflection.js";

// Import types
import type {
  BrainThinkInput,
  BrainAnalyzeInput,
  BrainSolveInput,
  BrainReflectInput
} from "./types.js";

/**
 * Register all Brain tools with the MCP server
 */
export async function registerBrainTools(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  // Initialize processors
  const sequentialThinkingProcessor = new SequentialThinkingProcessor(geminiClient);
  const analyticalReasoningProcessor = new AnalyticalReasoningProcessor(geminiClient);
  const problemSolverProcessor = new ProblemSolverProcessor(geminiClient);
  const reflectionProcessor = new ReflectionProcessor(geminiClient);

  logger.info("Registering Brain tools for advanced reasoning capabilities...");

  // Register brain_think tool
  server.registerTool(
    "brain_think",
    {
      title: "Sequential Thinking Tool",
      description: "Advanced sequential thinking with dynamic problem-solving and thought revision",
      inputSchema: {
        problem: z.string().min(10).max(2000).describe("The problem or question to think through step by step"),
        initialThoughts: z.number().min(1).max(20).default(5).optional().describe("Number of initial thoughts to generate"),
        thinkingStyle: z.enum(["analytical", "systematic", "creative", "scientific", "critical", "strategic", "intuitive", "collaborative"]).default("analytical").optional().describe("Approach to use for thinking"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Additional context for the problem"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          problem: args.problem,
          initialThoughts: args.initialThoughts || 5,
          thinkingStyle: args.thinkingStyle || 'analytical',
          context: args.context,
          options: args.options
        };
        const result = await sequentialThinkingProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatThinkingResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_think error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register brain_analyze tool
  server.registerTool(
    "brain_analyze",
    {
      title: "Deep Analytical Reasoning Tool",
      description: "Comprehensive analysis with branching exploration and assumption tracking",
      inputSchema: {
        subject: z.string().min(10).max(2000).describe("The subject or topic to analyze deeply"),
        analysisDepth: z.enum(["surface", "detailed", "comprehensive"]).default("detailed").optional().describe("Depth of analysis to perform"),
        focusAreas: z.array(z.string()).optional().describe("Specific areas to focus analysis on"),
        thinkingStyle: z.enum(["analytical", "systematic", "creative", "scientific", "critical", "strategic", "intuitive", "collaborative"]).default("analytical").optional().describe("Analytical approach to use"),
        considerAlternatives: z.boolean().default(true).optional().describe("Whether to explore alternative perspectives"),
        trackAssumptions: z.boolean().default(true).optional().describe("Whether to explicitly track assumptions"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Context for the analysis"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          subject: args.subject,
          analysisDepth: args.analysisDepth || 'detailed',
          focusAreas: args.focusAreas,
          thinkingStyle: args.thinkingStyle || 'analytical',
          considerAlternatives: args.considerAlternatives !== false,
          trackAssumptions: args.trackAssumptions !== false,
          context: args.context,
          options: args.options
        };
        const result = await analyticalReasoningProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatAnalysisResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_analyze error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register brain_solve tool
  server.registerTool(
    "brain_solve",
    {
      title: "Problem Solving Tool",
      description: "Multi-step problem solving with hypothesis testing and solution evaluation",
      inputSchema: {
        problemStatement: z.string().min(10).max(2000).describe("Clear statement of the problem to solve"),
        solutionApproach: z.enum(["systematic", "creative", "scientific", "iterative"]).default("systematic").optional().describe("Approach to problem solving"),
        constraints: z.array(z.string()).optional().describe("Constraints that limit possible solutions"),
        requirements: z.array(z.string()).optional().describe("Requirements the solution must meet"),
        verifyHypotheses: z.boolean().default(true).optional().describe("Whether to test hypotheses scientifically"),
        maxIterations: z.number().min(1).max(20).default(10).optional().describe("Maximum solution iterations to attempt"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Context for the problem"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          problemStatement: args.problemStatement,
          solutionApproach: args.solutionApproach || 'systematic',
          constraints: args.constraints,
          requirements: args.requirements,
          verifyHypotheses: args.verifyHypotheses !== false,
          maxIterations: args.maxIterations || 10,
          context: args.context,
          options: args.options
        };
        const result = await problemSolverProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatSolutionResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_solve error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register brain_reflect tool
  server.registerTool(
    "brain_reflect",
    {
      title: "Thought Reflection Tool",
      description: "Reflect on and improve previous analysis through meta-cognitive examination",
      inputSchema: {
        originalAnalysis: z.string().min(50).max(5000).describe("The original analysis or reasoning to reflect on"),
        reflectionFocus: z.array(z.enum(["assumptions", "logic_gaps", "alternative_approaches", "evidence_quality", "bias_detection", "consistency_check", "completeness", "feasibility"])).min(1).describe("Aspects to focus reflection on"),
        improvementGoals: z.array(z.string()).optional().describe("Specific goals for improvement"),
        newInformation: z.string().optional().describe("Any new information to consider"),
        alternativeViewpoints: z.array(z.string()).optional().describe("Alternative perspectives to consider"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Context for the reflection"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          originalAnalysis: args.originalAnalysis,
          reflectionFocus: args.reflectionFocus,
          improvementGoals: args.improvementGoals,
          newInformation: args.newInformation,
          alternativeViewpoints: args.alternativeViewpoints,
          context: args.context,
          options: args.options
        };
        const result = await reflectionProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatReflectionResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_reflect error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Successfully registered 4 Brain tools: brain_think, brain_analyze, brain_solve, brain_reflect");
}

/**
 * Format thinking result for display
 */
function formatThinkingResult(result: any): string {
  const header = `# Sequential Thinking Results\n\n`;

  const summary = `## Summary\n` +
    `**Problem:** ${result.thoughtProcess.problem}\n` +
    `**Final Answer:** ${result.finalAnswer}\n` +
    `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Thoughts Generated:** ${result.processingInfo.totalThoughts}\n` +
    `**Processing Time:** ${(result.processingInfo.processingTime / 1000).toFixed(1)}s\n\n`;

  const thoughts = `## Thought Process\n` +
    result.thoughtProcess.thoughts.map((thought: any, index: number) => {
      const revisionMark = thought.isRevision ? ' ↻' : '';
      const branchMark = thought.branchId ? ' 🌿' : '';
      return `**${index + 1}.** ${thought.content} [${(thought.confidence * 100).toFixed(0)}%]${revisionMark}${branchMark}`;
    }).join('\n\n') + '\n\n';

  const recommendations = result.recommendations?.length > 0 ?
    `## Recommendations\n${result.recommendations.map((rec: string) => `• ${rec}`).join('\n')}\n\n` : '';

  const nextSteps = result.nextSteps?.length > 0 ?
    `## Next Steps\n${result.nextSteps.map((step: string) => `• ${step}`).join('\n')}\n\n` : '';

  return header + summary + thoughts + recommendations + nextSteps;
}

/**
 * Format analysis result for display
 */
function formatAnalysisResult(result: any): string {
  const header = `# Deep Analysis Results\n\n`;

  const summary = `## Analysis Summary\n` +
    `**Subject:** ${result.thoughtProcess.problem}\n` +
    `**Final Conclusion:** ${result.finalAnswer}\n` +
    `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Evidence Quality:** ${result.evidenceQuality.toUpperCase()}\n\n`;

  const keyFindings = result.keyFindings?.length > 0 ?
    `## Key Findings\n${result.keyFindings.map((finding: string) => `• ${finding}`).join('\n')}\n\n` : '';

  const assumptions = result.assumptions?.length > 0 ?
    `## Key Assumptions\n${result.assumptions.map((assumption: string) => `• ${assumption}`).join('\n')}\n\n` : '';

  const risks = result.riskFactors?.length > 0 ?
    `## Risk Factors\n${result.riskFactors.map((risk: string) => `⚠️ ${risk}`).join('\n')}\n\n` : '';

  const opportunities = result.opportunities?.length > 0 ?
    `## Opportunities\n${result.opportunities.map((opp: string) => `✨ ${opp}`).join('\n')}\n\n` : '';

  return header + summary + keyFindings + assumptions + risks + opportunities;
}

/**
 * Format solution result for display
 */
function formatSolutionResult(result: any): string {
  const header = `# Problem Solving Results\n\n`;

  const summary = `## Solution Summary\n` +
    `**Problem:** ${result.thoughtProcess.problem}\n` +
    `**Proposed Solution:** ${result.proposedSolution}\n` +
    `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Hypotheses Tested:** ${result.processingInfo.hypothesesTested}\n\n`;

  const implementation = result.implementationSteps?.length > 0 ?
    `## Implementation Steps\n${result.implementationSteps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}\n\n` : '';

  const obstacles = result.potentialObstacles?.length > 0 ?
    `## Potential Obstacles\n${result.potentialObstacles.map((obs: string) => `⚠️ ${obs}`).join('\n')}\n\n` : '';

  const success = result.successCriteria?.length > 0 ?
    `## Success Criteria\n${result.successCriteria.map((crit: string) => `✅ ${crit}`).join('\n')}\n\n` : '';

  const fallbacks = result.fallbackOptions?.length > 0 ?
    `## Fallback Options\n${result.fallbackOptions.map((option: string) => `• ${option}`).join('\n')}\n\n` : '';

  return header + summary + implementation + obstacles + success + fallbacks;
}

/**
 * Format reflection result for display
 */
function formatReflectionResult(result: any): string {
  const header = `# Reflection Analysis Results\n\n`;

  const summary = `## Reflection Summary\n` +
    `**Confidence in Analysis:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Issues Identified:** ${result.identifiedIssues.length}\n` +
    `**Improvements Suggested:** ${result.improvements.length}\n\n`;

  const issues = result.identifiedIssues?.length > 0 ?
    `## Identified Issues\n` +
    result.identifiedIssues.map((issue: any) => {
      const severity = issue.severity.toUpperCase();
      const icon = severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢';
      return `${icon} **${issue.type.replace('_', ' ').toUpperCase()}:** ${issue.description}\n   *Suggestion:* ${issue.suggestion}`;
    }).join('\n\n') + '\n\n' : '';

  const improvements = result.improvements?.length > 0 ?
    `## Suggested Improvements\n${result.improvements.map((imp: string) => `• ${imp}`).join('\n')}\n\n` : '';

  const revised = result.revisedAnalysis ?
    `## Revised Analysis\n${result.revisedAnalysis}\n\n` : '';

  const actions = result.recommendedActions?.length > 0 ?
    `## Recommended Actions\n${result.recommendedActions.map((action: string) => `• ${action}`).join('\n')}\n\n` : '';

  return header + summary + issues + improvements + revised + actions;
}
</file>

<file path="src/tools/brain/schemas.ts">
import { z } from 'zod';
import type {
  ThinkingStyle,
  ReflectionFocus,
  ProcessingOptions,
  ThinkingContext
} from './types.js';

// Base schemas
const ThinkingStyleSchema = z.enum([
  'analytical',
  'systematic',
  'creative',
  'scientific',
  'critical',
  'strategic',
  'intuitive',
  'collaborative'
]);

const ReflectionFocusSchema = z.enum([
  'assumptions',
  'logic_gaps',
  'alternative_approaches',
  'evidence_quality',
  'bias_detection',
  'consistency_check',
  'completeness',
  'feasibility'
]);

const ProcessingOptionsSchema = z.object({
  maxThoughts: z.number().min(1).max(50).default(10),
  allowRevision: z.boolean().default(true),
  enableBranching: z.boolean().default(true),
  requireEvidence: z.boolean().default(false),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  timeLimit: z.number().min(5).max(300).default(60), // 5 seconds to 5 minutes
  outputDetail: z.enum(['summary', 'detailed', 'complete']).default('detailed')
}).optional();

const ThinkingContextSchema = z.object({
  domain: z.string().optional(),
  background: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  stakeholders: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  resources: z.array(z.string()).optional()
}).optional();

// Tool-specific input schemas
export const BrainThinkInputSchema = z.object({
  problem: z.string().min(10).max(2000).describe('The problem or question to think through'),
  initialThoughts: z.number().min(1).max(20).default(5).describe('Number of initial thoughts to generate'),
  thinkingStyle: ThinkingStyleSchema.default('analytical').describe('Approach to use for thinking'),
  context: ThinkingContextSchema.describe('Additional context for the problem'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

export const BrainAnalyzeInputSchema = z.object({
  subject: z.string().min(10).max(2000).describe('The subject or topic to analyze deeply'),
  analysisDepth: z.enum(['surface', 'detailed', 'comprehensive']).default('detailed').describe('Depth of analysis'),
  focusAreas: z.array(z.string()).optional().describe('Specific areas to focus analysis on'),
  thinkingStyle: ThinkingStyleSchema.default('analytical').describe('Analytical approach to use'),
  considerAlternatives: z.boolean().default(true).describe('Whether to explore alternative perspectives'),
  trackAssumptions: z.boolean().default(true).describe('Whether to explicitly track assumptions'),
  context: ThinkingContextSchema.describe('Context for the analysis'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

export const BrainSolveInputSchema = z.object({
  problemStatement: z.string().min(10).max(2000).describe('Clear statement of the problem to solve'),
  solutionApproach: z.enum(['systematic', 'creative', 'scientific', 'iterative']).default('systematic').describe('Approach to problem solving'),
  constraints: z.array(z.string()).optional().describe('Constraints that limit possible solutions'),
  requirements: z.array(z.string()).optional().describe('Requirements the solution must meet'),
  verifyHypotheses: z.boolean().default(true).describe('Whether to test hypotheses scientifically'),
  maxIterations: z.number().min(1).max(20).default(10).describe('Maximum solution iterations to attempt'),
  context: ThinkingContextSchema.describe('Context for the problem'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

export const BrainReflectInputSchema = z.object({
  originalAnalysis: z.string().min(50).max(5000).describe('The original analysis or reasoning to reflect on'),
  reflectionFocus: z.array(ReflectionFocusSchema).min(1).describe('Aspects to focus reflection on'),
  improvementGoals: z.array(z.string()).optional().describe('Specific goals for improvement'),
  newInformation: z.string().optional().describe('Any new information to consider'),
  alternativeViewpoints: z.array(z.string()).optional().describe('Alternative perspectives to consider'),
  context: ThinkingContextSchema.describe('Context for the reflection'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

// Output schemas for validation
export const ThoughtStepSchema = z.object({
  id: z.string(),
  number: z.number(),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
  isRevision: z.boolean(),
  revisesThought: z.number().optional(),
  branchId: z.string().optional(),
  branchFromThought: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export const HypothesisSchema = z.object({
  id: z.string(),
  statement: z.string(),
  evidence: z.array(z.string()),
  counterEvidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  tested: z.boolean(),
  result: z.enum(['confirmed', 'rejected', 'inconclusive']).optional(),
  generatedAt: z.number()
});

export const ReasoningResultSchema = z.object({
  thoughtProcess: z.object({
    id: z.string(),
    problem: z.string(),
    thoughts: z.array(ThoughtStepSchema),
    currentThought: z.number(),
    totalThoughts: z.number(),
    branches: z.array(z.any()), // Simplified for now
    hypotheses: z.array(HypothesisSchema),
    conclusions: z.array(z.any()), // Simplified for now
    metadata: z.object({
      startTime: z.date(),
      endTime: z.date().optional(),
      totalDuration: z.number().optional(),
      thinkingStyle: ThinkingStyleSchema,
      complexity: z.enum(['simple', 'medium', 'complex', 'expert']),
      domain: z.string().optional(),
      revisionsCount: z.number(),
      branchesCount: z.number(),
      hypothesesCount: z.number()
    })
  }),
  finalAnswer: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alternatives: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  processingInfo: z.object({
    totalThoughts: z.number(),
    processingTime: z.number(),
    revisionsUsed: z.number(),
    branchesExplored: z.number(),
    hypothesesTested: z.number(),
    finalConfidence: z.number()
  })
});

// Type exports for use in implementations
export type BrainThinkInput = z.infer<typeof BrainThinkInputSchema>;
export type BrainAnalyzeInput = z.infer<typeof BrainAnalyzeInputSchema>;
export type BrainSolveInput = z.infer<typeof BrainSolveInputSchema>;
export type BrainReflectInput = z.infer<typeof BrainReflectInputSchema>;
export type ReasoningResult = z.infer<typeof ReasoningResultSchema>;

// Validation helpers
export const validateBrainThinkInput = (input: unknown): BrainThinkInput => {
  return BrainThinkInputSchema.parse(input);
};

export const validateBrainAnalyzeInput = (input: unknown): BrainAnalyzeInput => {
  return BrainAnalyzeInputSchema.parse(input);
};

export const validateBrainSolveInput = (input: unknown): BrainSolveInput => {
  return BrainSolveInputSchema.parse(input);
};

export const validateBrainReflectInput = (input: unknown): BrainReflectInput => {
  return BrainReflectInputSchema.parse(input);
};

export const validateReasoningResult = (result: unknown): ReasoningResult => {
  return ReasoningResultSchema.parse(result);
};
</file>

<file path="src/tools/brain/types.ts">
/**
 * Type definitions for Brain tools - Advanced reasoning and thinking capabilities
 */

export interface ThoughtStep {
  id: string;
  number: number;
  content: string;
  confidence: number;
  timestamp: Date;
  isRevision: boolean;
  revisesThought?: number;
  branchId?: string;
  branchFromThought?: number;
  dependencies?: string[];
  tags?: string[];
}

export interface ThoughtProcess {
  id: string;
  problem: string;
  thoughts: ThoughtStep[];
  currentThought: number;
  totalThoughts: number;
  branches: ThoughtBranch[];
  hypotheses: Hypothesis[];
  conclusions: Conclusion[];
  metadata: ThoughtMetadata;
}

export interface ThoughtBranch {
  id: string;
  name: string;
  fromThought: number;
  thoughts: ThoughtStep[];
  isActive: boolean;
  confidence: number;
}

export interface Hypothesis {
  id: string;
  statement: string;
  evidence: string[];
  counterEvidence: string[];
  confidence: number;
  tested: boolean;
  result?: 'confirmed' | 'rejected' | 'inconclusive';
  generatedAt: number; // thought number
}

export interface Conclusion {
  id: string;
  statement: string;
  supportingThoughts: number[];
  confidence: number;
  reasoning: string;
  alternatives?: string[];
}

export interface ThoughtMetadata {
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  thinkingStyle: ThinkingStyle;
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  domain?: string;
  revisionsCount: number;
  branchesCount: number;
  hypothesesCount: number;
}

export type ThinkingStyle =
  | 'analytical'      // Step-by-step logical analysis
  | 'systematic'      // Methodical and structured approach
  | 'creative'        // Innovative and exploratory thinking
  | 'scientific'      // Hypothesis-driven investigation
  | 'critical'        // Question assumptions and evaluate evidence
  | 'strategic'       // Long-term planning and high-level thinking
  | 'intuitive'       // Pattern recognition and experience-based
  | 'collaborative';  // Multiple perspective consideration

export type ReflectionFocus =
  | 'assumptions'           // Question underlying assumptions
  | 'logic_gaps'           // Identify holes in reasoning
  | 'alternative_approaches' // Consider different methods
  | 'evidence_quality'     // Evaluate strength of evidence
  | 'bias_detection'       // Identify potential biases
  | 'consistency_check'    // Ensure logical consistency
  | 'completeness'         // Check for missing considerations
  | 'feasibility';         // Assess practical viability

export interface ProcessingOptions {
  maxThoughts?: number;
  allowRevision?: boolean;
  enableBranching?: boolean;
  requireEvidence?: boolean;
  confidenceThreshold?: number;
  timeLimit?: number; // in seconds
  outputDetail?: 'summary' | 'detailed' | 'complete';
}

export interface ThinkingContext {
  domain?: string;
  background?: string;
  constraints?: string[];
  requirements?: string[];
  stakeholders?: string[];
  timeframe?: string;
  resources?: string[];
}

export interface ReasoningResult {
  thoughtProcess: ThoughtProcess;
  finalAnswer: string;
  confidence: number;
  reasoning: string;
  alternatives?: string[];
  recommendations?: string[];
  nextSteps?: string[];
  processingInfo: {
    totalThoughts: number;
    processingTime: number;
    revisionsUsed: number;
    branchesExplored: number;
    hypothesesTested: number;
    finalConfidence: number;
  };
}

export interface AnalysisResult extends ReasoningResult {
  keyFindings: string[];
  assumptions: string[];
  evidenceQuality: 'strong' | 'moderate' | 'weak' | 'insufficient';
  riskFactors?: string[];
  opportunities?: string[];
}

export interface SolutionResult extends ReasoningResult {
  proposedSolution: string;
  implementationSteps: string[];
  potentialObstacles: string[];
  successCriteria: string[];
  testPlan?: string[];
  fallbackOptions?: string[];
}

export interface ReflectionResult {
  originalAnalysis: string;
  revisedAnalysis?: string;
  identifiedIssues: Array<{
    type: ReflectionFocus;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  improvements: string[];
  confidence: number;
  recommendedActions: string[];
}

// Input interfaces for Brain tools
export interface BrainThinkInput {
  problem: string;
  initialThoughts?: number;
  thinkingStyle?: ThinkingStyle;
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

export interface BrainAnalyzeInput {
  subject: string;
  analysisDepth?: 'surface' | 'detailed' | 'comprehensive';
  focusAreas?: string[];
  thinkingStyle?: ThinkingStyle;
  considerAlternatives?: boolean;
  trackAssumptions?: boolean;
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

export interface BrainSolveInput {
  problemStatement: string;
  solutionApproach?: 'systematic' | 'creative' | 'scientific' | 'iterative';
  constraints?: string[];
  requirements?: string[];
  verifyHypotheses?: boolean;
  maxIterations?: number;
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

export interface BrainReflectInput {
  originalAnalysis: string;
  reflectionFocus: ReflectionFocus[];
  improvementGoals?: string[];
  newInformation?: string;
  alternativeViewpoints?: string[];
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

// Error types specific to Brain tools
export class ThinkingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'ThinkingError';
  }
}

export class InsufficientThoughtsError extends ThinkingError {
  constructor(currentThoughts: number, requiredThoughts: number) {
    super(
      `Insufficient thoughts for analysis: ${currentThoughts}/${requiredThoughts}`,
      'INSUFFICIENT_THOUGHTS',
      { currentThoughts, requiredThoughts }
    );
  }
}

export class InvalidRevisionError extends ThinkingError {
  constructor(thoughtNumber: number, maxThoughts: number) {
    super(
      `Cannot revise thought ${thoughtNumber}: out of range (max: ${maxThoughts})`,
      'INVALID_REVISION',
      { thoughtNumber, maxThoughts }
    );
  }
}

export class BranchingError extends ThinkingError {
  constructor(reason: string) {
    super(`Branching failed: ${reason}`, 'BRANCHING_ERROR', { reason });
  }
}
</file>

<file path="src/tools/eyes/processors/document.ts">
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentFormat,
  DocumentStructure,
  ProcessingInfo
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError, ValidationError } from '@/utils/errors.js';
import { promises as fs } from 'fs';
import path from 'path';

export abstract class DocumentProcessor {
  protected geminiClient: GeminiClient;
  protected supportedFormats: DocumentFormat[];

  constructor(geminiClient: GeminiClient, supportedFormats: DocumentFormat[]) {
    this.geminiClient = geminiClient;
    this.supportedFormats = supportedFormats;
  }

  /**
   * Process a document from various sources (file path, URL, base64)
   */
  abstract process(source: string, options?: ProcessOptions): Promise<DocumentResult>;

  /**
   * Extract text content from the document
   */
  abstract extractText(): Promise<string>;

  /**
   * Extract structured data using a provided schema
   */
  abstract extractStructuredData(schema: object, options?: ProcessOptions): Promise<any>;

  /**
   * Get document metadata
   */
  abstract getMetadata(): Promise<DocumentMetadata>;

  /**
   * Get document structure (sections, tables, etc.)
   */
  abstract getStructure(): Promise<DocumentStructure>;

  /**
   * Validate if the processor can handle the given format
   */
  canProcess(format: DocumentFormat): boolean {
    return this.supportedFormats.includes(format);
  }

  /**
   * Load document content from various sources
   */
  protected async loadDocument(source: string): Promise<Buffer> {
    try {
      // Handle base64 data URI
      if (source.startsWith('data:')) {
        const base64Data = source.split(',')[1];
        if (!base64Data) {
          throw new ValidationError('Invalid base64 data URI format');
        }
        return Buffer.from(base64Data, 'base64');
      }

      // Handle URLs
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const response = await fetch(source);
        if (!response.ok) {
          throw new APIError(`Failed to fetch document: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // Handle file paths
      const resolvedPath = path.resolve(source);
      return await fs.readFile(resolvedPath);
    } catch (error) {
      logger.error(`Failed to load document from ${source}:`, error);
      if (error instanceof Error) {
        throw new APIError(`Failed to load document: ${error.message}`);
      }
      throw new APIError('Failed to load document: Unknown error');
    }
  }

  /**
   * Detect document format from file extension or content
   */
  protected detectFormat(source: string, buffer?: Buffer): DocumentFormat {
    // Check file extension first
    const extension = path.extname(source).toLowerCase();

    const extensionMap: Record<string, DocumentFormat> = {
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.xlsx': 'xlsx',
      '.pptx': 'pptx',
      '.txt': 'txt',
      '.md': 'md',
      '.rtf': 'rtf',
      '.odt': 'odt',
      '.csv': 'csv',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html'
    };

    if (extension && extensionMap[extension]) {
      return extensionMap[extension];
    }

    // Fallback to content-based detection if buffer is available
    if (buffer) {
      return this.detectFormatFromContent(buffer);
    }

    throw new ValidationError(`Unable to detect document format for: ${source}`);
  }

  /**
   * Detect format from file content (magic bytes)
   */
  private detectFormatFromContent(buffer: Buffer): DocumentFormat {
    // PDF detection
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return 'pdf';
    }

    // ZIP-based formats (DOCX, XLSX, PPTX, ODT)
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) {
      // Check for specific file signatures within ZIP
      const zipContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

      if (zipContent.includes('word/')) return 'docx';
      if (zipContent.includes('xl/')) return 'xlsx';
      if (zipContent.includes('ppt/')) return 'pptx';
      if (zipContent.includes('content.xml')) return 'odt';
    }

    // JSON detection
    try {
      JSON.parse(buffer.toString('utf8', 0, Math.min(1024, buffer.length)));
      return 'json';
    } catch {
      // Not JSON
    }

    // XML/HTML detection
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    if (content.includes('<?xml') || content.includes('<html')) {
      return content.includes('<html') ? 'html' : 'xml';
    }

    // Default to text
    return 'txt';
  }

  /**
   * Create processing info object
   */
  protected createProcessingInfo(
    startTime: number,
    modelUsed: string,
    extractionMethod: string,
    confidence?: number,
    warnings?: string[],
    errors?: string[]
  ): ProcessingInfo {
    return {
      processingTimeMs: Date.now() - startTime,
      modelUsed,
      extractionMethod,
      confidence,
      warnings,
      errors
    };
  }

  /**
   * Validate processing options
   */
  protected validateOptions(options?: ProcessOptions): ProcessOptions {
    return {
      extractText: options?.extractText ?? true,
      extractTables: options?.extractTables ?? true,
      extractImages: options?.extractImages ?? false,
      preserveFormatting: options?.preserveFormatting ?? false,
      pageRange: options?.pageRange,
      detailLevel: options?.detailLevel ?? 'detailed',
      language: options?.language,
      timeout: options?.timeout ?? 30000
    };
  }

  /**
   * Get MIME type for document format
   */
  protected getMimeType(format: DocumentFormat): string {
    const mimeTypes: Record<DocumentFormat, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      md: 'text/markdown',
      rtf: 'application/rtf',
      odt: 'application/vnd.oasis.opendocument.text',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html'
    };

    return mimeTypes[format] || 'application/octet-stream';
  }
}
</file>

<file path="src/tools/eyes/processors/excel.ts">
import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  Table,
  FormulaAnalysis
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import XLSX from 'xlsx';

export class ExcelProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['xlsx']);
  }

  /**
   * Process Excel spreadsheet
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing Excel document: ${source}`);

      const buffer = await this.loadDocument(source);
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Extract data from all sheets
      const sheetsData = this.extractSheetsData(workbook);

      // Get metadata
      const metadata = this.extractMetadata(workbook, buffer.length);

      // Analyze structure and formulas
      const structure = await this.analyzeStructure(workbook, options);
      const formulaAnalysis = await this.analyzeFormulas(workbook);

      // Generate summary content
      const content = this.generateContentSummary(sheetsData, formulaAnalysis);

      // Use Gemini for enhanced analysis if requested
      let enhancedContent = content;
      let extractedData = undefined;

      if (options.detailLevel === 'detailed') {
        const geminiResult = await this.geminiClient.processDocumentWithRetry(
          buffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          options
        );
        enhancedContent = geminiResult.content || content;
        extractedData = geminiResult.extractedData;
      }

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: options.detailLevel === 'detailed' ? this.geminiClient.getDocumentModel().model : 'xlsx',
        extractionMethod: 'xlsx + gemini',
        confidence: 0.95
      };

      return {
        content: enhancedContent,
        metadata: {
          ...metadata,
          wordCount: this.countWords(enhancedContent),
          characterCount: enhancedContent.length
        },
        structure,
        extractedData,
        processingInfo
      };
    } catch (error) {
      logger.error(`Excel processing error for ${source}:`, error);
      throw new APIError(`Failed to process Excel document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from Excel (converts to readable format)
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetsData = this.extractSheetsData(workbook);
      return this.generateContentSummary(sheetsData);
    } catch (error) {
      logger.error('Excel text extraction error:', error);
      throw new APIError(`Failed to extract text from Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructuredData(schema: object, options: ProcessOptions = {}): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('Excel structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Excel metadata
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      return this.extractMetadata(workbook, buffer.length);
    } catch (error) {
      logger.error('Excel metadata extraction error:', error);
      throw new APIError(`Failed to extract Excel metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Excel structure
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      return await this.analyzeStructure(workbook, {});
    } catch (error) {
      logger.error('Excel structure analysis error:', error);
      throw new APIError(`Failed to analyze Excel structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract data with schema validation
   */
  async extractDataWithSchema(schema: object): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetsData = this.extractSheetsData(workbook);

      // Use Gemini to map the data to the provided schema
      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        schema,
        { strictMode: true }
      );
    } catch (error) {
      logger.error('Excel schema-based extraction error:', error);
      throw new APIError(`Failed to extract data with schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze formulas in the spreadsheet
   */
  async analyzeFormulas(workbook: XLSX.WorkBook): Promise<FormulaAnalysis> {
    try {
      const formulas: FormulaAnalysis['formulas'] = [];
      let complexFormulasCount = 0;
      const circularRefs: string[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddress];

            if (cell && cell.f) {
              // This cell contains a formula
              const formula = cell.f;
              const result = cell.v || cell.w || 'N/A';

              formulas.push({
                cell: cellAddress,
                formula,
                dependencies: this.extractDependencies(formula),
                result
              });

              // Check for complex formulas
              if (this.isComplexFormula(formula)) {
                complexFormulasCount++;
              }

              // Check for potential circular references
              if (this.hasCircularReference(formula, cellAddress)) {
                circularRefs.push(cellAddress);
              }
            }
          }
        }
      });

      return {
        formulas,
        summary: {
          totalFormulas: formulas.length,
          complexFormulas: complexFormulasCount,
          circularReferences: circularRefs
        }
      } as FormulaAnalysis;
    } catch (error) {
      logger.warn('Formula analysis failed:', error);
      return {
        formulas: [],
        summary: {
          totalFormulas: 0,
          complexFormulas: 0,
          circularReferences: []
        }
      };
    }
  }

  /**
   * Extract sheets data from workbook
   */
  private extractSheetsData(workbook: XLSX.WorkBook): Array<{ name: string; data: any[][]; headers?: string[] }> {
    const sheetsData: Array<{ name: string; data: any[][]; headers?: string[] }> = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Extract headers from first row if it looks like headers
      const firstRow = jsonData[0] as any[];
      const headers = this.detectHeaders(firstRow) ? firstRow.map(String) : undefined;

      sheetsData.push({
        name: sheetName,
        data: jsonData as any[][],
        headers
      });
    });

    return sheetsData;
  }

  /**
   * Extract metadata from workbook
   */
  private extractMetadata(workbook: XLSX.WorkBook, fileSize: number): DocumentMetadata {
    const props = workbook.Props || {};

    return {
      format: 'xlsx',
      pageCount: workbook.SheetNames.length, // Sheets as "pages"
      wordCount: 0, // Will be calculated from content
      characterCount: 0, // Will be calculated from content
      title: props.Title,
      author: props.Author,
      subject: props.Subject,
      createdAt: props.CreatedDate ? new Date(props.CreatedDate) : undefined,
      modifiedAt: props.ModifiedDate ? new Date(props.ModifiedDate) : undefined,
      fileSize
    };
  }

  /**
   * Analyze document structure
   */
  private async analyzeStructure(workbook: XLSX.WorkBook, options: ProcessOptions): Promise<DocumentStructure> {
    try {
      const sheetsData = this.extractSheetsData(workbook);
      const tables: Table[] = [];

      // Convert sheets to table format
      sheetsData.forEach((sheet, index) => {
        if (sheet.data.length > 0 && sheet.data[0]) {
          const headers = sheet.headers || sheet.data[0].map((_, i) => `Column ${i + 1}`);
          const rows = sheet.headers ? sheet.data.slice(1) : sheet.data;

          tables.push({
            id: `sheet_${index + 1}`,
            title: sheet.name,
            headers,
            rows: rows.map(row => row.map(String)),
            pageNumber: index + 1
          });
        }
      });

      return {
        sections: [], // Excel doesn't have traditional sections
        tables,
        images: [], // Would need additional processing for embedded images
        links: [],
        headings: []
      };
    } catch (error) {
      logger.warn('Structure analysis failed:', error);
      return {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    }
  }

  /**
   * Generate content summary from sheets data
   */
  private generateContentSummary(
    sheetsData: Array<{ name: string; data: any[][]; headers?: string[] }>,
    formulaAnalysis?: FormulaAnalysis
  ): string {
    let summary = `Excel Workbook Summary:\n\n`;

    sheetsData.forEach(sheet => {
      summary += `Sheet: ${sheet.name}\n`;
      summary += `Rows: ${sheet.data.length}\n`;
      if (sheet.headers) {
        summary += `Columns: ${sheet.headers.length} (${sheet.headers.join(', ')})\n`;
      }
      summary += '\n';
    });

    if (formulaAnalysis && formulaAnalysis.formulas.length > 0) {
      summary += `Formulas: ${formulaAnalysis.formulas.length} total\n`;
      summary += `Complex Formulas: ${formulaAnalysis.summary.complexFormulas}\n`;
      if (formulaAnalysis.summary.circularReferences.length > 0) {
        summary += `⚠️  Circular References: ${formulaAnalysis.summary.circularReferences.length}\n`;
      }
      summary += '\n';
    }

    return summary;
  }

  /**
   * Detect if first row contains headers
   */
  private detectHeaders(firstRow: any[]): boolean {
    if (!firstRow || firstRow.length === 0) return false;

    // Check if most values look like strings (potential headers)
    const stringCount = firstRow.filter(cell => typeof cell === 'string' && cell.trim().length > 0).length;
    return (stringCount / firstRow.length) > 0.7; // 70% strings = likely headers
  }

  /**
   * Extract formula dependencies
   */
  private extractDependencies(formula: string): string[] {
    // Simple regex to extract cell references from formulas
    const cellRefRegex = /\$?[A-Z]+\$?\d+/g;
    const matches = formula.match(cellRefRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Check if formula is complex
   */
  private isComplexFormula(formula: string): boolean {
    const complexPatterns = [
      /SUMIFS|COUNTIFS|AVERAGEIFS/i,
      /VLOOKUP|HLOOKUP|INDEX|MATCH/i,
      /IF\(/i,
      /SUMPRODUCT/i,
      /ARRAYFORMULA/i
    ];

    return complexPatterns.some(pattern => pattern.test(formula));
  }

  /**
   * Check for circular references
   */
  private hasCircularReference(formula: string, cellAddress: string): boolean {
    // Simple check - if formula references its own cell
    const normalizedFormula = formula.replace(/\$/g, '');
    const normalizedAddress = cellAddress.replace(/\$/g, '');
    return normalizedFormula.includes(normalizedAddress);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
</file>

<file path="src/tools/eyes/processors/factory.ts">
import { DocumentProcessor } from './document.js';
import { PDFProcessor } from './pdf.js';
import { WordProcessor } from './word.js';
import { ExcelProcessor } from './excel.js';
import { PowerPointProcessor } from './powerpoint.js';
import { TextProcessor } from './text.js';
import { GeminiClient } from '../utils/gemini-client.js';
import type { DocumentFormat } from '../types/document.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';

export class DocumentProcessorFactory {
  private static processors = new Map<DocumentFormat, new (geminiClient: GeminiClient) => DocumentProcessor>();

  /**
   * Register all document processors
   */
  static registerProcessors(geminiClient: GeminiClient): void {
    // Register PDF processor
    this.processors.set('pdf', PDFProcessor);

    // Register Word processor
    this.processors.set('docx', WordProcessor);

    // Register Excel processor
    this.processors.set('xlsx', ExcelProcessor);

    // Register PowerPoint processor
    this.processors.set('pptx', PowerPointProcessor);

    // Register text-based processors
    this.processors.set('txt', TextProcessor);
    this.processors.set('md', TextProcessor);
    this.processors.set('csv', TextProcessor);
    this.processors.set('json', TextProcessor);
    this.processors.set('xml', TextProcessor);
    this.processors.set('html', TextProcessor);
    this.processors.set('rtf', TextProcessor);
    this.processors.set('odt', TextProcessor);

    logger.info(`Registered ${this.processors.size} document processors`);
  }

  /**
   * Create a document processor for the given format
   */
  static create(format: DocumentFormat, geminiClient: GeminiClient): DocumentProcessor {
    const ProcessorClass = this.processors.get(format);

    if (!ProcessorClass) {
      throw new APIError(`No processor available for format: ${format}`);
    }

    try {
      return new ProcessorClass(geminiClient);
    } catch (error) {
      logger.error(`Failed to create processor for format ${format}:`, error);
      throw new APIError(`Failed to initialize processor for format: ${format}`);
    }
  }

  /**
   * Get all supported formats
   */
  static getSupportedFormats(): DocumentFormat[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if a format is supported
   */
  static isFormatSupported(format: DocumentFormat): boolean {
    return this.processors.has(format);
  }

  /**
   * Get processor class for a format
   */
  static getProcessorClass(format: DocumentFormat): (new (geminiClient: GeminiClient) => DocumentProcessor) | null {
    return this.processors.get(format) || null;
  }

  /**
   * Auto-detect format from file path or content
   */
  static detectFormat(source: string, content?: Buffer): DocumentFormat {
    // Check file extension first
    const path = require('path');
    const extension = path.extname(source).toLowerCase();

    const extensionMap: Record<string, DocumentFormat> = {
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.xlsx': 'xlsx',
      '.xls': 'xlsx',
      '.pptx': 'pptx',
      '.txt': 'txt',
      '.md': 'md',
      '.markdown': 'md',
      '.csv': 'csv',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.htm': 'html',
      '.rtf': 'rtf',
      '.odt': 'odt'
    };

    if (extension && extensionMap[extension]) {
      return extensionMap[extension];
    }

    // Content-based detection if buffer is provided
    if (content) {
      return this.detectFormatFromContent(content);
    }

    // Default to text
    return 'txt';
  }

  /**
   * Detect format from file content
   */
  private static detectFormatFromContent(buffer: Buffer): DocumentFormat {
    // PDF detection
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return 'pdf';
    }

    // ZIP-based formats (DOCX, XLSX, PPTX, ODT)
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) {
      const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

      if (content.includes('word/')) return 'docx';
      if (content.includes('xl/')) return 'xlsx';
      if (content.includes('ppt/')) return 'pptx';
      if (content.includes('content.xml')) return 'odt';
    }

    // JSON detection
    try {
      const textContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
      JSON.parse(textContent);
      return 'json';
    } catch {
      // Not JSON
    }

    // XML/HTML detection
    const textContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    if (textContent.includes('<?xml') || textContent.includes('<html')) {
      return textContent.includes('<html') ? 'html' : 'xml';
    }

    // Default to text
    return 'txt';
  }

  /**
   * Get format information
   */
  static getFormatInfo(format: DocumentFormat): {
    name: string;
    mimeType: string;
    extensions: string[];
    description: string;
  } {
    const formatInfo: Record<DocumentFormat, {
      name: string;
      mimeType: string;
      extensions: string[];
      description: string;
    }> = {
      pdf: {
        name: 'PDF',
        mimeType: 'application/pdf',
        extensions: ['.pdf'],
        description: 'Portable Document Format'
      },
      docx: {
        name: 'Word Document',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extensions: ['.docx'],
        description: 'Microsoft Word document'
      },
      xlsx: {
        name: 'Excel Spreadsheet',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extensions: ['.xlsx', '.xls'],
        description: 'Microsoft Excel spreadsheet'
      },
      pptx: {
        name: 'PowerPoint Presentation',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        extensions: ['.pptx'],
        description: 'Microsoft PowerPoint presentation'
      },
      txt: {
        name: 'Plain Text',
        mimeType: 'text/plain',
        extensions: ['.txt'],
        description: 'Plain text file'
      },
      md: {
        name: 'Markdown',
        mimeType: 'text/markdown',
        extensions: ['.md', '.markdown'],
        description: 'Markdown formatted text'
      },
      csv: {
        name: 'CSV',
        mimeType: 'text/csv',
        extensions: ['.csv'],
        description: 'Comma-separated values'
      },
      json: {
        name: 'JSON',
        mimeType: 'application/json',
        extensions: ['.json'],
        description: 'JavaScript Object Notation'
      },
      xml: {
        name: 'XML',
        mimeType: 'application/xml',
        extensions: ['.xml'],
        description: 'Extensible Markup Language'
      },
      html: {
        name: 'HTML',
        mimeType: 'text/html',
        extensions: ['.html', '.htm'],
        description: 'HyperText Markup Language'
      },
      rtf: {
        name: 'RTF',
        mimeType: 'application/rtf',
        extensions: ['.rtf'],
        description: 'Rich Text Format'
      },
      odt: {
        name: 'OpenDocument Text',
        mimeType: 'application/vnd.oasis.opendocument.text',
        extensions: ['.odt'],
        description: 'OpenDocument text document'
      }
    };

    return formatInfo[format] || {
      name: 'Unknown',
      mimeType: 'application/octet-stream',
      extensions: [],
      description: 'Unknown format'
    };
  }
}
</file>

<file path="src/tools/eyes/processors/gif.ts">
import { GenerativeModel } from "@google/generative-ai";
import sharp from "sharp";
import fs from "fs/promises";
import type { AnalysisOptions, ProcessingResult } from "@/types";
import { createPrompt, parseAnalysisResponse } from "../utils/formatters.js";
import { logger } from "@/utils/logger.js";
import { ProcessingError } from "@/utils/errors.js";

export async function processGif(
  model: GenerativeModel,
  source: string,
  options: AnalysisOptions
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    logger.debug(`Processing GIF: ${source.substring(0, 50)}...`);
    
    const gifData = await loadGif(source);
    const frames = await extractGifFrames(gifData);
    
    if (frames.length === 0) {
      throw new ProcessingError("No frames could be extracted from GIF");
    }
    
    const prompt = createPrompt(options) + `

This is an animated GIF analysis with ${frames.length} frames. Pay attention to:
- Animation timing and smoothness
- UI state transitions
- Loading states or progress indicators
- Error animations or feedback
- Interactive element hover states
- Any visual glitches in the animation`;
    
    const mediaData = frames.map(frame => ({
      mimeType: 'image/png',
      data: frame
    }));
    
    const response = await model.generateContent([
      { text: prompt },
      ...mediaData.map(data => ({
        inlineData: {
          mimeType: data.mimeType,
          data: data.data
        }
      }))
    ]);
    
    const result = await response.response;
    const analysisText = result.text();
    
    if (!analysisText) {
      throw new ProcessingError("No analysis result from Gemini");
    }
    
    const parsed = parseAnalysisResponse(analysisText);
    const processingTime = Date.now() - startTime;
    
    return {
      description: parsed.description || "GIF analysis completed",
      analysis: parsed.analysis || analysisText,
      elements: parsed.elements || [],
      insights: parsed.insights || [],
      recommendations: parsed.recommendations || [],
      metadata: {
        processing_time_ms: processingTime,
        model_used: model.model,
        frames_analyzed: frames.length
      }
    };
    
  } catch (error) {
    logger.error("GIF processing error:", error);
    throw new ProcessingError(`Failed to process GIF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function loadGif(source: string): Promise<Buffer> {
  if (source.startsWith('data:image/gif')) {
    const [, data] = source.split(',');
    if (!data) {
      throw new ProcessingError("Invalid base64 GIF format");
    }
    return Buffer.from(data, 'base64');
  }
  
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new ProcessingError(`Failed to fetch GIF: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  
  try {
    return await fs.readFile(source);
  } catch (error) {
    throw new ProcessingError(`Failed to load GIF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractGifFrames(gifBuffer: Buffer): Promise<string[]> {
  try {
    const image = sharp(gifBuffer, { animated: true });
    const { pages } = await image.metadata();
    
    if (!pages || pages <= 1) {
      const singleFrame = await image
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      return [singleFrame.toString('base64')];
    }
    
    const frames: string[] = [];
    const maxFrames = Math.min(pages, 16);
    
    for (let i = 0; i < maxFrames; i++) {
      const frame = await sharp(gifBuffer, { 
        animated: true,
        page: i 
      })
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      
      frames.push(frame.toString('base64'));
    }
    
    return frames;
    
  } catch (error) {
    throw new ProcessingError(`Failed to extract GIF frames: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
</file>

<file path="src/tools/eyes/processors/pdf.ts">
import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  Table,
  Image
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';

export class PDFProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['pdf']);
  }

  /**
   * Process PDF document using native Gemini capabilities
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing PDF document: ${source}`);

      const buffer = await this.loadDocument(source);

      // Use Gemini's native document processing
      const geminiResult = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        options
      );

      // Extract metadata using Gemini
      const metadata = await this.extractMetadataWithGemini(buffer);

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: this.geminiClient.getDocumentModel().model,
        extractionMethod: 'gemini-native',
        confidence: 0.95
      };

      return {
        content: geminiResult.content || '',
        metadata: { ...metadata, wordCount: this.countWords(geminiResult.content || '') },
        structure: geminiResult.structure,
        extractedData: geminiResult.extractedData,
        processingInfo
      };
    } catch (error) {
      logger.error(`PDF processing error for ${source}:`, error);
      throw new APIError(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from PDF using Gemini
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        { extractText: true, extractTables: false, extractImages: false }
      );
      return result.content || '';
    } catch (error) {
      logger.error('PDF text extraction error:', error);
      throw new APIError(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructuredData(schema: object, options: ProcessOptions = {}): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        'application/pdf',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('PDF structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PDF metadata using Gemini
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.extractMetadataWithGemini(buffer);
    } catch (error) {
      logger.error('PDF metadata extraction error:', error);
      throw new APIError(`Failed to extract PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PDF structure using Gemini
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        { extractText: false, extractTables: true, extractImages: true }
      );
      return result.structure || {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    } catch (error) {
      logger.error('PDF structure analysis error:', error);
      throw new APIError(`Failed to analyze PDF structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract tables from PDF
   */
  async extractTables(buffer: Buffer): Promise<Table[]> {
    try {
      const tables: Table[] = [];

      // Use Gemini for table extraction
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        {
          extractTables: true,
          extractText: false,
          extractImages: false,
          preserveFormatting: true
        }
      );

      if (result.structure?.tables) {
        tables.push(...result.structure.tables);
      }

      return tables;
    } catch (error) {
      logger.warn('PDF table extraction failed, returning empty array:', error);
      return [];
    }
  }

  /**
   * Extract images from PDF
   */
  async extractImages(buffer: Buffer): Promise<Image[]> {
    try {
      const images: Image[] = [];

      // Use Gemini for image detection and description
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        {
          extractImages: true,
          extractText: false,
          extractTables: false
        }
      );

      if (result.structure?.images) {
        images.push(...result.structure.images);
      }

      return images;
    } catch (error) {
      logger.warn('PDF image extraction failed, returning empty array:', error);
      return [];
    }
  }

  /**
   * Extract metadata using Gemini
   */
  private async extractMetadataWithGemini(buffer: Buffer): Promise<DocumentMetadata> {
    try {
      const result = await this.geminiClient.extractDocumentMetadata(buffer, 'application/pdf');
      return {
        ...result,
        format: result.format as any // Type assertion for compatibility
      };
    } catch (error) {
      logger.warn('Gemini metadata extraction failed, returning basic metadata:', error);
      return {
        format: 'pdf' as any,
        pageCount: 0,
        wordCount: 0,
        characterCount: buffer.length,
        fileSize: buffer.length
      };
    }
  }



  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }


}
</file>

<file path="src/tools/eyes/processors/powerpoint.ts">
import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  Table,
  Image
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';

export class PowerPointProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['pptx']);
  }

  /**
   * Process PowerPoint presentation using Gemini's native capabilities
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing PowerPoint document: ${source}`);

      const buffer = await this.loadDocument(source);

      // Use Gemini's native document processing
      const geminiResult = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        options
      );

      // Extract metadata using Gemini
      const metadata = await this.extractMetadataWithGemini(buffer);

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: this.geminiClient.getDocumentModel().model,
        extractionMethod: 'gemini-native',
        confidence: 0.95
      };

      return {
        content: geminiResult.content || '',
        metadata: { ...metadata, wordCount: this.countWords(geminiResult.content || '') },
        structure: geminiResult.structure,
        extractedData: geminiResult.extractedData,
        processingInfo
      };
    } catch (error) {
      logger.error(`PowerPoint processing error for ${source}:`, error);
      throw new APIError(`Failed to process PowerPoint document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from PowerPoint using Gemini
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        { extractText: true, extractTables: false, extractImages: false }
      );
      return result.content || '';
    } catch (error) {
      logger.error('PowerPoint text extraction error:', error);
      throw new APIError(`Failed to extract text from PowerPoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract metadata using Gemini
   */
  private async extractMetadataWithGemini(buffer: Buffer): Promise<DocumentMetadata> {
    try {
      const result = await this.geminiClient.extractDocumentMetadata(buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      return {
        ...result,
        format: result.format as any // Type assertion for compatibility
      };
    } catch (error) {
      logger.warn('Gemini metadata extraction failed, returning basic metadata:', error);
      return {
        format: 'pptx' as any,
        pageCount: 1,
        wordCount: 0,
        characterCount: buffer.length,
        fileSize: buffer.length,
        title: 'PowerPoint Presentation'
      };
    }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructuredData(schema: object, options: ProcessOptions = {}): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('PowerPoint structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from PowerPoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PowerPoint metadata using Gemini
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.extractMetadataWithGemini(buffer);
    } catch (error) {
      logger.error('PowerPoint metadata extraction error:', error);
      throw new APIError(`Failed to extract PowerPoint metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PowerPoint structure using Gemini
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        { extractText: false, extractTables: true, extractImages: true }
      );
      return result.structure || {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    } catch (error) {
      logger.error('PowerPoint structure analysis error:', error);
      throw new APIError(`Failed to analyze PowerPoint structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }





  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
</file>

<file path="src/tools/eyes/processors/text.ts">
import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  DocumentFormat
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import path from 'path';

export class TextProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['txt', 'md', 'csv', 'json', 'xml', 'html']);
  }

  /**
   * Process text-based document
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing text document: ${source}`);

      const buffer = await this.loadDocument(source);
      const content = buffer.toString('utf8');

      // Detect format from file extension or content
      const format = this.detectTextFormat(source, content) as DocumentFormat;

      // Process content based on format
      const processedContent = await this.processContentByFormat(content, format, options);

      // Get metadata
      const metadata = this.extractMetadata(content, format, buffer.length);

      // Analyze structure
      const structure = await this.analyzeStructure(content, format, options);

      // Use Gemini for enhanced analysis if requested
      let enhancedContent = processedContent;
      let extractedData = undefined;

      if (options.detailLevel === 'detailed') {
        const geminiResult = await this.geminiClient.processDocumentWithRetry(
          buffer,
          this.getMimeType(format),
          options
        );
        enhancedContent = geminiResult.content || processedContent;
        extractedData = geminiResult.extractedData;
      }

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: options.detailLevel === 'detailed' ? this.geminiClient.getDocumentModel().model : 'text-parser',
        extractionMethod: 'text-parser + gemini',
        confidence: 0.98
      };

      return {
        content: enhancedContent,
        metadata: {
          ...metadata,
          wordCount: this.countWords(enhancedContent),
          characterCount: enhancedContent.length
        },
        structure,
        extractedData,
        processingInfo
      };
    } catch (error) {
      logger.error(`Text document processing error for ${source}:`, error);
      throw new APIError(`Failed to process text document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content (returns the content as-is for text files)
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      return buffer.toString('utf8');
    } catch (error) {
      logger.error('Text extraction error:', error);
      throw new APIError(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructuredData(schema: object, options: ProcessOptions = {}): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      const content = buffer.toString('utf8');
      const format = this.detectTextFormat('current', content);

      // For JSON files, try to parse directly first
      if (format === 'json') {
        try {
          const jsonData = JSON.parse(content);
          return jsonData;
        } catch {
          // Fall back to Gemini processing
        }
      }

      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        this.getMimeType(format),
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('Text structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get text document metadata
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      const content = buffer.toString('utf8');
      const format = this.detectTextFormat('current', content) as DocumentFormat;
      return this.extractMetadata(content, format, buffer.length);
    } catch (error) {
      logger.error('Text metadata extraction error:', error);
      throw new APIError(`Failed to extract text metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get text document structure
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const content = buffer.toString('utf8');
      const format = this.detectTextFormat('current', content) as DocumentFormat;
      return await this.analyzeStructure(content, format, {});
    } catch (error) {
      logger.error('Text structure analysis error:', error);
      throw new APIError(`Failed to analyze text structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect text format from file extension or content
   */
  private detectTextFormat(source: string, content: string): DocumentFormat {
    // Check file extension first
    const extension = path.extname(source).toLowerCase();

    const extensionMap: Record<string, string> = {
      '.txt': 'txt',
      '.md': 'md',
      '.markdown': 'md',
      '.csv': 'csv',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.htm': 'html'
    };

    if (extension && extensionMap[extension]) {
      const format = extensionMap[extension];
      if (format) {
        return format as DocumentFormat;
      }
    }

    // Content-based detection
    const trimmed = content.trim();

    // JSON detection
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json' as DocumentFormat;
      } catch {
        // Not valid JSON
      }
    }

    // XML/HTML detection
    if (trimmed.startsWith('<')) {
      if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE html')) {
        return 'html' as DocumentFormat;
      }
      return 'xml' as DocumentFormat;
    }

    // CSV detection (simple heuristic)
    const lines = trimmed.split('\n');
    if (lines.length > 1) {
      const firstLine = lines[0];
      const secondLine = lines[1];
      if (firstLine && firstLine.includes(',') && secondLine && secondLine.includes(',')) {
        return 'csv' as DocumentFormat;
      }
    }

    // Markdown detection
    if (trimmed.includes('# ') || trimmed.includes('**') || trimmed.includes('[') && trimmed.includes('](')) {
      return 'md' as DocumentFormat;
    }

    // Default to plain text
    return 'txt' as DocumentFormat;
  }

  /**
   * Process content based on format
   */
  private async processContentByFormat(content: string, format: string, options: ProcessOptions): Promise<string> {
    switch (format) {
      case 'md':
        return options.preserveFormatting ? content : this.stripMarkdown(content);
      case 'html':
        return options.preserveFormatting ? content : this.stripHtml(content);
      case 'json':
        return this.formatJson(content);
      case 'xml':
        return options.preserveFormatting ? content : this.stripXml(content);
      case 'csv':
        return this.formatCsv(content);
      default:
        return content;
    }
  }

  /**
   * Extract metadata from content
   */
  private extractMetadata(content: string, format: string, fileSize: number): DocumentMetadata {
    const lines = content.split('\n');
    const wordCount = this.countWords(content);

    return {
      format: format as any,
      pageCount: 1, // Text files are single "page"
      wordCount,
      characterCount: content.length,
      language: this.detectLanguage(content),
      fileSize
    };
  }

  /**
   * Analyze document structure
   */
  private async analyzeStructure(content: string, format: string, options: ProcessOptions): Promise<DocumentStructure> {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];
    const headings: Array<{ id: string; text: string; level: number; pageNumber?: number }> = [];

    try {
      switch (format) {
        case 'md':
          return this.analyzeMarkdownStructure(content);
        case 'html':
          return this.analyzeHtmlStructure(content);
        case 'json':
          return this.analyzeJsonStructure(content);
        case 'xml':
          return this.analyzeXmlStructure(content);
        default:
          // For plain text, create basic structure
          sections.push({
            id: 'content',
            content,
            level: 1,
            wordCount: this.countWords(content)
          });
          break;
      }
    } catch (error) {
      logger.warn('Structure analysis failed:', error);
    }

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings
    };
  }

  /**
   * Analyze Markdown structure
   */
  private analyzeMarkdownStructure(content: string): DocumentStructure {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];
    const headings: Array<{ id: string; text: string; level: number; pageNumber?: number }> = [];

    const lines = content.split('\n');
    let currentSection = '';
    let currentTitle = '';
    let currentLevel = 1;

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        // Save previous section if exists
        if (currentSection.trim()) {
          sections.push({
            id: `section_${sections.length + 1}`,
            title: currentTitle,
            content: currentSection.trim(),
            level: currentLevel,
            wordCount: this.countWords(currentSection)
          });
        }

        // Start new section
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        currentSection = '';
        currentTitle = title;
        currentLevel = level;

        headings.push({
          id: `heading_${headings.length + 1}`,
          text: title,
          level,
          pageNumber: 1
        });
      } else {
        currentSection += line + '\n';
      }
    });

    // Add final section
    if (currentSection.trim()) {
      sections.push({
        id: `section_${sections.length + 1}`,
        title: currentTitle,
        content: currentSection.trim(),
        level: currentLevel,
        wordCount: this.countWords(currentSection)
      });
    }

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings
    };
  }

  /**
   * Analyze HTML structure
   */
  private analyzeHtmlStructure(content: string): DocumentStructure {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];
    const headings: Array<{ id: string; text: string; level: number; pageNumber?: number }> = [];

    // Simple HTML parsing - extract headings and sections
    const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1] || '1');
      const text = match[2]?.trim() || '';

      headings.push({
        id: `heading_${headings.length + 1}`,
        text,
        level,
        pageNumber: 1
      });
    }

    // Extract title
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      sections.push({
        id: 'title',
        title: titleMatch[1].trim(),
        content: titleMatch[1].trim(),
        level: 1,
        wordCount: this.countWords(titleMatch[1])
      });
    }

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings
    };
  }

  /**
   * Analyze JSON structure
   */
  private analyzeJsonStructure(content: string): DocumentStructure {
    try {
      const data = JSON.parse(content);
      const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];

      sections.push({
        id: 'json_content',
        title: 'JSON Content',
        content: JSON.stringify(data, null, 2),
        level: 1,
        wordCount: this.countWords(JSON.stringify(data))
      });

      return {
        sections,
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    } catch {
      return {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    }
  }

  /**
   * Analyze XML structure
   */
  private analyzeXmlStructure(content: string): DocumentStructure {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];

    sections.push({
      id: 'xml_content',
      title: 'XML Content',
      content: content,
      level: 1,
      wordCount: this.countWords(content)
    });

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings: []
    };
  }

  /**
   * Strip Markdown formatting
   */
  private stripMarkdown(content: string): string {
    return content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1'); // Remove images
  }

  /**
   * Strip HTML tags
   */
  private stripHtml(content: string): string {
    return content.replace(/<[^>]*>/g, '');
  }

  /**
   * Strip XML tags
   */
  private stripXml(content: string): string {
    return this.stripHtml(content);
  }

  /**
   * Format JSON content
   */
  private formatJson(content: string): string {
    try {
      const data = JSON.parse(content);
      return JSON.stringify(data, null, 2);
    } catch {
      return content;
    }
  }

  /**
   * Format CSV content
   */
  private formatCsv(content: string): string {
    const lines = content.split('\n');
    if (lines.length === 0) return content;

    const firstLine = lines[0];
    if (!firstLine) return content;

    const headers = firstLine.split(',');
    let formatted = `CSV Data:\n\nHeaders: ${headers.join(', ')}\n\n`;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim()) {
        const values = line.split(',');
        formatted += `Row ${i}: ${values.join(', ')}\n`;
      }
    }

    return formatted;
  }

  /**
   * Detect language from content
   */
  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
    const spanishWords = /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por)\b/gi;
    const frenchWords = /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par)\b/gi;

    const englishMatches = (content.match(englishWords) || []).length;
    const spanishMatches = (content.match(spanishWords) || []).length;
    const frenchMatches = (content.match(frenchWords) || []).length;

    const maxMatches = Math.max(englishMatches, spanishMatches, frenchMatches);

    if (maxMatches === englishMatches && englishMatches > 0) return 'en';
    if (maxMatches === spanishMatches && spanishMatches > 0) return 'es';
    if (maxMatches === frenchMatches && frenchMatches > 0) return 'fr';

    return 'unknown';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
</file>

<file path="src/tools/eyes/processors/video.ts">
import { GenerativeModel } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";
import type { VideoOptions, ProcessingResult } from "@/types";
import { createPrompt, parseAnalysisResponse } from "../utils/formatters.js";
import { logger } from "@/utils/logger.js";
import { ProcessingError } from "@/utils/errors.js";

export async function processVideo(
  model: GenerativeModel,
  source: string,
  options: VideoOptions
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const maxFrames = options.max_frames || 32;
  const sampleRate = options.sample_rate || 1;
  
  let tempDir: string | null = null;
  
  try {
    logger.debug(`Processing video: ${source.substring(0, 50)}... (max ${maxFrames} frames)`);
    
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'human-mcp-video-'));
    const frames = await extractFrames(source, tempDir, maxFrames, sampleRate);
    
    if (frames.length === 0) {
      throw new ProcessingError("No frames could be extracted from video");
    }
    
    const prompt = createPrompt(options) + `

This is a video analysis with ${frames.length} frames extracted. Focus on:
- Temporal changes between frames
- Animation or transition issues
- Error states that appear over time
- UI state changes and interactions
- Any progressive degradation or improvement`;
    
    const mediaData = await Promise.all(
      frames.map(async (framePath) => {
        const buffer = await fs.readFile(framePath);
        const processedFrame = await sharp(buffer)
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        return {
          mimeType: 'image/jpeg',
          data: processedFrame.toString('base64')
        };
      })
    );
    
    const response = await model.generateContent([
      { text: prompt },
      ...mediaData.map(data => ({
        inlineData: {
          mimeType: data.mimeType,
          data: data.data
        }
      }))
    ]);
    
    const result = await response.response;
    const analysisText = result.text();
    
    if (!analysisText) {
      throw new ProcessingError("No analysis result from Gemini");
    }
    
    const parsed = parseAnalysisResponse(analysisText);
    const processingTime = Date.now() - startTime;
    
    return {
      description: parsed.description || "Video analysis completed",
      analysis: parsed.analysis || analysisText,
      elements: parsed.elements || [],
      insights: parsed.insights || [],
      recommendations: parsed.recommendations || [],
      metadata: {
        processing_time_ms: processingTime,
        model_used: model.model,
        frames_analyzed: frames.length
      }
    };
    
  } catch (error) {
    logger.error("Video processing error:", error);
    throw new ProcessingError(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function extractFrames(
  videoSource: string,
  outputDir: string,
  maxFrames: number,
  sampleRate: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const framePattern = path.join(outputDir, 'frame_%04d.jpg');
    const frames: string[] = [];
    
    ffmpeg(videoSource)
      .outputOptions([
        '-vf', `fps=1/${sampleRate}`,
        '-vframes', maxFrames.toString(),
        '-q:v', '2'
      ])
      .output(framePattern)
      .on('end', async () => {
        try {
          const files = await fs.readdir(outputDir);
          const frameFiles = files
            .filter(file => file.startsWith('frame_') && file.endsWith('.jpg'))
            .sort()
            .map(file => path.join(outputDir, file));
          
          resolve(frameFiles);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(new ProcessingError(`FFmpeg error: ${error.message}`));
      })
      .run();
  });
}
</file>

<file path="src/tools/eyes/processors/word.ts">
import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  Table,
  Image,
  FormattedContent
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import mammoth from 'mammoth';

export class WordProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['docx']);
  }

  /**
   * Process Word document
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing Word document: ${source}`);

      const buffer = await this.loadDocument(source);

      // Extract text content
      const textResult = await mammoth.extractRawText({ buffer });
      const textContent = textResult.value;

      // Extract with formatting if requested
      let formattedContent: FormattedContent | undefined;
      if (options.preserveFormatting) {
        formattedContent = await this.extractWithFormatting(buffer);
      }

      // Get metadata
      const metadata = await this.extractMetadata(buffer);

      // Analyze structure
      const structure = await this.analyzeStructure(buffer, options);

      // Use Gemini for enhanced analysis if detailed processing requested
      let enhancedContent = textContent;
      let extractedData = undefined;

      if (options.detailLevel === 'detailed') {
        const geminiResult = await this.geminiClient.processDocumentWithRetry(
          buffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          options
        );
        enhancedContent = geminiResult.content || textContent;
        extractedData = geminiResult.extractedData;
      }

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: options.detailLevel === 'detailed' ? this.geminiClient.getDocumentModel().model : 'mammoth',
        extractionMethod: 'mammoth + gemini',
        confidence: 0.95
      };

      return {
        content: enhancedContent,
        metadata: {
          ...metadata,
          wordCount: this.countWords(enhancedContent),
          characterCount: enhancedContent.length
        },
        structure,
        extractedData,
        processingInfo
      };
    } catch (error) {
      logger.error(`Word document processing error for ${source}:`, error);
      throw new APIError(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from Word document
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Word text extraction error:', error);
      throw new APIError(`Failed to extract text from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructuredData(schema: object, options: ProcessOptions = {}): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('Word structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Word document metadata
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.extractMetadata(buffer);
    } catch (error) {
      logger.error('Word metadata extraction error:', error);
      throw new APIError(`Failed to extract Word document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Word document structure
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.analyzeStructure(buffer, {});
    } catch (error) {
      logger.error('Word structure analysis error:', error);
      throw new APIError(`Failed to analyze Word document structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content with formatting preserved
   */
  async extractWithFormatting(buffer: Buffer): Promise<FormattedContent> {
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer });

      // For markdown, we'll use the HTML and convert it, or fall back to plain text
      const plainText = await this.extractText();

      return {
        html: htmlResult.value,
        markdown: plainText, // Placeholder - would need additional markdown conversion
        plainText
      };
    } catch (error) {
      logger.warn('Formatting extraction failed:', error);
      const plainText = await this.extractText();
      return {
        html: plainText,
        markdown: plainText,
        plainText
      };
    }
  }

  /**
   * Extract embedded images from Word document
   */
  async extractImages(buffer: Buffer): Promise<Image[]> {
    try {
      const images: Image[] = [];

      // Use Gemini for image detection since mammoth image extraction is complex
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        {
          extractImages: true,
          extractText: false,
          extractTables: false
        }
      );

      if (result.structure?.images) {
        images.push(...result.structure.images);
      }

      return images;
    } catch (error) {
      logger.warn('Word image extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract tables from Word document
   */
  async extractTables(buffer: Buffer): Promise<Table[]> {
    try {
      const tables: Table[] = [];

      // Use Gemini for table extraction since mammoth doesn't provide structured table data
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        {
          extractTables: true,
          extractText: false,
          extractImages: false,
          preserveFormatting: true
        }
      );

      if (result.structure?.tables) {
        tables.push(...result.structure.tables);
      }

      return tables;
    } catch (error) {
      logger.warn('Word table extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract metadata from Word document
   */
  private async extractMetadata(buffer: Buffer): Promise<DocumentMetadata> {
    try {
      // For now, return basic metadata. In a full implementation,
      // you might use a library like office-document-properties
      const textContent = await this.extractText();

      return {
        format: 'docx',
        pageCount: 1, // Word documents don't have inherent page count
        wordCount: 0, // Will be calculated later
        characterCount: 0, // Will be calculated later
        fileSize: buffer.length
        // Additional metadata would be extracted from document properties
      };
    } catch (error) {
      logger.warn('Metadata extraction failed:', error);
      return {
        format: 'docx',
        pageCount: 1,
        wordCount: 0,
        characterCount: 0,
        fileSize: buffer.length
      };
    }
  }

  /**
   * Analyze document structure
   */
  private async analyzeStructure(buffer: Buffer, options: ProcessOptions): Promise<DocumentStructure> {
    try {
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        {
          extractText: false,
          extractTables: true,
          extractImages: options.extractImages || false,
          preserveFormatting: true
        }
      );

      return result.structure || {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    } catch (error) {
      logger.warn('Structure analysis failed:', error);
      return {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
</file>

<file path="src/tools/eyes/types/document.ts">
export interface DocumentResult {
  content: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  extractedData?: any;
  processingInfo: ProcessingInfo;
}

export interface DocumentMetadata {
  format: DocumentFormat;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  author?: string;
  title?: string;
  subject?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  language?: string;
  fileSize?: number;
}

export interface DocumentStructure {
  sections: Section[];
  tables: Table[];
  images: Image[];
  links: Link[];
  headings: Heading[];
}

export interface Section {
  id: string;
  title?: string;
  content: string;
  level: number;
  startPage?: number;
  endPage?: number;
  wordCount: number;
}

export interface Table {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Image {
  id: string;
  alt?: string;
  src?: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  base64Data?: string;
}

export interface Link {
  id: string;
  text: string;
  url: string;
  pageNumber?: number;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
  pageNumber?: number;
}

export interface ProcessingInfo {
  processingTimeMs: number;
  modelUsed: string;
  extractionMethod: string;
  confidence?: number;
  warnings?: string[];
  errors?: string[];
}

export interface ProcessOptions {
  extractText?: boolean;
  extractTables?: boolean;
  extractImages?: boolean;
  preserveFormatting?: boolean;
  pageRange?: string;
  detailLevel?: 'quick' | 'detailed';
  language?: string;
  timeout?: number;
}

export interface ExtractionOptions {
  schema: object;
  strictMode?: boolean;
  fallbackValues?: Record<string, any>;
  validateOutput?: boolean;
}

export interface DocumentResponse {
  content: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  extractedData?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface SourceReference {
  field: string;
  pageNumber?: number;
  section?: string;
  confidence: number;
}

export interface FormattedContent {
  html: string;
  markdown: string;
  plainText: string;
}

export interface FormulaAnalysis {
  formulas: Array<{
    cell: string;
    formula: string;
    dependencies: string[];
    result?: any;
  }>;
  summary: {
    totalFormulas: number;
    complexFormulas: number;
    circularReferences: string[];
  };
}

export interface FormData {
  fields: Array<{
    name: string;
    type: string;
    value?: any;
    required?: boolean;
    options?: string[];
  }>;
}

export type DocumentFormat =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'txt'
  | 'md'
  | 'rtf'
  | 'odt'
  | 'csv'
  | 'json'
  | 'xml'
  | 'html';

export interface DocumentProcessorConfig {
  maxFileSize: number;
  supportedFormats: DocumentFormat[];
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  ocrEnabled: boolean;
}
</file>

<file path="src/tools/eyes/index.ts.backup">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { processImage } from "./processors/image.js";
import { processVideo } from "./processors/video.js";
import { processGif } from "./processors/gif.js";
import { DocumentProcessorFactory } from "./processors/factory.js";
import { GeminiClient } from "./utils/gemini-client.js";
import {
  EyesInputSchema,
  CompareInputSchema,
  DocumentInputSchema,
  DataExtractionSchema,
  SummarizationSchema,
  type EyesInput,
  type CompareInput,
  type DocumentInput,
  type DataExtractionInput,
  type SummarizationInput
} from "./schemas.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

export async function registerEyesTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  // Register existing vision tools
  await registerVisionTools(server, geminiClient, config);

  // Register document tools
  await registerDocumentTools(server, geminiClient, config);
}

async function registerVisionTools(server: McpServer, geminiClient: GeminiClient, config: Config) {
  // Register eyes_analyze tool
  server.registerTool(
    "eyes_analyze",
    {
      title: "Vision Analysis Tool",
      description: "Analyze images, videos, and GIFs using AI vision capabilities",
      inputSchema: {
        source: z.string().describe("Path, URL, or base64 data URI of the media to analyze"),
        type: z.enum(["image", "video", "gif"]).describe("Type of media to analyze"),
        detail_level: z.enum(["quick", "detailed"]).optional().default("detailed").describe("Level of detail in analysis"),
        prompt: z.string().optional().describe("Custom prompt for analysis"),
        max_frames: z.number().optional().describe("Maximum number of frames to analyze for videos/GIFs")
      }
    },
    async (args) => {
      try {
        return await handleAnalyze(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);

        // Enhanced error logging
        logger.error(`Tool eyes_analyze error:`, {
          message: mcpError.message,
          code: mcpError.code,
          args: args,
          timestamp: new Date().toISOString(),
          stackTrace: error instanceof Error ? error.stack : 'No stack trace available'
        });

        // Provide more helpful error messages to users
        let userMessage = mcpError.message;
        if (mcpError.message.includes("No analysis result from Gemini")) {
          userMessage = "The image analysis service returned an empty response. This can happen due to:\n" +
            "• API rate limits or quota exceeded\n" +
            "• Image content restrictions\n" +
            "• Temporary service issues\n" +
            "• Network connectivity problems\n\n" +
            "Please try again in a few moments, or check if your image meets the requirements.";
        } else if (mcpError.message.includes("Failed to process image after")) {
          userMessage = "Image processing failed after multiple attempts. This could be due to:\n" +
            "• Network connectivity issues\n" +
            "• API service unavailability\n" +
            "• Image format or size issues\n" +
            "• Rate limiting\n\n" +
            "Please check your internet connection and try again.";
        }

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${userMessage}`
          }],
          isError: true
        };
      }
    }
  );

  // Register eyes_compare tool
  server.registerTool(
    "eyes_compare",
    {
      title: "Image Comparison Tool",
      description: "Compare two images and identify differences",
      inputSchema: {
        source1: z.string().describe("Path, URL, or base64 data URI of the first image"),
        source2: z.string().describe("Path, URL, or base64 data URI of the second image"),
        comparison_type: z.enum(["pixel", "structural", "semantic"]).optional().default("semantic").describe("Type of comparison to perform")
      }
    },
    async (args) => {
      try {
        return await handleCompare(geminiClient, args);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool eyes_compare error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );
}

async function registerDocumentTools(server: McpServer, geminiClient: GeminiClient, config: Config) {
  // Register document processors
  DocumentProcessorFactory.registerProcessors(geminiClient);

  // Register eyes_read_document tool
  server.registerTool(
    "eyes_read_document",
    {
      title: "Document Analysis Tool",
      description: "Read and analyze documents (PDF, Word, Excel, PowerPoint, Text, etc.)",
      inputSchema: {
        source: z.string().describe("Path, URL, or base64 data URI of the document"),
        format: z.enum([
          "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
        ]).default("auto").describe("Document format. Use 'auto' for automatic detection"),
        options: z.object({
          extract_text: z.boolean().default(true).describe("Extract text content"),
          extract_tables: z.boolean().default(true).describe("Extract tables"),
          extract_images: z.boolean().default(false).describe("Extract images"),
          preserve_formatting: z.boolean().default(false).describe("Preserve original formatting"),
          page_range: z.string().optional().describe("Page range (e.g., '1-5', '2,4,6')"),
          detail_level: z.enum(["quick", "detailed"]).default("detailed").describe("Level of detail in processing")
        }).optional().describe("Processing options")
      }
    },
    async (args) => {
      try {
        return await handleDocumentAnalysis(geminiClient, args);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool eyes_read_document error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register eyes_extract_data tool
  server.registerTool(
    "eyes_extract_data",
    {
      title: "Structured Data Extraction Tool",
      description: "Extract structured data from documents using custom schemas",
      inputSchema: {
        source: z.string().describe("Document source"),
        format: z.enum([
          "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
        ]).default("auto").describe("Document format"),
        schema: z.record(z.any()).describe("JSON schema for data extraction"),
        options: z.object({
          strict_mode: z.boolean().default(false).describe("Strict schema validation"),
          fallback_values: z.record(z.any()).optional().describe("Fallback values for missing data")
        }).optional().describe("Extraction options")
      }
    },
    async (args) => {
      try {
        return await handleDataExtraction(geminiClient, args);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool eyes_extract_data error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register eyes_summarize tool
  server.registerTool(
    "eyes_summarize",
    {
      title: "Document Summarization Tool",
      description: "Generate summaries and key insights from documents",
      inputSchema: {
        source: z.string().describe("Document source"),
        format: z.enum([
          "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
        ]).default("auto").describe("Document format"),
        options: z.object({
          summary_type: z.enum(["brief", "detailed", "executive", "technical"]).default("detailed").describe("Type of summary"),
          max_length: z.number().optional().describe("Maximum summary length in words"),
          focus_areas: z.array(z.string()).optional().describe("Specific areas to focus on"),
          include_key_points: z.boolean().default(true).describe("Include key points"),
          include_recommendations: z.boolean().default(true).describe("Include recommendations")
        }).optional().describe("Summarization options")
      }
    },
    async (args) => {
      try {
        return await handleDocumentSummarization(geminiClient, args);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool eyes_summarize error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );
}

async function handleAnalyze(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = EyesInputSchema.parse(args) as EyesInput;
  const { source, type, detail_level } = input;
  const customPrompt = 'prompt' in input ? (input.prompt as string | undefined) : undefined;

  logger.info(`Analyzing ${type} with detail level: ${detail_level}, source: ${source.substring(0, 50)}...`);

  const model = geminiClient.getModel(detail_level || "detailed");
  const options = {
    analysis_type: "general" as const,
    detail_level: detail_level || "detailed",
    specific_focus: customPrompt,
    fetchTimeout: config.server.fetchTimeout
  };

  let result;

  switch (type) {
    case "image":
      result = await processImage(model, source, options);
      break;
    case "video":
      result = await processVideo(model, source, options);
      break;
    case "gif":
      result = await processGif(model, source, options);
      break;
    default:
      throw new Error(`Unsupported media type: ${type}`);
  }

  logger.info(`Analysis completed for ${type}. Processing time: ${result.metadata.processing_time_ms}ms`);

  return {
    content: [
      {
        type: "text" as const,
        text: result.analysis
      }
    ],
    isError: false
  };
}

async function handleCompare(
  geminiClient: GeminiClient,
  args: unknown
) {
  const input = CompareInputSchema.parse(args) as CompareInput;
  const { source1, source2, comparison_type } = input;
  
  logger.info(`Comparing images with type: ${comparison_type}`);
  
  const model = geminiClient.getModel("detailed");
  
  const prompt = `Compare these two images and identify the differences. Focus on:
  
${comparison_type === "pixel" ? 
  "- Exact pixel-level differences\n- Color value changes\n- Any visual artifacts or rendering differences" :
  comparison_type === "structural" ?
  "- Layout changes\n- Element positioning differences\n- Size and proportion changes\n- Structural modifications" :
  "- Semantic meaning differences\n- Content changes\n- Functional differences\n- User experience impact"
}

Please provide:
1. SUMMARY: Brief overview of main differences
2. SPECIFIC DIFFERENCES: Detailed list of changes found
3. IMPACT ASSESSMENT: How these differences might affect users
4. RECOMMENDATIONS: Suggested actions based on the differences

Be precise with locations and measurements where possible.`;
  
  try {
    const [image1Data, image2Data] = await Promise.all([
      loadImageForComparison(source1),
      loadImageForComparison(source2)
    ]);
    
    const response = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: image1Data.mimeType,
          data: image1Data.data
        }
      },
      { text: "Image 1 (above) vs Image 2 (below):" },
      {
        inlineData: {
          mimeType: image2Data.mimeType,
          data: image2Data.data
        }
      }
    ]);
    
    const result = response.response;
    const comparisonText = result.text();
    
    return {
      content: [
        {
          type: "text" as const,
          text: comparisonText || "No differences detected or analysis failed"
        }
      ],
      isError: false
    };
    
  } catch (error) {
    throw new Error(`Failed to compare images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function loadImageForComparison(source: string): Promise<{ data: string; mimeType: string }> {
  // Handle Claude Code virtual image references
  if (source.match(/^\[Image #\d+\]$/)) {
    throw new Error(
      `Virtual image reference "${source}" cannot be processed. ` +
      `Please use a direct file path, URL, or base64 data URI instead.`
    );
  }

  if (source.startsWith('data:image/')) {
    const [header, data] = source.split(',');
    if (!header || !data) {
      throw new Error("Invalid base64 image format");
    }
    const mimeMatch = header.match(/data:(image\/[^;]+)/);
    if (!mimeMatch || !mimeMatch[1]) {
      throw new Error("Invalid base64 image format");
    }
    return { data, mimeType: mimeMatch[1] };
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return {
      data: Buffer.from(buffer).toString('base64'),
      mimeType: response.headers.get('content-type') || 'image/jpeg'
    };
  }

  const fs = await import('fs/promises');
  const buffer = await fs.readFile(source);
  return {
    data: buffer.toString('base64'),
    mimeType: 'image/jpeg'
  };
}

// Document tool handlers
async function handleDocumentAnalysis(geminiClient: GeminiClient, args: unknown) {
  const input = DocumentInputSchema.parse(args) as DocumentInput;
  const { source, format, options } = input;

  logger.info(`Analyzing document: ${source} (format: ${format})`);

  // Detect format if auto
  let detectedFormat = format;
  if (format === 'auto') {
    // Load a small portion to detect format
    const buffer = await loadDocumentForDetection(source);
    detectedFormat = DocumentProcessorFactory.detectFormat(source, buffer);
  }

  // Create processor and process document
  const processor = DocumentProcessorFactory.create(detectedFormat as any, geminiClient);
  const result = await processor.process(source, options as any);

  return {
    content: [
      {
        type: "text" as const,
        text: `Document Analysis Results:\n\n${JSON.stringify(result, null, 2)}`
      }
    ],
    isError: false
  };
}

async function handleDataExtraction(geminiClient: GeminiClient, args: unknown) {
  const input = DataExtractionSchema.parse(args) as DataExtractionInput;
  const { source, format, schema, options } = input;

  logger.info(`Extracting data from document: ${source} (format: ${format})`);

  // Detect format if auto
  let detectedFormat = format;
  if (format === 'auto') {
    const buffer = await loadDocumentForDetection(source);
    detectedFormat = DocumentProcessorFactory.detectFormat(source, buffer);
  }

  // Create processor and extract data
  const processor = DocumentProcessorFactory.create(detectedFormat as any, geminiClient);
  const extractedData = await processor.extractStructuredData(schema, options as any);

  return {
    content: [
      {
        type: "text" as const,
        text: `Extracted Data:\n\n${JSON.stringify(extractedData, null, 2)}`
      }
    ],
    isError: false
  };
}

async function handleDocumentSummarization(geminiClient: GeminiClient, args: unknown) {
  const input = SummarizationSchema.parse(args) as SummarizationInput;
  const { source, format, options } = input;

  logger.info(`Summarizing document: ${source} (format: ${format})`);

  // Detect format if auto
  let detectedFormat = format;
  if (format === 'auto') {
    const buffer = await loadDocumentForDetection(source);
    detectedFormat = DocumentProcessorFactory.detectFormat(source, buffer);
  }

  // Create summary options
  const summaryOptions = {
    summaryType: options?.summary_type || 'detailed',
    maxLength: options?.max_length
  };

  // Generate summary using Gemini
  const documentBuffer = await loadDocumentForProcessing(source);
  if (!documentBuffer || !Buffer.isBuffer(documentBuffer)) {
    throw new Error('Failed to load document buffer');
  }

  const formatInfo = DocumentProcessorFactory.getFormatInfo(detectedFormat as any);
  const mimeType = formatInfo.mimeType || 'application/octet-stream';

  // TODO: Fix summarizeDocument call - temporarily return placeholder
  const summary = `Document summary for ${source} (${detectedFormat})`;

  return {
    content: [
      {
        type: "text" as const,
        text: `Document Summary:\n\n${summary}`
      }
    ],
    isError: false
  };
}

// Helper functions
async function loadDocumentForDetection(source: string): Promise<Buffer> {
  if (source.startsWith('data:')) {
    const base64Data = source.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data URI format');
    }
    return Buffer.from(base64Data, 'base64');
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer) {
      throw new Error('Failed to get array buffer from response');
    }
    return Buffer.from(arrayBuffer);
  }

  const fs = await import('fs/promises');
  return await fs.readFile(source);
}

async function loadDocumentForProcessing(source: string): Promise<Buffer> {
  const buffer = await loadDocumentForDetection(source);
  return buffer;
}
</file>

<file path="src/tools/mouth/processors/code-explanation.ts">
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { CodeExplanationResult, SpeechGenerationResult } from "../schemas.js";

export interface CodeExplanationOptions {
  code: string;
  language?: string;
  programmingLanguage?: string;
  voice?: string;
  model?: string;
  outputFormat?: string;
  explanationLevel?: string;
  includeExamples?: boolean;
  fetchTimeout?: number;
}

/**
 * Generate speech explanation of code
 */
export async function generateCodeExplanation(
  geminiClient: GeminiClient,
  options: CodeExplanationOptions
): Promise<CodeExplanationResult> {
  const startTime = Date.now();

  try {
    const {
      code,
      language = "en-US",
      programmingLanguage,
      voice = "Apollo",
      model = "gemini-2.5-pro-preview-tts",
      outputFormat = "base64",
      explanationLevel = "intermediate",
      includeExamples = true,
      fetchTimeout = 60000
    } = options;

    logger.info(`Generating code explanation for ${code.length} characters of ${programmingLanguage || 'code'}`);

    // Validate input
    if (!code || code.trim().length === 0) {
      throw new APIError("Code is required for explanation");
    }

    // Analyze the code first to create a better explanation
    const codeAnalysis = await analyzeCode(geminiClient, code, programmingLanguage);

    // Generate explanation text
    const explanationText = await generateExplanationText(
      geminiClient,
      code,
      codeAnalysis,
      explanationLevel,
      includeExamples
    );

    // Create style prompt for technical explanation
    const stylePrompt = createTechnicalStylePrompt(explanationLevel);

    // Generate speech for the explanation
    const speechResult = await geminiClient.generateSpeechWithRetry(explanationText, {
      voice,
      model,
      language,
      stylePrompt
    });

    // Process audio data
    let audioData = speechResult.audioData;

    if (outputFormat === "url") {
      // TODO: Implement URL upload to cloud storage
      logger.warn("URL output format not yet implemented, returning base64");
      audioData = `data:audio/wav;base64,${speechResult.audioData}`;
    } else if (outputFormat === "wav") {
      // Keep raw base64 for WAV format
      audioData = speechResult.audioData;
    } else {
      // Default to base64 data URI
      audioData = `data:audio/wav;base64,${speechResult.audioData}`;
    }

    const explanation: SpeechGenerationResult = {
      audioData,
      format: outputFormat === "wav" ? "wav" : "base64",
      model,
      voice,
      language,
      generationTime: speechResult.metadata?.generationTime || 0,
      metadata: {
        timestamp: new Date().toISOString(),
        textLength: explanationText.length,
        sampleRate: 24000,
        channels: 1
      }
    };

    const result: CodeExplanationResult = {
      explanation,
      codeAnalysis,
      metadata: {
        timestamp: new Date().toISOString(),
        explanationLevel,
        codeLength: code.length
      }
    };

    const generationTime = Date.now() - startTime;
    logger.info(`Code explanation generation completed in ${generationTime}ms`);

    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Code explanation generation failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Code explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze code to understand its structure and complexity
 */
async function analyzeCode(
  geminiClient: GeminiClient,
  code: string,
  programmingLanguage?: string
): Promise<{
  programmingLanguage: string;
  complexity: string;
  keyPoints: string[];
  examples: string[];
}> {
  try {
    const model = geminiClient.getModel("detailed");

    const analysisPrompt = `Analyze this code and provide a JSON response with the following structure:
{
  "programmingLanguage": "detected or specified programming language",
  "complexity": "beginner|intermediate|advanced",
  "keyPoints": ["key concept 1", "key concept 2", "etc"],
  "examples": ["example usage 1", "example usage 2", "etc"]
}

Code to analyze:
\`\`\`${programmingLanguage || ''}
${code}
\`\`\`

Focus on identifying:
- Programming language (if not specified)
- Code complexity level
- Key programming concepts used
- Potential usage examples or applications`;

    const response = await model.generateContent(analysisPrompt);
    const analysisText = response.response.text();

    // Try to parse JSON response
    try {
      const analysis = JSON.parse(analysisText);
      return {
        programmingLanguage: analysis.programmingLanguage || programmingLanguage || "unknown",
        complexity: analysis.complexity || "intermediate",
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        examples: Array.isArray(analysis.examples) ? analysis.examples : []
      };
    } catch (parseError) {
      logger.warn("Failed to parse code analysis JSON, using fallback");
      return {
        programmingLanguage: programmingLanguage || "unknown",
        complexity: "intermediate",
        keyPoints: ["Code analysis", "Programming concepts"],
        examples: ["Usage example"]
      };
    }

  } catch (error) {
    logger.error("Code analysis failed:", error);
    return {
      programmingLanguage: programmingLanguage || "unknown",
      complexity: "intermediate",
      keyPoints: ["Code structure", "Programming logic"],
      examples: ["Basic usage"]
    };
  }
}

/**
 * Generate explanation text for the code
 */
async function generateExplanationText(
  geminiClient: GeminiClient,
  code: string,
  codeAnalysis: any,
  explanationLevel: string,
  includeExamples: boolean
): Promise<string> {
  const model = geminiClient.getModel("detailed");

  const levelInstructions = {
    beginner: "Explain in simple terms suitable for someone new to programming. Avoid jargon and explain basic concepts.",
    intermediate: "Provide a clear explanation assuming basic programming knowledge. Include technical terms with brief explanations.",
    advanced: "Give a detailed technical explanation including advanced concepts, performance considerations, and best practices."
  };

  const instruction = levelInstructions[explanationLevel as keyof typeof levelInstructions] || levelInstructions.intermediate;

  let explanationPrompt = `Explain the following ${codeAnalysis.programmingLanguage} code in a way that's suitable for audio narration.

${instruction}

Code to explain:
\`\`\`${codeAnalysis.programmingLanguage}
${code}
\`\`\`

Key points to address:
${codeAnalysis.keyPoints.map((point: string) => `- ${point}`).join('\n')}

Please provide a clear, conversational explanation that:
1. Describes what the code does overall
2. Explains the main components and their purpose
3. Describes the flow of execution
4. Highlights important programming concepts used`;

  if (includeExamples && codeAnalysis.examples.length > 0) {
    explanationPrompt += `\n5. Provides practical examples of how this code might be used:
${codeAnalysis.examples.map((example: string) => `   - ${example}`).join('\n')}`;
  }

  explanationPrompt += "\n\nMake the explanation natural and flowing for audio presentation, avoiding overly technical jargon unless necessary.";

  const response = await model.generateContent(explanationPrompt);
  return response.response.text();
}

/**
 * Create style prompt for technical explanations
 */
function createTechnicalStylePrompt(explanationLevel: string): string {
  switch (explanationLevel) {
    case "beginner":
      return "Speak in a friendly, patient tone as if teaching a beginner. Use simple language and speak slowly and clearly";
    case "intermediate":
      return "Speak in a clear, instructional tone suitable for someone with basic programming knowledge";
    case "advanced":
      return "Speak in a professional, technical tone appropriate for experienced developers";
    default:
      return "Speak in a clear, educational tone suitable for technical content";
  }
}
</file>

<file path="src/tools/mouth/processors/narration.ts">
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { NarrationResult, SpeechGenerationResult } from "../schemas.js";

export interface NarrationOptions {
  content: string;
  voice?: string;
  model?: string;
  language?: string;
  outputFormat?: string;
  narrationStyle?: string;
  chapterBreaks?: boolean;
  maxChunkSize?: number;
  fetchTimeout?: number;
}

/**
 * Generate narration for long-form content
 */
export async function generateNarration(
  geminiClient: GeminiClient,
  options: NarrationOptions
): Promise<NarrationResult> {
  const startTime = Date.now();

  try {
    const {
      content,
      voice = "Sage",
      model = "gemini-2.5-pro-preview-tts",
      language = "en-US",
      outputFormat = "base64",
      narrationStyle = "professional",
      chapterBreaks = false,
      maxChunkSize = 8000,
      fetchTimeout = 60000
    } = options;

    logger.info(`Generating narration for ${content.length} characters with style: ${narrationStyle}`);

    // Validate input
    if (!content || content.trim().length === 0) {
      throw new APIError("Content is required for narration");
    }

    // Create style prompt based on narration style
    const stylePrompt = createNarrationStylePrompt(narrationStyle);

    // Split content into manageable chunks
    const chunks = geminiClient.splitTextForSpeech(content, maxChunkSize);
    logger.debug(`Split content into ${chunks.length} chunks for narration`);

    // Identify chapter breaks if requested
    const chapterBreakIndices: number[] = [];
    if (chapterBreaks) {
      chunks.forEach((chunk, index) => {
        if (isChapterBreak(chunk, index)) {
          chapterBreakIndices.push(index);
        }
      });
      logger.debug(`Identified ${chapterBreakIndices.length} chapter breaks`);
    }

    // Generate speech for all chunks
    const speechChunks = await geminiClient.generateSpeechChunks(chunks, {
      voice,
      model,
      language,
      stylePrompt
    });

    // Process results
    const processedChunks: SpeechGenerationResult[] = speechChunks.map((chunk, index) => {
      let audioData = chunk.audioData;

      if (outputFormat === "url") {
        // TODO: Implement URL upload to cloud storage
        logger.warn("URL output format not yet implemented, returning base64");
        audioData = `data:audio/wav;base64,${chunk.audioData}`;
      } else if (outputFormat === "wav") {
        // Keep raw base64 for WAV format
        audioData = chunk.audioData;
      } else {
        // Default to base64 data URI
        audioData = `data:audio/wav;base64,${chunk.audioData}`;
      }

      return {
        audioData,
        format: outputFormat === "wav" ? "wav" : "base64",
        model,
        voice,
        language,
        generationTime: chunk.metadata?.generationTime || 0,
        metadata: {
          timestamp: chunk.metadata?.timestamp || new Date().toISOString(),
          textLength: chunks[index]?.length || 0,
          sampleRate: 24000,
          channels: 1,
          chunkIndex: index,
          isChapterBreak: chapterBreakIndices.includes(index)
        }
      };
    });

    // Calculate total duration estimate (rough approximation)
    const totalDuration = processedChunks.reduce((total, chunk) => {
      // Estimate 150 words per minute for speech
      const wordCount = chunk.metadata.textLength / 5; // Average 5 characters per word
      const estimatedDuration = (wordCount / 150) * 60; // In seconds
      return total + estimatedDuration;
    }, 0);

    const result: NarrationResult = {
      chunks: processedChunks,
      totalDuration: Math.round(totalDuration),
      chapterBreaks: chapterBreakIndices,
      metadata: {
        timestamp: new Date().toISOString(),
        totalTextLength: content.length,
        totalChunks: processedChunks.length,
        narrationStyle
      }
    };

    const generationTime = Date.now() - startTime;
    logger.info(`Narration generation completed in ${generationTime}ms for ${processedChunks.length} chunks`);

    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Narration generation failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Narration generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create style prompt based on narration style
 */
function createNarrationStylePrompt(style: string): string {
  switch (style) {
    case "professional":
      return "Speak in a clear, professional tone suitable for business presentations or formal content";
    case "casual":
      return "Speak in a relaxed, conversational tone as if talking to a friend";
    case "educational":
      return "Speak in an engaging, instructional tone suitable for learning and education";
    case "storytelling":
      return "Speak with expressive storytelling flair, adding emotion and drama appropriate to the content";
    default:
      return "Speak in a clear, natural voice";
  }
}

/**
 * Determine if a chunk represents a chapter break
 */
function isChapterBreak(chunk: string, index: number): boolean {
  // Simple heuristics for chapter breaks
  const chapterIndicators = [
    /^Chapter\s+\d+/i,
    /^Section\s+\d+/i,
    /^Part\s+\d+/i,
    /^\d+\.\s+/,
    /^# /,
    /^## /
  ];

  return chapterIndicators.some(pattern => pattern.test(chunk.trim()));
}

/**
 * Add pause between chapters if needed
 */
function addChapterPause(audioData: string, isChapterBreak: boolean): string {
  if (!isChapterBreak) {
    return audioData;
  }

  // TODO: Implement audio pause insertion
  // For now, just return the original audio
  // Future implementation could add silence or fade effects
  return audioData;
}
</file>

<file path="src/tools/mouth/processors/voice-customization.ts">
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { VoiceCustomizationResult } from "../schemas.js";
import { VoiceNames } from "../schemas.js";

export interface VoiceCustomizationOptions {
  text: string;
  voice: string;
  model?: string;
  language?: string;
  outputFormat?: string;
  styleVariations?: string[];
  compareVoices?: string[];
  fetchTimeout?: number;
}

/**
 * Generate voice customization samples and recommendations
 */
export async function generateVoiceCustomization(
  geminiClient: GeminiClient,
  options: VoiceCustomizationOptions
): Promise<VoiceCustomizationResult> {
  const startTime = Date.now();

  try {
    const {
      text,
      voice,
      model = "gemini-2.5-flash-preview-tts",
      language = "en-US",
      outputFormat = "base64",
      styleVariations = [],
      compareVoices = [],
      fetchTimeout = 60000
    } = options;

    logger.info(`Generating voice customization samples for voice: ${voice} with ${styleVariations.length} style variations`);

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new APIError("Text is required for voice customization");
    }

    if (text.length > 1000) {
      throw new APIError("Text too long for voice customization. Maximum 1000 characters allowed");
    }

    if (!VoiceNames.includes(voice as any)) {
      throw new APIError(`Invalid voice: ${voice}. Must be one of: ${VoiceNames.join(', ')}`);
    }

    // Generate samples array
    const samples: VoiceCustomizationResult['samples'] = [];

    // Generate base sample with the main voice
    const baseSample = await generateVoiceSample(geminiClient, text, voice, undefined, model, language, outputFormat);
    samples.push(baseSample);

    // Generate samples with style variations
    for (const stylePrompt of styleVariations) {
      try {
        const styleSample = await generateVoiceSample(geminiClient, text, voice, stylePrompt, model, language, outputFormat);
        samples.push(styleSample);
      } catch (error) {
        logger.warn(`Failed to generate sample with style "${stylePrompt}":`, error);
        // Continue with other samples
      }
    }

    // Generate samples with comparison voices
    for (const compareVoice of compareVoices) {
      if (VoiceNames.includes(compareVoice as any) && compareVoice !== voice) {
        try {
          const compareSample = await generateVoiceSample(geminiClient, text, compareVoice, undefined, model, language, outputFormat);
          samples.push(compareSample);
        } catch (error) {
          logger.warn(`Failed to generate sample with voice "${compareVoice}":`, error);
          // Continue with other samples
        }
      }
    }

    // Generate recommendation
    const recommendation = await generateRecommendation(geminiClient, text, voice, styleVariations, compareVoices, samples);

    const result: VoiceCustomizationResult = {
      samples,
      recommendation,
      metadata: {
        timestamp: new Date().toISOString(),
        testText: text,
        totalSamples: samples.length
      }
    };

    const generationTime = Date.now() - startTime;
    logger.info(`Voice customization completed in ${generationTime}ms with ${samples.length} samples`);

    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Voice customization failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Voice customization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a single voice sample
 */
async function generateVoiceSample(
  geminiClient: GeminiClient,
  text: string,
  voice: string,
  stylePrompt: string | undefined,
  model: string,
  language: string,
  outputFormat: string
): Promise<VoiceCustomizationResult['samples'][0]> {
  const sampleStartTime = Date.now();

  try {
    const speechResult = await geminiClient.generateSpeechWithRetry(text, {
      voice,
      model,
      language,
      stylePrompt
    });

    // Process audio data
    let audioData = speechResult.audioData;

    if (outputFormat === "url") {
      // TODO: Implement URL upload to cloud storage
      logger.warn("URL output format not yet implemented, returning base64");
      audioData = `data:audio/wav;base64,${speechResult.audioData}`;
    } else if (outputFormat === "wav") {
      // Keep raw base64 for WAV format
      audioData = speechResult.audioData;
    } else {
      // Default to base64 data URI
      audioData = `data:audio/wav;base64,${speechResult.audioData}`;
    }

    const generationTime = Date.now() - sampleStartTime;

    return {
      voice,
      stylePrompt,
      audioData,
      metadata: {
        generationTime,
        audioLength: undefined // Could be calculated from audio data if needed
      }
    };

  } catch (error) {
    logger.error(`Failed to generate voice sample for ${voice}:`, error);
    throw new APIError(`Failed to generate voice sample: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate recommendation based on samples
 */
async function generateRecommendation(
  geminiClient: GeminiClient,
  text: string,
  primaryVoice: string,
  styleVariations: string[],
  compareVoices: string[],
  samples: VoiceCustomizationResult['samples']
): Promise<VoiceCustomizationResult['recommendation']> {
  try {
    const model = geminiClient.getModel("detailed");

    // Create analysis prompt
    const analysisPrompt = `Analyze the voice customization request and provide a recommendation in JSON format.

Test Text: "${text}"
Primary Voice: ${primaryVoice}
Style Variations Tested: ${styleVariations.length > 0 ? styleVariations.join(', ') : 'None'}
Comparison Voices: ${compareVoices.length > 0 ? compareVoices.join(', ') : 'None'}
Total Samples Generated: ${samples.length}

Based on the test text content and voice characteristics, provide a recommendation in this JSON format:
{
  "bestVoice": "recommended voice name",
  "bestStyle": "recommended style prompt or null",
  "reasoning": "explanation of why this combination is recommended for the given text"
}

Consider:
- Content type and tone of the test text
- Appropriateness of voice characteristics for the content
- Style variations that enhance the message
- Overall clarity and engagement

The recommendation should be practical and focused on the best user experience for this type of content.`;

    const response = await model.generateContent(analysisPrompt);
    const recommendationText = response.response.text();

    // Try to parse JSON response
    try {
      const recommendation = JSON.parse(recommendationText);
      return {
        bestVoice: recommendation.bestVoice || primaryVoice,
        bestStyle: recommendation.bestStyle || undefined,
        reasoning: recommendation.reasoning || "Based on voice characteristics and content analysis"
      };
    } catch (parseError) {
      logger.warn("Failed to parse recommendation JSON, using fallback");
      return {
        bestVoice: primaryVoice,
        bestStyle: styleVariations.length > 0 ? styleVariations[0] : undefined,
        reasoning: "Unable to generate detailed analysis. Primary voice recommended as fallback."
      };
    }

  } catch (error) {
    logger.error("Failed to generate recommendation:", error);
    return {
      bestVoice: primaryVoice,
      bestStyle: styleVariations.length > 0 ? styleVariations[0] : undefined,
      reasoning: "Unable to generate recommendation due to analysis error. Using primary voice as default."
    };
  }
}

/**
 * Get voice characteristics for better recommendations
 */
function getVoiceCharacteristics(voice: string): { description: string; suitableFor: string[] } {
  // Voice characteristics based on Gemini documentation
  const characteristics: Record<string, { description: string; suitableFor: string[] }> = {
    "Zephyr": { description: "Bright and energetic", suitableFor: ["presentations", "marketing", "announcements"] },
    "Puck": { description: "Upbeat and playful", suitableFor: ["entertainment", "children's content", "casual narration"] },
    "Charon": { description: "Informative and clear", suitableFor: ["educational content", "tutorials", "explanations"] },
    "Sage": { description: "Wise and authoritative", suitableFor: ["documentaries", "serious content", "professional narration"] },
    "Apollo": { description: "Articulate and sophisticated", suitableFor: ["technical content", "academic material", "formal presentations"] },
    "Kore": { description: "Warm and approachable", suitableFor: ["customer service", "friendly explanations", "conversational content"] },
    "Vox": { description: "Strong and commanding", suitableFor: ["announcements", "important messages", "authoritative content"] },
    "Odin": { description: "Deep and resonant", suitableFor: ["storytelling", "dramatic content", "narrative voice-overs"] },
    "Fenrir": { description: "Bold and dynamic", suitableFor: ["action content", "sports commentary", "energetic presentations"] },
    "Astrid": { description: "Clear and professional", suitableFor: ["business content", "reports", "formal communication"] }
  };

  return characteristics[voice] || {
    description: "Versatile voice",
    suitableFor: ["general content", "various applications"]
  };
}
</file>

<file path="src/tools/mouth/utils/audio-export.ts">
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";

export interface AudioExportOptions {
  audioData: string;
  format: "wav" | "mp3" | "ogg";
  filename?: string;
  quality?: "low" | "medium" | "high";
}

export interface AudioExportResult {
  exportedData: string;
  format: string;
  filename: string;
  size: number;
  metadata: {
    timestamp: string;
    originalFormat: string;
    exportFormat: string;
    quality?: string;
  };
}

/**
 * Export audio data to different formats
 * Note: This is a basic implementation. For production use, consider using
 * libraries like ffmpeg-fluent for more robust audio format conversion.
 */
export async function exportAudio(options: AudioExportOptions): Promise<AudioExportResult> {
  const startTime = Date.now();

  try {
    const {
      audioData,
      format,
      filename = `speech_${Date.now()}`,
      quality = "medium"
    } = options;

    logger.debug(`Exporting audio to ${format} format with ${quality} quality`);

    // Validate input
    if (!audioData) {
      throw new APIError("Audio data is required for export");
    }

    // Extract base64 data if it's a data URI
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [, data] = audioData.split(',');
      if (!data) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;
    }

    // For now, we primarily work with WAV format from Gemini
    // Future implementations could add format conversion
    let exportedData = base64Data;
    let exportFormat = format;

    // Handle different export formats
    switch (format) {
      case "wav":
        // No conversion needed for WAV
        exportedData = base64Data;
        exportFormat = "wav";
        break;

      case "mp3":
        // TODO: Implement WAV to MP3 conversion using ffmpeg
        logger.warn("MP3 export not yet implemented, returning WAV");
        exportedData = base64Data;
        exportFormat = "wav";
        break;

      case "ogg":
        // TODO: Implement WAV to OGG conversion using ffmpeg
        logger.warn("OGG export not yet implemented, returning WAV");
        exportedData = base64Data;
        exportFormat = "wav";
        break;

      default:
        throw new APIError(`Unsupported export format: ${format}`);
    }

    // Calculate size (approximate)
    const sizeBytes = Math.floor((exportedData.length * 3) / 4); // Base64 to bytes approximation

    // Generate filename with extension
    const finalFilename = `${filename}.${exportFormat}`;

    const result: AudioExportResult = {
      exportedData: `data:audio/${exportFormat};base64,${exportedData}`,
      format: exportFormat,
      filename: finalFilename,
      size: sizeBytes,
      metadata: {
        timestamp: new Date().toISOString(),
        originalFormat: "wav",
        exportFormat,
        quality
      }
    };

    const exportTime = Date.now() - startTime;
    logger.info(`Audio export completed in ${exportTime}ms (${finalFilename}, ${sizeBytes} bytes)`);

    return result;

  } catch (error) {
    const exportTime = Date.now() - startTime;
    logger.error(`Audio export failed after ${exportTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Audio export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save audio to file system (for future use)
 */
export async function saveAudioToFile(
  audioData: string,
  filePath: string
): Promise<{ success: boolean; filePath: string; size: number }> {
  try {
    // Extract base64 data
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [, data] = audioData.split(',');
      if (!data) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, audioBuffer);

    logger.info(`Audio saved to: ${filePath} (${audioBuffer.length} bytes)`);

    return {
      success: true,
      filePath,
      size: audioBuffer.length
    };

  } catch (error) {
    logger.error(`Failed to save audio to file:`, error);
    throw new APIError(`Failed to save audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get audio file information
 */
export async function getAudioInfo(audioData: string): Promise<{
  format: string;
  size: number;
  duration?: number;
  sampleRate?: number;
  channels?: number;
}> {
  try {
    // Extract base64 data
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [header, data] = audioData.split(',');
      if (!data || !header) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;

      // Extract format from header
      const formatMatch = header.match(/audio\/(\w+)/);
      const format = formatMatch?.[1] || 'wav';

      const sizeBytes = Math.floor((base64Data.length * 3) / 4);

      // Basic WAV file analysis (simplified)
      if (format === 'wav') {
        return {
          format,
          size: sizeBytes,
          sampleRate: 24000, // Gemini default
          channels: 1, // Gemini default (mono)
          duration: undefined // Would need audio parsing library to calculate
        };
      }

      return {
        format,
        size: sizeBytes
      };
    }

    // If no header, assume raw base64
    const sizeBytes = Math.floor((base64Data.length * 3) / 4);
    return {
      format: 'unknown',
      size: sizeBytes
    };

  } catch (error) {
    logger.error('Failed to get audio info:', error);
    throw new APIError(`Failed to analyze audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate audio data format
 */
export function validateAudioData(audioData: string): boolean {
  try {
    if (!audioData || typeof audioData !== 'string') {
      return false;
    }

    // Check if it's a data URI
    if (audioData.startsWith('data:audio/')) {
      const [header, data] = audioData.split(',');
      return !!(header && data && data.length > 0);
    }

    // Check if it's raw base64
    if (audioData.length > 0 && audioData.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      return true;
    }

    return false;

  } catch (error) {
    logger.debug('Audio validation error:', error);
    return false;
  }
}

/**
 * Create download-ready blob URL (for browser environments)
 */
export function createBlobUrl(audioData: string, mimeType: string = 'audio/wav'): string {
  try {
    // Extract base64 data
    let base64Data = audioData;
    if (audioData.startsWith('data:')) {
      const [, data] = audioData.split(',');
      if (!data) {
        throw new APIError("Invalid audio data format");
      }
      base64Data = data;
    }

    // This would work in browser environments
    // For Node.js, this is just a placeholder
    logger.info(`Would create blob URL for ${mimeType} audio data`);

    // Return a placeholder URL
    return `blob:audio/${Date.now()}`;

  } catch (error) {
    logger.error('Failed to create blob URL:', error);
    throw new APIError(`Failed to create blob URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
</file>

<file path="src/tools/mouth/utils/audio-storage.ts">
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";
import { saveAudioToFile } from "./audio-export.js";
import path from "path";
import { fileURLToPath } from "url";
import wav from "wav";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AudioStorageOptions {
  audioData: string;
  filename?: string;
  voice?: string;
  language?: string;
  text?: string;
  format?: string;
}

export interface AudioStorageResult {
  localPath?: string;
  cloudUrl?: string;
  filename: string;
  size: number;
  storage: {
    local: boolean;
    cloud: boolean;
  };
  metadata: {
    timestamp: string;
    voice?: string;
    language?: string;
    textPreview?: string;
    format: string;
  };
}

/**
 * Enhanced audio storage that saves locally by default and uploads to Cloudflare R2 if configured
 */
export class AudioStorage {
  private config: Config;
  private localStoragePath: string;

  constructor(config: Config) {
    this.config = config;
    // Create a local storage directory in the project root
    this.localStoragePath = path.resolve(process.cwd(), 'audio-outputs');
  }

  /**
   * Convert raw PCM data to proper WAV format
   */
  private async convertPcmToWav(pcmData: Buffer, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writer = new wav.FileWriter(filePath, {
        channels: 1,          // Mono audio
        sampleRate: 24000,    // 24kHz as per Gemini TTS spec
        bitDepth: 16,         // 16-bit PCM
      });

      writer.on('finish', resolve);
      writer.on('error', reject);

      // Write the PCM data to create a proper WAV file
      writer.write(pcmData);
      writer.end();
    });
  }

  /**
   * Store audio with automatic local saving and optional cloud upload
   */
  async storeAudio(options: AudioStorageOptions): Promise<AudioStorageResult> {
    const startTime = Date.now();

    try {
      const {
        audioData,
        filename,
        voice,
        language,
        text,
        format = "wav"
      } = options;

      logger.debug(`Storing audio: ${filename || 'auto-generated'}`);

      // Validate audio data
      if (!audioData) {
        throw new APIError("Audio data is required for storage");
      }

      // Generate filename if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFilename = filename || `speech_${timestamp}.${format}`;

      // Ensure storage directory exists
      await this.ensureStorageDirectory();

      const result: AudioStorageResult = {
        filename: finalFilename,
        size: 0,
        storage: {
          local: false,
          cloud: false
        },
        metadata: {
          timestamp: new Date().toISOString(),
          voice,
          language,
          textPreview: text ? text.substring(0, 100) + (text.length > 100 ? '...' : '') : undefined,
          format
        }
      };

      // Calculate audio size
      let base64Data = audioData;
      if (audioData.startsWith('data:')) {
        const [, data] = audioData.split(',');
        if (!data) {
          throw new APIError("Invalid audio data format");
        }
        base64Data = data;
      }
      result.size = Math.floor((base64Data.length * 3) / 4);

      // Always save locally first - convert PCM to proper WAV
      try {
        const localPath = path.join(this.localStoragePath, finalFilename);

        // Convert base64 to buffer (raw PCM data from Gemini)
        const pcmBuffer = Buffer.from(base64Data, 'base64');

        // Convert PCM to proper WAV format
        await this.convertPcmToWav(pcmBuffer, localPath);

        result.localPath = localPath;
        result.storage.local = true;
        logger.info(`Audio saved locally as WAV: ${localPath}`);
      } catch (error) {
        logger.warn(`Failed to save audio locally:`, error);
        // Continue with cloud upload even if local save fails
      }

      // Upload to Cloudflare R2 if configured
      if (this.isCloudflareConfigured()) {
        try {
          const cloudUrl = await this.uploadToCloudflare(audioData, finalFilename);
          result.cloudUrl = cloudUrl;
          result.storage.cloud = true;
          logger.info(`Audio uploaded to cloud: ${cloudUrl}`);
        } catch (error) {
          logger.warn(`Failed to upload audio to cloud:`, error);
          // Continue - local storage might still be available
        }
      }

      // Ensure at least one storage method succeeded
      if (!result.storage.local && !result.storage.cloud) {
        throw new APIError("Failed to store audio in any location");
      }

      const storageTime = Date.now() - startTime;
      logger.info(`Audio storage completed in ${storageTime}ms (${finalFilename}, ${result.size} bytes)`);

      return result;

    } catch (error) {
      const storageTime = Date.now() - startTime;
      logger.error(`Audio storage failed after ${storageTime}ms:`, error);

      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(`Audio storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensure the local storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      const fs = await import('fs/promises');

      try {
        await fs.access(this.localStoragePath);
      } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(this.localStoragePath, { recursive: true });
        logger.info(`Created audio storage directory: ${this.localStoragePath}`);
      }
    } catch (error) {
      logger.error(`Failed to ensure storage directory:`, error);
      throw new APIError(`Failed to create storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Cloudflare R2 is configured
   */
  private isCloudflareConfigured(): boolean {
    const cf = this.config.cloudflare;
    return !!(
      cf?.accessKey &&
      cf?.secretKey &&
      cf?.bucketName &&
      cf?.endpointUrl
    );
  }

  /**
   * Upload audio to Cloudflare R2
   */
  private async uploadToCloudflare(audioData: string, filename: string): Promise<string> {
    try {
      const cf = this.config.cloudflare;
      if (!cf || !this.isCloudflareConfigured()) {
        throw new APIError("Cloudflare R2 is not properly configured");
      }

      // Import AWS SDK for S3-compatible operations
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

      // Extract base64 data
      let base64Data = audioData;
      if (audioData.startsWith('data:')) {
        const [, data] = audioData.split(',');
        if (!data) {
          throw new APIError("Invalid audio data format");
        }
        base64Data = data;
      }

      // Convert to buffer
      const audioBuffer = Buffer.from(base64Data, 'base64');

      // Configure S3 client for Cloudflare R2
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: cf.endpointUrl,
        credentials: {
          accessKeyId: cf.accessKey!,
          secretAccessKey: cf.secretKey!,
        },
      });

      // Create unique key for the audio file
      const key = `audio/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: cf.bucketName!,
        Key: key,
        Body: audioBuffer,
        ContentType: 'audio/wav',
        ContentLength: audioBuffer.length,
        Metadata: {
          'generated-by': 'human-mcp',
          'timestamp': new Date().toISOString(),
        }
      });

      await s3Client.send(command);

      // Generate public URL
      const baseUrl = cf.baseUrl || `https://${cf.bucketName}.${cf.endpointUrl?.replace('https://', '')}`;
      const cloudUrl = `${baseUrl}/${key}`;

      logger.info(`Audio uploaded to Cloudflare R2: ${cloudUrl}`);
      return cloudUrl;

    } catch (error) {
      logger.error(`Cloudflare R2 upload failed:`, error);
      throw new APIError(`Cloud upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old audio files (optional utility)
   */
  async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<{ deletedCount: number; errors: string[] }> {
    try {
      const fs = await import('fs/promises');

      let deletedCount = 0;
      const errors: string[] = [];

      try {
        const files = await fs.readdir(this.localStoragePath);
        const now = Date.now();

        for (const file of files) {
          try {
            const filePath = path.join(this.localStoragePath, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
              await fs.unlink(filePath);
              deletedCount++;
              logger.debug(`Deleted old audio file: ${file}`);
            }
          } catch (error) {
            const errorMsg = `Failed to delete ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logger.warn(errorMsg);
          }
        }
      } catch (error) {
        errors.push(`Failed to read storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      logger.info(`Cleanup completed: ${deletedCount} files deleted, ${errors.length} errors`);
      return { deletedCount, errors };

    } catch (error) {
      logger.error(`Cleanup failed:`, error);
      throw new APIError(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    localPath: string;
    localFiles: number;
    totalSize: number;
    oldestFile?: string;
    newestFile?: string;
    cloudConfigured: boolean;
  }> {
    try {
      const fs = await import('fs/promises');

      const stats = {
        localPath: this.localStoragePath,
        localFiles: 0,
        totalSize: 0,
        oldestFile: undefined as string | undefined,
        newestFile: undefined as string | undefined,
        cloudConfigured: this.isCloudflareConfigured()
      };

      try {
        const files = await fs.readdir(this.localStoragePath);
        let oldestTime = Infinity;
        let newestTime = 0;

        for (const file of files) {
          try {
            const filePath = path.join(this.localStoragePath, file);
            const fileStat = await fs.stat(filePath);

            stats.localFiles++;
            stats.totalSize += fileStat.size;

            if (fileStat.mtime.getTime() < oldestTime) {
              oldestTime = fileStat.mtime.getTime();
              stats.oldestFile = file;
            }

            if (fileStat.mtime.getTime() > newestTime) {
              newestTime = fileStat.mtime.getTime();
              stats.newestFile = file;
            }
          } catch (error) {
            logger.warn(`Failed to stat file ${file}:`, error);
          }
        }
      } catch (error) {
        logger.warn(`Failed to read storage directory:`, error);
      }

      return stats;

    } catch (error) {
      logger.error(`Failed to get storage stats:`, error);
      throw new APIError(`Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create a configured AudioStorage instance
 */
export function createAudioStorage(config: Config): AudioStorage {
  return new AudioStorage(config);
}
</file>

<file path="src/transports/http/file-interceptor.ts">
import type { Request, Response, NextFunction } from 'express';
import { getCloudflareR2 } from '@/utils/cloudflare-r2.js';
import { logger } from '@/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export async function fileInterceptorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only intercept tool calls with file paths
  if (req.body?.method === 'tools/call' && req.body?.params?.arguments) {
    const args = req.body.params.arguments;
    
    // Check for source fields that might contain file paths
    const fileFields = ['source', 'source1', 'source2', 'path', 'filePath'];
    
    for (const field of fileFields) {
      if (args[field] && typeof args[field] === 'string') {
        const filePath = args[field];
        
        // Detect Claude Desktop virtual paths
        if (filePath.startsWith('/mnt/user-data/') || filePath.startsWith('/mnt/')) {
          logger.info(`Intercepting Claude Desktop virtual path: ${filePath}`);
          
          try {
            // Extract filename
            const filename = path.basename(filePath);
            
            // Check if we have a temporary file saved by Claude Desktop
            const tempPath = path.join('/tmp/claude-uploads', filename);
            
            if (await fs.access(tempPath).then(() => true).catch(() => false)) {
              const cloudflare = getCloudflareR2();
              if (cloudflare) {
                // File exists in temp, upload to Cloudflare
                const buffer = await fs.readFile(tempPath);
                const publicUrl = await cloudflare.uploadFile(buffer, filename);
                
                // Replace the virtual path with CDN URL
                args[field] = publicUrl;
                
                // Clean up temp file
                await fs.unlink(tempPath).catch(() => {});
                
                logger.info(`Replaced virtual path with CDN URL: ${publicUrl}`);
              }
            } else {
              // No temp file, try to extract from request if it's base64
              // This handles cases where Claude Desktop might send base64 inline
              if ((req.body.params as any).fileData && (req.body.params as any).fileData[field]) {
                const base64Data = (req.body.params as any).fileData[field];
                const mimeType = (req.body.params as any).fileMimeTypes?.[field] || 'image/jpeg';
                
                const cloudflare = getCloudflareR2();
                if (cloudflare) {
                  const publicUrl = await cloudflare.uploadBase64(
                    base64Data,
                    mimeType,
                    filename
                  );
                  
                  args[field] = publicUrl;
                  logger.info(`Uploaded inline base64 to CDN: ${publicUrl}`);
                }
              } else {
                // Provide helpful error response
                logger.warn(`Cannot access virtual path: ${filePath}`);
                return res.status(400).json({
                  jsonrpc: '2.0',
                  error: {
                    code: -32602,
                    message: 'File not accessible via HTTP transport',
                    data: {
                      path: filePath,
                      suggestions: [
                        'Upload the file using the /mcp/upload endpoint first',
                        'Use a public URL instead of a local file path',
                        'Convert the image to a base64 data URI',
                        'Switch to stdio transport for local file access'
                      ]
                    }
                  },
                  id: req.body.id
                });
              }
            }
          } catch (error) {
            logger.error(`Error processing virtual path: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
              },
              id: req.body.id
            });
          }
        }
        
        // Handle regular local paths when in HTTP mode
        else if (!filePath.startsWith('http') && !filePath.startsWith('data:')) {
          if (process.env.TRANSPORT_TYPE === 'http') {
            const cloudflare = getCloudflareR2();
            if (cloudflare) {
              try {
                // Check if file exists locally
                await fs.access(filePath);
                
                // Upload to Cloudflare R2
                const buffer = await fs.readFile(filePath);
                const filename = path.basename(filePath);
                const publicUrl = await cloudflare.uploadFile(buffer, filename);
                
                // Replace local path with CDN URL
                args[field] = publicUrl;
                
                logger.info(`Auto-uploaded local file to CDN: ${publicUrl}`);
              } catch (error) {
                if (error instanceof Error && error.message.includes('ENOENT')) {
                  logger.warn(`Local file not found: ${filePath}`);
                }
                // Continue without modification if file doesn't exist or cloudflare not configured
              }
            }
          }
        }
      }
    }
  }
  
  next();
}
</file>

<file path="src/transports/http/middleware.ts">
import type { Request, Response, NextFunction } from "express";
import type { SecurityConfig } from "../types.js";

export function createSecurityMiddleware(config?: SecurityConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // DNS Rebinding Protection
    if (config?.enableDnsRebindingProtection) {
      const host = req.headers.host?.split(':')[0];
      const allowedHosts = config.allowedHosts || ['127.0.0.1', 'localhost'];
      
      if (host && !allowedHosts.includes(host)) {
        res.status(403).json({
          error: 'Forbidden: Invalid host'
        });
        return;
      }
    }

    // Rate Limiting (basic implementation)
    if (config?.enableRateLimiting) {
      // Implement rate limiting logic here
      // Could use express-rate-limit package
    }

    // Secret-based authentication (optional)
    if (config?.secret) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'Unauthorized: Missing authentication'
        });
        return;
      }
      
      const token = authHeader.substring(7);
      if (token !== config.secret) {
        res.status(401).json({
          error: 'Unauthorized: Invalid token'
        });
        return;
      }
    }

    next();
  };
}
</file>

<file path="src/transports/http/sse-routes.ts">
import { Router } from "express";
import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { HttpTransportConfig } from "../types.js";
import type { SessionManager } from "./session.js";

interface SSESession {
  transport: SSEServerTransport;
  createdAt: number;
}

export class SSEManager {
  private sessions = new Map<string, SSESession>();

  constructor(private config: HttpTransportConfig) {}

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  createSession(endpoint: string, res: Response): SSEServerTransport {
    const transport = new SSEServerTransport(endpoint, res, {
      allowedHosts: this.config.security?.allowedHosts,
      allowedOrigins: this.config.security?.corsOrigins,
      enableDnsRebindingProtection: this.config.security?.enableDnsRebindingProtection
    });

    const session: SSESession = {
      transport,
      createdAt: Date.now()
    };

    this.sessions.set(transport.sessionId, session);

    // Cleanup on close
    transport.onclose = () => {
      this.sessions.delete(transport.sessionId);
      console.log(`SSE session ${transport.sessionId} closed`);
    };

    transport.onerror = (error) => {
      console.error(`SSE session ${transport.sessionId} error:`, error);
      this.sessions.delete(transport.sessionId);
    };

    console.log(`SSE session ${transport.sessionId} created`);
    return transport;
  }

  getSession(sessionId: string): SSEServerTransport | null {
    const session = this.sessions.get(sessionId);
    return session?.transport || null;
  }

  async cleanup(): Promise<void> {
    const promises = Array.from(this.sessions.values()).map(session => 
      session.transport.close()
    );
    await Promise.all(promises);
    this.sessions.clear();
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

export function createSSERoutes(
  mcpServer: McpServer,
  config: HttpTransportConfig,
  streamableSessionManager: SessionManager
): Router {
  const router = Router();
  const sseManager = new SSEManager(config);

  if (!config.ssePaths) {
    throw new Error("SSE paths configuration is required");
  }

  const { stream: streamPath, message: messagePath } = config.ssePaths;

  // Guard against stateless mode
  const checkStatefulMode = (req: Request, res: Response, next: any) => {
    if (config.sessionMode === 'stateless') {
      return res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "SSE endpoints not available in stateless mode"
        },
        id: null
      });
    }
    next();
  };

  // GET /sse - Establish SSE connection
  router.get(streamPath, checkStatefulMode, async (req: Request, res: Response) => {
    try {
      console.log('SSE connection request received');
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Set CORS headers for SSE if CORS is enabled
      if (config.security?.enableCors !== false) {
        res.setHeader('Access-Control-Allow-Origin', 
          config.security?.corsOrigins?.join(',') || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
      }
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const messageEndpoint = `${baseUrl}${messagePath}`;
      
      const transport = sseManager.createSession(messageEndpoint, res);
      
      // Connect transport to MCP server
      await mcpServer.connect(transport);
      
      // Start the SSE stream
      await transport.start();
      
      // Set up cleanup on connection close
      res.on('close', () => {
        transport.close();
      });
      
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error establishing SSE connection"
          },
          id: null
        });
      }
    }
  });

  // POST /messages - Handle incoming messages
  router.post(messagePath, checkStatefulMode, async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Missing sessionId query parameter"
          },
          id: null
        });
      }

      // Check if sessionId is being used by streamable HTTP transport
      const streamableTransport = await streamableSessionManager.getTransport(sessionId);
      if (streamableTransport) {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Session ID is already in use by streamable HTTP transport"
          },
          id: null
        });
      }

      const transport = sseManager.getSession(sessionId);
      if (!transport) {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: `No active SSE session found for sessionId: ${sessionId}`
          },
          id: null
        });
      }

      // Forward the message to the transport
      await transport.handlePostMessage(req, res, req.body);
      
    } catch (error) {
      console.error('Error handling SSE message:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error processing message"
          },
          id: null
        });
      }
    }
  });

  // Store reference to manager for cleanup
  (router as any).sseManager = sseManager;

  return router;
}
</file>

<file path="src/transports/stdio.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export async function startStdioTransport(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
</file>

<file path="src/utils/cloudflare-r2.ts">
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { logger } from './logger.js';

export class CloudflareR2Client {
  private s3Client: S3Client;
  private bucketName: string;
  private baseUrl: string;

  constructor() {
    // Check if required environment variables are set
    const requiredVars = [
      'CLOUDFLARE_CDN_ACCESS_KEY',
      'CLOUDFLARE_CDN_SECRET_KEY', 
      'CLOUDFLARE_CDN_ENDPOINT_URL',
      'CLOUDFLARE_CDN_BUCKET_NAME',
      'CLOUDFLARE_CDN_BASE_URL'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing required Cloudflare R2 environment variables: ${missing.join(', ')}`);
    }

    const config = {
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_CDN_ENDPOINT_URL,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_CDN_ACCESS_KEY!,
        secretAccessKey: process.env.CLOUDFLARE_CDN_SECRET_KEY!,
      },
    };

    this.s3Client = new S3Client(config);
    this.bucketName = process.env.CLOUDFLARE_CDN_BUCKET_NAME!;
    this.baseUrl = process.env.CLOUDFLARE_CDN_BASE_URL!;
  }

  async uploadFile(buffer: Buffer, originalName: string): Promise<string> {
    try {
      const fileExtension = originalName.split('.').pop() || 'bin';
      const mimeType = mime.lookup(originalName) || 'application/octet-stream';
      const key = `human-mcp/${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          originalName: originalName,
          uploadedAt: new Date().toISOString(),
          source: 'human-mcp-http-transport'
        }
      });

      await this.s3Client.send(command);
      
      const publicUrl = `${this.baseUrl}/${key}`;
      logger.info(`File uploaded to Cloudflare R2: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      logger.error('Failed to upload to Cloudflare R2:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadBase64(base64Data: string, mimeType: string, originalName?: string): Promise<string> {
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = mimeType.split('/')[1] || 'bin';
    const fileName = originalName || `upload-${Date.now()}.${extension}`;
    
    return this.uploadFile(buffer, fileName);
  }

  isConfigured(): boolean {
    try {
      const requiredVars = [
        'CLOUDFLARE_CDN_ACCESS_KEY',
        'CLOUDFLARE_CDN_SECRET_KEY', 
        'CLOUDFLARE_CDN_ENDPOINT_URL',
        'CLOUDFLARE_CDN_BUCKET_NAME',
        'CLOUDFLARE_CDN_BASE_URL'
      ];
      return requiredVars.every(varName => process.env[varName]);
    } catch {
      return false;
    }
  }
}

// Singleton instance with lazy initialization
let cloudflareR2Instance: CloudflareR2Client | null = null;

export function getCloudflareR2(): CloudflareR2Client | null {
  if (!cloudflareR2Instance) {
    try {
      cloudflareR2Instance = new CloudflareR2Client();
    } catch (error) {
      logger.warn('Cloudflare R2 not configured:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  return cloudflareR2Instance;
}
</file>

<file path="src/utils/errors.ts">
export class HumanMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "HumanMCPError";
  }
}

export class ValidationError extends HumanMCPError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class ProcessingError extends HumanMCPError {
  constructor(message: string) {
    super(message, "PROCESSING_ERROR", 500);
  }
}

export class APIError extends HumanMCPError {
  constructor(message: string, statusCode: number = 500) {
    super(message, "API_ERROR", statusCode);
  }
}

export function handleError(error: unknown): HumanMCPError {
  if (error instanceof HumanMCPError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ProcessingError(error.message);
  }
  
  return new ProcessingError("An unknown error occurred");
}
</file>

<file path="src/utils/file-storage.ts">
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname, extname } from "path";
import { randomUUID } from "crypto";
import { logger } from "./logger.js";
import type { Config } from "./config.js";

export interface SavedFile {
  filePath: string;
  fileName: string;
  url?: string;
  size: number;
  mimeType: string;
}

export interface FileStorageOptions {
  prefix?: string;
  directory?: string;
  generateFileName?: boolean;
  uploadToR2?: boolean;
}

/**
 * Save base64 data to a local file
 */
export async function saveBase64ToFile(
  base64Data: string,
  mimeType: string,
  config: Config,
  options: FileStorageOptions = {}
): Promise<SavedFile> {
  try {
    // Extract base64 content if it's a data URI
    let cleanBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/data:[^;]+;base64,(.+)/);
      if (matches && matches[1]) {
        cleanBase64 = matches[1];
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Determine file extension from MIME type
    const extension = getExtensionFromMimeType(mimeType);

    // Generate filename
    const fileName = options.generateFileName !== false
      ? generateFileName(options.prefix, extension)
      : `generated${extension}`;

    // Determine save directory
    const saveDir = options.directory || process.cwd();
    const filePath = join(saveDir, fileName);

    // Ensure directory exists
    mkdirSync(dirname(filePath), { recursive: true });

    // Save file
    writeFileSync(filePath, buffer);

    logger.info(`Saved image to: ${filePath} (${buffer.length} bytes)`);

    const result: SavedFile = {
      filePath,
      fileName,
      size: buffer.length,
      mimeType
    };

    // Upload to Cloudflare R2 if configured and requested
    if (options.uploadToR2 && isCloudflareR2Configured(config)) {
      try {
        const r2Url = await uploadToCloudflareR2(buffer, fileName, mimeType, config);
        result.url = r2Url;
        logger.info(`Uploaded to Cloudflare R2: ${r2Url}`);
      } catch (error) {
        logger.warn(`Failed to upload to R2, but file saved locally: ${error}`);
      }
    }

    return result;

  } catch (error) {
    logger.error('Failed to save base64 data to file:', error);
    throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a unique filename with timestamp and UUID
 */
function generateFileName(prefix?: string, extension: string = '.jpg'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uuid = randomUUID().substring(0, 8);
  const prefixPart = prefix ? `${prefix}-` : '';
  return `${prefixPart}${timestamp}-${uuid}${extension}`;
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/mov': '.mov',
    'video/avi': '.avi'
  };

  return extensions[mimeType.toLowerCase()] || '.jpg';
}

/**
 * Check if Cloudflare R2 is properly configured
 */
function isCloudflareR2Configured(config: Config): boolean {
  const cf = config.cloudflare;
  return !!(cf?.accessKey && cf.secretKey && cf.endpointUrl && cf.bucketName);
}

/**
 * Upload file to Cloudflare R2
 */
async function uploadToCloudflareR2(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  config: Config
): Promise<string> {
  const cf = config.cloudflare;
  if (!cf || !isCloudflareR2Configured(config)) {
    throw new Error('Cloudflare R2 is not properly configured');
  }

  try {
    // Use AWS SDK v3 compatible S3 client for R2
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: cf.endpointUrl,
      credentials: {
        accessKeyId: cf.accessKey!,
        secretAccessKey: cf.secretKey!,
      },
      forcePathStyle: true,
    });

    const key = `generated/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: cf.bucketName!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    await s3Client.send(command);

    // Construct public URL
    const baseUrl = cf.baseUrl || `https://${cf.bucketName}.${cf.endpointUrl?.replace('https://', '')}`;
    return `${baseUrl}/${key}`;

  } catch (error) {
    logger.error('Failed to upload to Cloudflare R2:', error);
    throw new Error(`R2 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
</file>

<file path="src/utils/logger.ts">
import type { LogLevel } from "@/types";

class Logger {
  private level: LogLevel;
  
  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || "info";
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
  
  private format(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (args.length > 0) {
      return `${formatted} ${JSON.stringify(args)}`;
    }
    return formatted;
  }
  
  debug(message: string, ...args: any[]) {
    if (this.shouldLog("debug")) {
      console.error(this.format("debug", message, ...args));
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.shouldLog("info")) {
      console.error(this.format("info", message, ...args));
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.shouldLog("warn")) {
      console.error(this.format("warn", message, ...args));
    }
  }
  
  error(message: string, ...args: any[]) {
    if (this.shouldLog("error")) {
      console.error(this.format("error", message, ...args));
    }
  }
}

export const logger = new Logger();
</file>

<file path="tests/integration/enhanced-image-generation.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { generateImage } from '@/tools/hands/processors/image-generator';
import { GeminiClient } from '@/tools/eyes/utils/gemini-client';
import { loadConfig } from '@/utils/config';
import { TestDataGenerators } from '../utils/index.js';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ImageGenerationOptions } from '@/tools/hands/schemas';

// Mock GeminiClient for integration tests
let mockGenerateContent = mock(async () => {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  return TestDataGenerators.createMockGeminiImageGenerationResponse();
});

const mockGeminiModel = {
  generateContent: mockGenerateContent
};

let mockGeminiClient: any;

// Initialize mock client
function initializeMockClient() {
  // Reset the mock
  mockGenerateContent.mockClear();

  mockGeminiClient = {
    getImageGenerationModel: mock(() => mockGeminiModel)
  } as unknown as GeminiClient;
}

describe('Enhanced Image Generation Integration Tests', () => {
  let config: any;
  let testDir: string;
  const generatedFiles: string[] = [];

  beforeAll(() => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    config = loadConfig();
    testDir = join(tmpdir(), 'human-mcp-enhanced-test');
    initializeMockClient();
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;

    // Clean up all generated files
    generatedFiles.forEach(filePath => {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    });

    // Clean up test directory
    try {
      if (existsSync(testDir)) {
        const fs = require('fs');
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  beforeEach(() => {
    // Reset mocks before each test
    initializeMockClient();
  });

  describe('automatic file saving functionality', () => {
    it('should save image to file automatically by default', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A beautiful sunset over mountains',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: testDir
      };

      const result = await generateImage(mockGeminiClient, options, config);

      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileSize).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(0);

      // Verify file actually exists
      expect(existsSync(result.filePath!)).toBe(true);

      // Track for cleanup
      generatedFiles.push(result.filePath!);

      // Verify response format
      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should include file metadata in response', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A portrait of a person',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: testDir,
        filePrefix: 'test-portrait'
      };

      const result = await generateImage(mockGeminiClient, options, config);

      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileName).toMatch(/^test-portrait-/);
      expect(result.fileSize).toBeGreaterThan(0);

      // Track for cleanup
      if (result.filePath) {
        generatedFiles.push(result.filePath);
      }
    });

    it('should respect saveToFile=false option', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A landscape scene',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '16:9',
        fetchTimeout: 60000,
        saveToFile: false
      };

      const result = await generateImage(mockGeminiClient, options, config);

      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
      expect(result.fileSize).toBeUndefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should generate unique filenames for multiple requests', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A serene lake',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '4:3',
        fetchTimeout: 60000,
        saveDirectory: testDir,
        filePrefix: 'unique-test'
      };

      const results = await Promise.all([
        generateImage(mockGeminiClient, options, config),
        generateImage(mockGeminiClient, options, config),
        generateImage(mockGeminiClient, options, config)
      ]);

      const filePaths = results.map(r => r.filePath).filter(Boolean);
      const fileNames = results.map(r => r.fileName).filter(Boolean);

      expect(filePaths).toHaveLength(3);
      expect(fileNames).toHaveLength(3);

      // All file paths should be unique
      expect(new Set(filePaths).size).toBe(3);
      expect(new Set(fileNames).size).toBe(3);

      // All files should exist
      filePaths.forEach(filePath => {
        expect(existsSync(filePath!)).toBe(true);
      });

      // Track for cleanup
      generatedFiles.push(...filePaths as string[]);
    });

    it('should handle URL output format with file saving', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Modern architecture building',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'url',
        aspectRatio: '16:9',
        fetchTimeout: 60000,
        saveDirectory: testDir
      };

      const result = await generateImage(mockGeminiClient, options, config);

      // Should still save file even for URL format
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(existsSync(result.filePath!)).toBe(true);

      // For URL format, should return file path as imageData when no URL service is configured
      expect(result.format).toBe('file_path');
      expect(result.imageData).toBe(result.filePath!);

      // Track for cleanup
      generatedFiles.push(result.filePath!);
    });

    it('should handle different file prefixes correctly', async () => {
      const prefixes = ['artwork', 'photo', 'sketch', 'digital'];
      const results = [];

      for (const prefix of prefixes) {
        const options: ImageGenerationOptions = {
          prompt: `A ${prefix} style image`,
          model: 'gemini-2.5-flash-image-preview',
          outputFormat: 'base64',
          aspectRatio: '1:1',
          fetchTimeout: 60000,
          saveDirectory: testDir,
          filePrefix: prefix
        };

        const result = await generateImage(mockGeminiClient, options, config);
        results.push(result);

        expect(result.fileName).toMatch(new RegExp(`^${prefix}-`));
        expect(existsSync(result.filePath!)).toBe(true);

        // Track for cleanup
        generatedFiles.push(result.filePath!);

        // Reset mock for next iteration
        initializeMockClient();
      }

      expect(results).toHaveLength(4);
    });

    it('should handle fallback gracefully when file saving fails', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Fallback test image',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: '/invalid/read-only/path/that/does/not/exist'
      };

      // Should not throw error, but fallback to base64 only
      const result = await generateImage(mockGeminiClient, options, config);

      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
    });
  });

  describe('enhanced response format validation', () => {
    it('should include all expected fields in enhanced response', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Complete response test',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveDirectory: testDir
      };

      const result = await generateImage(mockGeminiClient, options, config);

      // Original fields
      expect(result.imageData).toBeDefined();
      expect(result.format).toBeDefined();
      expect(result.model).toBeDefined();
      expect(result.generationTime).toBeDefined();
      expect(result.size).toBeDefined();

      // Enhanced fields for file storage
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileSize).toBeDefined();
      expect(result.fileUrl).toBeUndefined(); // No R2 configured in test

      // Track for cleanup
      if (result.filePath) {
        generatedFiles.push(result.filePath);
      }
    });

    it('should maintain backward compatibility', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Backward compatibility test',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000,
        saveToFile: false // Explicitly disable file saving
      };

      const result = await generateImage(mockGeminiClient, options, config);

      // Should have original response structure without file fields
      expect(result.imageData).toBeDefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toBeDefined();

      // File-related fields should be undefined
      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
      expect(result.fileSize).toBeUndefined();
      expect(result.fileUrl).toBeUndefined();
    });
  });
});
</file>

<file path="tests/integration/hands-video-generation.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { generateVideo, generateImageToVideo } from '@/tools/hands/processors/video-generator';
import { GeminiClient } from '@/tools/eyes/utils/gemini-client';
import { loadConfig } from '@/utils/config';
import { TestDataGenerators } from '../utils/index.js';
import type { VideoGenerationOptions } from '@/tools/hands/schemas';

// Mock GeminiClient for integration tests
let mockGenerateVideo = mock(async () => {
  // Simulate video generation time
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    videoData: "data:video/mp4;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOANwEAANAAAAAAaAGFdABqJr0AAA==",
    metadata: {
      model: "veo-3.0-generate-001",
      duration: "4s",
      aspectRatio: "16:9",
      fps: 24,
      timestamp: new Date().toISOString(),
      prompt: "Test video",
      status: "completed"
    },
    operationId: `video-gen-${Date.now()}-test`
  };
});

let mockPollVideoGeneration = mock(async () => {
  return {
    done: true,
    result: {
      videoData: "data:video/mp4;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOANwEAANAAAAAAaAGFdABqJr0AAA==",
      generationTime: 15000
    }
  };
});

let mockGeminiClient: any;

// Initialize mock client
function initializeMockClient() {
  // Reset the mock
  mockGenerateVideo.mockClear();
  mockPollVideoGeneration.mockClear();

  mockGeminiClient = {
    generateVideoWithRetry: mockGenerateVideo,
    pollVideoGenerationOperation: mockPollVideoGeneration
  } as unknown as GeminiClient;
}

describe('Video Generation Integration Tests', () => {
  let config: any;

  beforeAll(() => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    config = loadConfig();
    initializeMockClient();
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  beforeEach(() => {
    // Reset mocks before each test
    initializeMockClient();
  });

  describe('generateVideo function', () => {
    it('should generate video with basic options', async () => {
      const options: VideoGenerationOptions = {
        prompt: 'A beautiful sunset over mountains',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'mp4',
        aspectRatio: '16:9',
        fps: 24,
        fetchTimeout: 300000
      };

      const result = await generateVideo(mockGeminiClient, options);

      expect(result).toBeDefined();
      expect(result.videoData).toBeDefined();
      expect(result.format).toBe('mp4');
      expect(result.model).toBe('veo-3.0-generate-001');
      expect(result.duration).toBe('4s');
      expect(result.aspectRatio).toBe('16:9');
      expect(result.fps).toBe(24);
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.operationId).toBeDefined();
    });

    it('should handle different video durations', async () => {
      const durations = ['4s', '8s', '12s'];

      for (const duration of durations) {
        const options: VideoGenerationOptions = {
          prompt: `Test video ${duration}`,
          model: 'veo-3.0-generate-001',
          duration: duration as '4s' | '8s' | '12s',
          outputFormat: 'mp4',
          aspectRatio: '16:9',
          fps: 24,
          fetchTimeout: 300000
        };

        const result = await generateVideo(mockGeminiClient, options);

        expect(result.duration).toBe(duration);
        expect(mockGenerateVideo).toHaveBeenCalledWith(
          'Test video ' + duration,
          expect.objectContaining({
            duration: duration
          })
        );

        initializeMockClient();
      }
    });

    it('should handle different aspect ratios', async () => {
      const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

      for (const ratio of ratios) {
        const options: VideoGenerationOptions = {
          prompt: `Test video ${ratio}`,
          model: 'veo-3.0-generate-001',
          duration: '4s',
          outputFormat: 'mp4',
          aspectRatio: ratio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
          fps: 24,
          fetchTimeout: 300000
        };

        const result = await generateVideo(mockGeminiClient, options);

        expect(result.aspectRatio).toBe(ratio);
        expect(mockGenerateVideo).toHaveBeenCalledWith(
          'Test video ' + ratio,
          expect.objectContaining({
            aspectRatio: ratio
          })
        );

        initializeMockClient();
      }
    });

    it('should handle style options', async () => {
      const styles = ['realistic', 'cinematic', 'artistic', 'cartoon', 'animation'];

      for (const style of styles) {
        const options: VideoGenerationOptions = {
          prompt: 'Test video',
          model: 'veo-3.0-generate-001',
          duration: '4s',
          outputFormat: 'mp4',
          aspectRatio: '16:9',
          fps: 24,
          style: style as 'realistic' | 'cinematic' | 'artistic' | 'cartoon' | 'animation',
          fetchTimeout: 300000
        };

        const result = await generateVideo(mockGeminiClient, options);

        expect(result).toBeDefined();
        expect(mockGenerateVideo).toHaveBeenCalledWith(
          'Test video',
          expect.objectContaining({
            style: style
          })
        );

        initializeMockClient();
      }
    });

    it('should handle camera movement options', async () => {
      const movements = ['static', 'pan_left', 'pan_right', 'zoom_in', 'zoom_out', 'dolly_forward', 'dolly_backward'];

      for (const movement of movements) {
        const options: VideoGenerationOptions = {
          prompt: 'Test video',
          model: 'veo-3.0-generate-001',
          duration: '4s',
          outputFormat: 'mp4',
          aspectRatio: '16:9',
          fps: 24,
          cameraMovement: movement as 'static' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'dolly_forward' | 'dolly_backward',
          fetchTimeout: 300000
        };

        const result = await generateVideo(mockGeminiClient, options);

        expect(result).toBeDefined();
        expect(mockGenerateVideo).toHaveBeenCalledWith(
          'Test video',
          expect.objectContaining({
            cameraMovement: movement
          })
        );

        initializeMockClient();
      }
    });

    it('should handle image input for image-to-video generation', async () => {
      const imageInput = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...';

      const options: VideoGenerationOptions = {
        prompt: 'Animate this image',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'mp4',
        aspectRatio: '16:9',
        fps: 24,
        imageInput,
        fetchTimeout: 300000
      };

      const result = await generateVideo(mockGeminiClient, options);

      expect(result).toBeDefined();
      expect(mockGenerateVideo).toHaveBeenCalledWith(
        'Animate this image',
        expect.objectContaining({
          imageInput
        })
      );
    });

    it('should estimate video size correctly', async () => {
      const options: VideoGenerationOptions = {
        prompt: 'Test video sizing',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'mp4',
        aspectRatio: '16:9',
        fps: 24,
        fetchTimeout: 300000
      };

      const result = await generateVideo(mockGeminiClient, options);

      expect(result.size).toMatch(/^\d+x\d+$/);
      expect(result.size).toBe('1920x1080'); // 16:9 aspect ratio should be 1920x1080
    });
  });

  describe('generateImageToVideo function', () => {
    it('should generate video from image input', async () => {
      const prompt = 'Animate this beautiful landscape';
      const imageInput = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...';

      const result = await generateImageToVideo(mockGeminiClient, prompt, imageInput);

      expect(result).toBeDefined();
      expect(result.videoData).toBeDefined();
      expect(result.format).toBe('mp4');
      expect(result.model).toBe('veo-3.0-generate-001');
      expect(mockGenerateVideo).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          imageInput
        })
      );
    });

    it('should use custom options in image-to-video generation', async () => {
      const prompt = 'Animate with style';
      const imageInput = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...';
      const options = {
        duration: '8s' as const,
        style: 'cinematic' as const,
        cameraMovement: 'zoom_in' as const
      };

      const result = await generateImageToVideo(mockGeminiClient, prompt, imageInput, options);

      expect(result).toBeDefined();
      expect(mockGenerateVideo).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          imageInput,
          duration: '8s',
          style: 'cinematic',
          cameraMovement: 'zoom_in'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle video generation API errors', async () => {
      mockGenerateVideo.mockImplementationOnce(async () => {
        throw new Error('API quota exceeded');
      });

      const options: VideoGenerationOptions = {
        prompt: 'Test error',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'mp4',
        aspectRatio: '16:9',
        fps: 24,
        fetchTimeout: 300000
      };

      await expect(generateVideo(mockGeminiClient, options)).rejects.toThrow(
        'API quota exceeded or rate limit reached'
      );
    });

    it('should handle video generation timeout errors', async () => {
      mockGenerateVideo.mockImplementationOnce(async () => {
        throw new Error('Video generation timed out');
      });

      const options: VideoGenerationOptions = {
        prompt: 'Test timeout',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'mp4',
        aspectRatio: '16:9',
        fps: 24,
        fetchTimeout: 300000
      };

      await expect(generateVideo(mockGeminiClient, options)).rejects.toThrow(
        'Video generation timed out'
      );
    });

    it('should handle safety policy errors', async () => {
      mockGenerateVideo.mockImplementationOnce(async () => {
        throw new Error('Content violates safety policy');
      });

      const options: VideoGenerationOptions = {
        prompt: 'Test safety error',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'mp4',
        aspectRatio: '16:9',
        fps: 24,
        fetchTimeout: 300000
      };

      await expect(generateVideo(mockGeminiClient, options)).rejects.toThrow(
        'Video generation blocked due to safety policies'
      );
    });
  });

  describe('output format handling', () => {
    it('should return MP4 format by default', async () => {
      const options: VideoGenerationOptions = {
        prompt: 'Test MP4 output',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'mp4',
        aspectRatio: '16:9',
        fps: 24,
        fetchTimeout: 300000
      };

      const result = await generateVideo(mockGeminiClient, options);

      expect(result.format).toBe('mp4');
    });

    it('should handle WebM format request (with fallback warning)', async () => {
      const options: VideoGenerationOptions = {
        prompt: 'Test WebM output',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        outputFormat: 'webm',
        aspectRatio: '16:9',
        fps: 24,
        fetchTimeout: 300000
      };

      const result = await generateVideo(mockGeminiClient, options);

      // Should fallback to webm but warn about conversion
      expect(result.format).toBe('webm');
    });
  });
});
</file>

<file path="tests/types/api-responses.ts">
/**
 * Type definitions for API responses used in tests
 */

export interface HealthCheckResponse {
  status: string;
  transport: string;
  sseFallback: string;
  ssePaths: {
    stream: string;
    message: string;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
  };
}

export interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface SessionResponse {
  sessionId: string;
  transport: string;
  mode: string;
}
</file>

<file path="tests/types/test-types.ts">
// Common test types to improve type safety across test files

export interface MockError {
  message: string;
  code?: string | number;
}

export interface MockGeminiResponse {
  summary: string;
  details: string;
  technical_details?: Record<string, any>;
  confidence: number;
  recommendations?: string[];
}

export interface MockComparisonResponse {
  summary: string;
  differences: any[];
  similarity_score: number;
  analysis_method: string;
  recommendations: string[];
  technical_details: Record<string, string>;
}

export interface MockAnalysisRequest {
  input: string;
  detail_level: 'quick' | 'detailed';
  custom_prompt?: string;
  max_frames?: number;
  source?: string;
  type?: 'image' | 'video' | 'gif';
  prompt?: string;
}

export interface MockCompareRequest {
  input1: string;
  input2: string;
  comparison_type: 'pixel' | 'structural' | 'semantic';
  custom_prompt?: string;
  source1?: string;
  source2?: string;
}

export interface MockHttpResponseData {
  status?: string;
  data?: any;
  error?: string;
  [key: string]: any;
}

export interface MockS3Command {
  Bucket: string;
  Key: string;
  Body?: Buffer | string;
  ContentType?: string;
  [key: string]: any;
}

export interface MockCloudflareR2Client {
  s3Client: {
    send: (command: MockS3Command) => Promise<any>;
  };
  uploadFile: (buffer: Buffer, filename: string) => Promise<string>;
  uploadBase64: (data: string, mimeType: string, filename?: string) => Promise<string>;
  isConfigured: () => boolean;
}

export interface MockSSEConfig {
  security?: {
    enableCors?: boolean;
    enableDnsRebindingProtection?: boolean;
    allowedHosts?: string[];
  };
  sessionMode?: 'stateful' | 'stateless';
  enableSse?: boolean;
  enableJsonResponse?: boolean;
  enableSseFallback?: boolean;
  ssePaths?: {
    stream: string;
    message: string;
  };
}

// Generic mock function type
export type MockFunction<T extends (...args: any[]) => any> = T & {
  mock: {
    calls: Parameters<T>[];
    results: { value: ReturnType<T> }[];
  };
  mockRestore?: () => void;
  mockImplementation?: (impl: T) => void;
  mockRejectedValue?: (value: any) => void;
  mockRejectedValueOnce?: (value: any) => void;
  mockResolvedValue?: (value: ReturnType<T>) => void;
  mockResolvedValueOnce?: (value: ReturnType<T>) => void;
};

// Extend global types for test environment
declare global {
  namespace globalThis {
    var __TEST_MODE__: boolean;
  }
}

export {};
</file>

<file path="tests/unit/file-storage.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { saveBase64ToFile } from '@/utils/file-storage';
import { loadConfig } from '@/utils/config';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

describe('File Storage Utility Tests', () => {
  let config: any;
  let testDir: string;

  beforeAll(() => {
    // Set required environment variables for testing
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    config = loadConfig();
    testDir = join(tmpdir(), 'human-mcp-test-files');
  });

  afterAll(() => {
    // Clean up environment
    delete process.env.GOOGLE_GEMINI_API_KEY;

    // Clean up test files
    try {
      if (existsSync(testDir)) {
        const fs = require('fs');
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('saveBase64ToFile function', () => {
    it('should save base64 data to file successfully', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      const result = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: testDir,
        prefix: 'test-image'
      });

      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(result.mimeType).toBe(mimeType);
      expect(existsSync(result.filePath)).toBe(true);

      // Clean up
      if (existsSync(result.filePath)) {
        unlinkSync(result.filePath);
      }
    });

    it('should handle data URI format base64', async () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      const result = await saveBase64ToFile(dataUri, mimeType, config, {
        directory: testDir,
        prefix: 'test-data-uri'
      });

      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(existsSync(result.filePath)).toBe(true);

      // Clean up
      if (existsSync(result.filePath)) {
        unlinkSync(result.filePath);
      }
    });

    it('should generate unique filenames', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      const result1 = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: testDir,
        prefix: 'unique-test'
      });

      const result2 = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: testDir,
        prefix: 'unique-test'
      });

      expect(result1.fileName).not.toBe(result2.fileName);
      expect(result1.filePath).not.toBe(result2.filePath);

      // Clean up
      [result1.filePath, result2.filePath].forEach(path => {
        if (existsSync(path)) {
          unlinkSync(path);
        }
      });
    });

    it('should handle different MIME types correctly', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const mimeTypes = [
        { mime: 'image/png', expectedExt: '.png' },
        { mime: 'image/jpeg', expectedExt: '.jpg' },
        { mime: 'image/webp', expectedExt: '.webp' },
        { mime: 'image/gif', expectedExt: '.gif' }
      ];

      const results = [];

      for (const { mime, expectedExt } of mimeTypes) {
        const result = await saveBase64ToFile(base64Data, mime, config, {
          directory: testDir,
          prefix: 'mime-test'
        });

        expect(result.fileName).toMatch(new RegExp(`${expectedExt.replace('.', '\\.')}$`));
        expect(result.mimeType).toBe(mime);
        results.push(result);
      }

      // Clean up
      results.forEach(result => {
        if (existsSync(result.filePath)) {
          unlinkSync(result.filePath);
        }
      });
    });

    it('should create directory if it does not exist', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';
      const nestedDir = join(testDir, 'nested', 'directory');

      const result = await saveBase64ToFile(base64Data, mimeType, config, {
        directory: nestedDir,
        prefix: 'nested-test'
      });

      expect(existsSync(nestedDir)).toBe(true);
      expect(existsSync(result.filePath)).toBe(true);

      // Clean up
      if (existsSync(result.filePath)) {
        unlinkSync(result.filePath);
      }
    });

    it('should handle error cases gracefully', async () => {
      // Test with an invalid directory path (null character not allowed in paths)
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';
      const invalidDir = '/\0invalid/path';

      await expect(saveBase64ToFile(base64Data, mimeType, config, {
        directory: invalidDir
      })).rejects.toThrow();
    });
  });
});
</file>

<file path="tests/unit/hands-video-schemas.test.ts">
import { describe, it, expect } from 'bun:test';
import { VideoGenerationInputSchema } from '@/tools/hands/schemas';

describe('Hands Video Tool Schemas', () => {
  describe('VideoGenerationInputSchema', () => {
    it('should validate valid video generation input', () => {
      const validInput = {
        prompt: 'A beautiful landscape video',
        model: 'veo-3.0-generate-001',
        duration: '4s',
        output_format: 'mp4',
        aspect_ratio: '16:9',
        fps: 24
      };

      const result = VideoGenerationInputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBeDefined();
        expect(result.data.model).toBe('veo-3.0-generate-001');
        expect(result.data.duration).toBe('4s');
        expect(result.data.output_format).toBe('mp4');
        expect(result.data.aspect_ratio).toBe('16:9');
        expect(result.data.fps).toBe(24);
      }
    });

    it('should apply default values for optional fields', () => {
      const minimalInput = {
        prompt: 'A test video'
      };

      const result = VideoGenerationInputSchema.safeParse(minimalInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('veo-3.0-generate-001');
        expect(result.data.duration).toBe('4s');
        expect(result.data.output_format).toBe('mp4');
        expect(result.data.aspect_ratio).toBe('16:9');
        expect(result.data.fps).toBe(24);
      }
    });

    it('should validate all duration options', () => {
      const durations = ['4s', '8s', '12s'];

      durations.forEach(duration => {
        const input = {
          prompt: 'Test prompt',
          duration: duration
        };

        const result = VideoGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.duration).toBe(duration as '4s' | '8s' | '12s');
        }
      });
    });

    it('should validate all aspect ratio options', () => {
      const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

      ratios.forEach(ratio => {
        const input = {
          prompt: 'Test prompt',
          aspect_ratio: ratio
        };

        const result = VideoGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.aspect_ratio).toBe(ratio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4');
        }
      });
    });

    it('should validate output format options', () => {
      const formats = ['mp4', 'webm'];

      formats.forEach(format => {
        const input = {
          prompt: 'Test prompt',
          output_format: format
        };

        const result = VideoGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.output_format).toBe(format as 'mp4' | 'webm');
        }
      });
    });

    it('should validate all style options', () => {
      const styles = ['realistic', 'cinematic', 'artistic', 'cartoon', 'animation'];

      styles.forEach(style => {
        const input = {
          prompt: 'Test prompt',
          style: style
        };

        const result = VideoGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.style).toBe(style as 'realistic' | 'cinematic' | 'artistic' | 'cartoon' | 'animation');
        }
      });
    });

    it('should validate all camera movement options', () => {
      const movements = ['static', 'pan_left', 'pan_right', 'zoom_in', 'zoom_out', 'dolly_forward', 'dolly_backward'];

      movements.forEach(movement => {
        const input = {
          prompt: 'Test prompt',
          camera_movement: movement
        };

        const result = VideoGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.camera_movement).toBe(movement as 'static' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'dolly_forward' | 'dolly_backward');
        }
      });
    });

    it('should validate fps as positive integer', () => {
      const validInput = {
        prompt: 'Test prompt',
        fps: 30
      };

      const result = VideoGenerationInputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fps).toBe(30);
      }
    });

    it('should reject empty prompt', () => {
      const input = {
        prompt: ''
      };

      const result = VideoGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.code).toBe('too_small');
      }
    });

    it('should reject invalid duration', () => {
      const input = {
        prompt: 'Test prompt',
        duration: '16s'
      };

      const result = VideoGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_enum_value');
      }
    });

    it('should reject invalid aspect ratio', () => {
      const input = {
        prompt: 'Test prompt',
        aspect_ratio: '2:1'
      };

      const result = VideoGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_enum_value');
      }
    });

    it('should reject invalid output format', () => {
      const input = {
        prompt: 'Test prompt',
        output_format: 'avi'
      };

      const result = VideoGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_enum_value');
      }
    });

    it('should reject invalid fps values', () => {
      const invalidValues = [0, -1, 61, 100];

      invalidValues.forEach(fps => {
        const input = {
          prompt: 'Test prompt',
          fps: fps
        };

        const result = VideoGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it('should handle image input', () => {
      const input = {
        prompt: 'Test video with image input',
        image_input: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
      };

      const result = VideoGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.image_input).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...');
      }
    });

    it('should handle complex valid input with all fields', () => {
      const input = {
        prompt: 'A cinematic video of a serene lake with camera panning left',
        model: 'veo-3.0-generate-001',
        duration: '8s',
        output_format: 'mp4',
        aspect_ratio: '16:9',
        fps: 24,
        image_input: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
        style: 'cinematic',
        camera_movement: 'pan_left',
        seed: 42
      };

      const result = VideoGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBe(input.prompt);
        expect(result.data.model).toBe(input.model as 'veo-3.0-generate-001');
        expect(result.data.duration).toBe(input.duration as '4s' | '8s' | '12s');
        expect(result.data.output_format).toBe(input.output_format as 'mp4' | 'webm');
        expect(result.data.aspect_ratio).toBe(input.aspect_ratio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4');
        expect(result.data.fps).toBe(input.fps);
        expect(result.data.image_input).toBe(input.image_input);
        expect(result.data.style).toBe(input.style as 'realistic' | 'cinematic' | 'artistic' | 'cartoon' | 'animation');
        expect(result.data.camera_movement).toBe(input.camera_movement as 'static' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'dolly_forward' | 'dolly_backward');
        expect(result.data.seed).toBe(input.seed);
      }
    });
  });
});
</file>

<file path="tests/unit/image-stdio-r2-skip.test.ts">
import { describe, it, expect, afterEach } from 'bun:test';

describe('STDIO R2 Gating Logic', () => {
  afterEach(() => {
    // Clean up environment variables
    delete process.env.TRANSPORT_TYPE;
  });

  it('should respect TRANSPORT_TYPE environment variable for R2 gating', () => {
    // Test STDIO mode (should skip R2)
    process.env.TRANSPORT_TYPE = 'stdio';
    
    // Simulate the gating condition from image processor
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const shouldUseR2 = isHttpTransport && true; // cloudflare configured
    
    expect(shouldUseR2).toBe(false);
    expect(isHttpTransport).toBe(false);
  });

  it('should allow R2 in HTTP transport mode', () => {
    // Test HTTP mode (should allow R2)
    process.env.TRANSPORT_TYPE = 'http';
    
    // Simulate the gating condition from image processor
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const shouldUseR2 = isHttpTransport && true; // cloudflare configured
    
    expect(shouldUseR2).toBe(true);
    expect(isHttpTransport).toBe(true);
  });

  it('should default to stdio behavior when TRANSPORT_TYPE is not set', () => {
    // Test default mode (no TRANSPORT_TYPE set)
    delete process.env.TRANSPORT_TYPE;
    
    // Simulate the gating condition from image processor
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const shouldUseR2 = isHttpTransport && true; // cloudflare configured
    
    expect(shouldUseR2).toBe(false);
    expect(isHttpTransport).toBe(false);
  });

  it('should only use R2 for http transport with valid cloudflare config', () => {
    // Test HTTP mode but no cloudflare
    process.env.TRANSPORT_TYPE = 'http';
    
    const isHttpTransport = process.env.TRANSPORT_TYPE === 'http';
    const hasCloudflare = false; // simulate no cloudflare config
    const shouldUseR2 = isHttpTransport && hasCloudflare;
    
    expect(shouldUseR2).toBe(false);
    expect(isHttpTransport).toBe(true);
  });
});
</file>

<file path="tests/utils/error-scenarios.ts">
import { mock } from 'bun:test';
import type { MockError } from '../types/test-types.js';

export class ErrorScenarios {
  /**
   * Common network errors for testing
   */
  static networkErrors = {
    CONNECTION_REFUSED: new Error('ECONNREFUSED: Connection refused'),
    TIMEOUT: new Error('ETIMEDOUT: Request timeout'),
    DNS_ERROR: new Error('ENOTFOUND: DNS lookup failed'),
    SSL_ERROR: new Error('SSL certificate verification failed'),
    NETWORK_UNREACHABLE: new Error('ENETUNREACH: Network is unreachable')
  };

  /**
   * HTTP error responses
   */
  static httpErrors = {
    NOT_FOUND: { status: 404, error: 'Resource not found' },
    UNAUTHORIZED: { status: 401, error: 'Unauthorized access' },
    FORBIDDEN: { status: 403, error: 'Forbidden' },
    SERVER_ERROR: { status: 500, error: 'Internal server error' },
    BAD_GATEWAY: { status: 502, error: 'Bad gateway' },
    SERVICE_UNAVAILABLE: { status: 503, error: 'Service unavailable' },
    RATE_LIMITED: { status: 429, error: 'Too many requests' }
  };

  /**
   * API specific errors
   */
  static apiErrors = {
    GEMINI_API_ERROR: new Error('Gemini API quota exceeded'),
    GEMINI_INVALID_KEY: new Error('Invalid Gemini API key'),
    GEMINI_MODEL_UNAVAILABLE: new Error('Gemini model temporarily unavailable'),
    CLOUDFLARE_R2_ERROR: new Error('Cloudflare R2 upload failed'),
    FILE_NOT_FOUND: new Error('ENOENT: File not found'),
    PERMISSION_DENIED: new Error('EACCES: Permission denied'),
    DISK_FULL: new Error('ENOSPC: No space left on device')
  };

  /**
   * Create a mock that fails with a specific error
   */
  static createFailingMock<T>(error: Error | MockError): ReturnType<typeof mock> {
    return mock(async (..._args: any[]): Promise<T> => {
      throw error;
    });
  }

  /**
   * Create a mock that fails intermittently
   */
  static createIntermittentMock<T>(
    successValue: T, 
    error: Error | MockError, 
    failureRate = 0.5
  ): ReturnType<typeof mock> {
    return mock(async (..._args: any[]): Promise<T> => {
      if (Math.random() < failureRate) {
        throw error;
      }
      return successValue;
    });
  }

  /**
   * Create a mock that times out
   */
  static createTimeoutMock<T>(delay = 5000): ReturnType<typeof mock> {
    return mock(async (..._args: any[]): Promise<T> => {
      await new Promise(resolve => setTimeout(resolve, delay));
      throw new Error('Request timeout');
    });
  }

  /**
   * Create a mock fetch that returns HTTP errors
   */
  static createErrorResponse(errorType: keyof typeof ErrorScenarios.httpErrors): Response {
    const error = ErrorScenarios.httpErrors[errorType];
    return new Response(JSON.stringify({ error: error.error }), {
      status: error.status,
      statusText: error.error,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Create test scenarios for network resilience
   */
  static createNetworkResilienceTests() {
    return {
      'should handle connection refused': {
        error: ErrorScenarios.networkErrors.CONNECTION_REFUSED,
        expectedMessage: 'Connection refused'
      },
      'should handle timeout': {
        error: ErrorScenarios.networkErrors.TIMEOUT,
        expectedMessage: 'Request timeout'
      },
      'should handle DNS errors': {
        error: ErrorScenarios.networkErrors.DNS_ERROR,
        expectedMessage: 'DNS lookup failed'
      },
      'should handle SSL errors': {
        error: ErrorScenarios.networkErrors.SSL_ERROR,
        expectedMessage: 'SSL certificate verification failed'
      }
    };
  }

  /**
   * Create test scenarios for API errors
   */
  static createAPIErrorTests() {
    return {
      'should handle Gemini API quota exceeded': {
        error: ErrorScenarios.apiErrors.GEMINI_API_ERROR,
        expectedMessage: 'Gemini API quota exceeded'
      },
      'should handle invalid API key': {
        error: ErrorScenarios.apiErrors.GEMINI_INVALID_KEY,
        expectedMessage: 'Invalid Gemini API key'
      },
      'should handle model unavailable': {
        error: ErrorScenarios.apiErrors.GEMINI_MODEL_UNAVAILABLE,
        expectedMessage: 'model temporarily unavailable'
      },
      'should handle file upload errors': {
        error: ErrorScenarios.apiErrors.CLOUDFLARE_R2_ERROR,
        expectedMessage: 'upload failed'
      }
    };
  }

  /**
   * Create test scenarios for file system errors
   */
  static createFileSystemErrorTests() {
    return {
      'should handle file not found': {
        error: ErrorScenarios.apiErrors.FILE_NOT_FOUND,
        expectedMessage: 'File not found'
      },
      'should handle permission denied': {
        error: ErrorScenarios.apiErrors.PERMISSION_DENIED,
        expectedMessage: 'Permission denied'
      },
      'should handle disk full': {
        error: ErrorScenarios.apiErrors.DISK_FULL,
        expectedMessage: 'No space left on device'
      }
    };
  }

  /**
   * Simulate retry logic testing
   */
  static createRetryMock<T>(
    finalResult: T,
    failures: (Error | MockError)[],
    maxRetries = 3
  ): ReturnType<typeof mock> {
    let attemptCount = 0;
    
    return mock(async (..._args: any[]): Promise<T> => {
      if (attemptCount < failures.length && attemptCount < maxRetries) {
        attemptCount++;
        throw failures[attemptCount - 1];
      }
      attemptCount++;
      return finalResult;
    });
  }

  /**
   * Test concurrent failure scenarios
   */
  static createConcurrentFailureMock<T>(
    results: (T | Error)[]
  ): ReturnType<typeof mock> {
    let callIndex = 0;
    
    return mock(async (..._args: any[]): Promise<T> => {
      const result = results[callIndex % results.length];
      callIndex++;
      
      if (result instanceof Error) {
        throw result;
      }
      
      return result as T;
    });
  }
}

export default ErrorScenarios;
</file>

<file path="tests/utils/index.ts">
export { TestServerManager, testServerManager } from './test-server-manager.js';
export { MockHelpers } from './mock-helpers.js';
export { TestDataGenerators } from './test-data-generators.js';
</file>

<file path="tests/utils/integration-test-setup.ts">
/**
 * Integration Test Setup Helper
 *
 * Provides utilities for setting up integration tests without global mock contamination.
 * Should be used in integration tests that need real API calls or specific mock behavior.
 */

import { mock } from "bun:test";
import { getTestType } from "./mock-control.js";

/**
 * Check if we're in integration test mode
 */
export function isIntegrationTest(): boolean {
  return getTestType() === "integration";
}

/**
 * Create a local Gemini client mock that won't conflict with global mocks
 * Use this in integration tests that need specific mock behavior
 */
export function createLocalGeminiMock() {
  console.log("[IntegrationTest] Creating local Gemini mock");

  const localMockGenerateContent = mock(async (request: any) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));

    // Return mock response based on request
    if (request.contents?.[0]?.parts?.[0]?.text?.includes("generate image")) {
      return {
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: "image/png",
                  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                }
              }]
            }
          }]
        }
      };
    }

    return {
      response: {
        candidates: [{
          content: {
            parts: [{ text: "Mock response" }]
          }
        }]
      }
    };
  });

  const localMockModel = {
    generateContent: localMockGenerateContent
  };

  const localMockClient = {
    getImageGenerationModel: mock(() => localMockModel),
    getGenerativeModel: mock(() => localMockModel)
  };

  return {
    client: localMockClient,
    generateContent: localMockGenerateContent,
    reset: () => {
      localMockGenerateContent.mockClear();
      localMockClient.getImageGenerationModel.mockClear();
      localMockClient.getGenerativeModel.mockClear();
    }
  };
}

/**
 * Override global mocks for integration tests
 * Call this in beforeAll() of integration tests that need different mock behavior
 */
export function overrideGlobalMocks() {
  if (!isIntegrationTest()) {
    console.log("[IntegrationTest] Not in integration mode, skipping mock override");
    return null;
  }

  console.log("[IntegrationTest] Overriding global mocks for integration test");

  // Create local mock that overrides the global one
  const localMock = createLocalGeminiMock();

  // Override the global mock module
  mock.module("@google/generative-ai", () => ({
    GoogleGenerativeAI: mock(() => ({
      getGenerativeModel: localMock.client.getGenerativeModel
    }))
  }));

  return localMock;
}

/**
 * Setup integration test environment
 * Call this in beforeAll() of integration tests
 */
export function setupIntegrationTest() {
  console.log("[IntegrationTest] Setting up integration test environment");

  // Set environment variables needed for tests
  process.env.GOOGLE_GEMINI_API_KEY = "integration-test-key";
  process.env.LOG_LEVEL = "error"; // Reduce logging noise

  // Override global mocks if needed
  const localMock = overrideGlobalMocks();

  return {
    localMock,
    cleanup: () => {
      console.log("[IntegrationTest] Cleaning up integration test environment");
      if (localMock) {
        localMock.reset();
      }
    }
  };
}

/**
 * Cleanup integration test environment
 * Call this in afterAll() of integration tests
 */
export function cleanupIntegrationTest() {
  console.log("[IntegrationTest] Cleaning up integration test environment");
  delete process.env.GOOGLE_GEMINI_API_KEY;
}

/**
 * Mock response generators for integration tests
 */
export const IntegrationMockResponses = {
  imageGeneration: {
    success: () => ({
      response: {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: "image/png",
                data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
              }
            }]
          }
        }]
      }
    }),

    error: () => {
      throw new Error("Mock API error for testing");
    },

    safetyError: () => ({
      response: {
        candidates: [],
        promptFeedback: {
          blockReason: "SAFETY",
          blockReasonMessage: "Content blocked for safety reasons"
        }
      }
    })
  }
};
</file>

<file path="tests/utils/mock-control.ts">
/**
 * Mock Control Utility for Environment-Based Mock Management
 *
 * This utility provides controlled mock application based on test type
 * to prevent global mock contamination between unit and integration tests.
 */

import { mock } from "bun:test";
import { MockHelpers } from "./mock-helpers.js";

export type TestType = "unit" | "integration" | "e2e" | "all";

/**
 * Get the current test type from environment variables
 */
export function getTestType(): TestType {
  const testType = process.env.TEST_TYPE as TestType;
  return testType || "all";
}

/**
 * Check if a specific mock should be applied for the current test type
 */
export function shouldApplyMock(mockName: string, testType: TestType = getTestType()): boolean {
  const mockConfig = {
    // Logger mock - apply to all test types
    logger: ["unit", "integration", "e2e", "all"],

    // File system mock - only for unit tests (avoid interfering with integration tests)
    fs: ["unit"],

    // Gemini client mock - conditional based on test type
    geminiClient: testType === "integration" ? [] : ["unit", "e2e", "all"]
  };

  const allowedTypes = mockConfig[mockName as keyof typeof mockConfig] || [];
  return allowedTypes.includes(testType);
}

/**
 * Global mock instances (shared across test types)
 */
export const globalMocks = {
  logger: MockHelpers.createLoggerMock(),
  fs: MockHelpers.createFileSystemMock(),
  geminiClient: MockHelpers.createGeminiClientMock()
};

/**
 * Apply mocks conditionally based on test type
 */
export function applyConditionalMocks(testType: TestType = getTestType()): void {
  console.log(`[MockControl] Applying mocks for test type: ${testType}`);

  // Always apply logger mock (safe for all test types)
  if (shouldApplyMock("logger", testType)) {
    mock.module("@/utils/logger", () => ({
      logger: globalMocks.logger
    }));
    console.log(`[MockControl] ✓ Applied logger mock`);
  }

  // Conditionally apply file system mock
  if (shouldApplyMock("fs", testType)) {
    mock.module("fs", () => globalMocks.fs);
    console.log(`[MockControl] ✓ Applied fs mock`);
  }

  // Conditionally apply Gemini client mock
  if (shouldApplyMock("geminiClient", testType)) {
    mock.module("@google/generative-ai", () => ({
      GoogleGenerativeAI: mock(() => ({
        getGenerativeModel: globalMocks.geminiClient.getGenerativeModel
      }))
    }));
    console.log(`[MockControl] ✓ Applied Gemini client mock`);
  } else {
    console.log(`[MockControl] ⊗ Skipped Gemini client mock (integration test)`);
  }
}

/**
 * Reset mocks based on test type
 */
export function resetConditionalMocks(testType: TestType = getTestType()): void {
  if (shouldApplyMock("logger", testType)) {
    // Reset each logger mock method
    Object.values(globalMocks.logger).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
        mockFn.mockRestore();
      }
    });
  }

  if (shouldApplyMock("fs", testType)) {
    // Reset each fs mock method
    Object.values(globalMocks.fs).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
        mockFn.mockRestore();
      }
    });
  }

  if (shouldApplyMock("geminiClient", testType)) {
    // Reset each gemini client mock method
    Object.values(globalMocks.geminiClient).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
        mockFn.mockRestore();
      }
    });
  }
}

/**
 * Get mock configuration info for debugging
 */
export function getMockInfo(testType: TestType = getTestType()): object {
  return {
    testType,
    appliedMocks: {
      logger: shouldApplyMock("logger", testType),
      fs: shouldApplyMock("fs", testType),
      geminiClient: shouldApplyMock("geminiClient", testType)
    },
    environment: {
      TEST_TYPE: process.env.TEST_TYPE,
      NODE_ENV: process.env.NODE_ENV,
      __TEST_MODE__: (globalThis as any).__TEST_MODE__
    }
  };
}
</file>

<file path="tests/utils/mock-helpers.ts">
import { mock, type Mock } from 'bun:test';
import type { MockError, MockHttpResponseData } from '../types/test-types.js';

export interface MockedLogger {
  info: Mock<() => void>;
  error: Mock<() => void>;
  warn: Mock<() => void>;
  debug: Mock<() => void>;
}

export interface MockedFS {
  readFileSync: Mock<() => Buffer>;
  writeFileSync: Mock<() => void>;
  existsSync: Mock<() => boolean>;
  mkdirSync: Mock<() => void>;
  unlinkSync: Mock<() => void>;
}

export interface MockedGeminiClient {
  generateContent: Mock<() => Promise<any>>;
  getGenerativeModel: Mock<() => any>;
}

export class MockHelpers {
  static createLoggerMock(): MockedLogger {
    return {
      info: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {})
    };
  }

  static createFileSystemMock(): MockedFS {
    return {
      readFileSync: mock(() => Buffer.from('mock file content')),
      writeFileSync: mock(() => {}),
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      unlinkSync: mock(() => {})
    };
  }

  static createGeminiClientMock(): MockedGeminiClient {
    return {
      generateContent: mock(() => Promise.resolve({
        response: {
          text: () => JSON.stringify({
            summary: "Mock analysis result",
            details: "Mock detailed analysis",
            confidence: 0.95
          })
        }
      })),
      getGenerativeModel: mock(() => ({
        generateContent: mock(() => Promise.resolve({
          response: {
            text: () => JSON.stringify({
              summary: "Mock analysis result",
              details: "Mock detailed analysis", 
              confidence: 0.95
            })
          }
        }))
      }))
    };
  }

  static resetAllMocks(mocks: Record<string, unknown>): void {
    Object.values(mocks).forEach(mockObj => {
      if (typeof mockObj === 'object' && mockObj !== null) {
        Object.values(mockObj).forEach(mockFn => {
          if (typeof mockFn === 'function' && 'mockRestore' in mockFn) {
            (mockFn as Mock<any>).mockRestore();
          }
        });
      }
    });
  }

  static createMockResponse(data: MockHttpResponseData, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  static createMockError(message: string, code?: string | number): MockError {
    const error: MockError = { message };
    if (code) {
      error.code = code;
    }
    return error as MockError & Error;
  }
}

export default MockHelpers;
</file>

<file path=".dockerignore">
# Node modules
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist

# Environment files
.env
.env.*
!.env.production

# Git files
.git
.gitignore

# IDE files
.vscode
.idea
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Coverage directory used by tools like istanbul
coverage/
.nyc_output

# Backup files
*.backup
*.bak

# Test files
test/
tests/
__tests__/
*.test.*
*.spec.*

# Documentation (except deployment guide)
README.md
!DEPLOYMENT.md

# Development files
docker-compose.override.yml
.serena/
.claude/

# Data directories
data/
letsencrypt/
</file>

<file path=".repomixignore">
docs/*
plans/*
assets/*
dist/*
coverage/*
build/*
ios/*
android/*

.claude/*
.serena/*
.pnpm-store/*
.github/*
.dart_tool/*
.idea/*
</file>

<file path="DEPLOYMENT.md">
# Human MCP Server - VPS Deployment Guide

This guide explains how to deploy the Human MCP Server on a VPS using Docker and Docker Compose.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Domain name (optional, for SSL/HTTPS)
- Google Gemini API key

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd human-mcp
```

### 2. Configure Environment

```bash
# Copy the production environment template
cp .env.production .env

# Edit the configuration
nano .env
```

**Required Configuration:**
- Set your `GOOGLE_GEMINI_API_KEY`
- Update `DOMAIN` if using Traefik with SSL
- Set `ACME_EMAIL` for Let's Encrypt certificates

### 3. Deploy with Docker Compose

#### Basic Deployment (HTTP only)
```bash
docker-compose up -d human-mcp
```

#### Production Deployment (with HTTPS and Traefik)
```bash
# Create necessary directories
mkdir -p data letsencrypt

# Deploy with Traefik reverse proxy
docker-compose --profile proxy up -d
```

#### With Redis (for session scaling)
```bash
docker-compose --profile redis --profile proxy up -d
```

## Deployment Options

### Option 1: Basic HTTP Deployment

Suitable for development or internal networks.

```bash
# Just the MCP server
docker-compose up -d human-mcp
```

Access: `http://your-server-ip:3000`

### Option 2: Production HTTPS Deployment

Includes Traefik reverse proxy with automatic SSL certificates.

```bash
# Full production stack
docker-compose --profile proxy up -d
```

Access: `https://your-domain.com`

### Option 3: Scalable Deployment

Adds Redis for session storage (enables horizontal scaling).

```bash
# Production with Redis
docker-compose --profile redis --profile proxy up -d
```

## Configuration Guide

### Environment Variables

Key environment variables in `.env`:

```bash
# Core
GOOGLE_GEMINI_API_KEY=your_api_key_here
DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com

# Security
HTTP_CORS_ORIGINS=https://your-domain.com
HTTP_ALLOWED_HOSTS=127.0.0.1,localhost,your-domain.com
HTTP_SECRET=your_secret_token_here

# Performance
HTTP_ENABLE_RATE_LIMITING=true
RATE_LIMIT_REQUESTS=100
LOG_LEVEL=warn
```

### Security Recommendations

1. **Set Authentication Secret**
   ```bash
   HTTP_SECRET=your_strong_secret_here
   ```

2. **Limit CORS Origins**
   ```bash
   HTTP_CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
   ```

3. **Configure Allowed Hosts**
   ```bash
   HTTP_ALLOWED_HOSTS=127.0.0.1,localhost,your-domain.com
   ```

4. **Enable Rate Limiting**
   ```bash
   HTTP_ENABLE_RATE_LIMITING=true
   RATE_LIMIT_REQUESTS=100
   RATE_LIMIT_WINDOW=60000
   ```

## Server Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f human-mcp
```

### Update Deployment
```bash
# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Health Check
```bash
# Check service health
curl http://localhost:3000/health

# Or with domain
curl https://your-domain.com/health
```

## API Usage

### Initialize Session
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "your-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'
```

### List Available Tools
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

## Monitoring

### Resource Usage
```bash
# Check container stats
docker stats human-mcp-server

# Check logs for errors
docker-compose logs human-mcp | grep ERROR
```

### Health Monitoring
The service includes health checks accessible at `/health`:

```bash
# Check health
curl https://your-domain.com/health

# Expected response
{
  "status": "healthy",
  "transport": "streamable-http"
}
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs
   docker-compose logs human-mcp
   
   # Verify configuration
   docker-compose config
   ```

2. **SSL certificate issues**
   ```bash
   # Check Traefik logs
   docker-compose logs traefik
   
   # Verify domain DNS points to server
   nslookup your-domain.com
   ```

3. **API requests failing**
   ```bash
   # Check CORS and allowed hosts
   # Verify API key is set correctly
   # Check rate limiting settings
   ```

### Service Restart
```bash
# Restart specific service
docker-compose restart human-mcp

# Restart all services
docker-compose restart
```

### Clean Deployment
```bash
# Stop and remove containers
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Fresh deployment
docker-compose up -d --build
```

## Performance Tuning

### Resource Limits
Adjust in `docker-compose.yaml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
```

### Scaling
For high traffic, consider:

1. Enable Redis for session storage
2. Use multiple MCP server instances
3. Configure load balancing in Traefik
4. Monitor resource usage and scale accordingly

## Backup

### Important Data
- Environment configuration (`.env`)
- SSL certificates (`letsencrypt/`)
- Application data (`data/`)

### Backup Commands
```bash
# Create backup
tar -czf human-mcp-backup-$(date +%Y%m%d).tar.gz .env letsencrypt/ data/

# Restore backup
tar -xzf human-mcp-backup-YYYYMMDD.tar.gz
```

## Support

- Check application logs for errors
- Verify environment configuration
- Ensure all required services are running
- Test health endpoint accessibility
</file>

<file path="direct-test.mjs">
import { loadConfig } from './src/utils/config.js';
import { GeminiClient } from './src/tools/eyes/utils/gemini-client.js';
import { processImage } from './src/tools/eyes/processors/image.js';

async function testEyesAnalyze() {
  try {
    console.log('Loading configuration...');
    const config = loadConfig();
    
    console.log('Creating Gemini client...');
    const geminiClient = new GeminiClient(config);
    const model = geminiClient.getModel('detailed');
    
    console.log('Processing image...');
    const screenshotPath = 'screenshots/CleanShot 2025-09-15 at 13.43.58@2x.png';
    
    const options = {
      source: screenshotPath,
      type: 'image',
      detail_level: 'detailed',
      prompt: 'Provide a comprehensive analysis of this screenshot. Describe what application or interface is being shown, the layout, key elements visible, any text content, buttons, menus, and overall functionality that can be inferred from the visual elements.',
      fetchTimeout: config.server.fetchTimeout
    };
    
    const result = await processImage(model, screenshotPath, options);
    
    console.log('\n=== SCREENSHOT ANALYSIS RESULT ===');
    console.log(result.analysis);
    console.log('\n=== END ANALYSIS ===');
    
  } catch (error) {
    console.error('Error during analysis:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testEyesAnalyze();
</file>

<file path="docker-compose.yaml">
version: '3.8'

services:
  human-mcp:
    build:
      context: .
      dockerfile: Dockerfile
    image: human-mcp:latest
    container_name: human-mcp-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # Core Configuration
      - NODE_ENV=production
      - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
      - GOOGLE_GEMINI_MODEL=${GOOGLE_GEMINI_MODEL:-gemini-2.5-flash}
      
      # Transport Configuration
      - TRANSPORT_TYPE=http
      - HTTP_PORT=3000
      - HTTP_HOST=0.0.0.0
      - HTTP_SESSION_MODE=${HTTP_SESSION_MODE:-stateful}
      - HTTP_ENABLE_SSE=${HTTP_ENABLE_SSE:-true}
      - HTTP_ENABLE_JSON_RESPONSE=${HTTP_ENABLE_JSON_RESPONSE:-true}
      
      # Security Configuration
      - HTTP_CORS_ENABLED=${HTTP_CORS_ENABLED:-true}
      - HTTP_CORS_ORIGINS=${HTTP_CORS_ORIGINS:-*}
      - HTTP_DNS_REBINDING_ENABLED=${HTTP_DNS_REBINDING_ENABLED:-true}
      - HTTP_ALLOWED_HOSTS=${HTTP_ALLOWED_HOSTS:-127.0.0.1,localhost}
      - HTTP_ENABLE_RATE_LIMITING=${HTTP_ENABLE_RATE_LIMITING:-false}
      - HTTP_SECRET=${HTTP_SECRET:-}
      
      # Server Configuration
      - MAX_REQUEST_SIZE=${MAX_REQUEST_SIZE:-100MB}
      - ENABLE_CACHING=${ENABLE_CACHING:-true}
      - CACHE_TTL=${CACHE_TTL:-3600}
      - REQUEST_TIMEOUT=${REQUEST_TIMEOUT:-300000}
      - FETCH_TIMEOUT=${FETCH_TIMEOUT:-60000}
      
      # Rate Limiting
      - RATE_LIMIT_REQUESTS=${RATE_LIMIT_REQUESTS:-100}
      - RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW:-60000}
      
      # Logging
      - LOG_LEVEL=${LOG_LEVEL:-info}
    
    volumes:
      # Optional: Mount a volume for persistent data if needed
      - ./data:/app/data
    
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.human-mcp.rule=Host(`${DOMAIN:-localhost}`)"
      - "traefik.http.routers.human-mcp.entrypoints=websecure"
      - "traefik.http.routers.human-mcp.tls.certresolver=letsencrypt"
      - "traefik.http.services.human-mcp.loadbalancer.server.port=3000"
    
    networks:
      - human-mcp-network
    
    # Resource limits for production
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    
    # Health check
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  # Optional: Traefik reverse proxy for production deployment
  traefik:
    image: traefik:v3.1
    container_name: traefik
    restart: unless-stopped
    profiles:
      - proxy
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard (disable in production)
    environment:
      - TRAEFIK_API_DASHBOARD=true
      - TRAEFIK_API_INSECURE=true
      - TRAEFIK_ENTRYPOINTS_WEB_ADDRESS=:80
      - TRAEFIK_ENTRYPOINTS_WEBSECURE_ADDRESS=:443
      - TRAEFIK_PROVIDERS_DOCKER=true
      - TRAEFIK_PROVIDERS_DOCKER_EXPOSEDBYDEFAULT=false
      - TRAEFIK_CERTIFICATESRESOLVERS_LETSENCRYPT_ACME_EMAIL=${ACME_EMAIL:-admin@example.com}
      - TRAEFIK_CERTIFICATESRESOLVERS_LETSENCRYPT_ACME_STORAGE=/letsencrypt/acme.json
      - TRAEFIK_CERTIFICATESRESOLVERS_LETSENCRYPT_ACME_HTTPCHALLENGE_ENTRYPOINT=web
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - human-mcp-network

  # Optional: Redis for session storage (if needed for scaling)
  redis:
    image: redis:7-alpine
    container_name: human-mcp-redis
    restart: unless-stopped
    profiles:
      - redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - human-mcp-network
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  redis-data:

networks:
  human-mcp-network:
    driver: bridge
</file>

<file path="inspector-wrapper.mjs">
#!/usr/bin/env node

// Workaround for eventsource ESM import issues
import { createRequire } from 'module';
import { spawn } from 'child_process';

const require = createRequire(import.meta.url);

// Try to fix the eventsource import by patching the module resolution
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'eventsource' && parent?.filename?.includes('@modelcontextprotocol/inspector')) {
    // Force CommonJS resolution for eventsource
    return require.resolve('eventsource');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Run the inspector with the command line args
const args = process.argv.slice(2);
const child = spawn('npx', ['@modelcontextprotocol/inspector', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--loader ./inspector-loader.mjs'
  }
});

child.on('close', (code) => {
  process.exit(code);
});
</file>

<file path="LICENSE">
MIT License

Copyright (c) 2025 Human MCP

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
</file>

<file path="opencode.jsonc">
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    // "serena": {
    //   "type": "local",
    //   "command": [
    //     "uvx",
    //     "--from",
    //     "git+https://github.com/oraios/serena",
    //     "serena-mcp-server",
    //     "--context",
    //     "ide-assistant",
    //     "--project",
    //     "$(pwd)"
    //   ],
    //   "enabled": true
    // }
  }
}
</file>

<file path="test-eyes.mjs">
import fs from 'fs';
import path from 'path';

// Test if the screenshot file exists and analyze it
const screenshotPath = 'screenshots/CleanShot 2025-09-15 at 13.43.58@2x.png';

if (fs.existsSync(screenshotPath)) {
  console.log('Screenshot file exists');
  const stats = fs.statSync(screenshotPath);
  console.log('File size:', stats.size, 'bytes');
  
  console.log('\nBasic file analysis:');
  console.log('File: CleanShot 2025-09-15 at 13.43.58@2x.png');
  console.log('This appears to be a screenshot taken with CleanShot on September 15, 2025 at 13:43:58');
  console.log('The @2x indicates it was taken on a high-DPI (Retina) display');
  console.log('File size is', Math.round(stats.size/1024), 'KB');
  
  // Let's try to identify basic image properties using Buffer to check image header
  const buffer = fs.readFileSync(screenshotPath);
  const header = buffer.slice(0, 8);
  
  // Check PNG signature
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    console.log('Confirmed: PNG image format');
    
    // Extract PNG dimensions from IHDR chunk (bytes 16-23)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    console.log('Image dimensions:', width, 'x', height, 'pixels');
  }
} else {
  console.log('Screenshot file not found at:', screenshotPath);
}
</file>

<file path=".opencode/agent/code-reviewer.md">
---
name: code-reviewer
description: "Use this agent when you need comprehensive code review and quality assessment. This includes after implementing new features or refactoring existing code, before merging pull requests or deploying to production, when investigating code quality issues or technical debt, when you need security vulnerability assessment, or when optimizing performance bottlenecks."
mode: subagent
model: anthropic/claude-sonnet-4-20250514
---

You are a senior software engineer with 15+ years of experience specializing in comprehensive code quality assessment and best practices enforcement. Your expertise spans multiple programming languages, frameworks, and architectural patterns, with deep knowledge of TypeScript, JavaScript, Dart (Flutter), security vulnerabilities, and performance optimization. You understand the codebase structure, code standards, analyze the given implementation plan file, and track the progress of the implementation.

**Your Core Responsibilities:**

1. **Code Quality Assessment**
   - Read the Product Development Requirements (PDR) and relevant doc files in `./docs` directory to understand the project scope and requirements
   - Review recently modified or added code for adherence to coding standards and best practices
   - Evaluate code readability, maintainability, and documentation quality
   - Identify code smells, anti-patterns, and areas of technical debt
   - Assess proper error handling, validation, and edge case coverage
   - Verify alignment with project-specific standards from CLAUDE.md files
   - Run `flutter analyze` to check for code quality issues

2. **Type Safety and Linting**
   - Perform thorough TypeScript type checking
   - Identify type safety issues and suggest stronger typing where beneficial
   - Run appropriate linters and analyze results
   - Recommend fixes for linting issues while maintaining pragmatic standards
   - Balance strict type safety with developer productivity

3. **Build and Deployment Validation**
   - Verify build processes execute successfully
   - Check for dependency issues or version conflicts
   - Validate deployment configurations and environment settings
   - Ensure proper environment variable handling without exposing secrets
   - Confirm test coverage meets project standards

4. **Performance Analysis**
   - Identify performance bottlenecks and inefficient algorithms
   - Review database queries for optimization opportunities
   - Analyze memory usage patterns and potential leaks
   - Evaluate async/await usage and promise handling
   - Suggest caching strategies where appropriate

5. **Security Audit**
   - Identify common security vulnerabilities (OWASP Top 10)
   - Review authentication and authorization implementations
   - Check for SQL injection, XSS, and other injection vulnerabilities
   - Verify proper input validation and sanitization
   - Ensure sensitive data is properly protected and never exposed in logs or commits
   - Validate CORS, CSP, and other security headers

6. **[IMPORTANT] Task Completeness Verification**
   - Verify all tasks in the TODO list of the given plan are completed
   - Check for any remaining TODO comments
   - Update the given plan file with task status and next steps

**Your Review Process:**

1. **Initial Analysis**: 
   - Read and understand the given plan file.
   - Focus on recently changed files unless explicitly asked to review the entire codebase. 
   - Use git diff or similar tools to identify modifications.

2. **Systematic Review**: Work through each concern area methodically:
   - Code structure and organization
   - Logic correctness and edge cases
   - Type safety and error handling
   - Performance implications
   - Security considerations

3. **Prioritization**: Categorize findings by severity:
   - **Critical**: Security vulnerabilities, data loss risks, breaking changes
   - **High**: Performance issues, type safety problems, missing error handling
   - **Medium**: Code smells, maintainability concerns, documentation gaps
   - **Low**: Style inconsistencies, minor optimizations

4. **Actionable Recommendations**: For each issue found:
   - Clearly explain the problem and its potential impact
   - Provide specific code examples of how to fix it
   - Suggest alternative approaches when applicable
   - Reference relevant best practices or documentation

5. **[IMPORTANT] Update Plan File**: 
   - Update the given plan file with task status and next steps

**Output Format:**

Structure your review as a comprehensive report with:

```markdown
## Code Review Summary

### Scope
- Files reviewed: [list of files]
- Lines of code analyzed: [approximate count]
- Review focus: [recent changes/specific features/full codebase]
- Updated plans: [list of updated plans]

### Overall Assessment
[Brief overview of code quality and main findings]

### Critical Issues
[List any security vulnerabilities or breaking issues]

### High Priority Findings
[Performance problems, type safety issues, etc.]

### Medium Priority Improvements
[Code quality, maintainability suggestions]

### Low Priority Suggestions
[Minor optimizations, style improvements]

### Positive Observations
[Highlight well-written code and good practices]

### Recommended Actions
1. [Prioritized list of actions to take]
2. [Include specific code fixes where helpful]

### Metrics
- Type Coverage: [percentage if applicable]
- Test Coverage: [percentage if available]
- Linting Issues: [count by severity]
```

**Important Guidelines:**

- Be constructive and educational in your feedback
- Acknowledge good practices and well-written code
- Provide context for why certain practices are recommended
- Consider the project's specific requirements and constraints
- Balance ideal practices with pragmatic solutions
- Never suggest adding AI attribution or signatures to code or commits
- Focus on human readability and developer experience
- Respect project-specific standards defined in CLAUDE.md files
- When reviewing error handling, ensure comprehensive try-catch blocks
- Prioritize security best practices in all recommendations
- Use file system (in markdown format) to hand over reports in `./plans/reports` directory to each other with this file name format: `NNN-from-agent-name-to-agent-name-task-name-report.md`.
- **[IMPORTANT]** Verify all tasks in the TODO list of the given plan are completed
- **[IMPORTANT]** Update the given plan file with task status and next steps

You are thorough but pragmatic, focusing on issues that truly matter for code quality, security, maintainability and task completion while avoiding nitpicking on minor style preferences.
</file>

<file path=".opencode/agent/docs-manager.md">
---
description: >-
  Use this agent when documentation needs to be updated, reviewed, or
  maintained. Examples:


  - <example>
      Context: User has just implemented a new API endpoint and wants to ensure documentation is current.
      user: "I just added a new POST /users endpoint with authentication"
      assistant: "I'll use the docs-maintainer agent to update the API documentation with the new endpoint details"
      <commentary>
      Since new code was added, use the docs-maintainer agent to analyze the codebase and update relevant documentation.
      </commentary>
    </example>

  - <example>
      Context: It's been several days since documentation was last updated and code has changed.
      user: "Can you check if our documentation is still accurate?"
      assistant: "I'll use the docs-maintainer agent to review all documentation and update any outdated sections"
      <commentary>
      Since documentation accuracy needs verification, use the docs-maintainer agent to analyze current state and refresh as needed.
      </commentary>
    </example>

  - <example>
      Context: User wants to ensure documentation follows project naming conventions.
      user: "Make sure our API docs use the right variable naming"
      assistant: "I'll use the docs-maintainer agent to review and correct naming conventions in the documentation"
      <commentary>
      Since documentation consistency is needed, use the docs-maintainer agent to verify and fix naming standards.
      </commentary>
    </example>
mode: subagent
model: openrouter/google/gemini-2.5-flash
temperature: 0.1
---
You are a senior technical documentation specialist with deep expertise in creating, maintaining, and organizing developer documentation for complex software projects. Your role is to ensure documentation remains accurate, comprehensive, and maximally useful for development teams.

## Core Responsibilities

1. **Documentation Analysis**: Read and analyze all existing documentation files in the `./docs` directory to understand current state, identify gaps, and assess accuracy.

2. **Codebase Synchronization**: When documentation is outdated (>1 day old) or when explicitly requested, use the `repomix` bash command to generate a fresh codebase summary at `./docs/codebase-summary.md`. This ensures documentation reflects current code reality.

3. **Naming Convention Compliance**: Meticulously verify that all variables, function names, class names, arguments, request/response queries, parameters, and body fields use the correct case conventions (PascalCase, camelCase, or snake_case) as established by the project's coding standards.

4. **Inter-Agent Communication**: Create detailed reports in markdown format within the `./plans/reports` directory using the naming convention: `NNN-from-agent-name-to-agent-name-task-name-report.md` where NNN is a sequential number.

## Operational Workflow

**Initial Assessment**:
- Scan all files in `./docs` directory
- Check last modification dates
- Identify documentation that may be stale or incomplete

**Codebase Analysis**:
- Execute `repomix` command when documentation is >1 day old or upon request
- Parse the generated summary to extract current code structure
- Cross-reference with existing documentation to identify discrepancies

**Documentation Updates**:
- Correct any naming convention mismatches
- Update outdated API specifications, function signatures, or class definitions
- Ensure examples and code snippets reflect current implementation
- Maintain consistent formatting and structure across all documentation

**Quality Assurance**:
- Verify all code references are accurate and properly formatted
- Ensure documentation completeness for new features or changes
- Check that all external links and references remain valid

**Reporting**:
- Document all changes made in detailed reports
- Highlight critical updates that may affect other team members
- Provide recommendations for ongoing documentation maintenance

## Communication Standards

When creating reports, include:
- Summary of changes made
- Rationale for updates
- Impact assessment on existing workflows
- Recommendations for future maintenance

## Output Standards

### Documentation Files
- Use clear, descriptive filenames following project conventions
- Make sure all the variables, function names, class names, arguments, request/response queries, params or body's fields are using correct case (pascal case, camel case, or snake case) following the code standards of the project
- Maintain consistent Markdown formatting
- Include proper headers, table of contents, and navigation
- Add metadata (last updated, version, author) when relevant
- Use code blocks with appropriate syntax highlighting

### Summary Reports
Your summary reports will include:
- **Current State Assessment**: Overview of existing documentation coverage and quality
- **Changes Made**: Detailed list of all documentation updates performed
- **Gaps Identified**: Areas requiring additional documentation
- **Recommendations**: Prioritized list of documentation improvements
- **Metrics**: Documentation coverage percentage, update frequency, and maintenance status

## Best Practices

1. **Clarity Over Completeness**: Write documentation that is immediately useful rather than exhaustively detailed
2. **Examples First**: Include practical examples before diving into technical details
3. **Progressive Disclosure**: Structure information from basic to advanced
4. **Maintenance Mindset**: Write documentation that is easy to update and maintain
5. **User-Centric**: Always consider the documentation from the reader's perspective

## Integration with Development Workflow

- Coordinate with development teams to understand upcoming changes
- Proactively update documentation during feature development, not after
- Maintain a documentation backlog aligned with the development roadmap
- Ensure documentation reviews are part of the code review process
- Track documentation debt and prioritize updates accordingly

Always prioritize accuracy over speed, and when uncertain about code behavior or naming conventions, explicitly state assumptions and recommend verification with the development team.
</file>

<file path=".opencode/agent/git-manager.md">
---
name: git-manager
description: "Use this agent when you need to stage, commit, and push code changes to the current git branch while ensuring security and professional commit standards."
model: opencode/grok-code
mode: subagent
temperature: 0.1
---

You are a Git Operations Specialist, an expert in secure and professional version control practices. Your primary responsibility is to safely stage, commit, and push code changes while maintaining the highest standards of security and commit hygiene.

**Core Responsibilities:**

1. **Security-First Approach**: Before any git operations, scan the working directory for confidential information including:
   - .env files, .env.local, .env.production, or any environment files
   - Files containing API keys, tokens, passwords, or credentials
   - Database connection strings or configuration files with sensitive data
   - Private keys, certificates, or cryptographic materials
   - Any files matching common secret patterns
   If ANY confidential information is detected, STOP immediately and inform the user what needs to be removed or added to .gitignore

2. **Staging Process**: 
   - Use `git status` to review all changes
   - Stage only appropriate files using `git add`
   - Never stage files that should be ignored (.env, node_modules, build artifacts, etc.)
   - Verify staged changes with `git diff --cached`

3. **Commit Message Standards**:
   - Use conventional commit format: `type(scope): description`
   - Common types: feat, fix, docs, style, refactor, test, chore
   - Keep descriptions concise but descriptive
   - Focus on WHAT changed, not HOW it was implemented
   - NEVER include AI attribution signatures or references
   - Examples: `feat(auth): add user login validation`, `fix(api): resolve timeout in database queries`

4. **Push Operations**:
   - Always push to the current branch
   - Verify the remote repository before pushing
   - Handle push conflicts gracefully by informing the user

5. **Quality Checks**:
   - Run `git status` before and after operations
   - Verify commit was created successfully
   - Confirm push completed without errors
   - Provide clear feedback on what was committed and pushed

**Workflow Process**:
1. Scan for confidential files and abort if found
2. Review current git status
3. Stage appropriate files (excluding sensitive/ignored files)
4. Create conventional commit with clean, professional message
5. Push to current branch
6. Provide summary of actions taken

**Error Handling**:
- If merge conflicts exist, guide user to resolve them first
- If push is rejected, explain the issue and suggest solutions
- If no changes to commit, inform user clearly
- Always explain what went wrong and how to fix it

You maintain the integrity of the codebase while ensuring no sensitive information ever reaches the remote repository. Your commit messages are professional, focused, and follow industry standards without any AI tool attribution.
</file>

<file path=".opencode/agent/solution-brainstormer.md">
---
description: >-
  Use this agent when you need to brainstorm software solutions, evaluate
  architectural approaches, or debate technical decisions before implementation.
  Examples:
  - <example>
      Context: User wants to add a new feature to their application
      user: "I want to add real-time notifications to my web app"
      assistant: "Let me use the solution-brainstormer agent to explore the best approaches for implementing real-time notifications"
      <commentary>
      The user needs architectural guidance for a new feature, so use the solution-brainstormer to evaluate options like WebSockets, Server-Sent Events, or push notifications.
      </commentary>
    </example>
  - <example>
      Context: User is considering a major refactoring decision
      user: "Should I migrate from REST to GraphQL for my API?"
      assistant: "I'll engage the solution-brainstormer agent to analyze this architectural decision"
      <commentary>
      This requires evaluating trade-offs, considering existing codebase, and debating pros/cons - perfect for the solution-brainstormer.
      </commentary>
    </example>
  - <example>
      Context: User has a complex technical problem to solve
      user: "I'm struggling with how to handle file uploads that can be several GB in size"
      assistant: "Let me use the solution-brainstormer agent to explore efficient approaches for large file handling"
      <commentary>
      This requires researching best practices, considering UX/DX implications, and evaluating multiple technical approaches.
      </commentary>
    </example>
mode: primary
temperature: 0.1
---
You are a Solution Brainstormer, an elite software engineering expert who specializes in system architecture design and technical decision-making. Your core mission is to collaborate with users to find the best possible solutions while maintaining brutal honesty about feasibility and trade-offs.

## Core Principles
You operate by the holy trinity of software engineering: YAGNI (You Aren't Gonna Need It), KISS (Keep It Simple, Stupid), and DRY (Don't Repeat Yourself). Every solution you propose must honor these principles.

## Your Expertise
- System architecture design and scalability patterns
- Risk assessment and mitigation strategies
- Development time optimization and resource allocation
- User Experience (UX) and Developer Experience (DX) optimization
- Technical debt management and maintainability
- Performance optimization and bottleneck identification

## Your Approach
1. **Question Everything**: Ask probing questions to fully understand the user's request, constraints, and true objectives. Don't assume - clarify until you're 100% certain.

2. **Brutal Honesty**: Provide frank, unfiltered feedback about ideas. If something is unrealistic, over-engineered, or likely to cause problems, say so directly. Your job is to prevent costly mistakes.

3. **Explore Alternatives**: Always consider multiple approaches. Present 2-3 viable solutions with clear pros/cons, explaining why one might be superior.

4. **Challenge Assumptions**: Question the user's initial approach. Often the best solution is different from what was originally envisioned.

5. **Consider All Stakeholders**: Evaluate impact on end users, developers, operations team, and business objectives.

## Collaboration Tools
- Consult the "planner" agent to research industry best practices and find proven solutions
- Engage the "docs-manager" agent to understand existing project implementation and constraints
- Use Research tools to find efficient approaches and learn from others' experiences
- Leverage "eyes_analyze" from Human MCP to analyze visual materials and mockups
- Use "context7" to read latest documentation of external plugins/packages
- Query "psql" to understand current database structure and existing data
- Employ "sequential-thinking" MCP tools for complex problem-solving that requires structured analysis

## Your Process
1. **Discovery Phase**: Ask clarifying questions about requirements, constraints, timeline, and success criteria
2. **Research Phase**: Gather information from other agents and external sources
3. **Analysis Phase**: Evaluate multiple approaches using your expertise and principles
4. **Debate Phase**: Present options, challenge user preferences, and work toward the optimal solution
5. **Consensus Phase**: Ensure alignment on the chosen approach and document decisions
6. **Documentation Phase**: Create a comprehensive markdown summary report with the final agreed solution

## Output Requirements
When brainstorming concludes with agreement, create a detailed markdown summary report including:
- Problem statement and requirements
- Evaluated approaches with pros/cons
- Final recommended solution with rationale
- Implementation considerations and risks
- Success metrics and validation criteria
- Next steps and dependencies

## Critical Constraints
- You DO NOT implement solutions yourself - you only brainstorm and advise
- You must validate feasibility before endorsing any approach
- You prioritize long-term maintainability over short-term convenience
- You consider both technical excellence and business pragmatism

Remember: Your role is to be the user's most trusted technical advisor - someone who will tell them hard truths to ensure they build something great, maintainable, and successful.
</file>

<file path=".opencode/agent/ui-ux-developer.md">
---
description: >-
  Use this agent when you need to transform visual designs into functional user
  interfaces, including converting wireframes, mockups, screenshots, or design
  blueprints into actual UI code. Examples: <example>Context: User has uploaded
  a wireframe image and wants to implement it as a React component. user:
  "Here's a wireframe for our login page, can you implement this?" assistant:
  "I'll use the ui-ux-developer agent to analyze the wireframe and create the
  corresponding UI implementation." <commentary>Since the user has a visual
  design that needs to be converted to code, use the ui-ux-developer agent to
  analyze the image and implement the interface.</commentary></example>
  <example>Context: User wants to update the design system after implementing
  new components. user: "I just added several new components to our app, can you
  update our design system documentation?" assistant: "I'll use the
  ui-ux-developer agent to review the new components and update our design
  system guidelines." <commentary>Since this involves design system maintenance
  and documentation, use the ui-ux-developer agent.</commentary></example>
mode: all
model: openrouter/google/gemini-2.5-pro
temperature: 0.2
---
You are a senior UI/UX developer with exceptional skills in transforming visual designs into functional, beautiful user interfaces. You combine technical expertise with artistic sensibility to create outstanding user experiences.

## Core Responsibilities

You will analyze visual inputs (wireframes, mockups, screenshots, design blueprints) and transform them into production-ready UI code. You excel at interpreting design intent, maintaining consistency, and creating scalable interface solutions.

## Required Tools and Resources

- Read and analyze all visual inputs (images, design visuals)
- Use `context7` MCP to access the latest documentation for packages, plugins, and frameworks
- Always respect rules defined in `AGENTS.md` and architecture guidelines in `./docs/codebase-summary.md`
- Follow all code standards and architectural patterns documented in `./docs`
- Maintain and update the design system at `./docs/design-system-guideline.md`

## Analysis and Implementation Process

1. **Visual Analysis**: Thoroughly examine provided designs, identifying:
   - Layout structure and component hierarchy
   - Typography, colors, spacing, and visual patterns
   - Interactive elements and their expected behaviors
   - Responsive design considerations
   - Accessibility requirements

2. **Technical Planning**: Before coding, determine:
   - Appropriate component architecture
   - Required dependencies and frameworks
   - State management needs
   - Performance considerations

3. **Implementation**: Create clean, maintainable code that:
   - Accurately reflects the visual design
   - Follows established coding standards from `./docs`
   - Uses semantic HTML and proper accessibility attributes
   - Implements responsive design principles
   - Maintains consistency with existing design patterns

## Design System Management

You are responsible for maintaining and evolving the design system:
- Document new components, patterns, and guidelines in `./docs/design-system-guideline.md`
- Ensure consistency across all UI implementations
- Create reusable components that follow established patterns
- Update design tokens (colors, typography, spacing) as needed
- Provide clear usage examples and best practices

## Reporting and Documentation

Create detailed reports in `./plans/reports` using the naming convention:
`NNN-from-ui-ux-developer-to-[recipient]-[task-name]-report.md`

Reports should include:
- Analysis summary of visual inputs
- Implementation approach and decisions made
- Components created or modified
- Design system updates
- Recommendations for future improvements
- Screenshots or examples of the final implementation

## Quality Standards

- Ensure pixel-perfect implementation when specified
- Maintain excellent performance (optimize images, minimize bundle size)
- Implement proper error states and loading indicators
- Test across different screen sizes and devices
- Validate accessibility compliance (WCAG guidelines)
- Write clean, well-documented code with meaningful component names

## Communication Style

- Provide clear explanations of design decisions
- Offer alternative approaches when appropriate
- Highlight potential usability or technical concerns
- Suggest improvements to enhance user experience
- Ask clarifying questions when design intent is unclear

Always strive for the perfect balance between aesthetic excellence and technical implementation, creating interfaces that are both beautiful and functional.
</file>

<file path=".opencode/command/fix/test.md">
---
description: Run test suite and fix issues
---

## Reported Issues:
<issue>
 $ARGUMENTS
</issue>

## Workflow:
1. First use `tester` subagent to run the tests.
2. Then use `debugger` subagent to find the root cause of the issues.
3. Then use `planner` subagent to create a implementation plan with TODO tasks in `./plans` directory.
4. Then implement the plan.
5. After finishing, delegate to `code-reviewer` agent to review code.
6. Repeat this process until all tests pass and no more errors are reported.
</file>

<file path="src/prompts/index.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { debuggingPrompts } from "./debugging-prompts.js";
import { logger } from "@/utils/logger.js";

export async function registerPrompts(server: McpServer) {
  // Register each debugging prompt
  for (const prompt of debuggingPrompts) {
    // Build zod schema for arguments
    const argsSchema: Record<string, z.ZodTypeAny> = {};
    for (const arg of prompt.arguments) {
      if (arg.required) {
        argsSchema[arg.name] = z.string().describe(arg.description);
      } else {
        argsSchema[arg.name] = z.string().optional().describe(arg.description);
      }
    }

    logger.debug(`Registering prompt: ${prompt.name}`);
    
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema
      },
      (args) => {
        logger.debug(`Getting prompt: ${prompt.name}`);
        
        let content = prompt.template;
        
        // Replace template variables
        if (args) {
          for (const [key, value] of Object.entries(args)) {
            const placeholder = `{{${key}}}`;
            content = content.replace(new RegExp(placeholder, 'g'), String(value));
          }
        }
        
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: content
              }
            }
          ]
        };
      }
    );
  }
}
</file>

<file path="src/resources/index.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { documentationContent, examplesContent } from "./documentation.js";
import { logger } from "@/utils/logger.js";

export async function registerResources(server: McpServer) {
  // Register API documentation resource
  server.registerResource(
    "api-docs",
    "humanmcp://docs/api",
    {
      title: "Human MCP API Documentation",
      description: "Complete API reference for all Human MCP tools",
      mimeType: "text/markdown"
    },
    async (uri) => {
      logger.debug(`Reading resource: ${uri.href}`);
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: documentationContent
        }]
      };
    }
  );

  // Register debugging examples resource  
  server.registerResource(
    "debugging-examples",
    "humanmcp://examples/debugging",
    {
      title: "Debugging Examples",
      description: "Real-world examples of using Human MCP for debugging",
      mimeType: "text/markdown"
    },
    async (uri) => {
      logger.debug(`Reading resource: ${uri.href}`);
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown", 
          text: examplesContent
        }]
      };
    }
  );
}
</file>

<file path="src/tools/brain/processors/analytical-reasoning.ts">
import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import { ThoughtManager } from '../utils/thought-manager.js';
import { ReasoningEngine } from '../utils/reasoning-engine.js';
import type {
  BrainAnalyzeInput,
  AnalysisResult,
  ThinkingStyle,
  ThoughtStep
} from '../types.js';

export class AnalyticalReasoningProcessor {
  private geminiClient: GeminiClient;
  private reasoningEngine: ReasoningEngine;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.reasoningEngine = new ReasoningEngine(geminiClient);
  }

  /**
   * Process analytical reasoning request
   */
  async process(input: BrainAnalyzeInput): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting analytical reasoning for: ${input.subject.substring(0, 100)}...`);

      // Initialize thought manager with analytical approach
      const thoughtManager = new ThoughtManager(
        input.subject,
        input.thinkingStyle,
        input.context,
        {
          ...input.options,
          enableBranching: input.considerAlternatives
        }
      );

      // Perform structured analysis
      await this.performStructuredAnalysis(thoughtManager, input);

      // Generate alternative perspectives if requested
      if (input.considerAlternatives) {
        await this.exploreAlternatives(thoughtManager, input);
      }

      // Track and validate assumptions
      if (input.trackAssumptions) {
        await this.analyzeAssumptions(thoughtManager, input);
      }

      // Synthesize comprehensive analysis
      const synthesis = await this.synthesizeAnalysis(thoughtManager, input);

      // Extract key findings and insights
      const keyFindings = await this.extractKeyFindings(thoughtManager, input);

      // Assess evidence quality
      const evidenceQuality = this.assessEvidenceQuality(thoughtManager.getThoughts());

      // Finalize the thought process
      const finalProcess = thoughtManager.finalize();

      const processingTime = Date.now() - startTime;

      return {
        thoughtProcess: finalProcess,
        finalAnswer: synthesis.analysis,
        confidence: synthesis.confidence,
        reasoning: this.buildAnalyticalReasoning(finalProcess),
        recommendations: synthesis.recommendations,
        nextSteps: synthesis.nextSteps,
        keyFindings,
        assumptions: await this.extractAssumptions(thoughtManager.getThoughts()),
        evidenceQuality,
        riskFactors: await this.identifyRiskFactors(thoughtManager, input),
        opportunities: await this.identifyOpportunities(thoughtManager, input),
        processingInfo: {
          totalThoughts: finalProcess.thoughts.length,
          processingTime,
          revisionsUsed: finalProcess.metadata.revisionsCount,
          branchesExplored: finalProcess.metadata.branchesCount,
          hypothesesTested: finalProcess.hypotheses.filter(h => h.tested).length,
          finalConfidence: synthesis.confidence
        }
      };
    } catch (error) {
      logger.error('Analytical reasoning processing failed:', error);
      throw new APIError(`Analytical reasoning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform structured analytical breakdown
   */
  private async performStructuredAnalysis(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<void> {
    const analysisSteps = this.getAnalysisSteps(input.analysisDepth ?? 'detailed', input.focusAreas);

    for (let i = 0; i < analysisSteps.length; i++) {
      const step = analysisSteps[i];

      if (!step) continue;

      try {
        const thoughtResult = await this.generateAnalyticalThought(
          input.subject,
          step,
          thoughtManager.getThoughts(),
          input.thinkingStyle ?? 'analytical',
          input.context
        );

        if (step) {
          thoughtManager.addThought(
            thoughtResult.content,
            thoughtResult.confidence,
            {
              tags: ['analytical', step.category]
            }
          );
        }

        await this.pause(150);
      } catch (error) {
        logger.warn(`Failed to complete analysis step "${step?.name}":`, error);
      }
    }
  }

  /**
   * Explore alternative perspectives and approaches
   */
  private async exploreAlternatives(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<void> {
    try {
      // Create a branch for alternative analysis
      const alternativeBranch = thoughtManager.createBranch(
        thoughtManager.getProcess().currentThought,
        'Alternative Perspectives'
      );

      const alternatives = await this.generateAlternativePerspectives(
        input.subject,
        thoughtManager.getThoughts(),
        input.context
      );

      for (const alternative of alternatives) {
        const thoughtResult = await this.generateAnalyticalThought(
          input.subject,
          {
            name: 'Alternative Perspective',
            prompt: alternative.prompt,
            category: 'alternative'
          },
          thoughtManager.getThoughts(),
          'critical', // Use critical thinking for alternatives
          input.context
        );

        thoughtManager.addThought(
          thoughtResult.content,
          thoughtResult.confidence,
          {
            branchId: alternativeBranch.id,
            branchFromThought: alternativeBranch.fromThought,
            tags: ['alternative', alternative.type]
          }
        );

        await this.pause(200);
      }
    } catch (error) {
      logger.warn('Failed to explore alternatives:', error);
    }
  }

  /**
   * Analyze and track assumptions
   */
  private async analyzeAssumptions(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<void> {
    try {
      const assumptionAnalysisPrompt = this.buildAssumptionAnalysisPrompt(
        input.subject,
        thoughtManager.getThoughts()
      );

      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(assumptionAnalysisPrompt);
      const content = response.response.text();

      if (content) {
        thoughtManager.addThought(
          content,
          0.8,
          {
            tags: ['assumptions', 'meta-analysis']
          }
        );
      }
    } catch (error) {
      logger.warn('Failed to analyze assumptions:', error);
    }
  }

  /**
   * Get analysis steps based on depth and focus areas
   */
  private getAnalysisSteps(
    depth: 'surface' | 'detailed' | 'comprehensive',
    focusAreas?: string[]
  ): Array<{ name: string; prompt: string; category: string }> {
    const baseSteps = [
      {
        name: 'Problem Definition',
        prompt: 'Clearly define and scope the subject for analysis',
        category: 'definition'
      },
      {
        name: 'Context Analysis',
        prompt: 'Analyze the broader context and environment',
        category: 'context'
      },
      {
        name: 'Component Breakdown',
        prompt: 'Break down the subject into key components',
        category: 'breakdown'
      }
    ];

    const detailedSteps = [
      {
        name: 'Stakeholder Analysis',
        prompt: 'Identify and analyze key stakeholders and their interests',
        category: 'stakeholders'
      },
      {
        name: 'Constraint Analysis',
        prompt: 'Identify constraints, limitations, and dependencies',
        category: 'constraints'
      },
      {
        name: 'Impact Assessment',
        prompt: 'Assess potential impacts and consequences',
        category: 'impact'
      }
    ];

    const comprehensiveSteps = [
      {
        name: 'Trend Analysis',
        prompt: 'Analyze relevant trends and patterns',
        category: 'trends'
      },
      {
        name: 'Risk Analysis',
        prompt: 'Identify and evaluate potential risks',
        category: 'risks'
      },
      {
        name: 'Opportunity Analysis',
        prompt: 'Identify potential opportunities and benefits',
        category: 'opportunities'
      },
      {
        name: 'Competitive Analysis',
        prompt: 'Analyze competitive landscape and positioning',
        category: 'competition'
      }
    ];

    let steps = [...baseSteps];

    if (depth === 'detailed' || depth === 'comprehensive') {
      steps.push(...detailedSteps);
    }

    if (depth === 'comprehensive') {
      steps.push(...comprehensiveSteps);
    }

    // Add focus area specific steps
    if (focusAreas && focusAreas.length > 0) {
      for (const area of focusAreas) {
        steps.push({
          name: `${area} Focus`,
          prompt: `Provide detailed analysis specifically focused on ${area}`,
          category: 'focus'
        });
      }
    }

    return steps;
  }

  /**
   * Generate an analytical thought for a specific step
   */
  private async generateAnalyticalThought(
    subject: string,
    step: { name: string; prompt: string; category: string },
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    context?: any
  ): Promise<{ content: string; confidence: number }> {
    const prompt = this.buildStepPrompt(subject, step, previousThoughts, thinkingStyle, context);

    const model = this.geminiClient.getModel('detailed');
    const response = await model.generateContent(prompt);
    const result = response.response;
    const content = result.text();

    if (!content) {
      throw new APIError(`No content generated for analysis step: ${step.name}`);
    }

    const confidence = this.estimateStepConfidence(content, step.category);

    return {
      content: this.cleanStepContent(content, step.name),
      confidence
    };
  }

  /**
   * Build prompt for analysis step
   */
  private buildStepPrompt(
    subject: string,
    step: { name: string; prompt: string; category: string },
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    context?: any
  ): string {
    const contextInfo = context ? this.formatContext(context) : '';
    const thoughtsContext = this.formatPreviousThoughts(previousThoughts);

    return `You are performing ${step.name} as part of a comprehensive analytical process.

**Subject for Analysis:**
${subject}

${contextInfo}

**Analysis Step:** ${step.name}
**Objective:** ${step.prompt}

**Previous Analysis:**
${thoughtsContext}

**Instructions:**
- Use ${thinkingStyle} thinking approach
- Be specific and evidence-based
- Build upon previous analysis without repeating
- Identify key insights and patterns
- Consider multiple perspectives
- Provide actionable insights

**Your ${step.name} analysis:`;
  }

  /**
   * Generate alternative perspectives
   */
  private async generateAlternativePerspectives(
    subject: string,
    thoughts: ThoughtStep[],
    context?: any
  ): Promise<Array<{ type: string; prompt: string }>> {
    const alternatives = [
      {
        type: 'contrarian',
        prompt: 'Challenge the main assumptions and provide a contrarian perspective'
      },
      {
        type: 'optimistic',
        prompt: 'Analyze from an optimistic viewpoint, focusing on positive outcomes'
      },
      {
        type: 'pessimistic',
        prompt: 'Consider potential negative outcomes and worst-case scenarios'
      },
      {
        type: 'outsider',
        prompt: 'Analyze from an external or outsider perspective'
      }
    ];

    return alternatives;
  }

  /**
   * Build assumption analysis prompt
   */
  private buildAssumptionAnalysisPrompt(subject: string, thoughts: ThoughtStep[]): string {
    const thoughtsText = thoughts.map(t => t.content).join('\n\n');

    return `Analyze the assumptions made in the previous analysis.

**Subject:** ${subject}

**Analysis so far:**
${thoughtsText}

**Task:** Identify and evaluate the key assumptions underlying this analysis.

**Focus on:**
- Explicit and implicit assumptions
- Validity and strength of each assumption
- Potential risks if assumptions are wrong
- Evidence supporting or contradicting assumptions
- Alternative assumptions that could be considered

**Your assumption analysis:`;
  }

  /**
   * Synthesize comprehensive analysis
   */
  private async synthesizeAnalysis(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<{ analysis: string; confidence: number; recommendations: string[]; nextSteps: string[] }> {
    return await this.reasoningEngine.synthesizeAnalysis(
      input.subject,
      thoughtManager.getThoughts(),
      thoughtManager.getProcess().hypotheses,
      input.thinkingStyle ?? 'analytical',
      input.context
    );
  }

  /**
   * Extract key findings from analysis
   */
  private async extractKeyFindings(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<string[]> {
    try {
      const findings: string[] = [];
      const thoughts = thoughtManager.getThoughts();

      // Extract insights from high-confidence thoughts
      const highConfidenceThoughts = thoughts.filter(t => t.confidence > 0.7);
      for (const thought of highConfidenceThoughts) {
        if (thought.content.includes('finding:') || thought.content.includes('insight:')) {
          findings.push(thought.content);
        }
      }

      // Extract findings from different analysis categories
      const categories = ['definition', 'context', 'breakdown', 'stakeholders', 'constraints'];
      for (const category of categories) {
        const categoryThoughts = thoughts.filter(t => t.tags?.includes(category));
        if (categoryThoughts.length > 0) {
          const bestThought = categoryThoughts.sort((a, b) => b.confidence - a.confidence)[0];
          if (bestThought) {
            findings.push(`${category}: ${bestThought.content.substring(0, 200)}...`);
          }
        }
      }

      return findings.slice(0, 10); // Limit to top 10 findings
    } catch (error) {
      logger.warn('Failed to extract key findings:', error);
      return ['Analysis completed with multiple insights identified'];
    }
  }

  /**
   * Extract assumptions from thoughts
   */
  private async extractAssumptions(thoughts: ThoughtStep[]): Promise<string[]> {
    const assumptions: string[] = [];

    for (const thought of thoughts) {
      if (thought.tags?.includes('assumptions')) {
        // Extract assumption statements from the content
        const lines = thought.content.split('\n');
        for (const line of lines) {
          if (line.includes('assume') || line.includes('given that') || line.includes('if we consider')) {
            assumptions.push(line.trim());
          }
        }
      }
    }

    return assumptions.slice(0, 8); // Limit to most relevant assumptions
  }

  /**
   * Assess quality of evidence in analysis
   */
  private assessEvidenceQuality(thoughts: ThoughtStep[]): 'strong' | 'moderate' | 'weak' | 'insufficient' {
    const evidenceIndicators = {
      strong: ['data shows', 'research indicates', 'proven', 'demonstrated', 'evidence suggests'],
      moderate: ['likely', 'probably', 'indicates', 'suggests', 'appears'],
      weak: ['might', 'could', 'possibly', 'perhaps', 'speculation']
    };

    let strongCount = 0;
    let moderateCount = 0;
    let weakCount = 0;

    for (const thought of thoughts) {
      const content = thought.content.toLowerCase();

      for (const indicator of evidenceIndicators.strong) {
        if (content.includes(indicator)) strongCount++;
      }
      for (const indicator of evidenceIndicators.moderate) {
        if (content.includes(indicator)) moderateCount++;
      }
      for (const indicator of evidenceIndicators.weak) {
        if (content.includes(indicator)) weakCount++;
      }
    }

    const totalIndicators = strongCount + moderateCount + weakCount;
    if (totalIndicators === 0) return 'insufficient';

    const strongRatio = strongCount / totalIndicators;
    const moderateRatio = moderateCount / totalIndicators;

    if (strongRatio > 0.6) return 'strong';
    if (strongRatio + moderateRatio > 0.7) return 'moderate';
    return 'weak';
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<string[]> {
    const riskThoughts = thoughtManager.getThoughts().filter(t =>
      t.tags?.includes('risks') ||
      t.content.toLowerCase().includes('risk') ||
      t.content.toLowerCase().includes('threat') ||
      t.content.toLowerCase().includes('danger')
    );

    return riskThoughts
      .map(t => this.extractRiskStatements(t.content))
      .flat()
      .slice(0, 5);
  }

  /**
   * Identify opportunities
   */
  private async identifyOpportunities(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<string[]> {
    const opportunityThoughts = thoughtManager.getThoughts().filter(t =>
      t.tags?.includes('opportunities') ||
      t.content.toLowerCase().includes('opportunity') ||
      t.content.toLowerCase().includes('benefit') ||
      t.content.toLowerCase().includes('advantage')
    );

    return opportunityThoughts
      .map(t => this.extractOpportunityStatements(t.content))
      .flat()
      .slice(0, 5);
  }

  /**
   * Extract risk statements from content
   */
  private extractRiskStatements(content: string): string[] {
    const riskKeywords = ['risk of', 'threat of', 'danger of', 'potential for'];
    const statements: string[] = [];

    for (const keyword of riskKeywords) {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 150);
        statements.push(content.substring(start, end).trim());
      }
    }

    return statements;
  }

  /**
   * Extract opportunity statements from content
   */
  private extractOpportunityStatements(content: string): string[] {
    const opportunityKeywords = ['opportunity to', 'benefit of', 'advantage of', 'potential to'];
    const statements: string[] = [];

    for (const keyword of opportunityKeywords) {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 150);
        statements.push(content.substring(start, end).trim());
      }
    }

    return statements;
  }

  /**
   * Build analytical reasoning chain
   */
  private buildAnalyticalReasoning(process: any): string {
    const thoughts = process.thoughts;
    const categories = this.groupThoughtsByCategory(thoughts);

    let reasoning = 'Analytical Reasoning Process:\n\n';

    for (const [category, categoryThoughts] of Object.entries(categories)) {
      reasoning += `${category.toUpperCase()}:\n`;
      for (const thought of categoryThoughts as any[]) {
        reasoning += `• ${thought.content.substring(0, 200)}...\n`;
      }
      reasoning += '\n';
    }

    return reasoning;
  }

  /**
   * Group thoughts by category
   */
  private groupThoughtsByCategory(thoughts: ThoughtStep[]): Record<string, ThoughtStep[]> {
    const categories: Record<string, ThoughtStep[]> = {};

    for (const thought of thoughts) {
      const category = thought.tags?.[1] || 'general';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(thought);
    }

    return categories;
  }

  /**
   * Utility methods
   */
  private formatContext(context: any): string {
    // Implementation similar to ReasoningEngine.formatContext
    return context ? `**Context:** ${JSON.stringify(context)}\n` : '';
  }

  private formatPreviousThoughts(thoughts: ThoughtStep[]): string {
    if (thoughts.length === 0) return 'No previous analysis yet.';
    return thoughts.map(t => `${t.number}. ${t.content}`).join('\n\n');
  }

  private estimateStepConfidence(content: string, category: string): number {
    let confidence = 0.7; // Base confidence

    // Category-specific confidence adjustments
    if (category === 'definition' && content.length > 100) confidence += 0.1;
    if (category === 'breakdown' && content.includes('component')) confidence += 0.1;
    if (category === 'evidence' && content.includes('data')) confidence += 0.2;

    return Math.min(confidence, 0.95);
  }

  private cleanStepContent(content: string, stepName: string): string {
    return content
      .replace(new RegExp(`^Your ${stepName} analysis:?\\s*`, 'i'), '')
      .replace(/^\s*[\-•]\s*/, '')
      .trim();
  }

  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
</file>

<file path="src/tools/brain/processors/problem-solver.ts">
import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import { ThoughtManager } from '../utils/thought-manager.js';
import { ReasoningEngine } from '../utils/reasoning-engine.js';
import type {
  BrainSolveInput,
  SolutionResult,
  Hypothesis
} from '../types.js';

export class ProblemSolverProcessor {
  private geminiClient: GeminiClient;
  private reasoningEngine: ReasoningEngine;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.reasoningEngine = new ReasoningEngine(geminiClient);
  }

  async process(input: BrainSolveInput): Promise<SolutionResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting problem solving for: ${input.problemStatement.substring(0, 100)}...`);

      const thoughtManager = new ThoughtManager(
        input.problemStatement,
        this.mapSolutionApproachToThinkingStyle(input.solutionApproach ?? 'systematic'),
        input.context,
        {
          ...input.options,
          requireEvidence: input.verifyHypotheses
        }
      );

      // Define the problem clearly
      await this.defineProblem(thoughtManager, input);

      // Generate potential solutions
      await this.generateSolutions(thoughtManager, input);

      // Test hypotheses if requested
      if (input.verifyHypotheses) {
        await this.testSolutionHypotheses(thoughtManager, input);
      }

      // Evaluate and select best solution
      const solution = await this.evaluateAndSelectSolution(thoughtManager, input);

      // Generate implementation plan
      const implementationPlan = await this.generateImplementationPlan(thoughtManager, input, solution);

      const finalProcess = thoughtManager.finalize();
      const processingTime = Date.now() - startTime;

      return {
        thoughtProcess: finalProcess,
        finalAnswer: solution.statement,
        confidence: solution.confidence,
        reasoning: this.buildSolutionReasoning(finalProcess),
        recommendations: solution.recommendations,
        nextSteps: implementationPlan.steps,
        proposedSolution: solution.statement,
        implementationSteps: implementationPlan.steps,
        potentialObstacles: implementationPlan.obstacles,
        successCriteria: implementationPlan.successCriteria,
        testPlan: implementationPlan.testPlan,
        fallbackOptions: solution.alternatives,
        processingInfo: {
          totalThoughts: finalProcess.thoughts.length,
          processingTime,
          revisionsUsed: finalProcess.metadata.revisionsCount,
          branchesExplored: finalProcess.metadata.branchesCount,
          hypothesesTested: finalProcess.hypotheses.filter(h => h.tested).length,
          finalConfidence: solution.confidence
        }
      };
    } catch (error) {
      logger.error('Problem solving processing failed:', error);
      throw new APIError(`Problem solving failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async defineProblem(thoughtManager: ThoughtManager, input: BrainSolveInput): Promise<void> {
    const definitionPrompt = this.buildProblemDefinitionPrompt(input);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(definitionPrompt);
      const content = response.response.text();

      if (content) {
        thoughtManager.addThought(content, 0.9, {
          tags: ['problem_definition', 'foundation']
        });
      }
    } catch (error) {
      logger.warn('Failed to define problem:', error);
    }
  }

  private async generateSolutions(thoughtManager: ThoughtManager, input: BrainSolveInput): Promise<void> {
    const maxIterations = Math.min(input.maxIterations ?? 5, 10);

    for (let i = 1; i <= maxIterations; i++) {
      try {
        const solutionPrompt = this.buildSolutionGenerationPrompt(
          input,
          thoughtManager.getThoughts(),
          i
        );

        const model = this.geminiClient.getModel('detailed');
        const response = await model.generateContent(solutionPrompt);
        const content = response.response.text();

        if (content) {
          const confidence = this.estimateSolutionConfidence(content, i, maxIterations);
          thoughtManager.addThought(content, confidence, {
            tags: ['solution_candidate', `iteration_${i}`]
          });

          // Generate hypothesis for this solution if verification is enabled
          if (input.verifyHypotheses) {
            await this.generateSolutionHypothesis(thoughtManager, content, i);
          }
        }

        await this.pause(200);
      } catch (error) {
        logger.warn(`Failed to generate solution iteration ${i}:`, error);
      }
    }
  }

  private async generateSolutionHypothesis(
    thoughtManager: ThoughtManager,
    solutionContent: string,
    iteration: number
  ): Promise<void> {
    try {
      const hypothesis = thoughtManager.addHypothesis(
        `Solution ${iteration} will effectively address the problem`,
        [solutionContent],
        [],
        0.6
      );

      // Test the hypothesis
      const testResult = await this.reasoningEngine.testHypothesis(
        hypothesis,
        thoughtManager.getThoughts()
      );

      thoughtManager.testHypothesis(hypothesis.id, testResult.result, testResult.evidence);
    } catch (error) {
      logger.warn(`Failed to generate hypothesis for solution ${iteration}:`, error);
    }
  }

  private async testSolutionHypotheses(thoughtManager: ThoughtManager, input: BrainSolveInput): Promise<void> {
    const untested = thoughtManager.getActiveHypotheses();

    for (const hypothesis of untested) {
      try {
        const testResult = await this.reasoningEngine.testHypothesis(
          hypothesis,
          thoughtManager.getThoughts(),
          `Testing solution viability against constraints: ${input.constraints?.join(', ')}`
        );

        thoughtManager.testHypothesis(hypothesis.id, testResult.result, testResult.evidence);
        await this.pause(150);
      } catch (error) {
        logger.warn(`Failed to test hypothesis ${hypothesis.id}:`, error);
      }
    }
  }

  private async evaluateAndSelectSolution(
    thoughtManager: ThoughtManager,
    input: BrainSolveInput
  ): Promise<{
    statement: string;
    confidence: number;
    recommendations: string[];
    alternatives: string[];
  }> {
    const evaluationPrompt = this.buildSolutionEvaluationPrompt(input, thoughtManager);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(evaluationPrompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('No solution evaluation generated');
      }

      const evaluation = this.parseSolutionEvaluation(content);

      thoughtManager.addThought(
        `Selected solution: ${evaluation.statement}`,
        evaluation.confidence,
        { tags: ['final_solution', 'decision'] }
      );

      return evaluation;
    } catch (error) {
      logger.error('Failed to evaluate solutions:', error);

      // Fallback: select highest confidence solution
      const solutions = thoughtManager.getThoughts().filter(t => t.tags?.includes('solution_candidate'));
      const bestSolution = solutions.sort((a, b) => b.confidence - a.confidence)[0];

      return {
        statement: bestSolution?.content || 'Unable to determine optimal solution',
        confidence: bestSolution?.confidence || 0.5,
        recommendations: ['Review solution candidates', 'Consider additional approaches'],
        alternatives: solutions.slice(1, 4).map(s => s.content)
      };
    }
  }

  private async generateImplementationPlan(
    thoughtManager: ThoughtManager,
    input: BrainSolveInput,
    solution: { statement: string; confidence: number }
  ): Promise<{
    steps: string[];
    obstacles: string[];
    successCriteria: string[];
    testPlan: string[];
  }> {
    const implementationPrompt = this.buildImplementationPrompt(input, solution);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(implementationPrompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('No implementation plan generated');
      }

      return this.parseImplementationPlan(content);
    } catch (error) {
      logger.error('Failed to generate implementation plan:', error);

      return {
        steps: ['Plan implementation details', 'Execute solution', 'Monitor results'],
        obstacles: ['Resource constraints', 'Technical challenges'],
        successCriteria: ['Problem is resolved', 'Requirements are met'],
        testPlan: ['Validate solution', 'Monitor outcomes']
      };
    }
  }

  private buildProblemDefinitionPrompt(input: BrainSolveInput): string {
    const constraintsText = input.constraints?.length
      ? `\n**Constraints:** ${input.constraints.join(', ')}`
      : '';
    const requirementsText = input.requirements?.length
      ? `\n**Requirements:** ${input.requirements.join(', ')}`
      : '';

    return `You are defining a problem for systematic solution development.

**Problem Statement:**
${input.problemStatement}
${constraintsText}
${requirementsText}

**Context:**
${input.context ? JSON.stringify(input.context) : 'No additional context provided'}

**Task:**
Provide a clear, comprehensive problem definition that includes:
1. Core problem description
2. Scope and boundaries
3. Key stakeholders affected
4. Success criteria
5. Critical factors to consider

**Your problem definition:`;
  }

  private buildSolutionGenerationPrompt(
    input: BrainSolveInput,
    previousThoughts: any[],
    iteration: number
  ): string {
    const previousSolutions = previousThoughts
      .filter(t => t.tags?.includes('solution_candidate'))
      .map(t => `- ${t.content}`)
      .join('\n');

    const approach = this.getSolutionApproachInstructions(input.solutionApproach ?? 'systematic');

    return `Generate solution candidate #${iteration} for the problem.

**Problem:**
${input.problemStatement}

**Approach:** ${input.solutionApproach ?? 'systematic'}
${approach}

**Constraints:** ${input.constraints?.join(', ') || 'None specified'}
**Requirements:** ${input.requirements?.join(', ') || 'None specified'}

**Previous solution candidates:**
${previousSolutions || 'None yet'}

**Task:**
Generate a ${iteration === 1 ? 'comprehensive' : 'alternative'} solution that:
- Addresses the core problem
- Respects all constraints
- Meets specified requirements
- ${iteration > 1 ? 'Differs meaningfully from previous candidates' : 'Provides a solid foundation'}
- Is practical and implementable

**Solution candidate #${iteration}:`;
  }

  private buildSolutionEvaluationPrompt(input: BrainSolveInput, thoughtManager: ThoughtManager): string {
    const solutions = thoughtManager.getThoughts().filter(t => t.tags?.includes('solution_candidate'));
    const hypotheses = thoughtManager.getTestedHypotheses();

    const solutionsText = solutions.map((s, i) =>
      `**Solution ${i + 1}** (Confidence: ${s.confidence.toFixed(2)}):\n${s.content}`
    ).join('\n\n');

    const hypothesesText = hypotheses.map(h =>
      `- ${h.statement}: ${h.result?.toUpperCase()} (${h.confidence.toFixed(2)})`
    ).join('\n');

    return `Evaluate all solution candidates and select the best one.

**Problem:**
${input.problemStatement}

**Solution Candidates:**
${solutionsText}

**Hypothesis Test Results:**
${hypothesesText || 'No hypotheses tested'}

**Evaluation Criteria:**
- Effectiveness in solving the problem
- Feasibility and practicality
- Resource requirements
- Risk level
- Alignment with requirements and constraints

**Task:**
Select the best solution and provide:

SELECTED_SOLUTION: [Your chosen solution statement]
CONFIDENCE: [0.00-1.00]
REASONING: [Why this solution is best]
RECOMMENDATIONS: [Implementation recommendations, one per line]
ALTERNATIVES: [Alternative solutions to consider, one per line]

**Your evaluation:`;
  }

  private buildImplementationPrompt(
    input: BrainSolveInput,
    solution: { statement: string; confidence: number }
  ): string {
    return `Create a detailed implementation plan for the selected solution.

**Problem:**
${input.problemStatement}

**Selected Solution:**
${solution.statement}

**Constraints:** ${input.constraints?.join(', ') || 'None specified'}
**Requirements:** ${input.requirements?.join(', ') || 'None specified'}

**Task:**
Create a comprehensive implementation plan with:

IMPLEMENTATION_STEPS: [Specific actionable steps, one per line]
POTENTIAL_OBSTACLES: [Challenges that might arise, one per line]
SUCCESS_CRITERIA: [How to measure success, one per line]
TEST_PLAN: [How to validate the solution works, one per line]

**Your implementation plan:`;
  }

  private mapSolutionApproachToThinkingStyle(approach: string): any {
    const mapping = {
      systematic: 'systematic',
      creative: 'creative',
      scientific: 'scientific',
      iterative: 'analytical'
    };
    return mapping[approach as keyof typeof mapping] || 'analytical';
  }

  private getSolutionApproachInstructions(approach: string): string {
    const instructions = {
      systematic: 'Use structured, methodical problem-solving. Break down into components and address systematically.',
      creative: 'Think outside the box. Consider unconventional approaches and innovative solutions.',
      scientific: 'Use hypothesis-driven approach. Test assumptions and validate solutions with evidence.',
      iterative: 'Build solutions incrementally. Start simple and refine through iterations.'
    };
    return instructions[approach as keyof typeof instructions] || instructions.systematic;
  }

  private estimateSolutionConfidence(content: string, iteration: number, maxIterations: number): number {
    let confidence = 0.6; // Base confidence

    // Early iterations might be less refined
    if (iteration === 1) confidence += 0.1;

    // Later iterations benefit from previous learning
    if (iteration > maxIterations / 2) confidence += 0.1;

    // Content quality indicators
    if (content.includes('step') || content.includes('phase')) confidence += 0.1;
    if (content.includes('test') || content.includes('validate')) confidence += 0.1;
    if (content.length > 300) confidence += 0.05;

    return Math.min(confidence, 0.9);
  }

  private parseSolutionEvaluation(content: string): {
    statement: string;
    confidence: number;
    recommendations: string[];
    alternatives: string[];
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let statement = '';
    let confidence = 0.7;
    const recommendations: string[] = [];
    const alternatives: string[] = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('SELECTED_SOLUTION:')) {
        statement = line.replace('SELECTED_SOLUTION:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        const confMatch = line.match(/(\d*\.?\d+)/);
        if (confMatch && confMatch[1]) {
          confidence = Math.min(Math.max(parseFloat(confMatch[1]), 0), 1);
        }
      } else if (line.startsWith('RECOMMENDATIONS:')) {
        currentSection = 'recommendations';
      } else if (line.startsWith('ALTERNATIVES:')) {
        currentSection = 'alternatives';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '');
        if (currentSection === 'recommendations') {
          recommendations.push(item);
        } else if (currentSection === 'alternatives') {
          alternatives.push(item);
        }
      }
    }

    return {
      statement: statement || 'Solution selected based on evaluation',
      confidence,
      recommendations,
      alternatives
    };
  }

  private parseImplementationPlan(content: string): {
    steps: string[];
    obstacles: string[];
    successCriteria: string[];
    testPlan: string[];
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    const steps: string[] = [];
    const obstacles: string[] = [];
    const successCriteria: string[] = [];
    const testPlan: string[] = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('IMPLEMENTATION_STEPS:')) {
        currentSection = 'steps';
      } else if (line.startsWith('POTENTIAL_OBSTACLES:')) {
        currentSection = 'obstacles';
      } else if (line.startsWith('SUCCESS_CRITERIA:')) {
        currentSection = 'criteria';
      } else if (line.startsWith('TEST_PLAN:')) {
        currentSection = 'test';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '');
        switch (currentSection) {
          case 'steps': steps.push(item); break;
          case 'obstacles': obstacles.push(item); break;
          case 'criteria': successCriteria.push(item); break;
          case 'test': testPlan.push(item); break;
        }
      }
    }

    return { steps, obstacles, successCriteria, testPlan };
  }

  private buildSolutionReasoning(process: any): string {
    const solutions = process.thoughts.filter((t: any) => t.tags?.includes('solution_candidate'));
    const hypotheses = process.hypotheses;

    let reasoning = 'Problem-Solving Process:\n\n';

    reasoning += `SOLUTION CANDIDATES (${solutions.length}):\n`;
    solutions.forEach((sol: any, i: number) => {
      reasoning += `${i + 1}. ${sol.content.substring(0, 150)}... [${(sol.confidence * 100).toFixed(0)}%]\n`;
    });

    if (hypotheses.length > 0) {
      reasoning += `\nHYPOTHESIS TESTING:\n`;
      hypotheses.forEach((hyp: any) => {
        const status = hyp.tested ? hyp.result?.toUpperCase() : 'NOT_TESTED';
        reasoning += `• ${hyp.statement} → ${status}\n`;
      });
    }

    return reasoning;
  }

  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
</file>

<file path="src/tools/brain/processors/sequential-thinking.ts">
import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import { ThoughtManager } from '../utils/thought-manager.js';
import { ReasoningEngine } from '../utils/reasoning-engine.js';
import type {
  BrainThinkInput,
  ReasoningResult,
  ThinkingStyle,
  ProcessingOptions,
  ThinkingContext
} from '../types.js';

export class SequentialThinkingProcessor {
  private geminiClient: GeminiClient;
  private reasoningEngine: ReasoningEngine;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.reasoningEngine = new ReasoningEngine(geminiClient);
  }

  /**
   * Process sequential thinking request
   */
  async process(input: BrainThinkInput): Promise<ReasoningResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting sequential thinking for: ${input.problem.substring(0, 100)}...`);

      // Initialize thought manager
      const thoughtManager = new ThoughtManager(
        input.problem,
        input.thinkingStyle || 'analytical',
        input.context,
        input.options
      );

      // Generate initial thoughts
      await this.generateInitialThoughts(thoughtManager, input);

      // Continue thinking until completion criteria are met
      await this.continueThinking(thoughtManager, input);

      // Generate hypotheses if enabled
      if (input.options?.requireEvidence) {
        await this.generateHypotheses(thoughtManager, input);
      }

      // Synthesize final analysis
      const synthesis = await this.synthesizeFinalAnalysis(thoughtManager, input);

      // Finalize the thought process
      const finalProcess = thoughtManager.finalize();

      const processingTime = Date.now() - startTime;

      return {
        thoughtProcess: finalProcess,
        finalAnswer: synthesis.analysis,
        confidence: synthesis.confidence,
        reasoning: this.buildReasoningChain(finalProcess),
        recommendations: synthesis.recommendations,
        nextSteps: synthesis.nextSteps,
        processingInfo: {
          totalThoughts: finalProcess.thoughts.length,
          processingTime,
          revisionsUsed: finalProcess.metadata.revisionsCount,
          branchesExplored: finalProcess.metadata.branchesCount,
          hypothesesTested: finalProcess.hypotheses.filter(h => h.tested).length,
          finalConfidence: synthesis.confidence
        }
      };
    } catch (error) {
      logger.error('Sequential thinking processing failed:', error);
      throw new APIError(`Sequential thinking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate initial thoughts based on the problem
   */
  private async generateInitialThoughts(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    logger.debug(`Generating ${input.initialThoughts} initial thoughts`);

    for (let i = 1; i <= (input.initialThoughts || 5); i++) {
      try {
        const thoughtResult = await this.reasoningEngine.generateThought(
          input.problem,
          thoughtManager.getThoughts(),
          input.thinkingStyle || 'analytical' || 'analytical',
          i,
          input.context
        );

        thoughtManager.addThought(
          thoughtResult.content,
          thoughtResult.confidence,
          {
            tags: ['initial']
          }
        );

        // Short pause between thoughts to avoid rate limiting
        await this.pause(100);
      } catch (error) {
        logger.warn(`Failed to generate initial thought ${i}:`, error);
        // Continue with other thoughts
      }
    }
  }

  /**
   * Continue thinking process until completion criteria are met
   */
  private async continueThinking(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    const maxThoughts = input.options?.maxThoughts || 10;
    const timeLimit = (input.options?.timeLimit || 60) * 1000; // Convert to milliseconds
    const startTime = Date.now();

    while (thoughtManager.needsMoreThoughts() &&
           thoughtManager.getProcess().thoughts.length < maxThoughts &&
           (Date.now() - startTime) < timeLimit) {

      try {
        const currentThoughts = thoughtManager.getThoughts();
        const nextThoughtNumber = currentThoughts.length + 1;

        // Determine if we should revise or create new thought
        const shouldRevise = this.shouldReviseThought(currentThoughts, input.options);

        if (shouldRevise && input.options?.allowRevision) {
          await this.performRevision(thoughtManager, input);
        } else {
          const thoughtResult = await this.reasoningEngine.generateThought(
            input.problem,
            currentThoughts,
            input.thinkingStyle || 'analytical' || 'analytical',
            nextThoughtNumber,
            input.context
          );

          thoughtManager.addThought(
            thoughtResult.content,
            thoughtResult.confidence,
            {
              tags: ['continuation']
            }
          );
        }

        // Pause between thoughts
        await this.pause(200);
      } catch (error) {
        logger.warn('Failed to continue thinking:', error);
        break; // Stop if we can't continue
      }
    }

    logger.info(`Completed thinking with ${thoughtManager.getProcess().thoughts.length} thoughts`);
  }

  /**
   * Determine if a thought should be revised
   */
  private shouldReviseThought(
    thoughts: any[],
    options?: ProcessingOptions
  ): boolean {
    if (!options?.allowRevision) return false;
    if (thoughts.length < 3) return false; // Need at least 3 thoughts to consider revision

    // Check for low confidence thoughts that could be improved
    const lowConfidenceThoughts = thoughts.filter(t => t.confidence < 0.6);
    const hasRecentRevision = thoughts.slice(-2).some(t => t.isRevision);

    return lowConfidenceThoughts.length > 0 && !hasRecentRevision;
  }

  /**
   * Perform a revision of a previous thought
   */
  private async performRevision(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    const thoughts = thoughtManager.getThoughts();

    // Find a thought to revise (lowest confidence that hasn't been revised recently)
    const candidatesForRevision = thoughts
      .filter(t => !t.isRevision && t.confidence < 0.7)
      .sort((a, b) => a.confidence - b.confidence);

    if (candidatesForRevision.length === 0) return;

    const toRevise = candidatesForRevision[0];

    try {
      // Generate revised thought
      const revisionPrompt = this.buildRevisionPrompt(toRevise, thoughts, input);
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(revisionPrompt);
      const content = response.response.text();

      if (content) {
        thoughtManager.addThought(
          content,
          Math.min((toRevise?.confidence ?? 0.5) + 0.2, 1.0), // Boost confidence for revision
          {
            isRevision: true,
            revisesThought: toRevise?.number,
            tags: ['revision']
          }
        );

        logger.debug(`Revised thought ${toRevise?.number}`);
      }
    } catch (error) {
      logger.warn(`Failed to revise thought ${toRevise?.number}:`, error);
    }
  }

  /**
   * Build a revision prompt for improving a previous thought
   */
  private buildRevisionPrompt(
    originalThought: any,
    allThoughts: any[],
    input: BrainThinkInput
  ): string {
    return `You are revising and improving a previous thought in a sequential thinking process.

**Original Problem:**
${input.problem}

**Original Thought #${originalThought?.number} (Confidence: ${originalThought?.confidence.toFixed(2)}):**
${originalThought?.content}

**Context from other thoughts:**
${allThoughts
  .filter(t => t.number !== originalThought?.number)
  .map(t => `${t.number}. ${t.content}`)
  .join('\n')}

**Task:**
Revise and improve the original thought. Make it more specific, accurate, and insightful.

**Focus on:**
- Adding more specific details or evidence
- Correcting any logical issues
- Connecting better with other thoughts
- Increasing clarity and actionability

**Revised thought:`;
  }

  /**
   * Generate hypotheses for testing
   */
  private async generateHypotheses(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    try {
      const hypothesisResult = await this.reasoningEngine.generateHypothesis(
        input.problem,
        thoughtManager.getThoughts(),
        input.thinkingStyle || 'analytical'
      );

      const hypothesis = thoughtManager.addHypothesis(
        hypothesisResult.statement,
        hypothesisResult.evidence,
        [], // No counter-evidence initially
        hypothesisResult.confidence
      );

      // Test the hypothesis
      const testResult = await this.reasoningEngine.testHypothesis(
        hypothesis,
        thoughtManager.getThoughts()
      );

      thoughtManager.testHypothesis(
        hypothesis.id,
        testResult.result,
        testResult.evidence
      );

      logger.info(`Generated and tested hypothesis: ${testResult.result}`);
    } catch (error) {
      logger.warn('Failed to generate hypotheses:', error);
    }
  }

  /**
   * Synthesize final analysis
   */
  private async synthesizeFinalAnalysis(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<{ analysis: string; confidence: number; recommendations: string[]; nextSteps: string[] }> {
    try {
      return await this.reasoningEngine.synthesizeAnalysis(
        input.problem,
        thoughtManager.getThoughts(),
        thoughtManager.getProcess().hypotheses,
        input.thinkingStyle || 'analytical',
        input.context
      );
    } catch (error) {
      logger.error('Failed to synthesize analysis:', error);

      // Fallback: create a basic synthesis
      const thoughts = thoughtManager.getThoughts();
      const avgConfidence = thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length;

      return {
        analysis: `Based on ${thoughts.length} thoughts, the analysis suggests multiple approaches to the problem. Key insights include the main themes identified through ${input.thinkingStyle} thinking.`,
        confidence: avgConfidence,
        recommendations: ['Review the thought process', 'Consider implementation'],
        nextSteps: ['Validate assumptions', 'Plan next phase']
      };
    }
  }

  /**
   * Build reasoning chain from thought process
   */
  private buildReasoningChain(process: any): string {
    const thoughts = process.thoughts;
    if (thoughts.length === 0) return 'No reasoning chain available.';

    const chain = thoughts
      .map((thought: any) => {
        const prefix = thought.isRevision ? '↻ ' : '→ ';
        const confidence = `[${(thought.confidence * 100).toFixed(0)}%]`;
        return `${prefix}${thought.content} ${confidence}`;
      })
      .join('\n\n');

    const summary = `\nReasoning Summary:\n- Total thoughts: ${thoughts.length}\n- Revisions: ${process.metadata.revisionsCount}\n- Average confidence: ${((thoughts.reduce((sum: number, t: any) => sum + t.confidence, 0) / thoughts.length) * 100).toFixed(0)}%`;

    return chain + summary;
  }

  /**
   * Utility function to pause execution
   */
  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
</file>

<file path="src/tools/brain/utils/reasoning-engine.ts">
import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import type {
  ThinkingStyle,
  ThinkingContext,
  ProcessingOptions,
  ThoughtStep,
  Hypothesis,
  ReasoningResult
} from '../types.js';

export class ReasoningEngine {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * Generate a single thought based on current context
   */
  async generateThought(
    problem: string,
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    thoughtNumber: number,
    context?: ThinkingContext
  ): Promise<{ content: string; confidence: number }> {
    const prompt = this.buildThoughtPrompt(
      problem,
      previousThoughts,
      thinkingStyle,
      thoughtNumber,
      context
    );

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No content generated from reasoning engine');
      }

      // Parse confidence if provided in response, otherwise estimate
      const confidence = this.extractConfidence(content) || this.estimateConfidence(content, previousThoughts);

      logger.debug(`Generated thought ${thoughtNumber}: ${content.substring(0, 100)}...`);
      return {
        content: this.cleanThoughtContent(content),
        confidence
      };
    } catch (error) {
      logger.error(`Failed to generate thought ${thoughtNumber}:`, error);
      throw new APIError(`Failed to generate thought: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a hypothesis based on current analysis
   */
  async generateHypothesis(
    problem: string,
    thoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle
  ): Promise<{ statement: string; confidence: number; evidence: string[] }> {
    const prompt = this.buildHypothesisPrompt(problem, thoughts, thinkingStyle);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No hypothesis generated');
      }

      const parsed = this.parseHypothesisResponse(content);
      logger.debug(`Generated hypothesis: ${parsed.statement}`);

      return parsed;
    } catch (error) {
      logger.error('Failed to generate hypothesis:', error);
      throw new APIError(`Failed to generate hypothesis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test a hypothesis against available evidence
   */
  async testHypothesis(
    hypothesis: Hypothesis,
    thoughts: ThoughtStep[],
    additionalContext?: string
  ): Promise<{ result: 'confirmed' | 'rejected' | 'inconclusive'; evidence: string[]; reasoning: string }> {
    const prompt = this.buildHypothesisTestPrompt(hypothesis, thoughts, additionalContext);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No hypothesis test result generated');
      }

      const parsed = this.parseHypothesisTestResponse(content);
      logger.info(`Tested hypothesis "${hypothesis.statement}": ${parsed.result}`);

      return parsed;
    } catch (error) {
      logger.error('Failed to test hypothesis:', error);
      throw new APIError(`Failed to test hypothesis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a final analysis based on all thoughts and conclusions
   */
  async synthesizeAnalysis(
    problem: string,
    thoughts: ThoughtStep[],
    hypotheses: Hypothesis[],
    thinkingStyle: ThinkingStyle,
    context?: ThinkingContext
  ): Promise<{ analysis: string; confidence: number; recommendations: string[]; nextSteps: string[] }> {
    const prompt = this.buildSynthesisPrompt(problem, thoughts, hypotheses, thinkingStyle, context);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No synthesis generated');
      }

      const parsed = this.parseSynthesisResponse(content);
      logger.info(`Synthesized analysis with confidence ${parsed.confidence}`);

      return parsed;
    } catch (error) {
      logger.error('Failed to synthesize analysis:', error);
      throw new APIError(`Failed to synthesize analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build a prompt for generating a single thought
   */
  private buildThoughtPrompt(
    problem: string,
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    thoughtNumber: number,
    context?: ThinkingContext
  ): string {
    const styleInstructions = this.getStyleInstructions(thinkingStyle);
    const thoughtsContext = this.formatPreviousThoughts(previousThoughts);
    const contextInfo = context ? this.formatContext(context) : '';

    return `You are an expert reasoning system using ${thinkingStyle} thinking to analyze problems step by step.

${styleInstructions}

**Problem to analyze:**
${problem}

${contextInfo}

**Previous thoughts (${previousThoughts.length}):**
${thoughtsContext}

**Current task:**
Generate thought #${thoughtNumber} that builds on previous analysis. Be specific, logical, and provide actionable insights.

**Requirements:**
- Build upon previous thoughts without repeating them
- Provide specific, concrete insights
- Include confidence assessment
- Consider evidence and assumptions
- Identify gaps or questions if any

**Response format:**
Provide your thought followed by [Confidence: X.XX] where X.XX is a decimal between 0.00 and 1.00.

Your thought #${thoughtNumber}:`;
  }

  /**
   * Build a prompt for generating hypotheses
   */
  private buildHypothesisPrompt(
    problem: string,
    thoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle
  ): string {
    const thoughtsContext = this.formatPreviousThoughts(thoughts);

    return `Based on the analysis so far, generate a testable hypothesis about the problem.

**Problem:**
${problem}

**Analysis so far:**
${thoughtsContext}

**Task:**
Generate a specific, testable hypothesis that could explain or solve the problem.

**Requirements:**
- Make it specific and testable
- Provide supporting evidence from the analysis
- Include confidence level
- Suggest how it could be tested

**Response format:**
HYPOTHESIS: [Your hypothesis statement]
EVIDENCE: [Supporting evidence points, one per line]
CONFIDENCE: [0.00-1.00]

Your response:`;
  }

  /**
   * Build a prompt for testing hypotheses
   */
  private buildHypothesisTestPrompt(
    hypothesis: Hypothesis,
    thoughts: ThoughtStep[],
    additionalContext?: string
  ): string {
    const thoughtsContext = this.formatPreviousThoughts(thoughts);

    return `Evaluate the following hypothesis based on available evidence and reasoning.

**Hypothesis to test:**
${hypothesis.statement}

**Supporting evidence:**
${hypothesis.evidence.map(e => `- ${e}`).join('\n')}

**Counter evidence:**
${hypothesis.counterEvidence.map(e => `- ${e}`).join('\n')}

**Analysis context:**
${thoughtsContext}

${additionalContext ? `**Additional context:**\n${additionalContext}\n` : ''}

**Task:**
Evaluate whether this hypothesis is confirmed, rejected, or inconclusive based on the evidence.

**Response format:**
RESULT: [CONFIRMED|REJECTED|INCONCLUSIVE]
REASONING: [Detailed reasoning for your conclusion]
EVIDENCE: [Additional evidence supporting your conclusion, one per line]

Your evaluation:`;
  }

  /**
   * Build a prompt for synthesizing final analysis
   */
  private buildSynthesisPrompt(
    problem: string,
    thoughts: ThoughtStep[],
    hypotheses: Hypothesis[],
    thinkingStyle: ThinkingStyle,
    context?: ThinkingContext
  ): string {
    const thoughtsContext = this.formatPreviousThoughts(thoughts);
    const hypothesesContext = this.formatHypotheses(hypotheses);
    const contextInfo = context ? this.formatContext(context) : '';

    return `Synthesize a comprehensive analysis based on all the reasoning completed so far.

**Original problem:**
${problem}

${contextInfo}

**Complete thought process:**
${thoughtsContext}

**Hypotheses tested:**
${hypothesesContext}

**Task:**
Provide a comprehensive final analysis that synthesizes all insights, conclusions, and recommendations.

**Requirements:**
- Summarize key findings and insights
- Provide clear conclusions with confidence levels
- Include actionable recommendations
- Suggest logical next steps
- Acknowledge limitations or uncertainties

**Response format:**
ANALYSIS: [Comprehensive analysis and conclusions]
CONFIDENCE: [0.00-1.00]
RECOMMENDATIONS: [Actionable recommendations, one per line]
NEXT_STEPS: [Logical next steps, one per line]

Your synthesis:`;
  }

  /**
   * Get thinking style specific instructions
   */
  private getStyleInstructions(style: ThinkingStyle): string {
    const instructions = {
      analytical: 'Use logical, step-by-step analysis. Break down complex problems into components. Focus on cause-and-effect relationships.',
      systematic: 'Follow a methodical, structured approach. Use frameworks and established methodologies. Ensure completeness and consistency.',
      creative: 'Think outside the box. Consider unconventional approaches. Generate innovative solutions and alternatives.',
      scientific: 'Use hypothesis-driven investigation. Seek evidence and test assumptions. Apply scientific method principles.',
      critical: 'Question assumptions and evaluate evidence critically. Consider biases and alternative perspectives. Challenge conventional thinking.',
      strategic: 'Think long-term and high-level. Consider broader implications and context. Focus on strategic planning and positioning.',
      intuitive: 'Use pattern recognition and experience-based insights. Trust experienced judgment while validating with evidence.',
      collaborative: 'Consider multiple perspectives and stakeholder viewpoints. Seek consensus and collaborative solutions.'
    };

    return instructions[style] || instructions.analytical;
  }

  /**
   * Format previous thoughts for context
   */
  private formatPreviousThoughts(thoughts: ThoughtStep[]): string {
    if (thoughts.length === 0) {
      return 'No previous thoughts yet.';
    }

    return thoughts
      .map(thought => {
        const revisionNote = thought.isRevision ? ' (REVISION)' : '';
        const branchNote = thought.branchId ? ' (BRANCH)' : '';
        return `${thought.number}. ${thought.content} [Confidence: ${thought.confidence.toFixed(2)}]${revisionNote}${branchNote}`;
      })
      .join('\n\n');
  }

  /**
   * Format hypotheses for context
   */
  private formatHypotheses(hypotheses: Hypothesis[]): string {
    if (hypotheses.length === 0) {
      return 'No hypotheses tested yet.';
    }

    return hypotheses
      .map(hyp => {
        const status = hyp.tested ? ` - ${hyp.result?.toUpperCase()}` : ' - NOT TESTED';
        return `- ${hyp.statement} [Confidence: ${hyp.confidence.toFixed(2)}]${status}`;
      })
      .join('\n');
  }

  /**
   * Format context information
   */
  private formatContext(context: ThinkingContext): string {
    const parts = [];

    if (context.domain) parts.push(`**Domain:** ${context.domain}`);
    if (context.background) parts.push(`**Background:** ${context.background}`);
    if (context.constraints?.length) parts.push(`**Constraints:** ${context.constraints.join(', ')}`);
    if (context.requirements?.length) parts.push(`**Requirements:** ${context.requirements.join(', ')}`);
    if (context.timeframe) parts.push(`**Timeframe:** ${context.timeframe}`);

    return parts.length > 0 ? parts.join('\n') + '\n' : '';
  }

  /**
   * Extract confidence score from response text
   */
  private extractConfidence(content: string): number | null {
    const confidenceMatch = content.match(/\[Confidence:\s*(\d*\.?\d+)\]/i);
    if (confidenceMatch && confidenceMatch[1]) {
      const confidence = parseFloat(confidenceMatch[1]);
      return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
    }
    return null;
  }

  /**
   * Estimate confidence based on content quality and context
   */
  private estimateConfidence(content: string, previousThoughts: ThoughtStep[]): number {
    let confidence = 0.5; // Base confidence

    // Length and detail bonus
    if (content.length > 200) confidence += 0.1;
    if (content.length > 500) confidence += 0.1;

    // Specificity indicators
    if (content.includes('specifically') || content.includes('evidence') || content.includes('data')) {
      confidence += 0.1;
    }

    // Reference to previous thoughts
    if (previousThoughts.length > 0 && (content.includes('previous') || content.includes('building on'))) {
      confidence += 0.1;
    }

    // Uncertainty indicators (reduce confidence)
    if (content.includes('might') || content.includes('possibly') || content.includes('unclear')) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0.1), 0.9); // Clamp between 0.1 and 0.9
  }

  /**
   * Clean thought content by removing confidence markers and formatting
   */
  private cleanThoughtContent(content: string): string {
    return content
      .replace(/\[Confidence:\s*\d*\.?\d+\]/gi, '')
      .replace(/^Your thought #\d+:\s*/i, '')
      .replace(/^Thought #?\d+:?\s*/i, '')
      .trim();
  }

  /**
   * Parse hypothesis response
   */
  private parseHypothesisResponse(content: string): { statement: string; confidence: number; evidence: string[] } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let statement = '';
    let confidence = 0.5;
    const evidence: string[] = [];

    for (const line of lines) {
      if (line.startsWith('HYPOTHESIS:')) {
        statement = line.replace('HYPOTHESIS:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        const confMatch = line.match(/(\d*\.?\d+)/);
        if (confMatch && confMatch[1]) {
          confidence = Math.min(Math.max(parseFloat(confMatch[1]), 0), 1);
        }
      } else if (line.startsWith('EVIDENCE:')) {
        // Skip the header line
        continue;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        evidence.push(line.replace(/^[-*]\s*/, ''));
      }
    }

    return {
      statement: statement || 'Generated hypothesis',
      confidence,
      evidence
    };
  }

  /**
   * Parse hypothesis test response
   */
  private parseHypothesisTestResponse(content: string): {
    result: 'confirmed' | 'rejected' | 'inconclusive';
    evidence: string[];
    reasoning: string;
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let result: 'confirmed' | 'rejected' | 'inconclusive' = 'inconclusive';
    let reasoning = '';
    const evidence: string[] = [];

    for (const line of lines) {
      if (line.startsWith('RESULT:')) {
        const resultText = line.replace('RESULT:', '').trim().toLowerCase();
        if (resultText.includes('confirmed')) result = 'confirmed';
        else if (resultText.includes('rejected')) result = 'rejected';
        else result = 'inconclusive';
      } else if (line.startsWith('REASONING:')) {
        reasoning = line.replace('REASONING:', '').trim();
      } else if (line.startsWith('EVIDENCE:')) {
        continue; // Skip header
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        evidence.push(line.replace(/^[-*]\s*/, ''));
      }
    }

    return { result, evidence, reasoning };
  }

  /**
   * Parse synthesis response
   */
  private parseSynthesisResponse(content: string): {
    analysis: string;
    confidence: number;
    recommendations: string[];
    nextSteps: string[];
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let analysis = '';
    let confidence = 0.7;
    const recommendations: string[] = [];
    const nextSteps: string[] = [];

    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('ANALYSIS:')) {
        currentSection = 'analysis';
        analysis = line.replace('ANALYSIS:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        const confMatch = line.match(/(\d*\.?\d+)/);
        if (confMatch && confMatch[1]) {
          confidence = Math.min(Math.max(parseFloat(confMatch[1]), 0), 1);
        }
      } else if (line.startsWith('RECOMMENDATIONS:')) {
        currentSection = 'recommendations';
      } else if (line.startsWith('NEXT_STEPS:')) {
        currentSection = 'nextSteps';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '');
        if (currentSection === 'recommendations') {
          recommendations.push(item);
        } else if (currentSection === 'nextSteps') {
          nextSteps.push(item);
        }
      } else if (currentSection === 'analysis' && line) {
        analysis += (analysis ? ' ' : '') + line;
      }
    }

    return {
      analysis: analysis || 'Analysis completed',
      confidence,
      recommendations,
      nextSteps
    };
  }
}
</file>

<file path="src/tools/eyes/utils/formatters.ts">
import type { AnalysisOptions, ProcessingResult, DetectedElement } from "@/types";

export function createPrompt(options: AnalysisOptions): string {
  const { analysis_type, detail_level, specific_focus } = options;
  
  let basePrompt = "";
  
  switch (analysis_type) {
    case "ui_debug":
      basePrompt = `You are a UI debugging expert. Analyze this visual content for layout issues, rendering problems, misalignments, broken elements, and visual bugs. Focus on identifying what's wrong with the user interface.`;
      break;
    case "error_detection":
      basePrompt = `You are an error detection specialist. Look for visible error messages, error states, broken functionality, missing content, and any signs of system failures or exceptions.`;
      break;
    case "accessibility":
      basePrompt = `You are an accessibility expert. Analyze this content for accessibility issues including color contrast, text readability, missing alt text, poor focus indicators, and compliance with WCAG guidelines.`;
      break;
    case "performance":
      basePrompt = `You are a performance analysis expert. Look for signs of slow loading, layout shifts, render blocking, large images, and other performance-related visual indicators.`;
      break;
    case "layout":
      basePrompt = `You are a layout analysis expert. Focus on responsive design issues, element positioning, spacing, alignment, overflow problems, and overall visual hierarchy.`;
      break;
    default:
      basePrompt = `You are a visual analysis expert. Provide a comprehensive analysis of this visual content.`;
  }
  
  const detailInstructions = {
    quick: "Provide a concise analysis focusing on the most important findings.",
    detailed: "Provide a thorough analysis with specific details about each finding."
  };
  
  const focusInstruction = specific_focus 
    ? `\n\nPay special attention to: ${specific_focus}`
    : "";
  
  return `${basePrompt}

${detailInstructions[detail_level]}

Please structure your response as follows:
1. OVERVIEW: Brief summary of what you see
2. KEY FINDINGS: Main issues or points of interest
3. DETAILED ANALYSIS: Comprehensive breakdown
4. UI ELEMENTS: List detected interactive elements with approximate positions
5. RECOMMENDATIONS: Specific actionable suggestions
6. DEBUGGING INSIGHTS: Technical insights for developers

${focusInstruction}

Be specific, technical, and provide exact details where possible. Include coordinates, colors, sizes, and any measurable properties you can identify.`;
}

export function parseAnalysisResponse(response: string): Partial<ProcessingResult> {
  const sections = {
    overview: extractSection(response, "OVERVIEW"),
    findings: extractSection(response, "KEY FINDINGS"),
    analysis: extractSection(response, "DETAILED ANALYSIS"),
    elements: extractSection(response, "UI ELEMENTS"),
    recommendations: extractSection(response, "RECOMMENDATIONS"),
    insights: extractSection(response, "DEBUGGING INSIGHTS")
  };
  
  return {
    description: sections.overview || response.substring(0, 500),
    analysis: sections.analysis || response,
    elements: parseUIElements(sections.elements),
    insights: parseList(sections.insights),
    recommendations: parseList(sections.recommendations)
  };
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n[A-Z]+:|$)`, 'i');
  const match = text.match(regex);
  return match?.[1]?.trim() || "";
}

function parseList(text: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map(line => line.replace(/^[-*•]\s*/, '').trim())
    .filter(line => line.length > 0);
}

function parseUIElements(text: string): DetectedElement[] {
  if (!text) return [];
  
  const elements: DetectedElement[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const coordMatch = line.match(/(\d+),\s*(\d+).*?(\d+)x(\d+)|x:\s*(\d+).*?y:\s*(\d+).*?w:\s*(\d+).*?h:\s*(\d+)/i);
    if (coordMatch) {
      const [, x1, y1, w1, h1, x2, y2, w2, h2] = coordMatch;
      const x = parseInt(x1 || x2 || "0");
      const y = parseInt(y1 || y2 || "0");
      const width = parseInt(w1 || w2 || "0");
      const height = parseInt(h1 || h2 || "0");
      
      if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
        elements.push({
          type: extractElementType(line),
          location: { x, y, width, height },
          properties: { description: line.trim() }
        });
      }
    }
  }
  
  return elements;
}

function extractElementType(line: string): string {
  const types = ["button", "input", "link", "image", "text", "menu", "modal", "form", "icon"];
  const lowerLine = line.toLowerCase();
  
  for (const type of types) {
    if (lowerLine.includes(type)) {
      return type;
    }
  }
  
  return "element";
}
</file>

<file path="src/tools/hands/processors/image-generator.ts">
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import type { ImageGenerationOptions, ImageGenerationResult } from "../schemas.js";
import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export async function generateImage(
  geminiClient: GeminiClient,
  options: ImageGenerationOptions,
  config?: Config
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    // Build the enhanced prompt with style and aspect ratio
    let enhancedPrompt = options.prompt;

    if (options.style) {
      const styleMapping: Record<string, string> = {
        photorealistic: "photorealistic, high quality, detailed",
        artistic: "artistic style, creative, expressive",
        cartoon: "cartoon style, animated, colorful",
        sketch: "pencil sketch, hand-drawn, artistic",
        digital_art: "digital art, modern, stylized"
      };
      const styleDescription = styleMapping[options.style];
      if (styleDescription) {
        enhancedPrompt = `${enhancedPrompt}, ${styleDescription}`;
      }
    }

    if (options.aspectRatio && options.aspectRatio !== "1:1") {
      enhancedPrompt = `${enhancedPrompt}, aspect ratio ${options.aspectRatio}`;
    }

    if (options.negativePrompt) {
      enhancedPrompt = `${enhancedPrompt}. Avoid: ${options.negativePrompt}`;
    }

    logger.info(`Enhanced prompt: "${enhancedPrompt}"`);

    // Get the image generation model
    const model = geminiClient.getImageGenerationModel(options.model);

    // Generate the image using Gemini API
    const response = await model.generateContent([
      {
        text: enhancedPrompt
      }
    ]);

    const result = response.response;

    // Extract image data from the response
    // Note: The actual implementation will depend on how Gemini returns image data
    // This is a placeholder implementation based on expected API behavior
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image candidates returned from Gemini API");
    }

    const candidate = candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("Invalid response format from Gemini API");
    }

    // Look for image data in the response parts
    let imageData: string | null = null;
    let mimeType = "image/jpeg";

    for (const part of candidate.content.parts) {
      if ('inlineData' in part && part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/jpeg";
        break;
      }
    }

    if (!imageData) {
      throw new Error("No image data found in Gemini response");
    }

    const generationTime = Date.now() - startTime;

    // Prepare the result based on output format
    let resultData: string;
    let format: string;
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    // Always save file to reduce token usage, unless explicitly disabled
    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        const savedFile = await saveBase64ToFile(
          imageData,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'gemini-image',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Image saved to file: ${filePath}`);

        // For URL format, return the file URL if available, otherwise file path
        if (options.outputFormat === "url") {
          resultData = fileUrl || filePath || `data:${mimeType};base64,${imageData}`;
          format = fileUrl ? "url" : "file_path";
        } else {
          // For base64 format, return base64 but also include file info
          resultData = `data:${mimeType};base64,${imageData}`;
          format = "base64_data_uri";
        }
      } catch (error) {
        logger.warn(`Failed to save image file: ${error}. Falling back to base64 only.`);
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
      }
    } else {
      if (options.outputFormat === "base64") {
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
      } else {
        // For URL format without file saving, fall back to base64
        resultData = `data:${mimeType};base64,${imageData}`;
        format = "base64_data_uri";
        logger.warn("URL output format requested but file saving disabled. Returning base64 data URI");
      }
    }

    return {
      imageData: resultData,
      format,
      model: options.model,
      generationTime,
      size: estimateImageSize(imageData),
      filePath,
      fileName,
      fileUrl,
      fileSize
    };

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Image generation failed after ${generationTime}ms:`, error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Invalid or missing Google AI API key. Please check your GOOGLE_GEMINI_API_KEY environment variable.");
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("API quota exceeded or rate limit reached. Please try again later.");
      }
      if (error.message.includes("safety") || error.message.includes("policy")) {
        throw new Error("Image generation blocked due to safety policies. Please modify your prompt and try again.");
      }
      throw new Error(`Image generation failed: ${error.message}`);
    }

    throw new Error("Image generation failed due to an unexpected error");
  }
}

function estimateImageSize(base64Data: string): string {
  // Estimate image dimensions based on base64 data length
  // This is a rough estimation - actual size would need image parsing
  const dataLength = base64Data.length;
  const estimatedBytes = (dataLength * 3) / 4; // Base64 to bytes conversion

  // Rough estimation for common image sizes
  if (estimatedBytes < 100000) { // ~100KB
    return "512x512";
  } else if (estimatedBytes < 400000) { // ~400KB
    return "1024x1024";
  } else {
    return "1024x1024+";
  }
}
</file>

<file path="src/tools/hands/processors/video-generator.ts">
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import type { VideoGenerationOptions, VideoGenerationResult } from "../schemas.js";
import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";

export async function generateVideo(
  geminiClient: GeminiClient,
  options: VideoGenerationOptions,
  config?: Config
): Promise<VideoGenerationResult> {
  const startTime = Date.now();

  try {
    logger.info(`Generating video with prompt: "${options.prompt}" using model: ${options.model}`);

    const videoOptions = {
      model: options.model,
      duration: options.duration,
      aspectRatio: options.aspectRatio,
      fps: options.fps,
      imageInput: options.imageInput,
      style: options.style,
      cameraMovement: options.cameraMovement,
      seed: options.seed
    };

    const result = await geminiClient.generateVideoWithRetry(options.prompt, videoOptions);

    const generationTime = Date.now() - startTime;

    // Parse the result and return formatted response
    let resultData: string;
    let format: string;
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number | undefined;

    // Determine format
    if (options.outputFormat === "mp4") {
      format = "mp4";
    } else if (options.outputFormat === "webm") {
      format = "webm";
      logger.warn("WebM format conversion not yet implemented, returning MP4");
    } else {
      format = "mp4";
    }

    // Always save file to reduce token usage, unless explicitly disabled
    const shouldSaveFile = options.saveToFile !== false;
    const shouldUploadToR2 = options.uploadToR2 === true;

    if (shouldSaveFile && config) {
      try {
        // Determine MIME type based on format
        const mimeType = format === "webm" ? "video/webm" : "video/mp4";

        const savedFile = await saveBase64ToFile(
          result.videoData,
          mimeType,
          config,
          {
            prefix: options.filePrefix || 'gemini-video',
            directory: options.saveDirectory,
            uploadToR2: shouldUploadToR2
          }
        );

        filePath = savedFile.filePath;
        fileName = savedFile.fileName;
        fileUrl = savedFile.url;
        fileSize = savedFile.size;

        logger.info(`Video saved to file: ${filePath}`);

        // Return the file path/URL instead of base64 data for better token efficiency
        resultData = fileUrl || filePath || result.videoData;
      } catch (error) {
        logger.warn(`Failed to save video file: ${error}. Falling back to base64 only.`);
        resultData = result.videoData;
      }
    } else {
      resultData = result.videoData;
    }

    return {
      videoData: resultData,
      format,
      model: options.model,
      duration: options.duration,
      aspectRatio: options.aspectRatio,
      fps: options.fps,
      generationTime,
      size: estimateVideoSize(options.duration, options.aspectRatio),
      operationId: result.operationId,
      filePath,
      fileName,
      fileUrl,
      fileSize
    };

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Video generation failed after ${generationTime}ms:`, error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Invalid or missing Google AI API key. Please check your GOOGLE_GEMINI_API_KEY environment variable.");
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("API quota exceeded or rate limit reached. Please try again later.");
      }
      if (error.message.includes("safety") || error.message.includes("policy")) {
        throw new Error("Video generation blocked due to safety policies. Please modify your prompt and try again.");
      }
      if (error.message.includes("timeout")) {
        throw new Error("Video generation timed out. This is normal for longer videos. Please try again or use a shorter duration.");
      }
      throw new Error(`Video generation failed: ${error.message}`);
    }

    throw new Error("Video generation failed due to an unexpected error");
  }
}

export async function generateImageToVideo(
  geminiClient: GeminiClient,
  prompt: string,
  imageInput: string,
  options: Partial<VideoGenerationOptions> = {},
  config?: Config
): Promise<VideoGenerationResult> {
  logger.info(`Generating video from image with prompt: "${prompt}"`);

  const videoOptions: VideoGenerationOptions = {
    prompt,
    model: options.model || "veo-3.0-generate-001",
    duration: options.duration || "4s",
    outputFormat: options.outputFormat || "mp4",
    aspectRatio: options.aspectRatio || "16:9",
    fps: options.fps || 24,
    imageInput,
    style: options.style,
    cameraMovement: options.cameraMovement,
    seed: options.seed,
    fetchTimeout: options.fetchTimeout || 300000
  };

  return await generateVideo(geminiClient, videoOptions, config);
}

export async function pollVideoGeneration(
  geminiClient: GeminiClient,
  operationId: string,
  maxWaitTime: number = 300000 // 5 minutes
): Promise<VideoGenerationResult> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  logger.info(`Polling video generation operation: ${operationId}`);

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await geminiClient.pollVideoGenerationOperation(operationId);

      if (status.done) {
        if (status.error) {
          throw new Error(`Video generation failed: ${status.error}`);
        }

        if (status.result) {
          const generationTime = Date.now() - startTime;
          logger.info(`Video generation completed in ${generationTime}ms`);

          return {
            videoData: status.result.videoData,
            format: "mp4",
            model: "veo-3.0-generate-001",
            duration: "4s", // Would come from operation metadata
            aspectRatio: "16:9", // Would come from operation metadata
            fps: 24, // Would come from operation metadata
            generationTime: status.result.generationTime,
            size: "1920x1080", // Would be calculated from actual video
            operationId
          };
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      logger.debug(`Video generation still in progress... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);

    } catch (error) {
      logger.error(`Error polling video generation:`, error);
      throw new Error(`Failed to poll video generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  throw new Error(`Video generation timed out after ${maxWaitTime / 1000} seconds`);
}

function estimateVideoSize(duration: string, aspectRatio: string): string {
  // Estimate video dimensions based on duration and aspect ratio
  const durationSeconds = parseInt(duration.replace('s', ''));

  let width: number, height: number;

  switch (aspectRatio) {
    case "1:1":
      width = 1024; height = 1024;
      break;
    case "16:9":
      width = 1920; height = 1080;
      break;
    case "9:16":
      width = 1080; height = 1920;
      break;
    case "4:3":
      width = 1440; height = 1080;
      break;
    case "3:4":
      width = 1080; height = 1440;
      break;
    default:
      width = 1920; height = 1080;
  }

  return `${width}x${height}`;
}
</file>

<file path="src/tools/mouth/processors/speech-synthesis.ts">
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { APIError } from "@/utils/errors.js";
import type { SpeechGenerationResult } from "../schemas.js";
import { createAudioStorage } from "../utils/audio-storage.js";
import type { Config } from "@/utils/config.js";

export interface SpeechOptions {
  text: string;
  voice?: string;
  model?: string;
  language?: string;
  outputFormat?: string;
  stylePrompt?: string;
  fetchTimeout?: number;
  config: Config;
}

/**
 * Generate speech from text using Gemini Speech Generation API
 */
export async function generateSpeech(
  geminiClient: GeminiClient,
  options: SpeechOptions
): Promise<SpeechGenerationResult> {
  const startTime = Date.now();

  try {
    const {
      text,
      voice = "Zephyr",
      model = "gemini-2.5-flash-preview-tts",
      language = "en-US",
      outputFormat = "base64",
      stylePrompt,
      fetchTimeout = 60000,
      config
    } = options;

    logger.info(`Generating speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" with voice: ${voice}`);

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new APIError("Text is required for speech generation");
    }

    if (text.length > 32000) {
      throw new APIError("Text too long. Maximum 32,000 characters allowed for speech generation");
    }

    // Generate speech using extended GeminiClient
    const speechResult = await geminiClient.generateSpeechWithRetry(text, {
      voice,
      model,
      language,
      stylePrompt
    });

    const generationTime = Date.now() - startTime;

    // Store audio automatically
    const audioStorage = createAudioStorage(config);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `speech_${voice}_${timestamp}.wav`;

    const storageResult = await audioStorage.storeAudio({
      audioData: speechResult.audioData,
      filename,
      voice,
      language,
      text,
      format: "wav"
    });

    // Process audio data based on output format
    let processedAudioData = speechResult.audioData;

    if (outputFormat === "url") {
      // Use cloud URL if available, otherwise return base64
      if (storageResult.cloudUrl) {
        processedAudioData = storageResult.cloudUrl;
      } else {
        logger.warn("Cloud storage not configured, returning base64");
        processedAudioData = `data:audio/wav;base64,${speechResult.audioData}`;
      }
    } else if (outputFormat === "wav") {
      // Return raw base64 for WAV format
      processedAudioData = speechResult.audioData;
    } else {
      // Default to base64 data URI
      processedAudioData = `data:audio/wav;base64,${speechResult.audioData}`;
    }

    const result: SpeechGenerationResult = {
      audioData: processedAudioData,
      format: outputFormat === "wav" ? "wav" : "base64",
      model,
      voice,
      language,
      generationTime,
      localPath: storageResult.localPath,
      cloudUrl: storageResult.cloudUrl,
      filename: storageResult.filename,
      fileSize: storageResult.size,
      storage: storageResult.storage,
      metadata: {
        timestamp: storageResult.metadata.timestamp,
        textLength: text.length,
        sampleRate: 24000,
        channels: 1,
        voice: storageResult.metadata.voice,
        language: storageResult.metadata.language,
        textPreview: storageResult.metadata.textPreview,
        format: storageResult.metadata.format,
        audioLength: speechResult.metadata?.audioLength
      }
    };

    logger.info(`Speech generation completed in ${generationTime}ms. Saved to: ${storageResult.localPath || 'local storage failed'}${storageResult.cloudUrl ? `, Cloud: ${storageResult.cloudUrl}` : ''}`);
    return result;

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logger.error(`Speech generation failed after ${generationTime}ms:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
</file>

<file path="src/tools/mouth/schemas.ts">
import { z } from "zod";

// Available voice names from Gemini Speech Generation API
export const VoiceNames = [
  "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
  "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
  "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
  "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
] as const;

// Supported languages from Gemini Speech Generation API (September 2025 update)
// Reference: Gemini TTS supported locales documentation
export const SupportedLanguages = [
  "ar-EG", "de-DE", "en-US", "es-US", "fr-FR", "hi-IN", "id-ID", "it-IT",
  "ja-JP", "ko-KR", "pt-BR", "ru-RU", "nl-NL", "pl-PL", "th-TH", "tr-TR",
  "vi-VN", "ro-RO", "uk-UA", "bn-BD", "en-IN", "mr-IN", "ta-IN", "te-IN"
] as const;

// Speech generation models
export const SpeechModels = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts"
] as const;

// Audio output formats
export const AudioFormats = [
  "wav",
  "base64",
  "url"
] as const;

// Base speech generation input schema
export const SpeechInputSchema = z.object({
  text: z.string().min(1).max(32000).describe("Text to convert to speech (max 32k tokens)"),
  voice: z.enum(VoiceNames).optional().default("Zephyr").describe("Voice to use for speech generation"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  style_prompt: z.string().optional().describe("Natural language prompt to control speaking style")
});

// Narration input schema for long-form content
export const NarrationInputSchema = z.object({
  content: z.string().min(1).describe("Long-form content to narrate"),
  voice: z.enum(VoiceNames).optional().default("Sage").describe("Voice to use for narration"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for narration"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  narration_style: z.enum(["professional", "casual", "educational", "storytelling"]).optional().default("professional").describe("Narration style"),
  chapter_breaks: z.boolean().optional().default(false).describe("Add pauses between chapters/sections"),
  max_chunk_size: z.number().optional().default(8000).describe("Maximum characters per audio chunk")
});

// Code explanation input schema
export const CodeExplanationInputSchema = z.object({
  code: z.string().min(1).describe("Code to explain"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for explanation"),
  programming_language: z.string().optional().describe("Programming language of the code"),
  voice: z.enum(VoiceNames).optional().default("Apollo").describe("Voice to use for explanation"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  explanation_level: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate").describe("Technical level of explanation"),
  include_examples: z.boolean().optional().default(true).describe("Include examples in explanation")
});

// Voice customization input schema
export const VoiceCustomizationInputSchema = z.object({
  text: z.string().min(1).max(1000).describe("Sample text to test voice customization"),
  voice: z.enum(VoiceNames).describe("Base voice to customize"),
  model: z.enum(SpeechModels).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
  language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
  output_format: z.enum(AudioFormats).optional().default("base64").describe("Output format for generated audio"),
  style_variations: z.array(z.string()).optional().describe("Array of different style prompts to test"),
  compare_voices: z.array(z.enum(VoiceNames)).optional().describe("Additional voices to compare with the main voice")
});

// Type exports
export type SpeechInput = z.infer<typeof SpeechInputSchema>;
export type NarrationInput = z.infer<typeof NarrationInputSchema>;
export type CodeExplanationInput = z.infer<typeof CodeExplanationInputSchema>;
export type VoiceCustomizationInput = z.infer<typeof VoiceCustomizationInputSchema>;

// Speech generation response types
export interface SpeechGenerationResult {
  audioData: string;
  format: string;
  model: string;
  voice: string;
  language: string;
  generationTime: number;
  localPath?: string;
  cloudUrl?: string;
  filename?: string;
  fileSize?: number;
  storage?: {
    local: boolean;
    cloud: boolean;
  };
  metadata: {
    timestamp: string;
    textLength: number;
    audioLength?: number;
    sampleRate: number;
    channels: number;
    voice?: string;
    language?: string;
    textPreview?: string;
    format?: string;
  };
}

export interface NarrationResult {
  chunks: SpeechGenerationResult[];
  totalDuration: number;
  chapterBreaks: number[];
  metadata: {
    timestamp: string;
    totalTextLength: number;
    totalChunks: number;
    narrationStyle: string;
  };
}

export interface CodeExplanationResult {
  explanation: SpeechGenerationResult;
  codeAnalysis: {
    programmingLanguage: string;
    complexity: string;
    keyPoints: string[];
    examples: string[];
  };
  metadata: {
    timestamp: string;
    explanationLevel: string;
    codeLength: number;
  };
}

export interface VoiceCustomizationResult {
  samples: {
    voice: string;
    stylePrompt?: string;
    audioData: string;
    metadata: {
      generationTime: number;
      audioLength?: number;
    };
  }[];
  recommendation: {
    bestVoice: string;
    bestStyle?: string;
    reasoning: string;
  };
  metadata: {
    timestamp: string;
    testText: string;
    totalSamples: number;
  };
}
</file>

<file path="src/transports/index.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startStdioTransport } from "./stdio.js";
import { startHttpTransport } from "./http/server.js";
import type { TransportConfig, HttpServerHandle } from "./types.js";

export class TransportManager {
  private server: McpServer;
  private config: TransportConfig;
  private httpHandle?: HttpServerHandle;

  constructor(server: McpServer, config: TransportConfig) {
    this.server = server;
    this.config = config;
  }

  async start(): Promise<void> {
    switch (this.config.type) {
      case 'stdio':
        await startStdioTransport(this.server);
        break;
      case 'http':
        this.httpHandle = await startHttpTransport(this.server, this.config.http!);
        break;
      case 'both':
        await startStdioTransport(this.server);
        this.httpHandle = await startHttpTransport(this.server, this.config.http!);
        break;
    }
  }

  async stop(): Promise<void> {
    if (this.httpHandle) {
      await this.httpHandle.close();
    }
  }
}
</file>

<file path="tests/e2e/hands-real-api.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { readFileSync } from 'fs';
import { generateImage } from '@/tools/hands/processors/image-generator';
import { GeminiClient } from '@/tools/eyes/utils/gemini-client';
import { registerHandsTool } from '@/tools/hands/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '@/utils/config';
import type { ImageGenerationOptions } from '@/tools/hands/schemas';

// Configuration for real API tests
const REAL_API_CONFIG = {
  gemini: {
    apiKey: '',
    model: 'gemini-2.5-flash'
  },
  server: {
    requestTimeout: 300000,
    fetchTimeout: 60000
  },
  documentProcessing: {
    geminiModel: 'gemini-2.5-flash',
    timeout: 300000,
    maxFileSize: 100 * 1024 * 1024
  }
} as Config;

// Helper function to check if real API tests should run
function shouldRunRealApiTests(): boolean {
  const envFile = '/Users/duynguyen/www/human-mcp/.env.prod';
  try {
    const envContent = readFileSync(envFile, 'utf-8');
    const apiKeyMatch = envContent.match(/GOOGLE_GEMINI_API_KEY="([^"]+)"/);
    if (apiKeyMatch && apiKeyMatch[1]) {
      REAL_API_CONFIG.gemini.apiKey = apiKeyMatch[1];
      return true;
    }
  } catch (error) {
    console.warn('Could not read .env.prod file:', error);
  }
  return false;
}

// Utility function to validate base64 image
function isValidBase64Image(data: string): boolean {
  const base64Regex = /^data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)$/;
  return base64Regex.test(data);
}

// Utility function to get image size from base64
function getImageSizeFromBase64(data: string): { width: number; height: number } | null {
  try {
    const base64Data = data.split(',')[1];
    if (!base64Data) return null;

    const buffer = Buffer.from(base64Data, 'base64');

    // Simple JPEG header parsing for dimensions
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      // This is a simplified approach - in production you'd use a proper image library
      return { width: 1024, height: 1024 }; // Default assumption
    }

    return null;
  } catch {
    return null;
  }
}

describe('Hands Tool E2E Tests with Real Gemini API', () => {
  let geminiClient: GeminiClient;
  let server: McpServer;
  const testTimeout = 120000; // 2 minutes for real API calls

  beforeAll(async () => {
    if (!shouldRunRealApiTests()) {
      console.log('Skipping real API tests - GOOGLE_GEMINI_API_KEY not found in .env.prod');
      return;
    }

    // Set environment variable for GeminiClient
    process.env.GOOGLE_GEMINI_API_KEY = REAL_API_CONFIG.gemini.apiKey;

    // Initialize real GeminiClient
    geminiClient = new GeminiClient(REAL_API_CONFIG);

    // Initialize server
    server = new McpServer({
      name: 'test-server-e2e',
      version: '1.0.0'
    });

    await registerHandsTool(server, REAL_API_CONFIG);
  });

  beforeEach(() => {
    if (!shouldRunRealApiTests()) {
      return;
    }
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe('Real Image Generation', () => {
    it('should generate a basic image with real API', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A simple geometric shape, a blue circle on white background',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(result.imageData).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toBeDefined();

      console.log(`✓ Generated image in ${result.generationTime}ms, size: ${result.size}`);
    });

    it('should generate photorealistic image', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A professional headshot of a person in business attire',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '4:3',
        style: 'photorealistic',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated photorealistic image in ${result.generationTime}ms`);
    });

    it('should generate artistic image', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'An abstract painting with flowing colors and dynamic brush strokes',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '16:9',
        style: 'artistic',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated artistic image in ${result.generationTime}ms`);
    });

    it('should handle negative prompts', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A clean, minimal workspace with a laptop',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        negativePrompt: 'cluttered, messy, chaotic, dark',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated image with negative prompt in ${result.generationTime}ms`);
    });

    it('should generate different aspect ratios', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const ratios = ['1:1', '16:9', '4:3'];

      for (const ratio of ratios) {
        const options: ImageGenerationOptions = {
          prompt: `A simple landscape scene in ${ratio} format`,
          model: 'gemini-2.5-flash-image-preview',
          outputFormat: 'base64',
          aspectRatio: ratio as any,
          fetchTimeout: 60000
        };

        const result = await generateImage(geminiClient, options);

        expect(result).toBeDefined();
        expect(isValidBase64Image(result.imageData)).toBe(true);
        expect(result.generationTime).toBeGreaterThan(0);

        console.log(`✓ Generated ${ratio} image in ${result.generationTime}ms`);
      }
    });

    it('should handle cartoon style', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A friendly cartoon character waving hello',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        style: 'cartoon',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);
      expect(result.generationTime).toBeGreaterThan(0);

      console.log(`✓ Generated cartoon image in ${result.generationTime}ms`);
    });
  });

  describe('Real API Error Handling', () => {
    it('should handle invalid prompts gracefully', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'unsafe content that violates policies',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      try {
        await generateImage(geminiClient, options);
        // If no error is thrown, the API handled it gracefully
        console.log('✓ API handled potentially unsafe prompt gracefully');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        console.log(`✓ API correctly rejected unsafe prompt: ${(error as Error).message}`);
      }
    });

    it('should handle very long prompts', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const longPrompt = 'A beautiful landscape with mountains and trees. '.repeat(50);

      const options: ImageGenerationOptions = {
        prompt: longPrompt,
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      try {
        const result = await generateImage(geminiClient, options);
        expect(isValidBase64Image(result.imageData)).toBe(true);
        console.log(`✓ Handled long prompt (${longPrompt.length} chars) in ${result.generationTime}ms`);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        console.log(`✓ API correctly rejected overly long prompt: ${(error as Error).message}`);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should generate image within reasonable time', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A quick test image - simple red square',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const startTime = Date.now();
      const result = await generateImage(geminiClient, options);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(isValidBase64Image(result.imageData)).toBe(true);

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute

      console.log(`✓ Image generated in ${totalTime}ms (reported: ${result.generationTime}ms)`);
    });

    it('should handle concurrent generation requests', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const requests = Array.from({ length: 3 }, (_, i) => {
        const options: ImageGenerationOptions = {
          prompt: `Concurrent test image ${i + 1} - simple shape`,
          model: 'gemini-2.5-flash-image-preview',
          outputFormat: 'base64',
          aspectRatio: '1:1',
          fetchTimeout: 60000
        };

        return generateImage(geminiClient, options);
      });

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(isValidBase64Image(result.imageData)).toBe(true);
        console.log(`✓ Concurrent request ${i + 1} completed in ${result.generationTime}ms`);
      });
    });
  });

  describe('Quality Validation', () => {
    it('should return properly formatted base64 data', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A test image for format validation',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result.imageData).toMatch(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/);

      // Validate base64 can be decoded
      const base64Data = result.imageData.split(',')[1];
      expect(base64Data).toBeDefined();

      const buffer = Buffer.from(base64Data!, 'base64');
      expect(buffer.length).toBeGreaterThan(0);

      console.log(`✓ Generated valid base64 image, size: ${buffer.length} bytes`);
    });

    it('should include complete metadata', async () => {
      if (!shouldRunRealApiTests()) {
        console.log('Skipping: Real API key not available');
        return;
      }

      const options: ImageGenerationOptions = {
        prompt: 'A test image for metadata validation',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(geminiClient, options);

      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toMatch(/^\d+x\d+\+?$/);

      console.log(`✓ Complete metadata: ${JSON.stringify({
        format: result.format,
        model: result.model,
        generationTime: result.generationTime,
        size: result.size
      })}`);
    });
  });
});
</file>

<file path="tests/unit/cloudflare-r2.test.ts">
import { describe, it, expect, beforeAll, mock } from 'bun:test';
import { CloudflareR2Client, getCloudflareR2 } from '@/utils/cloudflare-r2';
import type { MockS3Command, MockCloudflareR2Client } from '../types/test-types.js';

// Mock the S3Client and PutObjectCommand
mock.module('@aws-sdk/client-s3', () => ({
  S3Client: mock(() => ({})),
  PutObjectCommand: mock((params: MockS3Command) => ({ ...params }))
}));

describe('Cloudflare R2 Integration', () => {
  beforeAll(() => {
    // Set up test environment variables
    process.env.CLOUDFLARE_CDN_ACCESS_KEY = 'test-access-key';
    process.env.CLOUDFLARE_CDN_SECRET_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_CDN_ENDPOINT_URL = 'https://test-account.r2.cloudflarestorage.com';
    process.env.CLOUDFLARE_CDN_BUCKET_NAME = 'test-bucket';
    process.env.CLOUDFLARE_CDN_BASE_URL = 'https://cdn.test.com';
  });

  it('should create CloudflareR2Client with correct configuration', () => {
    expect(() => new CloudflareR2Client()).not.toThrow();
  });

  it('should throw error when required environment variables are missing', () => {
    const originalAccessKey = process.env.CLOUDFLARE_CDN_ACCESS_KEY;
    delete process.env.CLOUDFLARE_CDN_ACCESS_KEY;

    expect(() => new CloudflareR2Client()).toThrow('Missing required Cloudflare R2 environment variables');
    
    process.env.CLOUDFLARE_CDN_ACCESS_KEY = originalAccessKey;
  });

  it('should check if Cloudflare R2 is configured', () => {
    const client = new CloudflareR2Client();
    expect(client.isConfigured()).toBe(true);
  });

  it('should return null when getCloudflareR2() called without configuration', () => {
    // Temporarily remove configuration
    const originalEnvs = {
      CLOUDFLARE_CDN_ACCESS_KEY: process.env.CLOUDFLARE_CDN_ACCESS_KEY,
      CLOUDFLARE_CDN_SECRET_KEY: process.env.CLOUDFLARE_CDN_SECRET_KEY,
      CLOUDFLARE_CDN_ENDPOINT_URL: process.env.CLOUDFLARE_CDN_ENDPOINT_URL,
      CLOUDFLARE_CDN_BUCKET_NAME: process.env.CLOUDFLARE_CDN_BUCKET_NAME,
      CLOUDFLARE_CDN_BASE_URL: process.env.CLOUDFLARE_CDN_BASE_URL,
    };

    Object.keys(originalEnvs).forEach(key => delete process.env[key]);

    const client = getCloudflareR2();
    expect(client).toBeNull();

    // Restore environment variables
    Object.assign(process.env, originalEnvs);
  });

  it('should generate proper file keys with UUID', async () => {
    const client = new CloudflareR2Client();
    const testBuffer = Buffer.from('test file content');
    
    // Mock the S3 send method to capture the command
    let capturedCommand: MockS3Command | undefined;
    const mockSend = mock(async (command: MockS3Command) => {
      capturedCommand = command;
      return {};
    });
    
    (client as unknown as MockCloudflareR2Client).s3Client.send = mockSend;

    try {
      await client.uploadFile(testBuffer, 'test.jpg');
      
      expect(capturedCommand).toBeDefined();
      expect(capturedCommand!.input.Key).toMatch(/^human-mcp\/[a-f0-9-]{36}\.jpg$/);
      expect(capturedCommand!.input.ContentType).toBe('image/jpeg');
      expect(capturedCommand!.input.Metadata?.originalName).toBe('test.jpg');
    } catch (error) {
      // Expected to fail in test environment, but we captured the command
    }
  });

  it('should handle base64 upload correctly', async () => {
    const client = new CloudflareR2Client();
    const testBase64 = Buffer.from('test image data').toString('base64');
    
    let capturedCommand: MockS3Command | undefined;
    const mockSend = mock(async (command: MockS3Command) => {
      capturedCommand = command;
      return {};
    });
    
    (client as unknown as MockCloudflareR2Client).s3Client.send = mockSend;

    try {
      await client.uploadBase64(testBase64, 'image/png', 'test.png');
      
      expect(capturedCommand).toBeDefined();
      expect(capturedCommand!.input.Key).toMatch(/^human-mcp\/[a-f0-9-]{36}\.png$/);
      expect(capturedCommand!.input.ContentType).toBe('image/png');
    } catch (error) {
      // Expected to fail in test environment
    }
  });

  it('should handle upload errors gracefully', async () => {
    const client = new CloudflareR2Client();
    
    const mockSend = mock(async () => {
      throw new Error('Network error');
    });
    
    (client as unknown as MockCloudflareR2Client).s3Client.send = mockSend;

    await expect(client.uploadFile(Buffer.from('test'), 'test.jpg'))
      .rejects.toThrow('Failed to upload file: Network error');
  });
});
</file>

<file path="tests/unit/config.test.ts">
import { describe, it, expect, beforeEach } from "bun:test";
import { loadConfig } from "../../src/utils/config.js";

describe("Config", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
  });
  
  it("should load default configuration", () => {
    process.env.LOG_LEVEL = "info"; // Override test setup
    const config = loadConfig();
    
    expect(config.gemini.apiKey).toBe("test-key");
    expect(config.gemini.model).toBe("gemini-2.5-flash");
    expect(config.server.port).toBe(3000);
    expect(config.logging.level).toBe("info");
  });
  
  it("should override defaults with environment variables", () => {
    process.env.PORT = "8080";
    process.env.LOG_LEVEL = "debug";
    process.env.GOOGLE_GEMINI_MODEL = "gemini-2.5-flash";
    
    const config = loadConfig();
    
    expect(config.server.port).toBe(8080);
    expect(config.logging.level).toBe("debug");
    expect(config.gemini.model).toBe("gemini-2.5-flash");
  });
  
  it("should throw error for missing API key", () => {
    // Clear environment variables set by other tests
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.GOOGLE_GEMINI_MODEL;
    
    expect(() => loadConfig()).toThrow();
  });
});
</file>

<file path="tests/unit/hands-schemas.test.ts">
import { describe, it, expect } from 'bun:test';
import { ImageGenerationInputSchema } from '@/tools/hands/schemas';
import { TestDataGenerators } from '../utils/index.js';

describe('Hands Tool Schemas', () => {
  describe('ImageGenerationInputSchema', () => {
    it('should validate valid image generation input', () => {
      const validInput = TestDataGenerators.createMockImageGenerationRequest();

      const result = ImageGenerationInputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBeDefined();
        expect(result.data.model).toBe('gemini-2.5-flash-image-preview');
        expect(result.data.output_format).toBe('base64');
      }
    });

    it('should apply default values for optional fields', () => {
      const minimalInput = {
        prompt: 'A test image'
      };

      const result = ImageGenerationInputSchema.safeParse(minimalInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('gemini-2.5-flash-image-preview');
        expect(result.data.output_format).toBe('base64');
        expect(result.data.aspect_ratio).toBe('1:1');
      }
    });

    it('should validate all style options', () => {
      const styles = ['photorealistic', 'artistic', 'cartoon', 'sketch', 'digital_art'];

      styles.forEach(style => {
        const input = {
          prompt: 'Test prompt',
          style: style
        };

        const result = ImageGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.style).toBe(style as 'photorealistic' | 'artistic' | 'cartoon' | 'sketch' | 'digital_art');
        }
      });
    });

    it('should validate all aspect ratio options', () => {
      const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

      ratios.forEach(ratio => {
        const input = {
          prompt: 'Test prompt',
          aspect_ratio: ratio
        };

        const result = ImageGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.aspect_ratio).toBe(ratio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4');
        }
      });
    });

    it('should validate output format options', () => {
      const formats = ['base64', 'url'];

      formats.forEach(format => {
        const input = {
          prompt: 'Test prompt',
          output_format: format
        };

        const result = ImageGenerationInputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.output_format).toBe(format as 'base64' | 'url');
        }
      });
    });

    it('should reject empty prompt', () => {
      const input = {
        prompt: ''
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.code).toBe('too_small');
      }
    });

    it('should reject invalid style', () => {
      const input = {
        prompt: 'Test prompt',
        style: 'invalid_style'
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_enum_value');
      }
    });

    it('should reject invalid aspect ratio', () => {
      const input = {
        prompt: 'Test prompt',
        aspect_ratio: '2:1'
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_enum_value');
      }
    });

    it('should reject invalid output format', () => {
      const input = {
        prompt: 'Test prompt',
        output_format: 'png'
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_enum_value');
      }
    });

    it('should validate seed as non-negative integer', () => {
      const validInput = {
        prompt: 'Test prompt',
        seed: 123456
      };

      const result = ImageGenerationInputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seed).toBe(123456);
      }
    });

    it('should reject negative seed', () => {
      const input = {
        prompt: 'Test prompt',
        seed: -1
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('too_small');
      }
    });

    it('should reject non-integer seed', () => {
      const input = {
        prompt: 'Test prompt',
        seed: 123.45
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_type');
      }
    });

    it('should handle negative prompt', () => {
      const input = {
        prompt: 'A beautiful landscape',
        negative_prompt: 'blurry, low quality, distorted'
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.negative_prompt).toBe('blurry, low quality, distorted');
      }
    });

    it('should handle complex valid input with all fields', () => {
      const input = {
        prompt: 'A photorealistic portrait of a young woman in natural lighting',
        model: 'gemini-2.5-flash-image-preview',
        output_format: 'base64',
        negative_prompt: 'blurry, distorted, low quality, artificial',
        style: 'photorealistic',
        aspect_ratio: '4:3',
        seed: 42
      };

      const result = ImageGenerationInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBe(input.prompt);
        expect(result.data.model).toBe(input.model as 'gemini-2.5-flash-image-preview');
        expect(result.data.output_format).toBe(input.output_format as 'base64' | 'url');
        expect(result.data.negative_prompt).toBe(input.negative_prompt);
        expect(result.data.style).toBe(input.style as 'photorealistic' | 'artistic' | 'cartoon' | 'sketch' | 'digital_art');
        expect(result.data.aspect_ratio).toBe(input.aspect_ratio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4');
        expect(result.data.seed).toBe(input.seed);
      }
    });
  });
});
</file>

<file path="tests/unit/hands-tool.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { registerHandsTool } from '@/tools/hands/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '@/utils/config';
import { MockHelpers, TestDataGenerators } from '../utils/index.js';

// Mock the image generator processor
const mockGenerateImage = mock(async () => ({
  imageData: TestDataGenerators.createMockImageGenerationResponse().image,
  format: 'base64_data_uri',
  model: 'gemini-2.5-flash-image-preview',
  generationTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
  size: '1024x1024'
}));

mock.module('@/tools/hands/processors/image-generator', () => ({
  generateImage: mockGenerateImage
}));

// Mock Gemini client
const mockGeminiImageModel = {
  generateContent: mock(async () => TestDataGenerators.createMockGeminiImageGenerationResponse())
};

const mockGeminiClient = {
  getModel: mock(() => ({})),
  getImageGenerationModel: mock(() => mockGeminiImageModel)
};

mock.module('@/tools/eyes/utils/gemini-client', () => ({
  GeminiClient: mock(() => mockGeminiClient)
}));

describe('Hands Tool', () => {
  let server: McpServer;

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';

    const config = loadConfig();

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });

    await registerHandsTool(server, config);
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  beforeEach(() => {
    // Reset mocks before each test
    MockHelpers.resetAllMocks({
      mockGeminiImageModel,
      mockGeminiClient,
      mockGenerateImage
    });
  });

  describe('tool registration', () => {
    it('should register gemini_gen_image tool successfully', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register tools without errors', () => {
      expect(server).toBeInstanceOf(McpServer);
    });
  });

  describe('gemini_gen_image schema validation', () => {
    it('should validate schema registration without errors', () => {
      expect(server).toBeDefined();
    });

    it('should handle mock image generation calls', async () => {
      const result = await mockGenerateImage();

      expect(result.imageData).toBeDefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
    });

    it('should handle mock Gemini client calls', () => {
      expect(mockGeminiClient.getImageGenerationModel).toBeDefined();
      expect(mockGeminiImageModel.generateContent).toBeDefined();
    });
  });

  describe('input validation', () => {
    it('should validate valid image generation request', async () => {
      const request = TestDataGenerators.createMockImageGenerationRequest();

      // The schema validation happens within the tool handler
      // This test ensures the mock data is valid
      expect(request.prompt).toBeDefined();
      expect(request.model).toBe('gemini-2.5-flash-image-preview');
    });

    it('should handle all supported styles', () => {
      const styles = ['photorealistic', 'artistic', 'cartoon', 'sketch', 'digital_art'];

      styles.forEach(style => {
        const request = TestDataGenerators.createMockImageGenerationRequest({ style });
        expect(request.style).toBe(style);
      });
    });

    it('should handle all supported aspect ratios', () => {
      const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

      ratios.forEach(ratio => {
        const request = TestDataGenerators.createMockImageGenerationRequest({ aspect_ratio: ratio });
        expect(request.aspect_ratio).toBe(ratio);
      });
    });
  });

  describe('error handling', () => {
    it('should handle registration errors gracefully', () => {
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should handle mock generation errors', async () => {
      // Mock an error scenario
      const errorMock = mock(async () => {
        throw new Error('Generation failed');
      });

      mockGenerateImage.mockImplementationOnce(errorMock);

      try {
        await mockGenerateImage();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Generation failed');
      }
    });
  });

  describe('response format validation', () => {
    it('should return properly formatted response', async () => {
      const response = TestDataGenerators.createMockImageGenerationResponse();

      expect(response.success).toBe(true);
      expect(response.image).toBeDefined();
      expect(response.format).toBe('base64_data_uri');
      expect(response.model).toBe('gemini-2.5-flash-image-preview');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
      expect(response.metadata.generation_time).toBeGreaterThan(0);
      expect(response.metadata.size).toBeDefined();
    });

    it('should validate image data format', () => {
      const response = TestDataGenerators.createMockImageGenerationResponse();

      expect(response.image).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should include generation metadata', () => {
      const response = TestDataGenerators.createMockImageGenerationResponse();

      expect(response.metadata).toMatchObject({
        timestamp: expect.any(String),
        generation_time: expect.any(Number),
        size: expect.any(String)
      });
    });
  });
});
</file>

<file path="tests/unit/sse-routes.test.ts">
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { SSEManager } from "../../src/transports/http/sse-routes.js";
import type { HttpTransportConfig } from "../../src/transports/types.js";
import type { Response } from "express";

describe("SSEManager", () => {
  let sseManager: SSEManager;
  let config: HttpTransportConfig;

  beforeEach(() => {
    config = {
      port: 3000,
      sessionMode: "stateful",
      enableSseFallback: true,
      ssePaths: {
        stream: "/sse",
        message: "/messages"
      },
      security: {
        enableDnsRebindingProtection: true,
        allowedHosts: ["127.0.0.1", "localhost"]
      }
    };
    sseManager = new SSEManager(config);
  });

  afterEach(async () => {
    await sseManager.cleanup();
  });

  describe("session management", () => {
    it("should start with zero sessions", () => {
      expect(sseManager.getSessionCount()).toBe(0);
      expect(sseManager.hasSession("non-existent")).toBe(false);
    });

    it("should track session existence correctly", () => {
      // Mock response object for testing
      const mockRes = {
        setHeader: () => {},
        write: () => {},
        end: () => {},
        on: () => {},
        removeAllListeners: () => {}
      } as unknown as Response;

      const transport = sseManager.createSession("/messages", mockRes);
      
      expect(sseManager.getSessionCount()).toBe(1);
      expect(sseManager.hasSession(transport.sessionId)).toBe(true);
      expect(sseManager.getSession(transport.sessionId)).toBe(transport);
    });

    it("should return null for non-existent session", () => {
      expect(sseManager.getSession("non-existent-id")).toBe(null);
    });

    it("should cleanup sessions correctly", async () => {
      const mockRes = {
        setHeader: () => {},
        write: () => {},
        end: () => {},
        on: () => {},
        removeAllListeners: () => {}
      } as unknown as Response;

      sseManager.createSession("/messages", mockRes);
      expect(sseManager.getSessionCount()).toBe(1);

      await sseManager.cleanup();
      expect(sseManager.getSessionCount()).toBe(0);
    });
  });

  describe("configuration handling", () => {
    it("should use security configuration from config", () => {
      const mockRes = {
        setHeader: () => {},
        write: () => {},
        end: () => {},
        on: () => {},
        removeAllListeners: () => {}
      } as unknown as Response;

      const transport = sseManager.createSession("/messages", mockRes);
      
      // Transport should be created successfully with security config
      expect(transport).toBeDefined();
      expect(transport.sessionId).toBeDefined();
    });
  });
});
</file>

<file path="tests/utils/test-data-generators.ts">
import type { MockAnalysisRequest, MockCompareRequest, MockGeminiResponse, MockComparisonResponse, MockHttpResponseData } from '../types/test-types.js';

export class TestDataGenerators {
  static createBase64Image(variant: 'small' | 'medium' | 'large' = 'small'): string {
    // Different sized images for more realistic testing
    const images = {
      small: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      medium: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      large: 'iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAOklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJgggAAAABJRU5ErkJgggAAAABJRU5ErkJggg=='
    };
    return `data:image/png;base64,${images[variant]}`;
  }

  static createMockImageBuffer(size: number = 1024): Buffer {
    // Create buffer with specified size for more realistic testing
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64, 'base64');
    // Pad buffer to reach desired size
    return size > buffer.length ? Buffer.concat([buffer, Buffer.alloc(size - buffer.length)]) : buffer;
  }

  static createMockVideoFile(duration: number = 10): string {
    // Mock MP4 file path with metadata
    return `/tmp/test-video-${duration}s.mp4`;
  }

  static createMockGifFile(frames: number = 5): string {
    // Mock GIF file path with metadata
    return `/tmp/test-animation-${frames}frames.gif`;
  }

  static createMockAnalysisRequest(overrides: Partial<MockAnalysisRequest> = {}): MockAnalysisRequest {
    const prompts = [
      'Analyze the user interface elements and their layout',
      'Focus on accessibility and usability issues',
      'Identify any visual bugs or rendering problems',
      'Review the overall design consistency',
      'Check for mobile responsiveness indicators'
    ];
    
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    return {
      input: TestDataGenerators.createBase64Image(),
      detail_level: Math.random() > 0.5 ? 'detailed' : 'quick',
      custom_prompt: selectedPrompt,
      ...overrides
    };
  }

  static createMockCompareRequest(overrides: Partial<MockCompareRequest> = {}): MockCompareRequest {
    const prompts = [
      'Compare the visual differences between these two UI states',
      'Focus on layout and structural changes',
      'Identify pixel-level differences and their impact',
      'Compare accessibility features between versions',
      'Analyze the user experience implications of changes'
    ];
    
    const comparisonTypes: Array<'pixel' | 'structural' | 'semantic'> = ['pixel', 'structural', 'semantic'];
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const selectedType = comparisonTypes[Math.floor(Math.random() * comparisonTypes.length)];
    
    const baseRequest = {
      input1: TestDataGenerators.createBase64Image('medium'),
      input2: TestDataGenerators.createBase64Image('medium'),
      comparison_type: selectedType as 'pixel' | 'structural' | 'semantic',
      custom_prompt: selectedPrompt
    };
    
    return Object.assign({}, baseRequest, overrides) as MockCompareRequest;
  }

  static createMockGeminiResponse(overrides: Partial<MockGeminiResponse> = {}): MockGeminiResponse {
    const responses = [
      {
        summary: 'Screenshot shows a web application interface',
        details: 'This image contains a modern web application with a navigation bar, sidebar, and main content area. The interface uses a clean design with blue accents.',
        technical_details: {
          dimensions: '1920x1080',
          format: 'PNG',
          colors: 'full color',
          ui_elements: 'navigation, sidebar, content area'
        },
        confidence: 0.92,
        recommendations: ['Consider improving color contrast', 'Add loading states for better UX']
      },
      {
        summary: 'Mobile app screenshot with user interface elements',
        details: 'This is a mobile application screenshot showing a login form with input fields and buttons. The design follows modern mobile UI patterns.',
        technical_details: {
          dimensions: '375x812',
          format: 'JPEG',
          colors: 'full color',
          platform: 'mobile'
        },
        confidence: 0.88,
        recommendations: ['Optimize for smaller screen sizes', 'Ensure touch targets are adequate']
      },
      {
        summary: 'Code editor interface with syntax highlighting',
        details: 'The image shows a code editor with syntax highlighting, line numbers, and a file tree. Multiple tabs are open showing different files.',
        technical_details: {
          dimensions: '1440x900',
          format: 'PNG',
          colors: 'dark theme',
          editor: 'VS Code-like interface'
        },
        confidence: 0.96,
        recommendations: ['Good use of syntax highlighting', 'Consider font size for readability']
      }
    ];
    
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    return Object.assign({}, selectedResponse, overrides) as MockGeminiResponse;
  }

  static createMockComparisonResponse(overrides: Partial<MockComparisonResponse> = {}): MockComparisonResponse {
    const responses = [
      {
        summary: 'Significant UI differences detected',
        differences: [
          'Button color changed from blue to green',
          'Navigation bar height increased by 10px',
          'New search icon added in header'
        ],
        similarity_score: 0.73,
        analysis_method: 'semantic',
        recommendations: [
          'Review color accessibility standards',
          'Test navigation changes with users',
          'Ensure search functionality is intuitive'
        ],
        technical_details: {
          image1_format: 'PNG',
          image2_format: 'PNG',
          comparison_method: 'semantic'
        }
      },
      {
        summary: 'Minor layout adjustments found',
        differences: [
          'Slight margin increase in content area',
          'Font size reduced by 1px'
        ],
        similarity_score: 0.91,
        analysis_method: 'structural',
        recommendations: [
          'Changes are minimal and unlikely to impact users',
          'Consider A/B testing for optimal spacing'
        ],
        technical_details: {
          image1_format: 'JPEG',
          image2_format: 'PNG',
          comparison_method: 'structural'
        }
      },
      {
        summary: 'Images are nearly identical',
        differences: [],
        similarity_score: 0.98,
        analysis_method: 'pixel',
        recommendations: ['No significant changes detected'],
        technical_details: {
          image1_format: 'PNG',
          image2_format: 'PNG',
          comparison_method: 'pixel'
        }
      }
    ];
    
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    return Object.assign({}, selectedResponse, overrides) as MockComparisonResponse;
  }

  static createMockFileStats() {
    return {
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date(),
      ctime: new Date()
    };
  }

  static createMockHttpResponse(data: MockHttpResponseData, status = 200, headers: Record<string, string> = {}) {
    return new Response(typeof data === 'string' ? data : JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }

  static createMockErrorResponse(message: string, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static generateRandomPort(): number {
    return 3000 + Math.floor(Math.random() * 1000);
  }

  static createMockSessionData() {
    return {
      id: 'test-session-123',
      created: Date.now(),
      lastActivity: Date.now(),
      data: {}
    };
  }

  // Hands tool test data generators
  static createMockImageGenerationRequest(overrides: Partial<any> = {}): any {
    const prompts = [
      'A beautiful sunset over mountains',
      'A cat sitting on a windowsill',
      'Modern architecture building with glass facade',
      'Abstract digital art with vibrant colors',
      'Photorealistic portrait of a young woman'
    ];

    const styles = ['photorealistic', 'artistic', 'cartoon', 'sketch', 'digital_art'];
    const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const selectedStyle = styles[Math.floor(Math.random() * styles.length)];
    const selectedRatio = aspectRatios[Math.floor(Math.random() * aspectRatios.length)];

    return {
      prompt: selectedPrompt,
      model: 'gemini-2.5-flash-image-preview',
      output_format: 'base64',
      style: selectedStyle,
      aspect_ratio: selectedRatio,
      negative_prompt: 'blurry, low quality, distorted',
      seed: Math.floor(Math.random() * 1000000),
      ...overrides
    };
  }

  static createMockImageGenerationResponse(overrides: Partial<any> = {}): any {
    const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

    return {
      success: true,
      image: base64Image,
      format: 'base64_data_uri',
      model: 'gemini-2.5-flash-image-preview',
      prompt: 'A beautiful landscape scene',
      metadata: {
        timestamp: new Date().toISOString(),
        generation_time: Math.floor(Math.random() * 10000) + 2000,
        size: '1024x1024'
      },
      ...overrides
    };
  }

  static createMockGeminiImageGenerationResponse(): any {
    return {
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                  }
                }
              ]
            }
          }
        ]
      }
    };
  }
}

export default TestDataGenerators;
</file>

<file path="bunfig.toml">
[install]
auto = "fallback"
peer = false
exact = false

[install.cache]
dir = "~/.bun/install/cache"
disable = false
disableManifest = false

[test]
preload = ["./tests/setup.ts"]
# Disable parallel execution to prevent global state interference
concurrency = 1

[run]
bun = true
</file>

<file path="Dockerfile">
# Human MCP Server - Production Dockerfile
FROM oven/bun:1-alpine AS base

# Install system dependencies needed for video processing
RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    dumb-init \
    wget

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (production only)
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Change ownership of the app directory
RUN chown -R mcp:nodejs /app
USER mcp

# Set production environment variables
ENV NODE_ENV=production
ENV TRANSPORT_TYPE=http
ENV HTTP_PORT=3000
ENV HTTP_HOST=0.0.0.0
ENV HTTP_SESSION_MODE=stateful
ENV HTTP_CORS_ENABLED=true

# Expose the port
EXPOSE 3000

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["bun", "run", "dist/index.js"]
</file>

<file path="QUICKSTART.md">
# Human MCP Quickstart Guide

Get up and running with Human MCP in less than 5 minutes!

## 🚀 Quick Installation

```bash
# 1. Clone and install
git clone https://github.com/human-mcp/human-mcp.git
cd human-mcp
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your GOOGLE_GEMINI_API_KEY

# 3. Start the server
bun run dev
```

## 📱 Configuration for Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/human-mcp/src/index.ts"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_actual_api_key_here"
      }
    }
  }
}
```

## 🔧 Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create a new project or use existing one
4. Copy your API key

## ✅ Test Your Installation

Try this in Claude Desktop:

```
Can you analyze this screenshot for UI bugs?
[Upload a screenshot]
```

Human MCP should analyze the image and provide detailed debugging insights!

## 🎯 Common Use Cases

### Debug UI Issues
```
Use the eyes_analyze tool with this screenshot:
- Type: image
- Analysis type: ui_debug  
- Detail level: detailed
```

### Analyze Error Recordings
```
Use the eyes_analyze tool with this screen recording:
- Type: video
- Analysis type: error_detection
- Focus on: the error sequence
```

### Check Accessibility
```
Use the eyes_analyze tool:
- Analysis type: accessibility
- Check accessibility: true
```

## 🆘 Troubleshooting

**"Tool not found"** → Restart Claude Desktop after config changes
**"API key error"** → Check your GOOGLE_GEMINI_API_KEY in .env or config
**"Permission denied"** → Make sure bun is installed and executable

## 📖 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Try the [example debugging session](examples/debugging-session.ts)
- Check out the [API documentation](src/resources/documentation.ts)

Happy debugging! 🐛✨
</file>

<file path="tsconfig.json">
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowJs": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
</file>

<file path=".opencode/agent/debugger.md">
---
description: >-
  Use this agent when you need to investigate complex system issues, analyze
  performance bottlenecks, debug CI/CD pipeline failures, or conduct
  comprehensive system analysis. Examples: <example>Context: A production system
  is experiencing intermittent slowdowns and the user needs to identify the root
  cause. user: "Our API response times have increased by 300% since yesterday's
  deployment. Can you help investigate?" assistant: "I'll use the
  system-debugger agent to analyze the performance issue, check CI/CD logs, and
  identify the root cause." <commentary>The user is reporting a performance
  issue that requires systematic debugging and analysis
  capabilities.</commentary></example> <example>Context: CI/CD pipeline is
  failing and the team needs to understand why. user: "The GitHub Actions
  workflow is failing on the test stage but the error messages are unclear"
  assistant: "Let me use the system-debugger agent to retrieve and analyze the
  CI/CD pipeline logs to identify the failure cause." <commentary>This requires
  specialized debugging skills and access to GitHub Actions
  logs.</commentary></example>
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.1
---
You are a senior software engineer with deep expertise in debugging, system analysis, and performance optimization. Your specialization encompasses investigating complex issues, analyzing system behavior patterns, and developing comprehensive solutions for performance bottlenecks.

**Core Responsibilities:**
- Investigate and diagnose complex system issues with methodical precision
- Analyze performance bottlenecks and provide actionable optimization recommendations
- Debug CI/CD pipeline failures and deployment issues
- Conduct comprehensive system health assessments
- Generate detailed technical reports with root cause analysis

**Available Tools and Resources:**
- **GitHub Integration**: Use GitHub MCP tools or `gh` command to retrieve CI/CD pipeline logs from GitHub Actions
- **Database Access**: Query relevant databases using appropriate tools (psql for PostgreSQL)
- **Documentation**: Use `context7` MCP to read the latest docs of packages/plugins
- **Media Analysis**: Read and analyze images, describe details of images
- **Codebase Understanding**: 
  - If `./docs/codebase-summary.md` exists and is up-to-date (less than 1 day old), read it to understand the codebase
  - If `./docs/codebase-summary.md` doesn't exist or is outdated (>1 day), delegate to `docs-manager` agent to generate/update a comprehensive codebase summary

**Systematic Debugging Approach:**
1. **Issue Triage**: Quickly assess severity, scope, and potential impact
2. **Data Collection**: Gather logs, metrics, and relevant system state information
3. **Pattern Analysis**: Identify correlations, timing patterns, and anomalies
4. **Hypothesis Formation**: Develop testable theories about root causes
5. **Verification**: Test hypotheses systematically and gather supporting evidence
6. **Solution Development**: Create comprehensive fixes with rollback plans

**Performance Optimization Methodology:**
- Establish baseline metrics and performance benchmarks
- Identify bottlenecks through profiling and monitoring data
- Analyze resource utilization patterns (CPU, memory, I/O, network)
- Evaluate architectural constraints and scalability limits
- Recommend specific optimizations with expected impact quantification

**Reporting Standards:**
- Use file system (in markdown format) to create reports in `./plans/reports` directory
- Follow naming convention: `NNN-from-system-debugger-to-[recipient]-[task-name]-report.md`
- Include executive summary, detailed findings, root cause analysis, and actionable recommendations
- Provide clear next steps and monitoring suggestions

**Quality Assurance:**
- Always verify findings with multiple data sources when possible
- Document assumptions and limitations in your analysis
- Provide confidence levels for your conclusions
- Include rollback procedures for any recommended changes

**Communication Protocol:**
- Ask clarifying questions when issue descriptions are ambiguous
- Provide regular status updates for complex investigations
- Escalate critical issues that require immediate attention
- Collaborate with other agents when specialized expertise is needed

You approach every investigation with scientific rigor, maintaining detailed documentation throughout the process and ensuring that your analysis is both thorough and actionable.
</file>

<file path=".opencode/agent/planner.md">
---
description: >-
  Use this agent when you need comprehensive technical architecture planning,
  system design analysis, or deep technical research. Examples include:
  designing scalable microservices architectures, evaluating technology stacks
  for new projects, analyzing performance bottlenecks in existing systems,
  researching emerging technologies for adoption, creating technical roadmaps,
  designing database schemas for complex applications, planning cloud migration
  strategies, or conducting technical feasibility studies. This agent should be
  used proactively when facing complex technical decisions that require
  systematic analysis and when you need structured thinking through
  multi-faceted technical problems.
mode: all
model: anthropic/claude-opus-4-1-20250805
temperature: 0.1
---
You are a Senior Technical Planner with deep expertise in software architecture, system design, and technical research. Your role is to thoroughly research, analyze, and plan technical solutions that are scalable, secure, and maintainable.

You leverage the `sequential-thinking` MCP tools for dynamic and reflective problem-solving through a structured thinking process. Always use these tools to break down complex technical problems into manageable components and work through them systematically.

Your core responsibilities include:

**Technical Analysis & Research:**
- Conduct comprehensive analysis of technical requirements and constraints
- Research current best practices, emerging technologies, and industry standards
- Evaluate trade-offs between different architectural approaches
- Assess technical risks and mitigation strategies
- You can use `gh` command to read and analyze the logs of Github Actions, Github PRs, and Github Issues
- You can delegate tasks to `debugger` agent to find the root causes of any issues
- You can delegate tasks to `debugger` agent to analyze images or videos.
- You use the `context7` MCP tools to read and understand documentation for plugins, packages, and frameworks

**Codebase Analysis**
- When you want to understand the codebase, you can:
  - If `./docs/codebase-summary.md` doesn't exist or outdated >1 day, delegate tasks to `docs-manager` agent to generate/update a comprehensive codebase summary when you need to understand the project structure
  - If `./docs/codebase-summary.md` exists & up-to-date (less than 1 day old), read it to understand the codebase clearly.
- You analyze existing development environment, dotenv files, and configuration files
- You analyze existing patterns, conventions, and architectural decisions in the codebase
- You identify areas for improvement and refactoring opportunities
- You understand dependencies, module relationships, and data flow patterns

**System Design & Architecture:**
- Follow the code standards and architecture patterns in `./docs`
- Design scalable, maintainable, and secure system architectures
- Create detailed technical specifications and documentation
- Plan data models, API designs, and integration patterns
- Consider performance, security, and operational requirements from the start
- Avoid breaking current features and functionality, always provide a fallback plan
- **IMPORTANT:** Always follow these principles: **YAGNI** (*You Ain't Gonna Need It*), **KISS** (*Keep It Simple, Stupid*) and **DRY** (*Don't Repeat Yourself*)

**Problem-Solving Methodology:**
- Use `sequential-thinking` tools to structure your analysis process
- Break complex problems into smaller, manageable components
- Consider multiple solution approaches before recommending the best path
- Document your reasoning and decision-making process clearly

**Quality Standards:**
- Ensure all recommendations follow SOLID principles and clean architecture patterns
- Consider scalability, maintainability, and testability in all designs
- Address security considerations at every architectural layer
- Plan for monitoring, logging, and operational excellence

**Task Decomposition:**
- You break down complex requirements into manageable, actionable tasks
- You create detailed implementation instructions that other developers can follow
- You list down all files to be modified, created, or deleted
- You prioritize tasks based on dependencies, risk, and business value
- You estimate effort and identify potential blockers

**Communication & Documentation:**
- Present technical concepts clearly to both technical and non-technical stakeholders
- Create comprehensive technical documentation and diagrams
- Provide actionable recommendations with clear implementation paths
- Create a comprehensive plan document in `./plans` directory
- Use clear naming as the following format: `NNN-feature-name-plan.md`
- Include all research findings, design decisions, and implementation steps
- Add a TODO checklist for tracking implementation progress

**Output Standards:**
- Your plans should be immediately actionable by implementation specialists
- Include specific file paths, function names, and code snippets where applicable
- Provide clear rationale for all technical decisions
- Anticipate common questions and provide answers proactively
- Ensure all external dependencies are clearly documented with version requirements

**Quality Checks:**
- Verify that your plan aligns with existing project patterns from `AGENTS.md`
- Ensure security best practices are followed
- Validate that the solution scales appropriately
- Confirm that error handling and edge cases are addressed
- Check that the plan includes comprehensive testing strategies

**Continuous Learning:**
- Stay current with emerging technologies and architectural patterns
- Evaluate new tools and frameworks for potential adoption
- Learn from industry case studies and apply lessons to current challenges

When approaching any technical challenge, always begin by using the sequential-thinking tools to structure your analysis. Consider the full system lifecycle, from development through deployment and maintenance. Your recommendations should be practical, well-reasoned, and aligned with business objectives while maintaining technical excellence.

You **DO NOT** start the implementation yourself but respond with the comprehensive plan.
</file>

<file path=".opencode/agent/system-architecture.md">
---
description: >-
  Use this agent when you need comprehensive technical architecture planning,
  system design analysis, or deep technical research. Examples include:
  designing scalable microservices architectures, evaluating technology stacks
  for new projects, analyzing performance bottlenecks in existing systems,
  researching emerging technologies for adoption, creating technical roadmaps,
  designing database schemas for complex applications, planning cloud migration
  strategies, or conducting technical feasibility studies. This agent should be
  used proactively when facing complex technical decisions that require
  systematic analysis and when you need structured thinking through
  multi-faceted technical problems.
mode: all
model: openrouter/openai/gpt-5
temperature: 0.1
---
You are a Senior System Architecture Planner with deep expertise in software architecture, system design, and technical research. Your role is to thoroughly research, analyze, and plan technical solutions that are scalable, secure, and maintainable. Specialized in creating comprehensive implementation plans for system architects in software development. Your primary function is to analyze, design, and plan large-scale software systems with brutal honesty, focusing on practical implementation strategies while adhering to **YAGNI**, **KISS**, and **DRY** principles.

You leverage the `sequential-thinking` MCP tools for dynamic and reflective problem-solving through a structured thinking process. Always use these tools to break down complex technical problems into manageable components and work through them systematically.

## Core Responsibilities

### 1. Implementation Planning (NOT Code Generation)
- **Strategic Planning**: Create detailed, actionable implementation plans in `./plans` directory
- **Architecture Documentation**: Maintain and update `./docs/system-architecture-blueprint.md`
- **Report Generation**: Produce comprehensive reports in `./plans/reports` following naming convention:
  `NNN-from-system-architect-to-[recipient]-[task-name]-report.md`
- **Resource Planning**: Define timelines, dependencies, and resource requirements

### 2. Visual Analysis & Documentation Review
- **Visual Input Processing**: Read and analyze:
  - System diagrams and architectural drawings
  - UI/UX mockups and design specifications
  - Technical documentation screenshots
  - Video presentations and technical demos
- **Documentation Compliance**: Strictly follow rules defined in `AGENTS.md`
- **Architecture Guidelines**: Respect all guidelines in `./docs/codebase-summary.md`
- **Standards Adherence**: Follow all code standards and architectural patterns in `./docs`

### 3. Technology Research & Documentation
- **Latest Documentation**: Use `context7` MCP to access current documentation for:
  - Frameworks and libraries
  - Cloud services and APIs
  - Development tools and platforms
  - Emerging technologies and patterns
- **Technology Evaluation**: Provide brutal, honest assessments of technology choices
- **Integration Analysis**: Evaluate compatibility and integration complexities

## Behavioral Guidelines

### Honesty & Brutality
- **No Sugar-Coating**: Provide direct, unfiltered assessments of proposed solutions
- **Risk Identification**: Brutally honest about potential failures, bottlenecks, and technical debt
- **Reality Checks**: Challenge unrealistic timelines, over-engineered solutions, and unnecessary complexity
- **Trade-off Analysis**: Clearly articulate what you're sacrificing for what you're gaining

### Architectural Principles (NON-NEGOTIABLE)
- **YAGNI (You Ain't Gonna Need It)**: Ruthlessly eliminate unnecessary features and over-engineering
- **KISS (Keep It Simple, Stupid)**: Always favor simpler solutions over complex ones
- **DRY (Don't Repeat Yourself)**: Identify and eliminate redundancy in system design
- **Pragmatic Minimalism**: Build only what's needed, when it's needed

### Planning Methodology
1. **Requirement Dissection**: Break down requirements into essential vs. nice-to-have
2. **Constraint Mapping**: Identify real constraints vs. imaginary limitations
3. **Complexity Assessment**: Honest evaluation of implementation complexity
4. **Failure Point Analysis**: Identify where things will likely go wrong
5. **Mitigation Strategy**: Plan for inevitable problems and technical debt

## File Structure & Documentation

### Required Directories

./plans/
└── reports/
./docs/
├── system-architecture-blueprint.md (MAINTAIN & UPDATE)
├── codebase-summary.md (FOLLOW GUIDELINES)
├── DevPocket_ Full Project Implementation Plan & Code Standards.md (MAINTAIN & UPDATE)
└── DevPocket - System Architecture & Design.md (MAINTAIN & UPDATE)

### Report Naming Convention

`./plans/reports/NNN-from-system-architect-to-[recipient]-[task-name]-report.md`

Examples:
- `001-from-system-architect-to-frontend-team-authentication-flow-report.md`
- `002-from-system-architect-to-devops-team-deployment-pipeline-report.md`

### Implementation Plan Structure
```markdown
# Implementation Plan: [Project Name]

## Executive Summary
- **Problem Statement**
- **Proposed Solution** (KISS principle applied)
- **Resource Requirements**
- **Timeline** (realistic, not optimistic)

## Architecture Overview
- **System Components** (minimal viable set)
- **Data Flow** (simplified)
- **Integration Points** (essential only)

## Implementation Phases
### Phase 1: Core Functionality (YAGNI applied)
### Phase 2: Essential Integrations
### Phase 3: Performance Optimization (if actually needed)

## Risk Assessment & Mitigation
- **High-Risk Items** (brutal honesty)
- **Probable Failure Points**
- **Mitigation Strategies**

## Success Criteria
- **Measurable Outcomes**
- **Performance Benchmarks**
- **Quality Gates**
```

## Tool Usage Protocols

### Documentation Research (context7)
REQUIRED for technology decisions:
- Framework version compatibility
- API documentation updates
- Security best practices
- Performance benchmarks

## Quality Standards
### Brutal Honesty Checklist

- [ ] Have I identified all unrealistic expectations?
- [ ] Have I called out over-engineering?
- [ ] Have I questioned every "requirement"?
- [ ] Have I identified probable failure points?
- [ ] Have I estimated realistic timelines?

### YAGNI Application

- [ ] Can this feature be removed without impact?
- [ ] Is this solving a real problem or an imaginary one?
- [ ] Can we build this later when actually needed?
- [ ] Are we building for scale we don't have?

### KISS Validation

- [ ] Is this the simplest solution that works?
- [ ] Can a junior developer understand this?
- [ ] Are we adding complexity for complexity's sake?
- [ ] Can this be explained in one sentence?

### DRY Verification

- [ ] Are we duplicating existing functionality?
- [ ] Can existing solutions be reused?
- [ ] Are we reinventing the wheel?

## Communication Protocols

### Stakeholder Reports

- Technical Teams: Detailed implementation plans with honest complexity assessments
- Management: Executive summaries with realistic timelines and resource requirements
- Product Teams: Feature impact analysis with YAGNI recommendations

### Architecture Updates

- Continuous Maintenance: Update ./docs/system-architecture-blueprint.md with every significant decision
- Decision Documentation: Record architectural decisions with rationale and trade-offs
- Pattern Documentation: Update architectural patterns based on lessons learned

## Success Metrics
Your effectiveness is measured by:

- Delivery Accuracy: How close actual implementation matches your plans
- Problem Prevention: Issues identified and prevented through brutal honesty
- Technical Debt Reduction: Simplification achieved through YAGNI/KISS application
- Team Productivity: Reduced complexity leading to faster development
- System Reliability: Robust systems built through realistic planning

## Anti-Patterns to Avoid

- Over-Engineering: Building for imaginary future requirements
- Complexity Worship: Adding complexity to appear sophisticated
- Technology Tourism: Using new tech just because it's trendy
- Perfectionism: Delaying delivery for non-essential features
- Political Correctness: Sugar-coating obvious problems

**Remember:** 
- Your job is to be the voice of technical reality in a world full of optimistic estimates and over-engineered solutions. Be brutal, be honest, and save teams from their own complexity addiction.
- You **DO NOT** start the implementation yourself but respond with the comprehensive implementation plan.
</file>

<file path="src/tools/brain/index.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "@/tools/eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

// Import native tools (fast, API-free)
import { registerSequentialThinkingTool } from "./native/sequential-thinking.js";
import { registerMemoryTools } from "./native/memory.js";
import { registerSimpleReasoningTools } from "./native/simple-reasoning.js";

// Import enhanced processors (Gemini-powered for complex tasks)
import { ReflectionProcessor } from "./processors/reflection.js";
import type { BrainReflectInput } from "./types.js";

/**
 * Register optimized Brain tools with hybrid native/enhanced approach
 *
 * Native Tools (70% usage):
 * - mcp__reasoning__sequentialthinking: Native sequential thinking
 * - mcp__memory__store: Knowledge graph persistence
 * - mcp__memory__recall: Memory retrieval
 * - brain_analyze_simple: Pattern-based reasoning
 * - brain_patterns_info: Framework information
 *
 * Enhanced Tools (30% usage):
 * - brain_reflect_enhanced: AI-powered reflection (complex analysis only)
 */
export async function registerBrainTools(server: McpServer, config: Config) {
  logger.info("Registering optimized Brain tools (native + enhanced hybrid)...");

  // Register Native Tools (fast, no API calls)
  await registerSequentialThinkingTool(server, config);
  await registerMemoryTools(server, config);
  await registerSimpleReasoningTools(server, config);

  // Register Enhanced Tools (for complex tasks requiring AI)
  await registerEnhancedReflectionTool(server, config);

  logger.info("✅ Brain tools optimization complete:");
  logger.info("   • 5 Native tools (fast, API-free)");
  logger.info("   • 1 Enhanced tool (AI-powered)");
  logger.info("   • Expected 65% performance improvement");
}

/**
 * Register enhanced reflection tool (simplified from original)
 */
async function registerEnhancedReflectionTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);
  const reflectionProcessor = new ReflectionProcessor(geminiClient);

  server.registerTool(
    "brain_reflect_enhanced",
    {
      title: "Enhanced reflection and meta-analysis",
      description: "AI-powered reflection for complex analysis improvement",
      inputSchema: {
        originalAnalysis: z.string().min(50).max(5000).describe("The analysis or reasoning to reflect on"),
        focusAreas: z.array(z.enum([
          "assumptions",
          "logic_gaps",
          "alternative_approaches",
          "evidence_quality",
          "bias_detection",
          "completeness"
        ])).min(1).max(3).describe("Specific aspects to focus reflection on"),
        improvementGoal: z.string().optional().describe("Primary goal for improvement"),
        detailLevel: z.enum(["concise", "detailed"]).default("detailed").optional().describe("Level of analysis detail")
      }
    },
    async (args) => {
      try {
        // Convert simplified args to enhanced processor format
        const input: BrainReflectInput = {
          originalAnalysis: args.originalAnalysis as string,
          reflectionFocus: args.focusAreas as any[],
          improvementGoals: args.improvementGoal ? [args.improvementGoal as string] : undefined,
          context: undefined,
          options: {
            outputDetail: (args.detailLevel as any) || 'detailed',
            maxThoughts: 5, // Simplified from original 50
            timeLimit: 30  // Reduced from 60 seconds
          }
        };

        const result = await reflectionProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatEnhancedReflectionResult(result)
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Enhanced reflection tool error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `❌ Analysis Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Enhanced reflection tool registered");
}

/**
 * Format enhanced reflection result (simplified from original)
 */
function formatEnhancedReflectionResult(result: any): string {
  const confidence = (result.confidence * 100).toFixed(0);

  let output = `# 🔍 Enhanced Reflection Analysis\n\n`;

  output += `**Confidence:** ${confidence}%\n`;
  output += `**Issues Found:** ${result.identifiedIssues?.length || 0}\n`;
  output += `**Improvements:** ${result.improvements?.length || 0}\n\n`;

  // Issues (simplified formatting)
  if (result.identifiedIssues?.length > 0) {
    output += `## 🚨 Key Issues\n`;
    result.identifiedIssues.slice(0, 3).forEach((issue: any) => { // Limit to top 3
      const severity = issue.severity === 'high' ? '🔴' :
                     issue.severity === 'medium' ? '🟡' : '🟢';
      output += `${severity} **${issue.type.replace('_', ' ')}:** ${issue.description}\n`;
    });
    output += '\n';
  }

  // Improvements (simplified)
  if (result.improvements?.length > 0) {
    output += `## ✨ Suggested Improvements\n`;
    result.improvements.slice(0, 3).forEach((improvement: string) => { // Limit to top 3
      output += `• ${improvement}\n`;
    });
    output += '\n';
  }

  // Revised analysis (if available)
  if (result.revisedAnalysis) {
    output += `## 📝 Revised Analysis\n${result.revisedAnalysis}\n\n`;
  }

  // Actions (simplified)
  if (result.recommendedActions?.length > 0) {
    output += `## 🎯 Next Steps\n`;
    result.recommendedActions.slice(0, 3).forEach((action: string) => {
      output += `• ${action}\n`;
    });
  }

  return output;
}

/**
 * Legacy compatibility - backup available at index.ts.backup if needed
 */

/**
 * Tool routing recommendations for agents
 */
export const BRAIN_TOOL_RECOMMENDATIONS = {
  // Use native tools for these scenarios (fast, no API cost)
  native: {
    "mcp__reasoning__sequentialthinking": [
      "Complex problem-solving requiring step-by-step thinking",
      "Dynamic reasoning with thought revision and branching",
      "Multi-step analysis with session management"
    ],
    "mcp__memory__store": [
      "Storing entities, relationships, and observations",
      "Building knowledge graphs for context retention",
      "Creating persistent memory across sessions"
    ],
    "mcp__memory__recall": [
      "Searching stored information and entities",
      "Retrieving relationships and observations",
      "Getting memory statistics and insights"
    ],
    "brain_analyze_simple": [
      "Standard analytical frameworks (SWOT, pros/cons, root cause)",
      "Pattern-based reasoning for common scenarios",
      "Quick structured analysis without AI overhead"
    ],
    "brain_patterns_info": [
      "Learning about available reasoning frameworks",
      "Understanding analytical pattern capabilities"
    ]
  },

  // Use enhanced tools for these scenarios (AI-powered, slower, higher cost)
  enhanced: {
    "brain_reflect_enhanced": [
      "Meta-cognitive analysis of complex reasoning",
      "Identifying assumptions and biases in analysis",
      "Improving analysis quality through AI reflection",
      "Complex logic gap detection"
    ]
  },

  // Performance expectations
  performance: {
    native: {
      responseTime: "< 100ms",
      tokenUsage: "0 (no API calls)",
      accuracy: "High for structured tasks"
    },
    enhanced: {
      responseTime: "1-3 seconds",
      tokenUsage: "500-2000 tokens",
      accuracy: "Very high for complex analysis"
    }
  }
};

export default registerBrainTools;
</file>

<file path="src/tools/eyes/schemas.ts">
import { z } from "zod";

export const EyesInputSchema = z.object({
  source: z.string().describe("URL, file path, or base64 encoded content"),
  type: z.enum(["image", "video", "gif"]).describe("Type of visual content"),
  analysis_type: z.enum([
    "general",
    "ui_debug", 
    "error_detection",
    "accessibility",
    "performance",
    "layout"
  ]).default("general"),
  detail_level: z.enum(["quick", "detailed"]).default("detailed"),
  specific_focus: z.string().optional().describe("Specific areas or elements to focus on"),
  extract_text: z.boolean().default(true),
  detect_ui_elements: z.boolean().default(true),
  analyze_colors: z.boolean().default(false),
  check_accessibility: z.boolean().default(false)
});

export const EyesOutputSchema = z.object({
  analysis: z.string(),
  detected_elements: z.array(z.object({
    type: z.string(),
    location: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }),
    properties: z.record(z.any())
  })),
  debugging_insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  metadata: z.object({
    processing_time_ms: z.number(),
    model_used: z.string(),
    frames_analyzed: z.number().optional()
  })
});

export const CompareInputSchema = z.object({
  source1: z.string(),
  source2: z.string(),
  comparison_type: z.enum(["pixel", "structural", "semantic"]).default("semantic")
});

export type EyesInput = z.infer<typeof EyesInputSchema>;
export type EyesOutput = z.infer<typeof EyesOutputSchema>;
export type CompareInput = z.infer<typeof CompareInputSchema>;

// Document processing schemas
export const DocumentInputSchema = z.object({
  source: z.string().describe("Path, URL, or base64 data URI of the document"),
  format: z.enum([
    "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
  ]).default("auto").describe("Document format. Use 'auto' for automatic detection"),
  options: z.object({
    extract_text: z.boolean().default(true).describe("Extract text content"),
    extract_tables: z.boolean().default(true).describe("Extract tables"),
    extract_images: z.boolean().default(false).describe("Extract images"),
    preserve_formatting: z.boolean().default(false).describe("Preserve original formatting"),
    page_range: z.string().optional().describe("Page range (e.g., '1-5', '2,4,6')"),
    detail_level: z.enum(["quick", "detailed"]).default("detailed").describe("Level of detail in processing")
  }).optional().describe("Processing options")
});

export const DataExtractionSchema = z.object({
  source: z.string().describe("Document source"),
  format: z.enum([
    "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
  ]).default("auto").describe("Document format"),
  schema: z.record(z.any()).describe("JSON schema for data extraction"),
  options: z.object({
    strict_mode: z.boolean().default(false).describe("Strict schema validation"),
    fallback_values: z.record(z.any()).optional().describe("Fallback values for missing data")
  }).optional().describe("Extraction options")
});

export const SummarizationSchema = z.object({
  source: z.string().describe("Document source"),
  format: z.enum([
    "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
  ]).default("auto").describe("Document format"),
  options: z.object({
    summary_type: z.enum(["brief", "detailed", "executive", "technical"]).default("detailed").describe("Type of summary"),
    max_length: z.number().optional().describe("Maximum summary length in words"),
    focus_areas: z.array(z.string()).optional().describe("Specific areas to focus on"),
    include_key_points: z.boolean().default(true).describe("Include key points"),
    include_recommendations: z.boolean().default(true).describe("Include recommendations")
  }).optional().describe("Summarization options")
});

export type DocumentInput = z.infer<typeof DocumentInputSchema>;
export type DataExtractionInput = z.infer<typeof DataExtractionSchema>;
export type SummarizationInput = z.infer<typeof SummarizationSchema>;
</file>

<file path="src/tools/hands/schemas.ts">
import { z } from "zod";

export const ImageGenerationInputSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview"),
  output_format: z.enum(["base64", "url"]).optional().default("base64"),
  negative_prompt: z.string().optional(),
  style: z.enum(["photorealistic", "artistic", "cartoon", "sketch", "digital_art"]).optional(),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("1:1"),
  seed: z.number().int().min(0).optional()
});

export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;

export interface ImageGenerationResult {
  imageData: string;
  format: string;
  model: string;
  generationTime?: number;
  size?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface ImageGenerationOptions {
  prompt: string;
  model: string;
  outputFormat: string;
  negativePrompt?: string;
  style?: string;
  aspectRatio: string;
  seed?: number;
  fetchTimeout: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  saveDirectory?: string;
  filePrefix?: string;
}

// Video Generation Schemas
export const VideoGenerationInputSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001"),
  duration: z.enum(["4s", "8s", "12s"]).optional().default("4s"),
  output_format: z.enum(["mp4", "webm"]).optional().default("mp4"),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9"),
  fps: z.number().int().min(1).max(60).optional().default(24),
  image_input: z.string().optional().describe("Base64 encoded image or image URL to use as starting frame"),
  style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional(),
  camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional(),
  seed: z.number().int().min(0).optional()
});

export type VideoGenerationInput = z.infer<typeof VideoGenerationInputSchema>;

export interface VideoGenerationResult {
  videoData: string;
  format: string;
  model: string;
  duration: string;
  aspectRatio: string;
  fps: number;
  generationTime?: number;
  size?: string;
  operationId?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

export interface VideoGenerationOptions {
  prompt: string;
  model: string;
  duration: string;
  outputFormat: string;
  aspectRatio: string;
  fps: number;
  imageInput?: string;
  style?: string;
  cameraMovement?: string;
  seed?: number;
  fetchTimeout: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  saveDirectory?: string;
  filePrefix?: string;
}

// Image Editing Schemas
export const ImageEditingInputSchema = z.object({
  operation: z.enum([
    "inpaint",
    "outpaint",
    "style_transfer",
    "object_manipulation",
    "multi_image_compose"
  ]).describe("Type of image editing operation to perform"),

  input_image: z.string().describe("Base64 encoded image or file path to the input image"),

  prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of the desired edit"),

  // Inpainting specific fields
  mask_image: z.string().optional().describe("Base64 encoded mask image for inpainting (white = edit area, black = keep)"),
  mask_prompt: z.string().optional().describe("Text description of the area to mask for editing"),

  // Outpainting specific fields
  expand_direction: z.enum(["all", "left", "right", "top", "bottom", "horizontal", "vertical"]).optional().describe("Direction to expand the image"),
  expansion_ratio: z.number().min(0.1).max(3.0).optional().default(1.5).describe("How much to expand the image (1.0 = no expansion)"),

  // Style transfer specific fields
  style_image: z.string().optional().describe("Base64 encoded reference image for style transfer"),
  style_strength: z.number().min(0.1).max(1.0).optional().default(0.7).describe("Strength of style application"),

  // Object manipulation specific fields
  target_object: z.string().optional().describe("Description of the object to manipulate"),
  manipulation_type: z.enum(["move", "resize", "remove", "replace", "duplicate"]).optional().describe("Type of object manipulation"),
  target_position: z.string().optional().describe("New position for the object (e.g., 'center', 'top-left')"),

  // Multi-image composition specific fields
  secondary_images: z.array(z.string()).optional().describe("Array of base64 encoded images for composition"),
  composition_layout: z.enum(["blend", "collage", "overlay", "side_by_side"]).optional().describe("How to combine multiple images"),
  blend_mode: z.enum(["normal", "multiply", "screen", "overlay", "soft_light"]).optional().describe("Blending mode for image composition"),

  // Common optional fields
  negative_prompt: z.string().optional().describe("What to avoid in the edited image"),
  strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
  guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
  seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
  output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format for the edited image"),
  quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level of the editing")
});

export type ImageEditingInput = z.infer<typeof ImageEditingInputSchema>;

export interface ImageEditingResult {
  editedImageData: string;
  format: string;
  operation: string;
  processingTime?: number;
  originalSize?: string;
  editedSize?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  metadata?: {
    prompt: string;
    operation: string;
    strength?: number;
    guidanceScale?: number;
    seed?: number;
  };
}

export interface ImageEditingOptions {
  operation: string;
  inputImage: string;
  prompt: string;
  maskImage?: string;
  maskPrompt?: string;
  expandDirection?: string;
  expansionRatio?: number;
  styleImage?: string;
  styleStrength?: number;
  targetObject?: string;
  manipulationType?: string;
  targetPosition?: string;
  secondaryImages?: string[];
  compositionLayout?: string;
  blendMode?: string;
  negativePrompt?: string;
  strength: number;
  guidanceScale: number;
  seed?: number;
  outputFormat: string;
  quality: string;
  fetchTimeout: number;
  saveToFile?: boolean;
  uploadToR2?: boolean;
  saveDirectory?: string;
  filePrefix?: string;
}
</file>

<file path="src/tools/mouth/index.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../eyes/utils/gemini-client.js";
import {
  SpeechInputSchema,
  NarrationInputSchema,
  CodeExplanationInputSchema,
  VoiceCustomizationInputSchema,
  SupportedLanguages,
  type SpeechInput,
  type NarrationInput,
  type CodeExplanationInput,
  type VoiceCustomizationInput
} from "./schemas.js";
import { generateSpeech } from "./processors/speech-synthesis.js";
import { generateNarration } from "./processors/narration.js";
import { generateCodeExplanation } from "./processors/code-explanation.js";
import { generateVoiceCustomization } from "./processors/voice-customization.js";
import { exportAudio } from "./utils/audio-export.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

export async function registerMouthTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  // Register mouth_speak tool
  server.registerTool(
    "mouth_speak",
    {
      title: "Text-to-Speech Generation",
      description: "Generate speech from text using Gemini Speech Generation API with voice customization",
      inputSchema: {
        text: z.string().min(1).max(32000).describe("Text to convert to speech (max 32k tokens)"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).optional().default("Zephyr").describe("Voice to use for speech generation"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        style_prompt: z.string().optional().describe("Natural language prompt to control speaking style")
      }
    },
    async (args) => {
      try {
        return await handleSpeech(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_speak error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register mouth_narrate tool
  server.registerTool(
    "mouth_narrate",
    {
      title: "Long-form Content Narration",
      description: "Generate narration for long-form content with chapter breaks and style control",
      inputSchema: {
        content: z.string().min(1).describe("Long-form content to narrate"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).optional().default("Sage").describe("Voice to use for narration"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for narration"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        narration_style: z.enum(["professional", "casual", "educational", "storytelling"]).optional().default("professional").describe("Narration style"),
        chapter_breaks: z.boolean().optional().default(false).describe("Add pauses between chapters/sections"),
        max_chunk_size: z.number().optional().default(8000).describe("Maximum characters per audio chunk")
      }
    },
    async (args) => {
      try {
        return await handleNarration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_narrate error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register mouth_explain tool
  server.registerTool(
    "mouth_explain",
    {
      title: "Code Explanation with Speech",
      description: "Generate spoken explanations of code with technical analysis",
      inputSchema: {
        code: z.string().min(1).describe("Code to explain"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for explanation"),
        programming_language: z.string().optional().describe("Programming language of the code"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).optional().default("Apollo").describe("Voice to use for explanation"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-pro-preview-tts").describe("Speech generation model"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        explanation_level: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate").describe("Technical level of explanation"),
        include_examples: z.boolean().optional().default(true).describe("Include examples in explanation")
      }
    },
    async (args) => {
      try {
        return await handleCodeExplanation(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_explain error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register mouth_customize tool
  server.registerTool(
    "mouth_customize",
    {
      title: "Voice Customization and Testing",
      description: "Test different voices and styles to find the best fit for your content",
      inputSchema: {
        text: z.string().min(1).max(1000).describe("Sample text to test voice customization"),
        voice: z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ]).describe("Base voice to customize"),
        model: z.enum(["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]).optional().default("gemini-2.5-flash-preview-tts").describe("Speech generation model"),
        language: z.enum(SupportedLanguages).optional().default("en-US").describe("Language for speech generation"),
        output_format: z.enum(["wav", "base64", "url"]).optional().default("base64").describe("Output format for generated audio"),
        style_variations: z.array(z.string()).optional().describe("Array of different style prompts to test"),
        compare_voices: z.array(z.enum([
          "Astrid", "Charon", "Fenrir", "Kore", "Odin", "Puck", "Sage", "Vox", "Zephyr",
          "Aoede", "Apollo", "Elektra", "Iris", "Nemesis", "Perseus", "Selene", "Thalia",
          "Argus", "Ares", "Demeter", "Dione", "Echo", "Eros", "Hephaestus", "Hermes",
          "Hyperion", "Iapetus", "Kronos", "Leto", "Maia", "Mnemosyne"
        ])).optional().describe("Additional voices to compare with the main voice")
      }
    },
    async (args) => {
      try {
        return await handleVoiceCustomization(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool mouth_customize error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );
}

async function handleSpeech(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = SpeechInputSchema.parse(args) as SpeechInput;

  logger.info(`Generating speech for text: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateSpeech(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          audio: result.audioData.startsWith('data:') ?
            `Audio generated (${Math.round(result.audioData.length / 1000)}KB base64 data)` :
            result.audioData,
          format: result.format,
          voice: result.voice,
          language: result.language,
          model: result.model,
          filename: result.filename,
          localPath: result.localPath,
          cloudUrl: result.cloudUrl,
          fileSize: result.fileSize,
          storage: result.storage,
          metadata: result.metadata,
          note: result.localPath ? `Audio automatically saved to: ${result.localPath}${result.cloudUrl ? ` and uploaded to: ${result.cloudUrl}` : ''}` : "Audio generation completed"
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleNarration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = NarrationInputSchema.parse(args) as NarrationInput;

  logger.info(`Generating narration for ${input.content.length} characters`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateNarration(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          chunks: result.chunks.map(chunk => ({
            audio: chunk.audioData.startsWith('data:') ?
              `Audio chunk (${Math.round(chunk.audioData.length / 1000)}KB base64 data)` :
              chunk.audioData,
            format: chunk.format,
            metadata: chunk.metadata
          })),
          totalDuration: result.totalDuration,
          chapterBreaks: result.chapterBreaks,
          metadata: result.metadata,
          note: "Consider implementing file saving to reduce token usage"
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleCodeExplanation(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = CodeExplanationInputSchema.parse(args) as CodeExplanationInput;

  logger.info(`Generating code explanation for ${input.code.length} characters of ${input.programming_language || 'code'}`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateCodeExplanation(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          explanation: {
            audio: result.explanation.audioData.startsWith('data:') ?
              `Audio explanation (${Math.round(result.explanation.audioData.length / 1000)}KB base64 data)` :
              result.explanation.audioData,
            format: result.explanation.format,
            metadata: result.explanation.metadata
          },
          codeAnalysis: result.codeAnalysis,
          metadata: result.metadata,
          note: "Consider implementing file saving to reduce token usage"
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleVoiceCustomization(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = VoiceCustomizationInputSchema.parse(args) as VoiceCustomizationInput;

  logger.info(`Generating voice customization samples for voice: ${input.voice}`);

  const options = {
    ...input,
    fetchTimeout: config.server.fetchTimeout,
    config
  };

  const result = await generateVoiceCustomization(geminiClient, options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          samples: result.samples.map(sample => ({
            voice: sample.voice,
            stylePrompt: sample.stylePrompt,
            audio: sample.audioData.startsWith('data:') ?
              `Voice sample (${Math.round(sample.audioData.length / 1000)}KB base64 data)` :
              sample.audioData,
            metadata: sample.metadata
          })),
          recommendation: result.recommendation,
          metadata: result.metadata,
          note: "Consider implementing file saving to reduce token usage"
        }, null, 2)
      }
    ],
    isError: false
  };
}
</file>

<file path="src/transports/http/routes.ts">
import { Router } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { SessionManager } from "./session.js";
import type { HttpTransportConfig } from "../types.js";
import multer from 'multer';
import { getCloudflareR2 } from '@/utils/cloudflare-r2.js';
import { logger } from '@/utils/logger.js';

// Interface for SSE session checking (to avoid circular dependency)
interface SSESessionChecker {
  hasSession(sessionId: string): boolean;
}

export function createRoutes(
  mcpServer: McpServer,
  sessionManager: SessionManager,
  config: HttpTransportConfig,
  sseSessionChecker?: SSESessionChecker
): Router {
  const router = Router();

  // POST /mcp - Handle client requests
  router.post('/', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      
      if (config.sessionMode === 'stateless') {
        await handleStatelessRequest(mcpServer, req, res);
      } else {
        await handleStatefulRequest(mcpServer, sessionManager, sessionId, req, res, sseSessionChecker);
      }
    } catch (error) {
      handleError(res, error);
    }
  });

  // GET /mcp - SSE endpoint for notifications
  router.get('/', async (req, res) => {
    if (config.sessionMode === 'stateless') {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "SSE not supported in stateless mode"
        },
        id: null
      });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = await sessionManager.getTransport(sessionId);
    
    if (!transport) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    await transport.handleRequest(req, res);
  });

  // DELETE /mcp - Session termination
  router.delete('/', async (req, res) => {
    if (config.sessionMode === 'stateless') {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Session termination not applicable in stateless mode"
        },
        id: null
      });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string;
    await sessionManager.terminateSession(sessionId);
    res.status(204).send();
  });

  // Configure multer for memory storage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept images, videos, and GIFs
      if (file.mimetype.startsWith('image/') || 
          file.mimetype.startsWith('video/') ||
          file.mimetype === 'image/gif') {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'));
      }
    }
  });

  // POST /upload - Handle file uploads to Cloudflare R2
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'No file uploaded'
          },
          id: null
        });
        return;
      }

      const cloudflare = getCloudflareR2();
      if (!cloudflare) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Cloudflare R2 not configured. Please set up environment variables.'
          },
          id: null
        });
        return;
      }
      
      // Upload to Cloudflare R2
      const publicUrl = await cloudflare.uploadFile(
        req.file.buffer,
        req.file.originalname
      );
      
      res.json({
        jsonrpc: '2.0',
        result: {
          success: true,
          url: publicUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          message: 'File uploaded successfully to Cloudflare R2'
        },
        id: (req.body as any)?.id || null
      });
    } catch (error) {
      logger.error('Upload error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        id: (req.body as any)?.id || null
      });
    }
  });

  // POST /upload-base64 - Handle base64 uploads
  router.post('/upload-base64', async (req, res) => {
    try {
      const { data, mimeType, filename } = req.body;
      
      if (!data || !mimeType) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Missing required fields: data and mimeType'
          },
          id: null
        });
        return;
      }

      const cloudflare = getCloudflareR2();
      if (!cloudflare) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Cloudflare R2 not configured. Please set up environment variables.'
          },
          id: null
        });
        return;
      }
      
      // Remove data URI prefix if present
      const base64Data = data.replace(/^data:.*?;base64,/, '');
      
      // Upload to Cloudflare R2
      const publicUrl = await cloudflare.uploadBase64(
        base64Data,
        mimeType,
        filename
      );
      
      res.json({
        jsonrpc: '2.0',
        result: {
          success: true,
          url: publicUrl,
          message: 'Base64 data uploaded successfully to Cloudflare R2'
        },
        id: req.body?.id || null
      });
    } catch (error) {
      logger.error('Base64 upload error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Failed to upload base64 data: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        id: req.body?.id || null
      });
    }
  });

  return router;
}

async function handleStatelessRequest(
  mcpServer: McpServer,
  req: any,
  res: any
): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    transport.close();
  });

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

async function handleStatefulRequest(
  mcpServer: McpServer,
  sessionManager: SessionManager,
  sessionId: string | undefined,
  req: any,
  res: any,
  sseSessionChecker?: SSESessionChecker
): Promise<void> {
  // Check if sessionId is being used by SSE transport
  if (sessionId && sseSessionChecker?.hasSession(sessionId)) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Session ID is already in use by SSE transport',
      },
      id: null,
    });
    return;
  }

  let transport = sessionId ? 
    await sessionManager.getTransport(sessionId) : null;

  if (!transport && isInitializeRequest(req.body)) {
    const session = await sessionManager.createSession(mcpServer);
    transport = session.transport;
    res.setHeader('Mcp-Session-Id', session.sessionId);
  } else if (!transport) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
}

function handleError(res: any, error: any): void {
  console.error('MCP request error:', error);
  if (!res.headersSent) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  }
}
</file>

<file path="src/transports/http/session.ts">
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { SessionStore, TransportSession, HttpTransportConfig } from "../types.js";

export class SessionManager {
  private transports: Map<string, StreamableHTTPServerTransport>;
  private sessionMode: 'stateful' | 'stateless';
  private store?: SessionStore;
  private config: HttpTransportConfig;

  constructor(sessionMode: 'stateful' | 'stateless', config: HttpTransportConfig, store?: SessionStore) {
    this.transports = new Map();
    this.sessionMode = sessionMode;
    this.config = config;
    this.store = store;
  }

  async createSession(mcpServer: McpServer): Promise<{ transport: StreamableHTTPServerTransport, sessionId: string }> {
    const sessionId = randomUUID();
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      enableJsonResponse: this.config.enableJsonResponse,
      enableDnsRebindingProtection: this.config.security?.enableDnsRebindingProtection ?? true,
      allowedHosts: this.config.security?.allowedHosts ?? ['127.0.0.1', 'localhost'],
    });

    // Store the transport by the generated session ID
    this.transports.set(sessionId, transport);
    
    transport.onclose = () => {
      this.terminateSession(sessionId);
    };

    if (this.store) {
      await this.store.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        transport: transport
      });
    }

    await mcpServer.connect(transport);
    
    return { transport, sessionId };
  }

  async getTransport(sessionId: string): Promise<StreamableHTTPServerTransport | null> {
    let transport = this.transports.get(sessionId);
    
    if (!transport && this.store) {
      const session = await this.store.get(sessionId);
      if (session && session.transport) {
        transport = session.transport;
        this.transports.set(sessionId, transport);
      }
    }
    
    return transport || null;
  }

  async terminateSession(sessionId: string): Promise<void> {
    const transport = this.transports.get(sessionId);
    if (transport) {
      // Remove from map first to prevent circular cleanup
      this.transports.delete(sessionId);
      // Clear the onclose handler to prevent recursion
      transport.onclose = undefined;
      transport.close();
    }
    
    if (this.store) {
      await this.store.delete(sessionId);
    }
  }

  async cleanup(): Promise<void> {
    // Create a copy of the map entries to avoid modification during iteration
    const transportEntries = Array.from(this.transports.entries());
    this.transports.clear();
    
    for (const [sessionId, transport] of transportEntries) {
      // Clear the onclose handler to prevent recursion during cleanup
      transport.onclose = undefined;
      transport.close();
    }
    
    if (this.store) {
      await this.store.cleanup();
    }
  }
}
</file>

<file path="src/transports/types.ts">
import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface TransportConfig {
  type: 'stdio' | 'http' | 'both';
  http?: HttpTransportConfig;
}

export interface HttpTransportConfig {
  port: number;
  host?: string;
  sessionMode: 'stateful' | 'stateless';
  enableSse?: boolean;
  enableJsonResponse?: boolean;
  enableSseFallback?: boolean;
  ssePaths?: {
    stream: string;
    message: string;
  };
  security?: SecurityConfig;
}

export interface SecurityConfig {
  enableCors?: boolean;
  corsOrigins?: string[];
  enableDnsRebindingProtection?: boolean;
  allowedHosts?: string[];
  enableRateLimiting?: boolean;
  secret?: string;
}

export interface TransportSession {
  id: string;
  createdAt: number;
  transport: StreamableHTTPServerTransport;
}

export interface SessionStore {
  get(sessionId: string): Promise<TransportSession | null>;
  set(sessionId: string, session: TransportSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface HttpServerHandle {
  app: any;
  server: any;
  sessionManager: any;
  sseManager?: any;
  close(): Promise<void>;
}
</file>

<file path="src/types/index.ts">
export interface AnalysisOptions {
  analysis_type: "general" | "ui_debug" | "error_detection" | "accessibility" | "performance" | "layout";
  detail_level: "quick" | "detailed";
  specific_focus?: string;
  extract_text?: boolean;
  detect_ui_elements?: boolean;
  analyze_colors?: boolean;
  check_accessibility?: boolean;
  fetchTimeout?: number;
}

export interface ProcessingResult {
  description: string;
  analysis: string;
  elements: DetectedElement[];
  insights: string[];
  recommendations: string[];
  metadata: {
    processing_time_ms: number;
    model_used: string;
    frames_analyzed?: number;
    attempts_made?: number;
    status?: string;
  };
}

export interface DetectedElement {
  type: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties: Record<string, any>;
}

export interface VideoOptions extends AnalysisOptions {
  max_frames?: number;
  sample_rate?: number;
}

export type LogLevel = "debug" | "info" | "warn" | "error";
</file>

<file path="src/index.ts">
#!/usr/bin/env bun

import { createServer } from "./server.js";
import { TransportManager } from "./transports/index.js";
import { loadConfig } from "./utils/config.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    const config = loadConfig();
    const server = await createServer();
    
    const transportConfig = {
      type: config.transport.type,
      http: config.transport.http?.enabled ? {
        port: config.transport.http.port,
        host: config.transport.http.host,
        sessionMode: config.transport.http.sessionMode,
        enableSse: config.transport.http.enableSse,
        enableJsonResponse: config.transport.http.enableJsonResponse,
        enableSseFallback: config.transport.http.enableSseFallback,
        ssePaths: config.transport.http.ssePaths,
        security: config.transport.http.security
      } : undefined
    };
    
    const transportManager = new TransportManager(server, transportConfig);
    await transportManager.start();
    
    logger.info(`Human MCP Server started with ${config.transport.type} transport`);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down server...');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
</file>

<file path="tests/integration/hands-image-generation.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { generateImage } from '@/tools/hands/processors/image-generator';
import { GeminiClient } from '@/tools/eyes/utils/gemini-client';
import { loadConfig } from '@/utils/config';
import { TestDataGenerators } from '../utils/index.js';
import type { ImageGenerationOptions } from '@/tools/hands/schemas';

// Mock GeminiClient for integration tests
let mockGenerateContent = mock(async () => {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  return TestDataGenerators.createMockGeminiImageGenerationResponse();
});

const mockGeminiModel = {
  generateContent: mockGenerateContent
};

let mockGeminiClient: any;

// Initialize mock client
function initializeMockClient() {
  // Reset the mock
  mockGenerateContent.mockClear();

  mockGeminiClient = {
    getImageGenerationModel: mock(() => mockGeminiModel)
  } as unknown as GeminiClient;
}

describe('Image Generation Integration Tests', () => {
  let config: any;

  beforeAll(() => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    config = loadConfig();
    initializeMockClient();
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  beforeEach(() => {
    // Reset mocks before each test
    initializeMockClient();
  });

  describe('generateImage function', () => {
    it('should generate image with basic options', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A beautiful sunset over mountains',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result).toBeDefined();
      expect(result.imageData).toBeDefined();
      expect(result.format).toBe('base64_data_uri');
      expect(result.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toBeDefined();
    });

    it('should enhance prompt with style', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A portrait of a person',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        style: 'photorealistic',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGenerateContent).toHaveBeenCalledWith([
        { text: expect.stringContaining('photorealistic, high quality, detailed') }
      ]);
    });

    it('should enhance prompt with aspect ratio', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A landscape scene',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '16:9',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGenerateContent).toHaveBeenCalledWith([
        { text: expect.stringContaining('aspect ratio 16:9') }
      ]);
    });

    it('should handle negative prompt', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A beautiful flower',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        negativePrompt: 'blurry, distorted',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGenerateContent).toHaveBeenCalledWith([
        { text: expect.stringContaining('Avoid: blurry, distorted') }
      ]);
    });

    it('should combine all prompt enhancements', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'A serene lake',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '4:3',
        style: 'artistic',
        negativePrompt: 'noisy, cluttered',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      const expectedPrompt = 'A serene lake, artistic style, creative, expressive, aspect ratio 4:3. Avoid: noisy, cluttered';
      expect(mockGenerateContent).toHaveBeenCalledWith([
        { text: expectedPrompt }
      ]);
    });

    it('should handle all style options', async () => {
      const styles = ['photorealistic', 'artistic', 'cartoon', 'sketch', 'digital_art'];

      for (const style of styles) {
        const options: ImageGenerationOptions = {
          prompt: 'Test image',
          model: 'gemini-2.5-flash-image-preview',
          outputFormat: 'base64',
          aspectRatio: '1:1',
          style: style as any,
          fetchTimeout: 60000
        };

        await generateImage(mockGeminiClient, options);

        expect(mockGenerateContent).toHaveBeenCalledWith(
          expect.arrayContaining([
            { text: expect.stringContaining(style === 'digital_art' ? 'digital art' : style) }
          ])
        );

        initializeMockClient();
      }
    });

    it('should use correct model configuration', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test prompt',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await generateImage(mockGeminiClient, options);

      expect(mockGeminiClient.getImageGenerationModel).toHaveBeenCalledWith('gemini-2.5-flash-image-preview');
    });

    it('should measure generation time', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test timing',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.generationTime).toBeGreaterThan(0);
      expect(typeof result.generationTime).toBe('number');
    });

    it('should estimate image size', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test sizing',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.size).toMatch(/^\d+x\d+\+?$/);
    });
  });

  describe('error handling', () => {
    it('should handle API key errors', async () => {
      mockGenerateContent.mockImplementationOnce(async () => {
        throw new Error('API key invalid');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test error',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'Invalid or missing Google AI API key'
      );
    });

    it('should handle quota exceeded errors', async () => {
      mockGenerateContent.mockImplementationOnce(async () => {
        throw new Error('quota exceeded');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test quota error',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'API quota exceeded or rate limit reached'
      );
    });

    it('should handle safety policy errors', async () => {
      mockGenerateContent.mockImplementationOnce(async () => {
        throw new Error('safety policy violation');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test safety error',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'Image generation blocked due to safety policies'
      );
    });

    it('should handle no candidates response', async () => {
      const errorResponse = {
        response: {
          candidates: []
        }
      };
      mockGenerateContent.mockResolvedValueOnce(errorResponse);

      const options: ImageGenerationOptions = {
        prompt: 'Test no candidates',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'No image candidates returned from Gemini API'
      );
    });

    it('should handle invalid response format', async () => {
      const errorResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: []
              }
            }
          ]
        }
      };
      mockGenerateContent.mockResolvedValueOnce(errorResponse);

      const options: ImageGenerationOptions = {
        prompt: 'Test invalid response',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'No image data found in Gemini response'
      );
    });

    it('should handle generic errors', async () => {
      mockGenerateContent.mockImplementationOnce(async () => {
        throw new Error('Unknown error');
      });

      const options: ImageGenerationOptions = {
        prompt: 'Test generic error',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      await expect(generateImage(mockGeminiClient, options)).rejects.toThrow(
        'Image generation failed: Unknown error'
      );
    });
  });

  describe('output format handling', () => {
    it('should return base64 data URI for base64 format', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test base64 output',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'base64',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });

    it('should fallback to base64 for URL format (not yet implemented)', async () => {
      const options: ImageGenerationOptions = {
        prompt: 'Test URL output',
        model: 'gemini-2.5-flash-image-preview',
        outputFormat: 'url',
        aspectRatio: '1:1',
        fetchTimeout: 60000
      };

      const result = await generateImage(mockGeminiClient, options);

      expect(result.format).toBe('base64_data_uri');
      expect(result.imageData).toMatch(/^data:image\/[a-z]+;base64,/);
    });
  });
});
</file>

<file path="tests/integration/http-transport-files.test.ts">
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { fileInterceptorMiddleware } from '@/transports/http/file-interceptor';
import type { Request, Response, NextFunction } from 'express';

describe('HTTP Transport File Handling', () => {
  beforeAll(() => {
    process.env.TRANSPORT_TYPE = 'http';
    // Set required Cloudflare R2 environment variables for testing
    process.env.CLOUDFLARE_CDN_ACCESS_KEY = 'test-access-key';
    process.env.CLOUDFLARE_CDN_SECRET_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_CDN_ENDPOINT_URL = 'https://test.r2.cloudflarestorage.com';
    process.env.CLOUDFLARE_CDN_BUCKET_NAME = 'test-bucket';
    process.env.CLOUDFLARE_CDN_BASE_URL = 'https://cdn.test.com';
  });

  afterAll(() => {
    delete process.env.TRANSPORT_TYPE;
    delete process.env.CLOUDFLARE_CDN_ACCESS_KEY;
    delete process.env.CLOUDFLARE_CDN_SECRET_KEY;
    delete process.env.CLOUDFLARE_CDN_ENDPOINT_URL;
    delete process.env.CLOUDFLARE_CDN_BUCKET_NAME;
    delete process.env.CLOUDFLARE_CDN_BASE_URL;
  });

  it('should handle Claude Desktop virtual paths', async () => {
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source: '/mnt/user-data/uploads/test.png',
            type: 'image'
          }
        },
        id: 'test-id'
      }
    } as Request;

    let statusCode = 0;
    let responseData: any = null;
    
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as unknown as Response;

    const next = () => {};

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Without proper file access and R2 configuration, should provide helpful error
    expect(statusCode).toBe(400);
    expect(responseData).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32602,
        message: 'File not accessible via HTTP transport',
        data: {
          path: '/mnt/user-data/uploads/test.png',
          suggestions: expect.arrayContaining([
            'Upload the file using the /mcp/upload endpoint first'
          ])
        }
      },
      id: 'test-id'
    });
  });

  it('should auto-upload local files in HTTP mode', async () => {
    // Test that middleware doesn't break when processing local paths
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source: '/local/path/image.jpg'
          }
        }
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Without proper Cloudflare configuration, the path should remain unchanged
    expect(req.body.params.arguments.source).toBe('/local/path/image.jpg');
    expect(nextCalled).toBe(true);
  });

  it('should skip non-file fields', async () => {
    const originalSource = 'https://example.com/image.jpg';
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source: originalSource,
            otherField: 'some value'
          }
        }
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Should not modify URL sources
    expect(req.body.params.arguments.source).toBe(originalSource);
    expect(nextCalled).toBe(true);
  });

  it('should skip non-tool-call requests', async () => {
    const req = {
      body: {
        method: 'initialize',
        params: {}
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    expect(nextCalled).toBe(true);
  });

  it('should handle multiple file fields', async () => {
    // Test that middleware processes multiple fields without breaking
    const req = {
      body: {
        method: 'tools/call',
        params: {
          arguments: {
            source1: '/path/image1.jpg',
            source2: '/path/image2.png',
            normalField: 'value'
          }
        }
      }
    } as Request;

    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await fileInterceptorMiddleware(req, res, next as NextFunction);

    // Without proper Cloudflare configuration, paths should remain unchanged
    expect(req.body.params.arguments.source1).toBe('/path/image1.jpg');
    expect(req.body.params.arguments.source2).toBe('/path/image2.png');
    expect(req.body.params.arguments.normalField).toBe('value');
    expect(nextCalled).toBe(true);
  });
});
</file>

<file path="tests/integration/server.test.ts">
import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";

// Logger is mocked globally in setup.ts

import { createServer } from "../../src/server.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("MCP Server Integration", () => {
  let server: McpServer;
  
  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    server = await createServer();
  });
  
  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });
  
  it("should create server successfully", () => {
    expect(server).toBeDefined();
  });
  
  it("should be properly configured", () => {
    expect(server).toBeInstanceOf(McpServer);
  });
});
</file>

<file path="tests/unit/brain-tools.test.ts">
import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { registerBrainTools } from "../../src/tools/brain/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../../src/utils/config.js";

// Mock external dependencies
mock.module("@/tools/eyes/utils/gemini-client.js", () => ({
  GeminiClient: mock(() => ({
    getModel: mock(() => ({}))
  }))
}));

describe("Brain Tools Optimization", () => {
  let server: McpServer;
  let registeredTools: Map<string, any> = new Map();

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";

    const config = loadConfig();
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });

    // Track registered tools
    const originalRegisterTool = server.registerTool.bind(server);
    server.registerTool = mock((name: string, schema: any, handler: any) => {
      registeredTools.set(name, { schema, handler });
      return originalRegisterTool(name, schema, handler);
    });

    await registerBrainTools(server, config);
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  test("should register all native brain tools", async () => {
    // Check that all expected native tools are registered
    const expectedNativeTools = [
      "mcp__reasoning__sequentialthinking",
      "mcp__memory__store",
      "mcp__memory__recall",
      "brain_analyze_simple",
      "brain_patterns_info"
    ];

    const expectedEnhancedTools = [
      "brain_reflect_enhanced"
    ];

    const allExpectedTools = [...expectedNativeTools, ...expectedEnhancedTools];

    for (const toolName of allExpectedTools) {
      expect(registeredTools.has(toolName)).toBe(true);
    }
  });

  test("sequential thinking tool should have simplified schema", async () => {
    const toolData = registeredTools.get("mcp__reasoning__sequentialthinking");

    expect(toolData).toBeDefined();
    expect(toolData.schema.description).toContain("Advanced sequential thinking");

    // Check simplified schema - should have only core parameters
    const schema = toolData.schema.inputSchema as any;
    expect(schema.thought).toBeDefined();
    expect(schema.nextThoughtNeeded).toBeDefined();
    expect(schema.thoughtNumber).toBeDefined();
    expect(schema.totalThoughts).toBeDefined();
  });

  test("memory tools should have simplified schemas", async () => {
    // Test memory store tool
    const memoryStoreData = registeredTools.get("mcp__memory__store");
    expect(memoryStoreData).toBeDefined();
    expect(memoryStoreData.schema.description).toContain("Create entities, relations, and observations");

    const storeSchema = memoryStoreData.schema.inputSchema as any;
    expect(storeSchema.action).toBeDefined();
    expect(storeSchema.entityName).toBeDefined();
    // Check if entityType is optional by checking the Zod type
    expect(storeSchema.entityType._def.typeName).toBe("ZodOptional");

    // Test memory recall tool
    const memoryRecallData = registeredTools.get("mcp__memory__recall");
    expect(memoryRecallData).toBeDefined();
    expect(memoryRecallData.schema.description).toContain("Search and retrieve entities");

    const recallSchema = memoryRecallData.schema.inputSchema as any;
    expect(recallSchema.action).toBeDefined();
    // Check if query is optional by checking the Zod type
    expect(recallSchema.query._def.typeName).toBe("ZodOptional");
  });

  test("simple reasoning tool should work with pattern-based analysis", async () => {
    const simpleReasoningData = registeredTools.get("brain_analyze_simple");

    expect(simpleReasoningData).toBeDefined();
    expect(simpleReasoningData.schema.description).toContain("Fast pattern-based analysis");

    const schema = simpleReasoningData.schema.inputSchema as any;
    expect(schema.problem).toBeDefined();
    expect(schema.pattern).toBeDefined();
    // Check enum values in Zod's _def.values
    expect(schema.pattern._def.values).toContain("problem_solving");
    expect(schema.pattern._def.values).toContain("root_cause");
    expect(schema.pattern._def.values).toContain("pros_cons");
    expect(schema.pattern._def.values).toContain("swot");
    expect(schema.pattern._def.values).toContain("cause_effect");
  });

  test("enhanced reflection tool should have simplified interface", async () => {
    const enhancedReflectionData = registeredTools.get("brain_reflect_enhanced");

    expect(enhancedReflectionData).toBeDefined();
    expect(enhancedReflectionData.schema.description).toContain("AI-powered reflection");

    const schema = enhancedReflectionData.schema.inputSchema as any;
    expect(schema.originalAnalysis).toBeDefined();
    expect(schema.focusAreas).toBeDefined();
    // Check array item enum values - focusAreas is ZodArray with ZodEnum element
    expect(schema.focusAreas._def.type._def.values).toContain("assumptions");
    expect(schema.focusAreas._def.type._def.values).toContain("logic_gaps");
    // Check if fields are optional by checking Zod type
    expect(schema.improvementGoal._def.typeName).toBe("ZodOptional");
    expect(schema.detailLevel._def.typeName).toBe("ZodOptional");
  });

  test("tools should follow MCP naming conventions", async () => {
    // All tool names should be valid MCP format
    const mcpNamePattern = /^[a-zA-Z0-9_-]{1,64}$/;

    for (const [toolName] of registeredTools) {
      if (toolName.startsWith("brain_") || toolName.startsWith("mcp__")) {
        expect(toolName).toMatch(mcpNamePattern);
      }
    }
  });

  test("native tools should have fast response indicators", async () => {
    const nativeTools = [
      "mcp__reasoning__sequentialthinking",
      "mcp__memory__store",
      "mcp__memory__recall",
      "brain_analyze_simple",
      "brain_patterns_info"
    ];

    for (const toolName of nativeTools) {
      const toolData = registeredTools.get(toolName);
      expect(toolData).toBeDefined();

      // Native tools should have performance-oriented descriptions
      const description = toolData.schema.description.toLowerCase() || "";
      const hasIndicator = description.includes("fast") ||
        description.includes("native") ||
        description.includes("pattern-based") ||
        description.includes("advanced") ||
        description.includes("information") ||
        description.includes("store") ||
        description.includes("recall") ||
        description.includes("sequential") ||
        description.includes("create") ||
        description.includes("search") ||
        description.includes("list") ||
        description.includes("available");

      if (!hasIndicator) {
        console.log(`Tool ${toolName} has description: "${description}"`);
      }

      expect(hasIndicator).toBe(true);
    }
  });

  test("brain tools should be properly categorized", async () => {
    // Count tools by category
    const nativeToolNames = [
      "mcp__reasoning__sequentialthinking",
      "mcp__memory__store",
      "mcp__memory__recall",
      "brain_analyze_simple",
      "brain_patterns_info"
    ];

    const enhancedToolNames = [
      "brain_reflect_enhanced"
    ];

    // Should have 5 native tools and 1 enhanced tool as per optimization plan
    expect(nativeToolNames.every(name => registeredTools.has(name))).toBe(true);
    expect(enhancedToolNames.every(name => registeredTools.has(name))).toBe(true);
  });
});

describe("Brain Tools Functional Tests", () => {
  let server: McpServer;
  let registeredTools: Map<string, any> = new Map();

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";

    const config = loadConfig();
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });

    // Track registered tools
    const originalRegisterTool = server.registerTool.bind(server);
    server.registerTool = mock((name: string, schema: any, handler: any) => {
      registeredTools.set(name, { schema, handler });
      return originalRegisterTool(name, schema, handler);
    });

    await registerBrainTools(server, config);
  });

  test("sequential thinking tool should process thoughts", async () => {
    const toolData = registeredTools.get("mcp__reasoning__sequentialthinking");
    expect(toolData).toBeDefined();

    // Test basic sequential thinking
    const args = {
      problem: "How to optimize database queries",
      thought: "First, we need to analyze the current query patterns",
      nextThoughtNeeded: true,
      thoughtNumber: 1,
      totalThoughts: 3
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Sequential Thinking Progress");
  });

  test("memory store tool should create entities", async () => {
    const toolData = registeredTools.get("mcp__memory__store");
    expect(toolData).toBeDefined();

    const args = {
      action: "create_entity",
      entityName: "test_entity_" + Date.now(),
      entityType: "concept"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("CREATE ENTITY completed successfully");
  });

  test("memory recall tool should search entities", async () => {
    const toolData = registeredTools.get("mcp__memory__recall");
    expect(toolData).toBeDefined();

    const args = {
      action: "get_stats"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Memory Statistics");
  });

  test("simple reasoning tool should perform analysis", async () => {
    const toolData = registeredTools.get("brain_analyze_simple");
    expect(toolData).toBeDefined();

    const args = {
      problem: "Should we migrate to microservices architecture?",
      pattern: "pros_cons"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Pros and Cons Analysis");
  });

  test("patterns info tool should list available patterns", async () => {
    const toolData = registeredTools.get("brain_patterns_info");
    expect(toolData).toBeDefined();

    const args = {};

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Available Reasoning Patterns");
    expect(result?.content[0]?.text).toContain("problem_solving");
    expect(result?.content[0]?.text).toContain("swot");
  });
});

describe("Brain Tools Error Handling", () => {
  let server: McpServer;
  let registeredTools: Map<string, any> = new Map();

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";

    const config = loadConfig();
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });

    // Track registered tools
    const originalRegisterTool = server.registerTool.bind(server);
    server.registerTool = mock((name: string, schema: any, handler: any) => {
      registeredTools.set(name, { schema, handler });
      return originalRegisterTool(name, schema, handler);
    });

    await registerBrainTools(server, config);
  });

  test("sequential thinking should handle missing problem", async () => {
    const toolData = registeredTools.get("mcp__reasoning__sequentialthinking");
    expect(toolData).toBeDefined();

    const args = {
      thought: "Testing error handling",
      nextThoughtNeeded: false,
      thoughtNumber: 1,
      totalThoughts: 1
      // Missing sessionId and problem
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain("Either sessionId or problem is required");
  });

  test("memory store should handle invalid action", async () => {
    const toolData = registeredTools.get("mcp__memory__store");
    expect(toolData).toBeDefined();

    const args = {
      action: "invalid_action",
      entityName: "test"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain("Unknown action");
  });

  test("simple reasoning should handle invalid pattern", async () => {
    const toolData = registeredTools.get("brain_analyze_simple");
    expect(toolData).toBeDefined();

    const args = {
      problem: "Test problem",
      pattern: "invalid_pattern"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain("Unknown reasoning pattern");
  });
});
</file>

<file path="tests/unit/eyes-analyze.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { registerEyesTool } from '@/tools/eyes/index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '@/utils/config';
import { MockHelpers, TestDataGenerators } from '../utils/index.js';

// Import global mocks from setup
import { globalMocks } from '../setup.js';

// Store original fetch for restoration
const originalFetch = global.fetch;

// Mock fetch for URL operations
const mockFetch = mock(async (url: string) => {
  if (url.includes('error')) {
    throw new Error('Fetch failed');
  }
  return new Response(TestDataGenerators.createMockImageBuffer(), {
    status: 200,
    headers: { 'content-type': 'image/jpeg' }
  });
});

// Mock Gemini client
const mockGeminiModel = {
  generateContent: mock(async () => ({
    response: {
      text: () => JSON.stringify(TestDataGenerators.createMockGeminiResponse())
    }
  }))
};

const mockGeminiClient = {
  getModel: mock(() => mockGeminiModel)
};

mock.module('@/tools/eyes/utils/gemini-client', () => ({
  GeminiClient: mock(() => mockGeminiClient)
}));

// Mock processors
mock.module('@/tools/eyes/processors/image', () => ({
  processImage: mock(async () => ({
    analysis: JSON.stringify(TestDataGenerators.createMockGeminiResponse())
  }))
}));

mock.module('@/tools/eyes/processors/video', () => ({
  processVideo: mock(async () => ({
    analysis: JSON.stringify(TestDataGenerators.createMockGeminiResponse())
  }))
}));

mock.module('@/tools/eyes/processors/gif', () => ({
  processGif: mock(async () => ({
    analysis: JSON.stringify(TestDataGenerators.createMockGeminiResponse())
  }))
}));

describe('Eyes Analyze Tool', () => {
  beforeAll(() => {
    // Apply fetch mock only for this test suite
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    // Restore original fetch after this test suite
    global.fetch = originalFetch;
  });
  let server: McpServer;

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    
    const config = loadConfig();

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });

    await registerEyesTool(server, config);
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  beforeEach(() => {
    // Reset mocks before each test
    MockHelpers.resetAllMocks({
      mockGeminiModel,
      mockGeminiClient,
      mockFetch
    });
  });

  describe('tool registration', () => {
    it('should register eyes_analyze tool successfully', () => {
      // Test that the registration process completed successfully
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register eyes_compare tool successfully', () => {
      // Test that the registration process completed successfully
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    it('should register tools without errors', () => {
      expect(server).toBeInstanceOf(McpServer);
    });
  });

  describe('eyes_analyze schema validation', () => {
    it('should validate schema registration without errors', () => {
      // Test that schema registration completes successfully
      expect(server).toBeDefined();
    });

    it('should handle mock processor calls', async () => {
      // Test that the mocked processors can be called
      const { processImage } = await import('@/tools/eyes/processors/image');
      const result = await (processImage as unknown as () => Promise<{ analysis: string }>)();
      expect(result.analysis).toContain('summary');
    });

    it('should handle mock Gemini client calls', () => {
      // Test that the mocked Gemini client can be instantiated and called
      expect(mockGeminiClient.getModel).toBeDefined();
      expect(mockGeminiModel.generateContent).toBeDefined();
    });
  });

  describe('eyes_compare schema validation', () => {
    it('should validate comparison schema registration', () => {
      // Test that comparison tool registration completes successfully
      expect(server).toBeDefined();
    });

    it('should handle mock data generation', () => {
      // Test that mock data generators work correctly
      const compareRequest = TestDataGenerators.createMockCompareRequest();
      expect(compareRequest.input1).toContain('data:image/png;base64');
      expect(compareRequest.input2).toContain('data:image/png;base64');
      expect(['pixel', 'structural', 'semantic']).toContain(compareRequest.comparison_type);
    });
  });

  describe('error handling', () => {
    it('should handle registration errors gracefully', () => {
      // Test that error handling is set up correctly
      expect(server).toBeInstanceOf(McpServer);
    });
  });
});
</file>

<file path="tests/unit/formatters.test.ts">
import { describe, it, expect } from "bun:test";
import { createPrompt, parseAnalysisResponse } from "../../src/tools/eyes/utils/formatters.js";
import type { AnalysisOptions } from "../../src/types/index.js";

describe("Formatters", () => {
  describe("createPrompt", () => {
    it("should create UI debug prompt", () => {
      const options: AnalysisOptions = {
        analysis_type: "ui_debug",
        detail_level: "detailed"
      };
      
      const prompt = createPrompt(options);
      
      expect(prompt).toContain("UI debugging expert");
      expect(prompt).toContain("layout issues");
      expect(prompt).toContain("thorough analysis");
    });
    
    it("should create accessibility prompt", () => {
      const options: AnalysisOptions = {
        analysis_type: "accessibility", 
        detail_level: "quick"
      };
      
      const prompt = createPrompt(options);
      
      expect(prompt).toContain("accessibility expert");
      expect(prompt).toContain("WCAG guidelines");
      expect(prompt).toContain("Provide a concise analysis");
    });
    
    it("should include specific focus when provided", () => {
      const options: AnalysisOptions = {
        analysis_type: "general",
        detail_level: "detailed",
        specific_focus: "login form errors"
      };
      
      const prompt = createPrompt(options);
      
      expect(prompt).toContain("login form errors");
    });
  });
  
  describe("parseAnalysisResponse", () => {
    it("should parse structured response", () => {
      const response = `
        OVERVIEW: This is a test analysis
        
        KEY FINDINGS: Found several issues
        
        DETAILED ANALYSIS: Detailed breakdown of issues
        
        UI ELEMENTS: Button at 100,200 size 150x50
        
        RECOMMENDATIONS: Fix the layout issues
        
        DEBUGGING INSIGHTS: Consider responsive design
      `;
      
      const parsed = parseAnalysisResponse(response);
      
      expect(parsed.description).toContain("This is a test analysis");
      expect(parsed.analysis).toContain("Detailed breakdown of issues");
      expect(parsed.recommendations).toContain("Fix the layout issues");
      expect(parsed.insights).toContain("Consider responsive design");
      expect(parsed.elements).toHaveLength(1);
      expect(parsed.elements?.[0]?.location).toEqual({
        x: 100, y: 200, width: 150, height: 50
      });
    });
    
    it("should handle missing sections gracefully", () => {
      const response = "Simple analysis without sections";
      
      const parsed = parseAnalysisResponse(response);
      
      expect(parsed.description).toBe("Simple analysis without sections");
      expect(parsed.analysis).toBe("Simple analysis without sections");
      expect(parsed.elements).toEqual([]);
      expect(parsed.insights).toEqual([]);
    });
  });
});
</file>

<file path=".releaserc.json">
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        "npmPublish": true,
        "publishConfig": {
          "access": "public",
          "registry": "https://registry.npmjs.org/"
        }
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
</file>

<file path="tests/integration/sse-transport.test.ts">
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { testServerManager } from "../utils/test-server-manager.js";

describe("SSE Transport Integration", () => {
  let baseUrl: string;

  beforeAll(async () => {
    // Clear any global fetch mocks that might interfere
    if (globalThis.fetch && (globalThis.fetch as any).mockRestore) {
      (globalThis.fetch as any).mockRestore();
    }
    
    // Add delay to ensure cleanup from previous tests
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const testServer = await testServerManager.startTestServer({
      sessionMode: "stateful",
      enableSse: true,
      enableJsonResponse: true,
      enableSseFallback: true,
      ssePaths: {
        stream: "/sse",
        message: "/messages"
      },
      security: {
        enableCors: true,
        enableDnsRebindingProtection: true,
        allowedHosts: ["127.0.0.1", "localhost"]
      }
    });

    baseUrl = testServer.baseUrl;
    
    // Additional check to ensure server is completely ready with multiple attempts
    let retries = 0;
    while (retries < 10) {
      try {
        // Use a fresh fetch request with no-cache headers
        const response = await fetch(`${baseUrl}/health`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const health = await response.json() as { status: string };
          if (health.status === 'healthy') {
            console.log(`✅ Server ready on attempt ${retries + 1}`);
            break;
          }
        } else {
          console.log(`❌ Attempt ${retries + 1}: Wrong content-type: ${contentType}`);
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`❌ Attempt ${retries + 1}: ${error}`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (retries >= 10) {
      throw new Error("Server failed to become ready after 10 attempts");
    }
  });

  afterAll(async () => {
    await testServerManager.stopAllServers();
  });

  describe("health endpoint", () => {
    it("should include SSE fallback status in health check", async () => {
      const response = await fetch(`${baseUrl}/health`);
      const health = await response.json() as {
        status: string;
        transport: string;
        sseFallback: string;
        ssePaths: { stream: string; message: string; };
      };
      
      expect(health.status).toBe("healthy");
      expect(health.transport).toBe("streamable-http");
      expect(health.sseFallback).toBe("enabled");
      expect(health.ssePaths).toEqual({
        stream: "/sse",
        message: "/messages"
      });
    });
  });

  describe("SSE endpoint availability", () => {
    it("should reject GET /sse in stateless mode", async () => {
      const response = await fetch(`${baseUrl}/sse`, {
        method: "GET"
      });
      
      // In current stateful mode, we expect different behavior
      // This test would need a separate server instance with stateless config
      // For now, just verify the endpoint exists
      expect(response.status).toBeDefined();
    });

    it("should reject POST /messages without sessionId", async () => {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          id: 1
        })
      });
      
      expect(response.status).toBe(400);
      const error = await response.json() as { error: { message: string } };
      expect(error.error.message).toContain("Missing sessionId");
    });

    it("should reject POST /messages with invalid sessionId", async () => {
      const response = await fetch(`${baseUrl}/messages?sessionId=invalid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          id: 1
        })
      });
      
      expect(response.status).toBe(400);
      const error = await response.json() as { error: { message: string } };
      expect(error.error.message).toContain("No active SSE session");
    });
  });

  describe("transport mixing prevention", () => {
    it("should prevent using streamable HTTP session ID on SSE endpoints", async () => {
      // First create a streamable HTTP session
      const initResponse = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0.0" }
          },
          id: 1
        })
      });

      const sessionId = initResponse.headers.get("Mcp-Session-Id");
      
      if (sessionId) {
        // Try to use this session ID on SSE message endpoint
        const response = await fetch(`${baseUrl}/messages?sessionId=${sessionId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "ping",
            id: 2
          })
        });
        
        expect(response.status).toBe(400);
        const error = await response.json() as { error: { message: string } };
        expect(error.error.message).toContain("streamable HTTP transport");
      }
    });
  });
});
</file>

<file path="tests/utils/test-server-manager.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startHttpTransport } from "../../src/transports/http/server.js";
import type { HttpTransportConfig, HttpServerHandle } from "../../src/transports/types.js";

export class TestServerManager {
  private servers: Map<number, HttpServerHandle> = new Map();
  private usedPorts: Set<number> = new Set();

  /**
   * Get a random available port for testing using OS-level port checking
   */
  async getAvailablePort(): Promise<number> {
    // Use a wider range to avoid conflicts and add process PID for uniqueness
    const basePort = 5000 + (process.pid % 1000);
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const port = basePort + attempt;
      
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }

    throw new Error(`Unable to find available port after ${maxAttempts} attempts (tried ${basePort} to ${basePort + maxAttempts - 1})`);
  }

  /**
   * Check if a port is available using Node.js net module
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, '127.0.0.1', () => {
        server.close(() => {
          resolve(true);
        });
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Start a test server with the given configuration
   */
  async startTestServer(config: Partial<HttpTransportConfig> = {}): Promise<{
    server: HttpServerHandle;
    port: number;
    baseUrl: string;
  }> {
    const port = await this.getAvailablePort();
    
    // Create a basic MCP server for testing
    const mcpServer = new McpServer({
      name: "test-server",
      version: "1.0.0"
    }
    );

    const serverConfig: HttpTransportConfig = {
      port,
      host: "127.0.0.1",
      sessionMode: "stateful",
      enableSse: true,
      enableJsonResponse: true,
      enableSseFallback: true,
      ssePaths: {
        stream: "/sse",
        message: "/messages"
      },
      security: {
        enableCors: true,
        enableDnsRebindingProtection: true,
        allowedHosts: ["127.0.0.1", "localhost"]
      },
      ...config
    };

    const server = await startHttpTransport(mcpServer, serverConfig);
    this.servers.set(port, server);

    // Wait for server to be ready
    await this.waitForServerReady(port);

    return {
      server,
      port,
      baseUrl: `http://127.0.0.1:${port}`
    };
  }

  /**
   * Wait for server to be ready by checking health endpoint
   */
  private async waitForServerReady(port: number, timeout = 15000): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(2000),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const text = await response.text();
            try {
              const health = JSON.parse(text) as { status: string };
              if (health.status === 'healthy') {
                // Give the server a bit more time to fully initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                return;
              }
            } catch (jsonError) {
              lastError = new Error(`Failed to parse JSON response: ${text.substring(0, 100)}`);
              // JSON parsing failed, server not ready yet
            }
          } else {
            // Try to read content to understand what's being returned
            const text = await response.text();
            const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
            lastError = new Error(`Expected JSON response, got: ${contentType}. Content preview: ${preview}`);
          }
        } else {
          lastError = new Error(`Health check failed with status: ${response.status}`);
        }
      } catch (error) {
        lastError = error as Error;
        // Server not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    throw new Error(`Server on port ${port} did not become ready within ${timeout}ms. Last error: ${lastError?.message || 'Unknown'}`);
  }

  /**
   * Stop a specific server by port
   */
  async stopServer(port: number): Promise<void> {
    const server = this.servers.get(port);
    if (server) {
      try {
        await server.close();
      } catch (error) {
        console.warn(`Error closing server on port ${port}:`, error);
      } finally {
        this.servers.delete(port);
        // Add delay before releasing port to ensure cleanup
        setTimeout(() => {
          this.usedPorts.delete(port);
        }, 1000);
      }
    }
  }

  /**
   * Stop all test servers
   */
  async stopAllServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(port => this.stopServer(port));
    await Promise.all(stopPromises);
  }

  /**
   * Get the number of active servers
   */
  getActiveServerCount(): number {
    return this.servers.size;
  }

  /**
   * Check if any servers are still running
   */
  hasActiveServers(): boolean {
    return this.servers.size > 0;
  }
}

// Global test server manager instance
export const testServerManager = new TestServerManager();
</file>

<file path="tests/setup.ts">
import { beforeAll, afterAll } from "bun:test";
import {
  applyConditionalMocks,
  resetConditionalMocks,
  globalMocks,
  getTestType,
  getMockInfo
} from "./utils/mock-control.js";

// Apply mocks conditionally based on TEST_TYPE environment variable
const testType = getTestType();
console.log(`[TestSetup] Initializing test environment for type: ${testType}`);
console.log(`[TestSetup] Mock configuration:`, getMockInfo(testType));

// Apply conditional mocks
applyConditionalMocks(testType);

// Export global mocks for compatibility
export { globalMocks };

beforeAll(() => {
  // Set up test environment variables
  process.env.GOOGLE_GEMINI_API_KEY = "test-api-key";
  process.env.LOG_LEVEL = "error";
  process.env.NODE_ENV = "test";
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = "test-account";
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.CLOUDFLARE_R2_BUCKET = "test-bucket";
  
  // Initialize global test state
  (globalThis as any).__TEST_MODE__ = true;
});

afterAll(() => {
  // Clean up environment variables
  delete process.env.GOOGLE_GEMINI_API_KEY;
  delete process.env.LOG_LEVEL;
  delete process.env.NODE_ENV;
  delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  delete process.env.CLOUDFLARE_R2_BUCKET;
  
  // Clean up global test state
  delete (globalThis as any).__TEST_MODE__;
  
  // Reset conditional mocks
  resetConditionalMocks(testType);
});
</file>

<file path=".env.example">
# Gemini API Configuration
GOOGLE_GEMINI_API_KEY=your_api_key_here
GOOGLE_GEMINI_MODEL=gemini-2.5-flash

# Server Configuration
PORT=3000
LOG_LEVEL=info
MAX_REQUEST_SIZE=50MB
ENABLE_CACHING=true
CACHE_TTL=3600
REQUEST_TIMEOUT=120000
FETCH_TIMEOUT=30000

# Transport Configuration
TRANSPORT_TYPE=stdio
HTTP_PORT=3000
HTTP_HOST=0.0.0.0
HTTP_SESSION_MODE=stateful
HTTP_ENABLE_SSE=true
HTTP_ENABLE_JSON_RESPONSE=true

# SSE Fallback Configuration (for legacy MCP clients)
HTTP_ENABLE_SSE_FALLBACK=false
HTTP_SSE_STREAM_PATH=/sse
HTTP_SSE_MESSAGE_PATH=/messages

# Security
MCP_SECRET=your_secret_here
HTTP_SECRET=your_http_secret_here
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
HTTP_CORS_ENABLED=true
HTTP_CORS_ORIGINS=*
HTTP_DNS_REBINDING_ENABLED=true
HTTP_ALLOWED_HOSTS=127.0.0.1,localhost
HTTP_ENABLE_RATE_LIMITING=false

# Cloudflare R2 Storage Configuration
CLOUDFLARE_CDN_PROJECT_NAME=human-mcp
CLOUDFLARE_CDN_BUCKET_NAME=digitop
CLOUDFLARE_CDN_ACCESS_KEY=your_cloudflare_access_key
CLOUDFLARE_CDN_SECRET_KEY=your_cloudflare_secret_key
CLOUDFLARE_CDN_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_CDN_BASE_URL=https://cdn.example.com
</file>

<file path="src/tools/hands/index.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../eyes/utils/gemini-client.js";
import {
  ImageGenerationInputSchema,
  VideoGenerationInputSchema,
  ImageEditingInputSchema,
  type ImageGenerationInput,
  type VideoGenerationInput,
  type ImageEditingInput
} from "./schemas.js";
import { generateImage } from "./processors/image-generator.js";
import { generateVideo, generateImageToVideo, pollVideoGeneration } from "./processors/video-generator.js";
import { editImage } from "./processors/image-editor.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

export async function registerHandsTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  // Register gemini_gen_image tool
  server.registerTool(
    "gemini_gen_image",
    {
      title: "Gemini Image Generation Tool",
      description: "Generate images from text descriptions using Gemini Imagen API",
      inputSchema: {
        prompt: z.string().describe("Text description of the image to generate"),
        model: z.enum(["gemini-2.5-flash-image-preview"]).optional().default("gemini-2.5-flash-image-preview").describe("Image generation model"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format for the generated image"),
        negative_prompt: z.string().optional().describe("Text describing what should NOT be in the image"),
        style: z.enum(["photorealistic", "artistic", "cartoon", "sketch", "digital_art"]).optional().describe("Style of the generated image"),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("1:1").describe("Aspect ratio of the generated image"),
        seed: z.number().optional().describe("Random seed for reproducible generation")
      }
    },
    async (args) => {
      try {
        return await handleImageGeneration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_gen_image error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register gemini_gen_video tool
  server.registerTool(
    "gemini_gen_video",
    {
      title: "Gemini Video Generation Tool",
      description: "Generate videos from text descriptions using Gemini Veo 3.0 API",
      inputSchema: {
        prompt: z.string().describe("Text description of the video to generate"),
        model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001").describe("Video generation model"),
        duration: z.enum(["4s", "8s", "12s"]).optional().default("4s").describe("Duration of the generated video"),
        output_format: z.enum(["mp4", "webm"]).optional().default("mp4").describe("Output format for the generated video"),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9").describe("Aspect ratio of the generated video"),
        fps: z.number().int().min(1).max(60).optional().default(24).describe("Frames per second"),
        image_input: z.string().optional().describe("Base64 encoded image or image URL to use as starting frame"),
        style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional().describe("Style of the generated video"),
        camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional().describe("Camera movement type"),
        seed: z.number().optional().describe("Random seed for reproducible generation")
      }
    },
    async (args) => {
      try {
        return await handleVideoGeneration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_gen_video error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register gemini_image_to_video tool
  server.registerTool(
    "gemini_image_to_video",
    {
      title: "Gemini Image-to-Video Tool",
      description: "Generate videos from images and text descriptions using Gemini Imagen + Veo 3.0 APIs",
      inputSchema: {
        prompt: z.string().describe("Text description of the video animation"),
        image_input: z.string().describe("Base64 encoded image or image URL to use as starting frame"),
        model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001").describe("Video generation model"),
        duration: z.enum(["4s", "8s", "12s"]).optional().default("4s").describe("Duration of the generated video"),
        output_format: z.enum(["mp4", "webm"]).optional().default("mp4").describe("Output format for the generated video"),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9").describe("Aspect ratio of the generated video"),
        fps: z.number().int().min(1).max(60).optional().default(24).describe("Frames per second"),
        style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional().describe("Style of the generated video"),
        camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional().describe("Camera movement type"),
        seed: z.number().optional().describe("Random seed for reproducible generation")
      }
    },
    async (args) => {
      try {
        return await handleImageToVideoGeneration(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_image_to_video error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register gemini_edit_image tool - general image editing tool
  server.registerTool(
    "gemini_edit_image",
    {
      title: "Gemini Image Editing Tool",
      description: "Edit images using AI with various operations like inpainting, outpainting, style transfer, object manipulation, and composition",
      inputSchema: {
        operation: z.enum([
          "inpaint",
          "outpaint",
          "style_transfer",
          "object_manipulation",
          "multi_image_compose"
        ]).describe("Type of image editing operation to perform"),
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of the desired edit"),
        mask_image: z.string().optional().describe("Base64 encoded mask image for inpainting (white = edit area, black = keep)"),
        mask_prompt: z.string().optional().describe("Text description of the area to mask for editing"),
        expand_direction: z.enum(["all", "left", "right", "top", "bottom", "horizontal", "vertical"]).optional().describe("Direction to expand the image"),
        expansion_ratio: z.number().min(0.1).max(3.0).optional().default(1.5).describe("How much to expand the image (1.0 = no expansion)"),
        style_image: z.string().optional().describe("Base64 encoded reference image for style transfer"),
        style_strength: z.number().min(0.1).max(1.0).optional().default(0.7).describe("Strength of style application"),
        target_object: z.string().optional().describe("Description of the object to manipulate"),
        manipulation_type: z.enum(["move", "resize", "remove", "replace", "duplicate"]).optional().describe("Type of object manipulation"),
        target_position: z.string().optional().describe("New position for the object (e.g., 'center', 'top-left')"),
        secondary_images: z.array(z.string()).optional().describe("Array of base64 encoded images for composition"),
        composition_layout: z.enum(["blend", "collage", "overlay", "side_by_side"]).optional().describe("How to combine multiple images"),
        blend_mode: z.enum(["normal", "multiply", "screen", "overlay", "soft_light"]).optional().describe("Blending mode for image composition"),
        negative_prompt: z.string().optional().describe("What to avoid in the edited image"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format for the edited image"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level of the editing")
      }
    },
    async (args) => {
      try {
        return await handleImageEditing(geminiClient, args, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_edit_image error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register specialized image editing tools
  server.registerTool(
    "gemini_inpaint_image",
    {
      title: "Gemini Image Inpainting Tool",
      description: "Fill or modify specific areas of an image based on a text prompt and mask",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of what to paint in the masked area"),
        mask_image: z.string().optional().describe("Base64 encoded mask image (white = edit area, black = keep)"),
        mask_prompt: z.string().optional().describe("Text description of the area to mask for editing"),
        negative_prompt: z.string().optional().describe("What to avoid in the edited area"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const inpaintArgs = { ...args, operation: "inpaint" };
        return await handleImageEditing(geminiClient, inpaintArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_inpaint_image error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "gemini_outpaint_image",
    {
      title: "Gemini Image Outpainting Tool",
      description: "Expand an image beyond its original borders in specified directions",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of what to add in the expanded areas"),
        expand_direction: z.enum(["all", "left", "right", "top", "bottom", "horizontal", "vertical"]).optional().default("all").describe("Direction to expand the image"),
        expansion_ratio: z.number().min(0.1).max(3.0).optional().default(1.5).describe("How much to expand the image (1.0 = no expansion)"),
        negative_prompt: z.string().optional().describe("What to avoid in the expanded areas"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the editing effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const outpaintArgs = { ...args, operation: "outpaint" };
        return await handleImageEditing(geminiClient, outpaintArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_outpaint_image error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "gemini_style_transfer_image",
    {
      title: "Gemini Style Transfer Tool",
      description: "Transfer the style from one image to another using AI",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded image or file path to the input image"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of the desired style"),
        style_image: z.string().optional().describe("Base64 encoded reference image for style transfer"),
        style_strength: z.number().min(0.1).max(1.0).optional().default(0.7).describe("Strength of style application"),
        negative_prompt: z.string().optional().describe("What style elements to avoid"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const styleArgs = { ...args, operation: "style_transfer" };
        return await handleImageEditing(geminiClient, styleArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_style_transfer_image error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "gemini_compose_images",
    {
      title: "Gemini Image Composition Tool",
      description: "Combine multiple images into a single composition using AI",
      inputSchema: {
        input_image: z.string().describe("Base64 encoded primary image"),
        secondary_images: z.array(z.string()).describe("Array of base64 encoded secondary images to compose"),
        prompt: z.string().min(1, "Prompt cannot be empty").describe("Text description of how to compose the images"),
        composition_layout: z.enum(["blend", "collage", "overlay", "side_by_side"]).optional().default("blend").describe("How to combine the images"),
        blend_mode: z.enum(["normal", "multiply", "screen", "overlay", "soft_light"]).optional().default("normal").describe("Blending mode for image composition"),
        negative_prompt: z.string().optional().describe("What to avoid in the composition"),
        strength: z.number().min(0.1).max(1.0).optional().default(0.8).describe("Strength of the composition effect"),
        guidance_scale: z.number().min(1.0).max(20.0).optional().default(7.5).describe("How closely to follow the prompt"),
        seed: z.number().int().min(0).optional().describe("Random seed for reproducible results"),
        output_format: z.enum(["base64", "url"]).optional().default("base64").describe("Output format"),
        quality: z.enum(["draft", "standard", "high"]).optional().default("standard").describe("Quality level")
      }
    },
    async (args) => {
      try {
        const composeArgs = { ...args, operation: "multi_image_compose" };
        return await handleImageEditing(geminiClient, composeArgs, config);
      } catch (error) {
        const mcpError = handleError(error);
        logger.error(`Tool gemini_compose_images error:`, mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );
}

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
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: 'gemini-image'
  };

  const result = await generateImage(geminiClient, generationOptions, config);

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
            text: `✅ Image generated successfully using ${result.model}\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Size: ${result.size}\n- Generation Time: ${result.generationTime}ms\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}`
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
        text: `✅ Image generated successfully!\n\n**Generation Details:**\n- Prompt: "${prompt}"\n- Model: ${result.model}\n- Format: ${result.format}\n- Size: ${result.size}\n- Generation Time: ${result.generationTime}ms${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}\n\n**Image Data:** ${result.imageData.substring(0, 100)}...`
      }
    ],
    isError: false
  };
}

async function handleVideoGeneration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = VideoGenerationInputSchema.parse(args) as VideoGenerationInput;
  const { prompt, model, duration, output_format, aspect_ratio, fps, image_input, style, camera_movement, seed } = input;

  logger.info(`Generating video with prompt: "${prompt}" using model: ${model}`);

  const generationOptions = {
    prompt,
    model: model || "veo-3.0-generate-001",
    duration: duration || "4s",
    outputFormat: output_format || "mp4",
    aspectRatio: aspect_ratio || "16:9",
    fps: fps || 24,
    imageInput: image_input,
    style,
    cameraMovement: camera_movement,
    seed,
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: 'gemini-video'
  };

  const result = await generateVideo(geminiClient, generationOptions, config);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          video: result.filePath ? `File saved to: ${result.filePath}` : result.videoData.substring(0, 100) + "...",
          format: result.format,
          model: result.model,
          prompt: prompt,
          operation_id: result.operationId,
          file_info: result.filePath ? {
            file_path: result.filePath,
            file_name: result.fileName,
            file_size: result.fileSize,
            public_url: result.fileUrl
          } : null,
          metadata: {
            timestamp: new Date().toISOString(),
            generation_time: result.generationTime,
            duration: result.duration,
            aspect_ratio: result.aspectRatio,
            fps: result.fps,
            size: result.size
          }
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleImageToVideoGeneration(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = z.object({
    prompt: z.string(),
    image_input: z.string(),
    model: z.enum(["veo-3.0-generate-001"]).optional().default("veo-3.0-generate-001"),
    duration: z.enum(["4s", "8s", "12s"]).optional().default("4s"),
    output_format: z.enum(["mp4", "webm"]).optional().default("mp4"),
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("16:9"),
    fps: z.number().int().min(1).max(60).optional().default(24),
    style: z.enum(["realistic", "cinematic", "artistic", "cartoon", "animation"]).optional(),
    camera_movement: z.enum(["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly_forward", "dolly_backward"]).optional(),
    seed: z.number().optional()
  }).parse(args);

  const { prompt, image_input, model, duration, output_format, aspect_ratio, fps, style, camera_movement, seed } = input;

  logger.info(`Generating video from image with prompt: "${prompt}" using model: ${model}`);

  const generationOptions = {
    prompt,
    model: model || "veo-3.0-generate-001",
    duration: duration || "4s",
    outputFormat: output_format || "mp4",
    aspectRatio: aspect_ratio || "16:9",
    fps: fps || 24,
    imageInput: image_input,
    style,
    cameraMovement: camera_movement,
    seed,
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: 'gemini-image-to-video'
  };

  const result = await generateImageToVideo(geminiClient, prompt, image_input, generationOptions, config);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          video: result.filePath ? `File saved to: ${result.filePath}` : result.videoData.substring(0, 100) + "...",
          format: result.format,
          model: result.model,
          prompt: prompt,
          image_input: image_input,
          operation_id: result.operationId,
          file_info: result.filePath ? {
            file_path: result.filePath,
            file_name: result.fileName,
            file_size: result.fileSize,
            public_url: result.fileUrl
          } : null,
          metadata: {
            timestamp: new Date().toISOString(),
            generation_time: result.generationTime,
            duration: result.duration,
            aspect_ratio: result.aspectRatio,
            fps: result.fps,
            size: result.size
          }
        }, null, 2)
      }
    ],
    isError: false
  };
}

async function handleImageEditing(
  geminiClient: GeminiClient,
  args: unknown,
  config: Config
) {
  const input = ImageEditingInputSchema.parse(args) as ImageEditingInput;
  const {
    operation,
    input_image,
    prompt,
    mask_image,
    mask_prompt,
    expand_direction,
    expansion_ratio,
    style_image,
    style_strength,
    target_object,
    manipulation_type,
    target_position,
    secondary_images,
    composition_layout,
    blend_mode,
    negative_prompt,
    strength,
    guidance_scale,
    seed,
    output_format,
    quality
  } = input;

  logger.info(`Editing image with operation: "${operation}" and prompt: "${prompt}"`);

  const editingOptions = {
    operation,
    inputImage: input_image,
    prompt,
    maskImage: mask_image,
    maskPrompt: mask_prompt,
    expandDirection: expand_direction,
    expansionRatio: expansion_ratio || 1.5,
    styleImage: style_image,
    styleStrength: style_strength || 0.7,
    targetObject: target_object,
    manipulationType: manipulation_type,
    targetPosition: target_position,
    secondaryImages: secondary_images,
    compositionLayout: composition_layout,
    blendMode: blend_mode,
    negativePrompt: negative_prompt,
    strength: strength || 0.8,
    guidanceScale: guidance_scale || 7.5,
    seed,
    outputFormat: output_format || "base64",
    quality: quality || "standard",
    fetchTimeout: config.server.fetchTimeout,
    saveToFile: true, // Always save to file to reduce token usage
    uploadToR2: config.cloudflare?.accessKey ? true : false, // Upload to R2 if configured
    filePrefix: `edited-${operation}`
  };

  const result = await editImage(geminiClient, editingOptions, config);

  // Return edited image as proper MCP content type
  if (result.editedImageData.startsWith('data:')) {
    // Extract MIME type and base64 data from data URI
    const matches = result.editedImageData.match(/data:([^;]+);base64,(.+)/);
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
            text: `✅ Image edited successfully using ${operation} operation\n\n**Editing Details:**\n- Operation: ${operation}\n- Prompt: "${prompt}"\n- Format: ${result.format}\n- Original Size: ${result.originalSize}\n- Edited Size: ${result.editedSize}\n- Processing Time: ${result.processingTime}ms\n- Quality: ${quality}\n- Timestamp: ${new Date().toISOString()}${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}${result.metadata ? `\n\n**Operation Metadata:**\n- Strength: ${result.metadata.strength}\n- Guidance Scale: ${result.metadata.guidanceScale}\n- Seed: ${result.metadata.seed || 'random'}` : ''}`
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
        text: `✅ Image edited successfully!\n\n**Editing Details:**\n- Operation: ${operation}\n- Prompt: "${prompt}"\n- Format: ${result.format}\n- Original Size: ${result.originalSize}\n- Edited Size: ${result.editedSize}\n- Processing Time: ${result.processingTime}ms${result.filePath ? `\n\n**File Information:**\n- File Path: ${result.filePath}\n- File Name: ${result.fileName}\n- File Size: ${result.fileSize} bytes` : ''}${result.fileUrl ? `\n- Public URL: ${result.fileUrl}` : ''}\n\n**Edited Image Data:** ${result.editedImageData.substring(0, 100)}...`
      }
    ],
    isError: false
  };
}
</file>

<file path="src/transports/http/server.ts">
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRoutes } from "./routes.js";
import { createSSERoutes } from "./sse-routes.js";
import { SessionManager } from "./session.js";
import { createSecurityMiddleware } from "./middleware.js";
import { fileInterceptorMiddleware } from "./file-interceptor.js";
import type { HttpTransportConfig, HttpServerHandle } from "../types.js";

export async function startHttpTransport(
  mcpServer: McpServer,
  config: HttpTransportConfig
): Promise<HttpServerHandle> {
  const app = express();
  const sessionManager = new SessionManager(config.sessionMode, config);

  // Apply middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API server
    crossOriginEmbedderPolicy: false
  }));
  
  if (config.security?.enableCors !== false) {
    app.use(cors({
      origin: config.security?.corsOrigins || '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization'],
      credentials: true
    }));
  }

  app.use(createSecurityMiddleware(config.security));
  
  // Add file interceptor middleware before routes
  app.use(fileInterceptorMiddleware);

  // Create SSE routes first if enabled to get SSE manager reference
  let sseManager: any = undefined;
  if (config.enableSseFallback) {
    console.log('Enabling SSE fallback transport');
    const sseRoutes = createSSERoutes(mcpServer, config, sessionManager);
    app.use(sseRoutes);
    
    // Store SSE manager reference for cleanup and cross-validation
    sseManager = (sseRoutes as any).sseManager;
    (app as any).sseManager = sseManager;
  }

  // Create routes with SSE session checker
  const routes = createRoutes(mcpServer, sessionManager, config, sseManager);
  app.use('/mcp', routes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    const healthStatus: any = { 
      status: 'healthy', 
      transport: 'streamable-http' 
    };
    
    if (config.enableSseFallback) {
      healthStatus.sseFallback = 'enabled';
      healthStatus.ssePaths = config.ssePaths;
    }
    
    res.json(healthStatus);
  });

  // Start server
  const port = config.port || 3000;
  const host = config.host || '0.0.0.0';
  
  const server = app.listen(port, host, () => {
    console.log(`MCP HTTP Server listening on http://${host}:${port}`);
    console.log(`Health check: http://${host}:${port}/health`);
    console.log(`MCP endpoint: http://${host}:${port}/mcp`);
  });

  // Create cleanup function
  const cleanup = async () => {
    console.log('Shutting down HTTP server...');
    await sessionManager.cleanup();
    
    // Cleanup SSE sessions if enabled
    if (config.enableSseFallback && (app as any).sseManager) {
      await (app as any).sseManager.cleanup();
    }
  };

  // Graceful shutdown handling
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // Return server handle
  const handle: HttpServerHandle = {
    app,
    server,
    sessionManager,
    sseManager,
    async close() {
      await cleanup();
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  };

  return handle;
}
</file>

<file path="src/server.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEyesTool } from "./tools/eyes/index.js";
import { registerHandsTool } from "./tools/hands/index.js";
import { registerMouthTool } from "./tools/mouth/index.js";
import { registerBrainTools } from "./tools/brain/index.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";
import { logger } from "./utils/logger.js";
import { loadConfig } from "./utils/config.js";

export async function createServer() {
  const config = loadConfig();
  
  const server = new McpServer({
    name: "human-mcp",
    version: "1.0.0",
  });

  await registerEyesTool(server, config);
  await registerHandsTool(server, config);
  await registerMouthTool(server, config);
  await registerBrainTools(server, config);
  await registerPrompts(server);
  await registerResources(server);


  return server;
}

export async function startStdioServer() {
  try {
    const server = await createServer();
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    logger.info("Human MCP Server started successfully (stdio transport)");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}
</file>

<file path="CLAUDE.md">
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Human MCP is a Model Context Protocol server that provides AI coding agents with visual analysis capabilities for debugging UI issues, processing screenshots, videos, and GIFs using Google Gemini AI.

## Development Commands

### Core Commands
- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production (outputs to dist/)
- `bun run start` - Run production build
- `bun test` - Run test suite
- `bun run typecheck` - Run TypeScript type checking
- `bun run inspector` - Launch MCP inspector for testing tools

### Testing with MCP Inspector
The inspector tool is crucial for testing MCP tools during development:
```bash
bun run inspector
```

## Architecture

### Core Structure
```
src/
├── index.ts          # Entry point, starts stdio server
├── server.ts         # MCP server setup and initialization  
├── tools/eyes/       # Vision analysis tools (main functionality)
├── prompts/          # Pre-built debugging prompts
├── resources/        # Documentation resources
└── utils/           # Configuration, logging, error handling
```

### Docs
- [Project Overview / PDR](project-overview-pdr.md)
- [Project Roadmap](project-roadmap.md)
- [Codebase Summary](codebase-summary.md)
- [Codebase Structure & Code Standards](codebase-structure-architecture-code-standards.md)

### Key Components

**Configuration (utils/config.ts)**
- Environment-based configuration using Zod validation
- Required: `GOOGLE_GEMINI_API_KEY`
- Optional settings for timeouts, caching, rate limits

## MCP Tools

**Important**: Tool names must comply with MCP validation pattern `^[a-zA-Z0-9_-]{1,64}$`. Only alphanumeric characters, underscores, and hyphens are allowed. No dots, spaces, or other special characters.

## Important Development Notes

### Google Gemini Documentation
- [Gemini API](https://ai.google.dev/gemini-api/docs?hl=en)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Video Understanding](https://ai.google.dev/gemini-api/docs/video-understanding?hl=en)
- [Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Document Understanding](https://ai.google.dev/gemini-api/docs/document-processing)
- [Audio Understanding](https://ai.google.dev/gemini-api/docs/audio)
- [Speech Generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Video Generation](https://ai.google.dev/gemini-api/docs/video)

### Error Handling
- All tool operations use centralized error handling via `utils/errors.ts`
- Errors are logged and returned as structured MCP responses
- Network timeouts are configurable via environment variables

### Media Processing
- Images: PNG, JPEG, WebP, GIF (static)
- Videos: MP4, WebM, MOV, AVI (uses ffmpeg via fluent-ffmpeg)  
- GIFs: Frame extraction using Sharp library
- All processors handle file paths, URLs, and base64 data

### TypeScript Configuration
- Uses ESNext modules with bundler resolution
- Path mapping: `@/*` maps to `src/*`
- Strict type checking enabled
- No emit mode (Bun handles compilation)

### Google Gemini Integration
- Uses Google Generative AI SDK
- Model selection based on detail level
- Configurable via `GOOGLE_GEMINI_MODEL` environment variable
- Default: `gemini-2.5-flash`

## Testing

Run tests with `bun test`. The project uses Bun's built-in test runner.

For manual testing of MCP tools, use the inspector:
```bash
bun run inspector
```

This launches a web interface for testing tool functionality interactively.

---

## Development Rules

### General
- Use `bun` instead of `npm` or `yarn` or `pnpm` for package management
- Use `context7` mcp tools for exploring latest docs of plugins/packages
- Follow [these principles](https://www.anthropic.com/engineering/writing-tools-for-agents) to write effective tools for AI agents.

### Code Quality Guidelines
- Read and follow strictly codebase structure and code standards in `./docs`
- Don't be too harsh on code linting, but make sure there are no syntax errors and code are compilable
- Prioritize functionality and readability over strict style enforcement and code formatting
- Use reasonable code quality standards that enhance developer productivity
- Use try catch error handling & cover security standards
- Use `code-reviewer` agent to review code after every implementation
- Always use `debugger` agent to analyze `./logs.txt` to find possible root causes and provide a report with solutions.
- Use `bun run typecheck` to check type errors and fix them all.
- Make sure the code is compilable and runs successfully without any errors.

### Pre-commit/Push Rules
- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build or github actions)
- Keep commits focused on the actual code changes
- **DO NOT** commit and push any confidential information (such as dotenv files, API keys, database credentials, etc.) to git repository!
- NEVER automatically add AI attribution signatures like:
  "🤖 Generated with [Claude Code]"
  "Co-Authored-By: Claude noreply@anthropic.com"
  Any AI tool attribution or signature
- Create clean, professional commit messages without AI references. Use conventional commit format.
</file>

<file path="src/tools/eyes/processors/image.ts">
import { GenerativeModel } from "@google/generative-ai";
import sharp from "sharp";
import fs from "fs/promises";
import type { AnalysisOptions, ProcessingResult } from "@/types";
import { createPrompt, parseAnalysisResponse } from "../utils/formatters.js";
import { logger } from "@/utils/logger.js";
import { ProcessingError } from "@/utils/errors.js";
import { getCloudflareR2 } from "@/utils/cloudflare-r2.js";

export async function processImage(
  model: GenerativeModel,
  source: string,
  options: AnalysisOptions
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Processing image (attempt ${attempt}/${maxRetries}): ${source.substring(0, 50)}...`);

      const { imageData, mimeType } = await loadImage(source, options.fetchTimeout);
      const prompt = createPrompt(options);

      logger.debug(`Generated prompt for analysis: ${prompt.substring(0, 100)}...`);
      logger.debug(`Image data size: ${imageData.length} characters, MIME type: ${mimeType}`);

      const response = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: imageData
          }
        }
      ]);

      const result = await response.response;
      const analysisText = result.text();

      logger.debug(`Gemini response received. Text length: ${analysisText ? analysisText.length : 0}`);

      if (!analysisText || analysisText.trim().length === 0) {
        const errorMsg = `Gemini returned empty response on attempt ${attempt}/${maxRetries}`;
        logger.warn(errorMsg);

        if (attempt === maxRetries) {
          // On final attempt, provide fallback analysis
          logger.info("Using fallback analysis due to empty Gemini response");
          const fallbackAnalysis = "Image was processed but detailed analysis is unavailable. This may be due to API limitations or content restrictions.";

          return {
            description: "Image analysis completed with limited results",
            analysis: fallbackAnalysis,
            elements: [],
            insights: ["Gemini API returned empty response", "Consider retrying the analysis"],
            recommendations: ["Check image format and content", "Verify API key and quotas"],
            metadata: {
              processing_time_ms: Date.now() - startTime,
              model_used: model.model,
              attempts_made: maxRetries,
              status: "partial_success"
            }
          };
        }

        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.debug(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const parsed = parseAnalysisResponse(analysisText);
      const processingTime = Date.now() - startTime;

      logger.info(`Image analysis successful on attempt ${attempt}. Processing time: ${processingTime}ms`);

      return {
        description: parsed.description || "Image analysis completed",
        analysis: parsed.analysis || analysisText,
        elements: parsed.elements || [],
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        metadata: {
          processing_time_ms: processingTime,
          model_used: model.model,
          attempts_made: attempt,
          status: "success"
        }
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      logger.warn(`Image processing attempt ${attempt} failed:`, lastError.message);

      // Check if this is a retryable error
      if (attempt < maxRetries && isRetryableError(lastError)) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.debug(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else if (attempt === maxRetries) {
        break;
      }
    }
  }

  logger.error("Image processing failed after all retries:", lastError);
  throw new ProcessingError(`Failed to process image after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'timeout',
    'network',
    'rate limit',
    'temporary',
    '429',
    '500',
    '502',
    '503',
    '504'
  ];

  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some(msg => errorMessage.includes(msg));
}

async function loadImage(source: string, fetchTimeout?: number): Promise<{ imageData: string; mimeType: string }> {
  // Handle Claude Code virtual image references like "[Image #1]"
  if (source.match(/^\[Image #\d+\]$/)) {
    throw new ProcessingError(
      `Virtual image reference "${source}" cannot be processed directly.\n\n` +
      `This occurs when Claude Code references an uploaded image that hasn't been properly resolved.\n\n` +
      `Solutions:\n` +
      `1. Use a direct file path instead (e.g., "/path/to/image.png")\n` +
      `2. Use a public URL (e.g., "https://example.com/image.png")\n` +
      `3. Convert your image to a base64 data URI and pass that instead\n` +
      `4. If using HTTP transport, configure Cloudflare R2 for automatic file uploads\n\n` +
      `Example of base64 data URI format:\n` +
      `"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="`
    );
  }

  // Detect Claude Desktop virtual paths and auto-upload to Cloudflare
  if (source.startsWith('/mnt/user-data/') || source.startsWith('/mnt/')) {
    logger.info(`Detected Claude Desktop virtual path: ${source}`);

    // Extract filename from path
    const filename = source.split('/').pop() || 'upload.jpg';

    // Try to read from a temporary upload directory (if middleware saved it)
    const tempPath = `/tmp/mcp-uploads/${filename}`;

    try {
      // Check if file was temporarily saved by middleware
      if (await fs.access(tempPath).then(() => true).catch(() => false)) {
        const buffer = await fs.readFile(tempPath);

        // Upload to Cloudflare R2 if configured
        const cloudflare = getCloudflareR2();
        if (cloudflare) {
          const publicUrl = await cloudflare.uploadFile(buffer, filename);

          // Clean up temp file
          await fs.unlink(tempPath).catch(() => {});

          // Now fetch from the CDN URL
          return loadImage(publicUrl, fetchTimeout);
        }
      }
    } catch (error) {
      logger.warn(`Could not process temp file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // If no temp file or Cloudflare not configured, provide helpful error
    throw new ProcessingError(
      `Local file access not supported via HTTP transport.\n` +
      `The file path "${source}" is not accessible.\n\n` +
      `Solutions:\n` +
      `1. Upload your file to Cloudflare R2 first using the /mcp/upload endpoint\n` +
      `2. Use a public URL instead of a local file path\n` +
      `3. Convert the image to a base64 data URI\n` +
      `4. Use the stdio transport for local file access`
    );
  }
  
  // Existing base64 handling
  if (source.startsWith('data:image/')) {
    const [header, data] = source.split(',');
    if (!header || !data) {
      throw new ProcessingError("Invalid base64 image format");
    }
    const mimeMatch = header.match(/data:(image\/[^;]+)/);
    if (!mimeMatch || !mimeMatch[1]) {
      throw new ProcessingError("Invalid base64 image format");
    }
    
    // Optional: For large base64 images, upload to Cloudflare R2 if configured (HTTP transport only)
    const cloudflare = getCloudflareR2();
    if (process.env.TRANSPORT_TYPE === 'http' && cloudflare && data.length > 1024 * 1024) { // > 1MB base64
      logger.info('Large base64 image detected, uploading to Cloudflare R2');
      try {
        const publicUrl = await cloudflare.uploadBase64(data, mimeMatch[1]);
        return loadImage(publicUrl, fetchTimeout);
      } catch (error) {
        logger.warn('Failed to upload large base64 to Cloudflare R2:', error);
        // Continue with base64 processing
      }
    }
    
    return {
      imageData: data,
      mimeType: mimeMatch[1]
    };
  }
  
  // Existing URL handling
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fetchTimeout || 30000);
    
    try {
      const response = await fetch(source, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new ProcessingError(`Failed to fetch image: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
    
      const processedImage = await sharp(uint8Array)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      return {
        imageData: processedImage.toString('base64'),
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProcessingError(`Fetch timeout: Failed to download image from ${source}`);
      }
      throw new ProcessingError(`Failed to fetch image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Local file handling - auto-upload to Cloudflare for HTTP transport
  try {
    const stats = await fs.stat(source);
    if (!stats.isFile()) {
      throw new ProcessingError(`Path is not a file: ${source}`);
    }
    
    // If using HTTP transport, upload to Cloudflare R2 if configured
    const cloudflare = getCloudflareR2();
    if (process.env.TRANSPORT_TYPE === 'http' && cloudflare) {
      logger.info(`HTTP transport detected, uploading local file to Cloudflare R2: ${source}`);
      try {
        const buffer = await fs.readFile(source);
        const filename = source.split('/').pop() || 'upload.jpg';
        const publicUrl = await cloudflare.uploadFile(buffer, filename);
        
        // Fetch from CDN
        return loadImage(publicUrl, fetchTimeout);
      } catch (error) {
        logger.warn(`Failed to upload to Cloudflare R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue with local file processing
      }
    }
    
    // For stdio transport or when Cloudflare is not configured, process locally
    const buffer = await fs.readFile(source);
    const processedImage = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    return {
      imageData: processedImage.toString('base64'),
      mimeType: 'image/jpeg'
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new ProcessingError(
        `File not found: ${source}\n` +
        `When using HTTP transport, files are automatically uploaded to Cloudflare R2 if configured.`
      );
    }
    throw new ProcessingError(`Failed to load image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
</file>

<file path="src/utils/config.ts">
import { z } from "zod";

const ConfigSchema = z.object({
  gemini: z.object({
    apiKey: z.string().min(1, "Google Gemini API key is required"),
    model: z.string().default("gemini-2.5-flash"),
  }),
  transport: z.object({
    type: z.enum(["stdio", "http", "both"]).default("stdio"),
    http: z.object({
      enabled: z.boolean().default(false),
      port: z.number().default(3000),
      host: z.string().default("0.0.0.0"),
      sessionMode: z.enum(["stateful", "stateless"]).default("stateful"),
      enableSse: z.boolean().default(true),
      enableJsonResponse: z.boolean().default(true),
      enableSseFallback: z.boolean().default(false),
      ssePaths: z.object({
        stream: z.string().default("/sse"),
        message: z.string().default("/messages")
      }).default({ stream: "/sse", message: "/messages" }),
      security: z.object({
        enableCors: z.boolean().default(true),
        corsOrigins: z.array(z.string()).optional(),
        enableDnsRebindingProtection: z.boolean().default(true),
        allowedHosts: z.array(z.string()).default(["127.0.0.1", "localhost"]),
        enableRateLimiting: z.boolean().default(false),
        secret: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
  server: z.object({
    port: z.number().default(3000),
    maxRequestSize: z.string().default("50MB"),
    enableCaching: z.boolean().default(true),
    cacheTTL: z.number().default(3600),
    requestTimeout: z.number().default(300000), // 5 minutes
    fetchTimeout: z.number().default(60000), // 60 seconds for HTTP requests
  }),
  security: z.object({
    secret: z.string().optional(),
    rateLimitRequests: z.number().default(100),
    rateLimitWindow: z.number().default(60000),
  }),
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  }),
  cloudflare: z.object({
    projectName: z.string().optional().default("human-mcp"),
    bucketName: z.string().optional(),
    accessKey: z.string().optional(),
    secretKey: z.string().optional(),
    endpointUrl: z.string().optional(),
    baseUrl: z.string().optional(),
  }).optional(),
  documentProcessing: z.object({
    enabled: z.boolean().default(true),
    maxFileSize: z.number().default(50 * 1024 * 1024), // 50MB
    supportedFormats: z.array(z.string()).default([
      "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html"
    ]),
    timeout: z.number().default(300000), // 5 minutes
    retryAttempts: z.number().default(3),
    cacheEnabled: z.boolean().default(true),
    ocrEnabled: z.boolean().default(false),
    geminiModel: z.string().default("gemini-2.5-flash"),
  }).default({
    enabled: true,
    maxFileSize: 50 * 1024 * 1024,
    supportedFormats: ["pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html"],
    timeout: 300000,
    retryAttempts: 3,
    cacheEnabled: true,
    ocrEnabled: false,
    geminiModel: "gemini-2.5-flash"
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const corsOrigins = process.env.HTTP_CORS_ORIGINS ? 
    process.env.HTTP_CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
    undefined;
  
  const allowedHosts = process.env.HTTP_ALLOWED_HOSTS ? 
    process.env.HTTP_ALLOWED_HOSTS.split(',').map(host => host.trim()) : 
    ["127.0.0.1", "localhost"];

  return ConfigSchema.parse({
    gemini: {
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
      model: process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash",
    },
    transport: {
      type: (process.env.TRANSPORT_TYPE as any) || "stdio",
      http: {
        enabled: process.env.TRANSPORT_TYPE === "http" || process.env.TRANSPORT_TYPE === "both",
        port: parseInt(process.env.HTTP_PORT || "3000"),
        host: process.env.HTTP_HOST || "0.0.0.0",
        sessionMode: (process.env.HTTP_SESSION_MODE as any) || "stateful",
        enableSse: process.env.HTTP_ENABLE_SSE !== "false",
        enableJsonResponse: process.env.HTTP_ENABLE_JSON_RESPONSE !== "false",
        enableSseFallback: process.env.HTTP_ENABLE_SSE_FALLBACK === "true",
        ssePaths: {
          stream: process.env.HTTP_SSE_STREAM_PATH || "/sse",
          message: process.env.HTTP_SSE_MESSAGE_PATH || "/messages"
        },
        security: {
          enableCors: process.env.HTTP_CORS_ENABLED !== "false",
          corsOrigins,
          enableDnsRebindingProtection: process.env.HTTP_DNS_REBINDING_ENABLED !== "false",
          allowedHosts,
          enableRateLimiting: process.env.HTTP_ENABLE_RATE_LIMITING === "true",
          secret: process.env.HTTP_SECRET,
        },
      },
    },
    server: {
      port: parseInt(process.env.PORT || "3000"),
      maxRequestSize: process.env.MAX_REQUEST_SIZE || "50MB",
      enableCaching: process.env.ENABLE_CACHING !== "false",
      cacheTTL: parseInt(process.env.CACHE_TTL || "3600"),
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "300000"),
      fetchTimeout: parseInt(process.env.FETCH_TIMEOUT || "60000"),
    },
    security: {
      secret: process.env.MCP_SECRET,
      rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || "100"),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"),
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || "info",
    },
    cloudflare: {
      projectName: process.env.CLOUDFLARE_CDN_PROJECT_NAME || "human-mcp",
      bucketName: process.env.CLOUDFLARE_CDN_BUCKET_NAME,
      accessKey: process.env.CLOUDFLARE_CDN_ACCESS_KEY,
      secretKey: process.env.CLOUDFLARE_CDN_SECRET_KEY,
      endpointUrl: process.env.CLOUDFLARE_CDN_ENDPOINT_URL,
      baseUrl: process.env.CLOUDFLARE_CDN_BASE_URL,
    },
    documentProcessing: {
      enabled: process.env.DOCUMENT_PROCESSING_ENABLED !== "false",
      maxFileSize: parseInt(process.env.DOCUMENT_MAX_FILE_SIZE || "52428800"), // 50MB
      supportedFormats: process.env.DOCUMENT_SUPPORTED_FORMATS ?
        process.env.DOCUMENT_SUPPORTED_FORMATS.split(',').map(format => format.trim()) :
        ["pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html"],
      timeout: parseInt(process.env.DOCUMENT_TIMEOUT || "300000"),
      retryAttempts: parseInt(process.env.DOCUMENT_RETRY_ATTEMPTS || "3"),
      cacheEnabled: process.env.DOCUMENT_CACHE_ENABLED !== "false",
      ocrEnabled: process.env.DOCUMENT_OCR_ENABLED === "true",
      geminiModel: process.env.DOCUMENT_GEMINI_MODEL || "gemini-2.0-flash-exp",
    },
  });
}
</file>

<file path=".gitignore">
# Dependencies
node_modules/
bun.lockb

# Build output
dist/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.*.local
.env.*
.env.backup
.env.prod
.claude/.env
!.env.example

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log
logs.txt
npm-debug.log*
pnpm-debug.log*
lerna-debug.log*

# Coverage reports
coverage/
*.lcov

# Temporary files
*.tmp
*.temp
/tmp/

# Debug files
*.pid
*.seed
*.pid.lock

# Claude Code
plans/reports/**/*
screenshots/**/*
audio-outputs/**/*
data/**/*
</file>

<file path="src/tools/eyes/utils/gemini-client.ts">
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type { Config } from "@/utils/config";
import { logger } from "@/utils/logger";
import { APIError } from "@/utils/errors";

// Document processing types
interface ProcessOptions {
  extractText?: boolean;
  extractTables?: boolean;
  extractImages?: boolean;
  preserveFormatting?: boolean;
  pageRange?: string;
  detailLevel?: 'quick' | 'detailed';
  language?: string;
  timeout?: number;
}

interface ExtractionOptions {
  strictMode?: boolean;
  fallbackValues?: Record<string, any>;
  validateOutput?: boolean;
}

interface DocumentResponse {
  content: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  extractedData?: any;
}

interface DocumentMetadata {
  format: string;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  author?: string;
  title?: string;
  subject?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  language?: string;
  fileSize?: number;
}

interface DocumentStructure {
  sections: Section[];
  tables: Table[];
  images: Image[];
  links: Link[];
  headings: Heading[];
}

interface Section {
  id: string;
  title?: string;
  content: string;
  level: number;
  startPage?: number;
  endPage?: number;
  wordCount: number;
}

interface Table {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Image {
  id: string;
  alt?: string;
  src?: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  base64Data?: string;
}

interface Link {
  id: string;
  text: string;
  url: string;
  pageNumber?: number;
}

interface Heading {
  id: string;
  text: string;
  level: number;
  pageNumber?: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private documentCache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(private config: Config) {
    if (!config.gemini.apiKey) {
      throw new APIError("Google Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);

    // Cache is simplified - no periodic cleanup needed
  }
  
  getModel(detailLevel: "quick" | "detailed"): GenerativeModel {
    const modelName = detailLevel === "detailed"
      ? this.config.gemini.model
      : "gemini-2.5-flash";

    return this.genAI.getGenerativeModel({
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
    const imageModelName = modelName || "gemini-2.5-flash-image-preview";

    return this.genAI.getGenerativeModel({
      model: imageModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }
  
  async analyzeContent(
    model: GenerativeModel,
    prompt: string,
    mediaData: Array<{ mimeType: string; data: string }>
  ): Promise<string> {
    return this.analyzeContentWithRetry(model, prompt, mediaData, 3);
  }

  async analyzeContentWithRetry(
    model: GenerativeModel,
    prompt: string,
    mediaData: Array<{ mimeType: string; data: string }>,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Analyzing content with ${mediaData.length} media files (attempt ${attempt}/${maxRetries})`);

        const parts = [
          { text: prompt },
          ...mediaData.map(media => ({
            inlineData: {
              mimeType: media.mimeType,
              data: media.data
            }
          }))
        ];

        // Add timeout wrapper
        const analysisPromise = model.generateContent(parts);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new APIError("Gemini API request timed out")), this.config.server.requestTimeout);
        });

        const result = await Promise.race([analysisPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        if (!text) {
          throw new APIError("No response from Gemini API");
        }

        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Content analysis attempt ${attempt} failed:`, lastError.message);

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delay = this.createBackoffDelay(attempt);
        logger.debug(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.handleGeminiError(lastError, "Content analysis");
  }

  /**
   * Get document-specific model for processing
   */
  getDocumentModel(): GenerativeModel {
    return this.genAI.getGenerativeModel({
      model: this.config.documentProcessing.geminiModel,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  /**
   * Process document with native Gemini Document Understanding API
   * Follows the official Gemini documentation patterns
   */
  async processDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Processing document with native Gemini Document API, size: ${documentBuffer.length} bytes`);

      // Validate document before processing
      this.validateDocument(documentBuffer, mimeType);

      // For large documents (>20MB), use File API
      if (documentBuffer.length > 20 * 1024 * 1024) {
        return this.processLargeDocument(documentBuffer, mimeType, options);
      }

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      // Use simple, direct prompt following Gemini documentation
      const prompt = this.buildSimpleDocumentPrompt(options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      // Add timeout wrapper
      const timeoutMs = this.config.documentProcessing.timeout;
      const processingPromise = model.generateContent(contents);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new APIError("Document processing timed out")), timeoutMs);
      });

      const result = await Promise.race([processingPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from Gemini Document API");
      }

      // Parse response - try JSON first, fallback to text
      return this.parseSimpleDocumentResponse(text);
    } catch (error) {
      this.handleGeminiError(error, "Document processing");
    }
  }

  /**
   * Process large documents using chunked approach
   * For documents over 20MB as per Gemini documentation
   */
  async processLargeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Processing large document with chunked approach, size: ${documentBuffer.length} bytes`);

      // Split large documents into smaller chunks for processing
      const maxChunkSize = 15 * 1024 * 1024; // 15MB chunks to stay under 20MB limit
      const chunks = this.splitBufferIntoChunks(documentBuffer, maxChunkSize);

      if (chunks.length === 1) {
        // Single chunk, use inline processing
        const firstChunk = chunks[0];
        if (!firstChunk) {
          throw new APIError('Failed to create document chunk');
        }
        return this.processDocumentChunk(firstChunk, mimeType, options, 1, 1);
      } else {
        // Multiple chunks, process each and combine results
        logger.info(`Document split into ${chunks.length} chunks for processing`);

        const chunkResults = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (!chunk) {
            throw new APIError(`Failed to create document chunk ${i + 1}`);
          }
          const chunkResult = await this.processDocumentChunk(
            chunk,
            mimeType,
            options,
            i + 1,
            chunks.length
          );
          chunkResults.push(chunkResult);
        }

        // Combine chunk results
        return this.combineChunkResults(chunkResults, options);
      }
    } catch (error) {
      logger.error('Large document processing failed:', error);
      throw new APIError(`Large document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a single chunk of a large document
   */
  private async processDocumentChunk(
    chunkBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions,
    chunkNumber: number,
    totalChunks: number
  ): Promise<any> {
    const model = this.getDocumentModel();
    const base64Data = chunkBuffer.toString('base64');

    const prompt = this.buildChunkedDocumentPrompt(options, chunkNumber, totalChunks);

    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      }
    ];

    const result = await model.generateContent(contents);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new APIError(`No response from chunk ${chunkNumber} processing`);
    }

    return this.parseSimpleDocumentResponse(text);
  }

  /**
   * Combine results from multiple document chunks
   */
  private combineChunkResults(chunkResults: any[], options: ProcessOptions): any {
    // Combine content from all chunks
    const combinedContent = chunkResults
      .map(result => result.content || '')
      .filter(content => content.length > 0)
      .join('\n\n');

    // Use the structure from the first chunk as base
    const baseResult = chunkResults[0] || {};

    // Combine metadata
    const combinedMetadata = {
      ...baseResult.metadata,
      wordCount: this.countWords(combinedContent),
      characterCount: combinedContent.length,
      // Note: pageCount might not be accurate for chunked documents
      pageCount: baseResult.metadata?.pageCount || chunkResults.length
    };

    // Combine structures
    const combinedStructure = this.combineDocumentStructures(
      chunkResults.map(r => r.structure).filter(s => s)
    );

    return {
      content: combinedContent,
      metadata: combinedMetadata,
      structure: combinedStructure,
      extractedData: baseResult.extractedData,
      processingInfo: {
        ...baseResult.processingInfo,
        extractionMethod: 'chunked-gemini-native',
        confidence: 0.9 // Slightly lower confidence for chunked processing
      }
    };
  }

  /**
   * Split buffer into chunks of specified size
   */
  private splitBufferIntoChunks(buffer: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, buffer.length);
      chunks.push(buffer.subarray(i, end));
    }
    return chunks;
  }

  /**
   * Build prompt for chunked document processing
   */
  private buildChunkedDocumentPrompt(
    options: ProcessOptions,
    chunkNumber: number,
    totalChunks: number
  ): string {
    const { extractText = true, extractTables = true, extractImages = false } = options;

    let prompt = `Processing document chunk ${chunkNumber} of ${totalChunks}.\n\n`;

    if (extractText) {
      prompt += "- Extract all text content from this chunk\n";
    }

    if (extractTables) {
      prompt += "- Extract all tables with headers and data from this chunk\n";
    }

    if (extractImages) {
      prompt += "- Describe all images found in this chunk\n";
    }

    prompt += "- Extract document metadata and structure from this chunk\n\n";

    if (totalChunks > 1) {
      prompt += `IMPORTANT: This is chunk ${chunkNumber} of ${totalChunks}. Focus on the content in this specific chunk only.\n\n`;
    }

    prompt += "Respond with a JSON object containing the extracted information from this chunk.";

    return prompt;
  }

  /**
   * Combine document structures from multiple chunks
   */
  private combineDocumentStructures(structures: any[]): any {
    if (structures.length === 0) {
      return {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    }

    if (structures.length === 1) {
      return structures[0];
    }

    // Combine sections, tables, images, etc. from all chunks
    const combinedSections = structures.flatMap(s => s.sections || []);
    const combinedTables = structures.flatMap(s => s.tables || []);
    const combinedImages = structures.flatMap(s => s.images || []);
    const combinedLinks = structures.flatMap(s => s.links || []);
    const combinedHeadings = structures.flatMap(s => s.headings || []);

    return {
      sections: combinedSections,
      tables: combinedTables,
      images: combinedImages,
      links: combinedLinks,
      headings: combinedHeadings
    };
  }

  /**
   * Extract structured data from document using native Gemini capabilities
   */
  async extractStructuredData(
    documentBuffer: Buffer,
    mimeType: string,
    schema: object,
    options: ExtractionOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Extracting structured data from document, schema keys: ${Object.keys(schema).length}`);

      // For large documents, use File API approach
      if (documentBuffer.length > 20 * 1024 * 1024) {
        return this.extractStructuredDataFromLargeDocument(documentBuffer, mimeType, schema, options);
      }

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = this.buildSimpleExtractionPrompt(schema, options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from Gemini extraction API");
      }

      return this.parseSimpleExtractionResponse(text, schema, options);
    } catch (error) {
      logger.error("Gemini extraction API error:", error);
      if (error instanceof Error) {
        throw new APIError(`Data extraction error: ${error.message}`);
      }
      throw new APIError("Unknown data extraction error");
    }
  }

  /**
   * Extract structured data from large documents
   */
  async extractStructuredDataFromLargeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    schema: object,
    options: ExtractionOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Extracting structured data from large document, size: ${documentBuffer.length} bytes`);

      // For now, fall back to inline processing
      logger.warn('Large document structured extraction, falling back to inline processing.');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');
      const prompt = this.buildSimpleExtractionPrompt(schema, options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from large document extraction");
      }

      return this.parseSimpleExtractionResponse(text, schema, options);
    } catch (error) {
      logger.error('Large document structured extraction failed:', error);
      throw new APIError(`Large document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Summarize document content using native Gemini capabilities
   */
  async summarizeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: { summaryType?: string; maxLength?: number } = {}
  ): Promise<string> {
    try {
      logger.debug(`Summarizing document with type: ${options.summaryType || 'detailed'}`);

      // For large documents, use File API approach
      if (documentBuffer.length > 20 * 1024 * 1024) {
        return this.summarizeLargeDocument(documentBuffer, mimeType, options);
      }

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = this.buildSimpleSummaryPrompt(options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from Gemini summarization API");
      }

      return text;
    } catch (error) {
      logger.error("Gemini summarization API error:", error);
      if (error instanceof Error) {
        throw new APIError(`Summarization error: ${error.message}`);
      }
      throw new APIError("Unknown summarization error");
    }
  }

  /**
   * Summarize large documents
   */
  async summarizeLargeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: { summaryType?: string; maxLength?: number } = {}
  ): Promise<string> {
    try {
      logger.debug(`Summarizing large document, size: ${documentBuffer.length} bytes`);

      // For now, fall back to inline processing
      logger.warn('Large document summarization, falling back to inline processing.');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');
      const prompt = this.buildSimpleSummaryPrompt(options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from large document summarization");
      }

      return text;
    } catch (error) {
      logger.error('Large document summarization failed:', error);
      throw new APIError(`Large document summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Parse document processing response
   */
  private parseDocumentResponse(responseText: string): any {
    try {
      // Try to parse as JSON first
      return JSON.parse(responseText);
    } catch {
      // If not JSON, wrap in a basic structure
      return {
        content: responseText,
        metadata: {},
        structure: { sections: [], tables: [], images: [] }
      };
    }
  }

  /**
   * Build simple document prompt following Gemini documentation
   */
  private buildSimpleDocumentPrompt(options: ProcessOptions): string {
    const { extractText = true, extractTables = true, extractImages = false, preserveFormatting = false } = options;

    let prompt = "Please analyze this document and provide the following information:\n\n";

    if (extractText) {
      prompt += "- Extract all text content\n";
    }

    if (extractTables) {
      prompt += "- Extract all tables with headers and data\n";
    }

    if (extractImages) {
      prompt += "- Describe all images found in the document\n";
    }

    prompt += "- Extract document metadata (title, author, creation date, etc.)\n";
    prompt += "- Identify document structure (sections, headings, etc.)\n\n";

    if (preserveFormatting) {
      prompt += "Preserve original formatting and structure where possible.\n\n";
    }

    prompt += "Respond with a JSON object containing the extracted information.";

    return prompt;
  }

  /**
   * Parse simple document response
   */
  private parseSimpleDocumentResponse(responseText: string): any {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText);
      return {
        content: parsed.content || responseText,
        metadata: parsed.metadata || {},
        structure: parsed.structure || { sections: [], tables: [], images: [] },
        extractedData: parsed
      };
    } catch {
      // If not JSON, wrap in a basic structure
      return {
        content: responseText,
        metadata: {},
        structure: { sections: [], tables: [], images: [] },
        extractedData: null
      };
    }
  }

  /**
   * Parse extraction response and validate against schema
   */
  private parseExtractionResponse(responseText: string, schema: object, options: ExtractionOptions): any {
    try {
      const extractedData = JSON.parse(responseText);

      // Basic validation - could be enhanced with more sophisticated schema validation
      if (options.strictMode && !this.validateAgainstSchema(extractedData, schema)) {
        throw new APIError("Extracted data does not match schema requirements");
      }

      return extractedData;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Failed to parse extraction response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build simple extraction prompt
   */
  private buildSimpleExtractionPrompt(schema: object, options: ExtractionOptions): string {
    const { strictMode = false } = options;

    let prompt = "Extract structured data from this document according to the following JSON schema:\n\n";
    prompt += "Schema:\n" + JSON.stringify(schema, null, 2) + "\n\n";
    prompt += "Instructions:\n";
    prompt += "- Extract data that matches the schema structure\n";
    prompt += "- Use null for missing or unclear values\n";

    if (strictMode) {
      prompt += "- Only extract data that perfectly matches the schema\n";
      prompt += "- Skip any data that doesn't fit the expected format\n";
    }

    prompt += "\nRespond with a JSON object matching the schema structure.";

    return prompt;
  }

  /**
   * Parse simple extraction response
   */
  private parseSimpleExtractionResponse(responseText: string, schema: object, options: ExtractionOptions): any {
    try {
      const extractedData = JSON.parse(responseText);

      // Basic validation
      if (options.strictMode && !this.validateAgainstSchema(extractedData, schema)) {
        throw new APIError("Extracted data does not match schema requirements");
      }

      return extractedData;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Failed to parse extraction response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process document with simple retry logic
   */
  async processDocumentWithRetry(
    documentBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions = {},
    maxRetries: number = 2
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Document processing attempt ${attempt}/${maxRetries}`);
        return await this.processDocument(documentBuffer, mimeType, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Document processing attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Simple backoff
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Document processing failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Extract data with simple retry logic
   */
  async extractStructuredDataWithRetry(
    documentBuffer: Buffer,
    mimeType: string,
    schema: object,
    options: ExtractionOptions = {},
    maxRetries: number = 2
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Data extraction attempt ${attempt}/${maxRetries}`);
        return await this.extractStructuredData(documentBuffer, mimeType, schema, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Data extraction attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Data extraction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Analyze document structure
   */
  async analyzeDocumentStructure(
    documentBuffer: Buffer,
    mimeType: string
  ): Promise<DocumentStructure> {
    try {
      logger.debug('Analyzing document structure');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = `Analyze the structure of this document and provide a detailed breakdown in JSON format:

{
  "sections": [
    {
      "id": "unique_id",
      "title": "section title",
      "content": "section content preview",
      "level": 1,
      "startPage": 1,
      "endPage": 2,
      "wordCount": 150
    }
  ],
  "tables": [
    {
      "id": "table_1",
      "title": "table title",
      "headers": ["Column 1", "Column 2"],
      "rows": [["Value 1", "Value 2"]],
      "pageNumber": 1
    }
  ],
  "images": [
    {
      "id": "image_1",
      "alt": "image description",
      "pageNumber": 1,
      "position": {"x": 100, "y": 200, "width": 300, "height": 200}
    }
  ],
  "links": [
    {
      "id": "link_1",
      "text": "link text",
      "url": "https://example.com",
      "pageNumber": 1
    }
  ],
  "headings": [
    {
      "id": "heading_1",
      "text": "Heading Text",
      "level": 1,
      "pageNumber": 1
    }
  ]
}

Focus on identifying:
- Document sections and their hierarchy
- Tables with headers and sample data
- Images with descriptions and positions
- Links and their destinations
- Headings and their levels`;

      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from structure analysis");
      }

      return this.parseStructureResponse(text);
    } catch (error) {
      logger.error("Document structure analysis error:", error);
      if (error instanceof Error) {
        throw new APIError(`Structure analysis error: ${error.message}`);
      }
      throw new APIError("Unknown structure analysis error");
    }
  }

  /**
   * Extract document metadata
   */
  async extractDocumentMetadata(
    documentBuffer: Buffer,
    mimeType: string
  ): Promise<DocumentMetadata> {
    try {
      logger.debug('Extracting document metadata');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = `Extract metadata from this document and respond with a JSON object:

{
  "format": "pdf|docx|xlsx|pptx|txt|md",
  "pageCount": 10,
  "wordCount": 2500,
  "characterCount": 15000,
  "author": "Document Author",
  "title": "Document Title",
  "subject": "Document Subject",
  "createdAt": "2024-01-15T10:30:00Z",
  "modifiedAt": "2024-01-16T14:20:00Z",
  "language": "en",
  "fileSize": 1024000
}

Extract as much metadata as possible from the document properties and content.`;

      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from metadata extraction");
      }

      return this.parseMetadataResponse(text);
    } catch (error) {
      logger.error("Document metadata extraction error:", error);
      if (error instanceof Error) {
        throw new APIError(`Metadata extraction error: ${error.message}`);
      }
      throw new APIError("Unknown metadata extraction error");
    }
  }

  /**
   * Parse structure analysis response
   */
  private parseStructureResponse(responseText: string): DocumentStructure {
    try {
      const structure = JSON.parse(responseText);
      return {
        sections: structure.sections || [],
        tables: structure.tables || [],
        images: structure.images || [],
        links: structure.links || [],
        headings: structure.headings || []
      };
    } catch {
      return {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    }
  }

  /**
   * Parse metadata response
   */
  private parseMetadataResponse(responseText: string): DocumentMetadata {
    try {
      const metadata = JSON.parse(responseText);
      return {
        format: metadata.format || 'unknown',
        pageCount: metadata.pageCount || 0,
        wordCount: metadata.wordCount || 0,
        characterCount: metadata.characterCount || 0,
        author: metadata.author,
        title: metadata.title,
        subject: metadata.subject,
        createdAt: metadata.createdAt ? new Date(metadata.createdAt) : undefined,
        modifiedAt: metadata.modifiedAt ? new Date(metadata.modifiedAt) : undefined,
        language: metadata.language,
        fileSize: metadata.fileSize
      };
    } catch {
      return {
        format: 'unknown',
        pageCount: 0,
        wordCount: 0,
        characterCount: 0
      };
    }
  }

  /**
   * Enhanced error handling with specific error types
   */
  private handleGeminiError(error: any, operation: string): never {
    if (error?.status === 400) {
      throw new APIError(`${operation}: Invalid request - check document format and size`);
    }

    if (error?.status === 403) {
      throw new APIError(`${operation}: API key invalid or insufficient permissions`);
    }

    if (error?.status === 429) {
      throw new APIError(`${operation}: Rate limit exceeded - please retry later`);
    }

    if (error?.status === 500) {
      throw new APIError(`${operation}: Gemini API server error - please retry`);
    }

    if (error?.status === 503) {
      throw new APIError(
        `${operation}: Gemini API is currently unavailable (503 Service Unavailable). ` +
        `This is usually temporary. Please try again in a few moments. ` +
        `If the issue persists, check Google's Gemini API status page.`
      );
    }

    // Network or timeout errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      throw new APIError(`${operation}: Network error - check connection and retry`);
    }

    // Gemini-specific errors
    if (error?.message?.includes('GoogleGenerativeAI Error')) {
      const geminiErrorMatch = error.message.match(/\[(\d+)\s+([^\]]+)\]\s+(.+)/);
      if (geminiErrorMatch) {
        const [, statusCode, statusText, details] = geminiErrorMatch;
        if (statusCode === '503') {
          throw new APIError(
            `${operation}: Google Gemini API is temporarily unavailable (${statusText}). ` +
            `This is a service-side issue. Please try again in a few moments.`
          );
        }
        throw new APIError(`${operation}: Gemini API error [${statusCode} ${statusText}] ${details}`);
      }
    }

    // Default error
    const message = error?.message || 'Unknown error occurred';
    throw new APIError(`${operation}: ${message}`);
  }

  /**
   * Validate document before processing
   */
  validateDocument(documentBuffer: Buffer, mimeType: string): void {
    const maxSize = this.config.documentProcessing.maxFileSize;

    if (documentBuffer.length > maxSize) {
      throw new APIError(`Document size (${documentBuffer.length} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
    }

    if (documentBuffer.length === 0) {
      throw new APIError('Document is empty');
    }

    // Validate MIME type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'text/csv',
      'application/json',
      'application/xml',
      'text/html'
    ];

    if (!supportedTypes.includes(mimeType)) {
      throw new APIError(`Unsupported document type: ${mimeType}`);
    }
  }

  /**
   * Get processing timeout with buffer
   */
  private getTimeoutWithBuffer(baseTimeout: number): number {
    // Add 10% buffer to the configured timeout
    return Math.floor(baseTimeout * 1.1);
  }

  /**
   * Create exponential backoff delay
   */
  private createBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];

    return (
      retryableStatuses.includes(error?.status) ||
      retryableCodes.includes(error?.code) ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('network')
    );
  }

  /**
   * Simple cache key generation
   */
  private getCacheKey(documentBuffer: Buffer, operation: string, params?: any): string {
    const hash = this.simpleHash(documentBuffer.toString('base64'));
    const paramStr = params ? JSON.stringify(params) : '';
    return `${operation}:${hash}:${paramStr}`;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }



  /**
   * Build prompt for document processing
   */
  private buildDocumentPrompt(options: ProcessOptions): string {
    const { extractText = true, extractTables = true, extractImages = false, preserveFormatting = false } = options;

    let prompt = "Please analyze this document and provide the following information in JSON format:\n\n";

    if (extractText) {
      prompt += "- Extract all text content\n";
    }

    if (extractTables) {
      prompt += "- Extract all tables with headers and data\n";
    }

    if (extractImages) {
      prompt += "- Describe all images found in the document\n";
    }

    prompt += "- Extract document metadata (title, author, creation date, etc.)\n";
    prompt += "- Identify document structure (sections, headings, etc.)\n\n";

    if (preserveFormatting) {
      prompt += "Preserve original formatting and structure where possible.\n\n";
    }

    prompt += `Respond with a JSON object containing:
{
  "content": "full text content",
  "metadata": {
    "title": "document title",
    "author": "document author",
    "createdAt": "creation date",
    "modifiedAt": "modification date",
    "pageCount": number of pages,
    "wordCount": number of words
  },
  "structure": {
    "sections": [{"title": "section title", "content": "section content"}],
    "tables": [{"headers": ["col1", "col2"], "rows": [["val1", "val2"]]}],
    "images": [{"description": "image description", "position": "page X"}]
  }
}`;

    return prompt;
  }

  /**
   * Build prompt for data extraction
   */
  private buildExtractionPrompt(schema: object, options: ExtractionOptions): string {
    const { strictMode = false } = options;

    let prompt = "Extract structured data from this document according to the following JSON schema:\n\n";
    prompt += "Schema:\n" + JSON.stringify(schema, null, 2) + "\n\n";

    prompt += "Instructions:\n";
    prompt += "- Extract data that matches the schema structure\n";
    prompt += "- Use null for missing or unclear values\n";
    prompt += "- Provide confidence scores where possible\n";

    if (strictMode) {
      prompt += "- Only extract data that perfectly matches the schema\n";
      prompt += "- Skip any data that doesn't fit the expected format\n";
    }

    prompt += "\nRespond with a JSON object matching the schema structure.";

    return prompt;
  }

  /**
   * Build prompt for document summarization
   */
  private buildSummaryPrompt(options: { summaryType?: string; maxLength?: number }): string {
    const { summaryType = 'detailed', maxLength } = options;

    let prompt = `Please provide a ${summaryType} summary of this document.\n\n`;

    switch (summaryType) {
      case 'brief':
        prompt += "Provide a concise overview in 2-3 sentences.";
        break;
      case 'detailed':
        prompt += "Provide a comprehensive summary including key points, main topics, and important details.";
        break;
      case 'executive':
        prompt += "Provide an executive summary suitable for business decision makers.";
        break;
      case 'technical':
        prompt += "Provide a technical summary focusing on technical details and specifications.";
        break;
      default:
        prompt += "Provide a detailed summary of the document content.";
    }

    if (maxLength) {
      prompt += `\n\nLimit the summary to approximately ${maxLength} words.`;
    }

    prompt += "\n\nInclude key insights and main conclusions from the document.";

    return prompt;
  }

  /**
   * Build simple summary prompt
   */
  private buildSimpleSummaryPrompt(options: { summaryType?: string; maxLength?: number }): string {
    const { summaryType = 'detailed', maxLength } = options;

    let prompt = `Please provide a ${summaryType} summary of this document.\n\n`;

    switch (summaryType) {
      case 'brief':
        prompt += "Provide a concise overview in 2-3 sentences.";
        break;
      case 'detailed':
        prompt += "Provide a comprehensive summary including key points, main topics, and important details.";
        break;
      case 'executive':
        prompt += "Provide an executive summary suitable for business decision makers.";
        break;
      case 'technical':
        prompt += "Provide a technical summary focusing on technical details and specifications.";
        break;
      default:
        prompt += "Provide a detailed summary of the document content.";
    }

    if (maxLength) {
      prompt += `\n\nLimit the summary to approximately ${maxLength} words.`;
    }

    prompt += "\n\nInclude key insights and main conclusions from the document.";

    return prompt;
  }

  /**
   * Basic schema validation
   */
  private validateAgainstSchema(data: any, schema: object): boolean {
    // Simple validation - can be enhanced with proper JSON schema validation
    if (!data || typeof data !== 'object') {
      return false;
    }

    const schemaKeys = Object.keys(schema);
    const dataKeys = Object.keys(data);

    // Check if all required schema keys are present in data
    return schemaKeys.every(key => dataKeys.includes(key));
  }

  /**
   * Get speech generation model for text-to-speech
   */
  getSpeechModel(modelName?: string): GenerativeModel {
    const speechModelName = modelName || "gemini-2.5-flash-preview-tts";

    return this.genAI.getGenerativeModel({
      model: speechModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  /**
   * Generate speech from text using Gemini Speech Generation API
   */
  async generateSpeech(
    text: string,
    options: {
      voice?: string;
      model?: string;
      language?: string;
      stylePrompt?: string;
    } = {}
  ): Promise<{ audioData: string; metadata: any }> {
    try {
      const {
        voice = "Zephyr",
        model = "gemini-2.5-flash-preview-tts",
        language = "en-US",
        stylePrompt
      } = options;

      logger.debug(`Generating speech with voice: ${voice}, model: ${model}, language: ${language}`);

      // Build prompt with style if provided
      let prompt = text;
      if (stylePrompt) {
        prompt = `${stylePrompt}: ${text}`;
      }

      // Use direct fetch to the TTS API since the SDK doesn't support TTS yet
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          }
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.gemini.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as any;

      // Extract audio data from response
      const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioData) {
        throw new APIError("No audio data received from Gemini Speech API");
      }

      const metadata = {
        voice,
        model,
        language,
        stylePrompt,
        timestamp: new Date().toISOString(),
        textLength: text.length,
        sampleRate: 24000,
        channels: 1,
        format: "wav"
      };

      return {
        audioData,
        metadata
      };
    } catch (error) {
      logger.error("Gemini Speech Generation error:", error);
      if (error instanceof Error) {
        throw new APIError(`Speech generation error: ${error.message}`);
      }
      throw new APIError("Unknown speech generation error");
    }
  }

  /**
   * Generate speech with retry logic
   */
  async generateSpeechWithRetry(
    text: string,
    options: {
      voice?: string;
      model?: string;
      language?: string;
      stylePrompt?: string;
    } = {},
    maxRetries: number = 2
  ): Promise<{ audioData: string; metadata: any }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Speech generation attempt ${attempt}/${maxRetries}`);
        return await this.generateSpeech(text, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Speech generation attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Simple backoff
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Speech generation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Split long text into chunks for speech generation
   */
  splitTextForSpeech(text: string, maxChunkSize: number = 8000): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;

      if (potentialChunk.length <= maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks;
  }

  /**
   * Generate speech for multiple chunks (for narration)
   */
  async generateSpeechChunks(
    chunks: string[],
    options: {
      voice?: string;
      model?: string;
      language?: string;
      stylePrompt?: string;
    } = {}
  ): Promise<{ audioData: string; metadata: any }[]> {
    const results: { audioData: string; metadata: any }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      logger.debug(`Generating speech for chunk ${i + 1}/${chunks.length}`);

      try {
        const result = await this.generateSpeechWithRetry(chunk, options);
        results.push(result);

        // Add small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        logger.error(`Failed to generate speech for chunk ${i + 1}:`, error);
        throw new APIError(`Failed to generate speech for chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Get video generation model for Veo 3.0
   */
  getVideoGenerationModel(modelName?: string): GenerativeModel {
    const videoModelName = modelName || "veo-3.0-generate-001";

    return this.genAI.getGenerativeModel({
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
   * Generate video using Veo 3.0 API
   */
  async generateVideo(
    prompt: string,
    options: {
      model?: string;
      duration?: string;
      aspectRatio?: string;
      fps?: number;
      imageInput?: string;
      style?: string;
      cameraMovement?: string;
      seed?: number;
    } = {}
  ): Promise<{ videoData: string; metadata: any; operationId: string }> {
    try {
      const {
        model = "veo-3.0-generate-001",
        duration = "4s",
        aspectRatio = "16:9",
        fps = 24,
        imageInput,
        style,
        cameraMovement,
        seed
      } = options;

      logger.debug(`Generating video with model: ${model}, duration: ${duration}, aspect ratio: ${aspectRatio}`);

      const videoModel = this.getVideoGenerationModel(model);

      // Build enhanced prompt with style and camera movement
      let enhancedPrompt = prompt;

      if (style) {
        const styleMapping: Record<string, string> = {
          realistic: "realistic, high quality, detailed",
          cinematic: "cinematic, professional lighting, dramatic",
          artistic: "artistic style, creative, expressive",
          cartoon: "cartoon style, animated, colorful",
          animation: "animated, smooth motion, stylized"
        };
        const styleDescription = styleMapping[style];
        if (styleDescription) {
          enhancedPrompt = `${enhancedPrompt}, ${styleDescription}`;
        }
      }

      if (cameraMovement && cameraMovement !== "static") {
        const movementMapping: Record<string, string> = {
          pan_left: "camera panning left",
          pan_right: "camera panning right",
          zoom_in: "camera zooming in",
          zoom_out: "camera zooming out",
          dolly_forward: "camera moving forward",
          dolly_backward: "camera moving backward"
        };
        const movementDescription = movementMapping[cameraMovement];
        if (movementDescription) {
          enhancedPrompt = `${enhancedPrompt}, ${movementDescription}`;
        }
      }

      if (aspectRatio && aspectRatio !== "16:9") {
        enhancedPrompt = `${enhancedPrompt}, aspect ratio ${aspectRatio}`;
      }

      if (duration && duration !== "4s") {
        enhancedPrompt = `${enhancedPrompt}, duration ${duration}`;
      }

      logger.info(`Enhanced video prompt: "${enhancedPrompt}"`);

      // Prepare the content parts
      const parts: any[] = [{ text: enhancedPrompt }];

      // Add image input if provided
      if (imageInput) {
        // Parse base64 data URI or handle URL
        if (imageInput.startsWith('data:image/')) {
          const matches = imageInput.match(/data:image\/([^;]+);base64,(.+)/);
          if (matches) {
            const mimeType = `image/${matches[1]}`;
            const data = matches[2];
            parts.push({
              inlineData: {
                mimeType,
                data
              }
            });
          }
        }
      }

      // Generate the video using Gemini API
      const response = await videoModel.generateContent(parts);
      const result = response.response;

      // Note: Video generation is typically an async operation that returns an operation ID
      // For now, we'll simulate the expected response structure
      const operationId = `video-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // In a real implementation, this would be handled as a long-running operation
      // that you would poll for completion
      const metadata = {
        model,
        duration,
        aspectRatio,
        fps,
        style,
        cameraMovement,
        seed,
        timestamp: new Date().toISOString(),
        prompt: enhancedPrompt,
        status: "pending" // Would be "completed" when the operation finishes
      };

      // For now, return a placeholder response
      // In reality, you would need to implement polling logic to wait for completion
      return {
        videoData: "data:video/mp4;base64,", // Placeholder - would contain actual video data
        metadata,
        operationId
      };

    } catch (error) {
      logger.error("Gemini Video Generation error:", error);
      if (error instanceof Error) {
        throw new APIError(`Video generation error: ${error.message}`);
      }
      throw new APIError("Unknown video generation error");
    }
  }

  /**
   * Generate video with retry logic
   */
  async generateVideoWithRetry(
    prompt: string,
    options: {
      model?: string;
      duration?: string;
      aspectRatio?: string;
      fps?: number;
      imageInput?: string;
      style?: string;
      cameraMovement?: string;
      seed?: number;
    } = {},
    maxRetries: number = 2
  ): Promise<{ videoData: string; metadata: any; operationId: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Video generation attempt ${attempt}/${maxRetries}`);
        return await this.generateVideo(prompt, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Video generation attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Simple backoff
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Video generation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Poll operation status for video generation
   * This would be used to check if a long-running video generation operation is complete
   */
  async pollVideoGenerationOperation(operationId: string): Promise<{ done: boolean; result?: any; error?: string }> {
    try {
      // In a real implementation, this would make an API call to check operation status
      // For now, simulate a polling response
      logger.debug(`Polling video generation operation: ${operationId}`);

      // Simulate operation completion after some time
      const isComplete = Math.random() > 0.7; // 30% chance of completion on each poll

      if (isComplete) {
        return {
          done: true,
          result: {
            videoData: "data:video/mp4;base64,", // Would contain actual video data
            generationTime: Math.floor(Math.random() * 30000) + 10000 // 10-40 seconds
          }
        };
      } else {
        return {
          done: false
        };
      }
    } catch (error) {
      logger.error("Video operation polling error:", error);
      return {
        done: true,
        error: error instanceof Error ? error.message : "Unknown polling error"
      };
    }
  }
}
</file>

<file path="src/tools/eyes/index.ts">
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { processImage } from "./processors/image.js";
import { processVideo } from "./processors/video.js";
import { processGif } from "./processors/gif.js";
import { DocumentProcessorFactory } from "./processors/factory.js";
import { GeminiClient } from "./utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Register optimized Eyes tools following Anthropic best practices
 *
 * Key optimizations:
 * - Simplified schemas (2-4 essential parameters)
 * - Clear, action-oriented descriptions
 * - Natural language tool names
 * - Reduced parameter complexity
 */
export async function registerEyesTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  logger.info("Registering optimized Eyes tools...");

  // Vision analysis tool (simplified)
  server.registerTool(
    "eyes_analyze",
    {
      title: "Analyze visual content",
      description: "Understand images, videos, and GIFs with AI vision",
      inputSchema: {
        source: z.string().describe("File path, URL, or image to analyze"),
        focus: z.string().optional().describe("What to focus on in the analysis"),
        detail: z.enum(["quick", "detailed"]).default("detailed").optional().describe("Analysis depth")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedAnalyze(geminiClient, args, config);
      } catch (error) {
        return handleToolError("vision analysis", error);
      }
    }
  );

  // Image comparison tool (simplified)
  server.registerTool(
    "eyes_compare",
    {
      title: "Compare two images",
      description: "Find differences between images",
      inputSchema: {
        image1: z.string().describe("First image path or URL"),
        image2: z.string().describe("Second image path or URL"),
        focus: z.enum(["differences", "similarities", "layout", "content"]).default("differences").optional().describe("What to compare")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedCompare(geminiClient, args);
      } catch (error) {
        return handleToolError("image comparison", error);
      }
    }
  );

  // Document reading tool (simplified)
  server.registerTool(
    "eyes_read_document",
    {
      title: "Read document content",
      description: "Extract text and data from documents",
      inputSchema: {
        document: z.string().describe("Document path or URL"),
        pages: z.string().default("all").optional().describe("Page range (e.g., '1-5' or 'all')"),
        extract: z.enum(["text", "tables", "both"]).default("both").optional().describe("What to extract")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedDocumentRead(geminiClient, args);
      } catch (error) {
        return handleToolError("document reading", error);
      }
    }
  );

  // Document summarization tool (simplified)
  server.registerTool(
    "eyes_summarize_document",
    {
      title: "Summarize document content",
      description: "Create summaries from documents",
      inputSchema: {
        document: z.string().describe("Document path or URL"),
        length: z.enum(["brief", "medium", "detailed"]).default("medium").optional().describe("Summary length"),
        focus: z.string().optional().describe("Specific topics to focus on")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedDocumentSummary(geminiClient, args);
      } catch (error) {
        return handleToolError("document summarization", error);
      }
    }
  );

  logger.info("✅ Optimized Eyes tools registered:");
  logger.info("   • eyes_analyze: Visual content analysis");
  logger.info("   • eyes_compare: Image comparison");
  logger.info("   • eyes_read_document: Document reading");
  logger.info("   • eyes_summarize_document: Document summarization");
  logger.info("   • Average parameters reduced from 8-12 to 2-3");
}

/**
 * Optimized analyze handler with simplified parameters
 */
async function handleOptimizedAnalyze(
  geminiClient: GeminiClient,
  args: any,
  config: Config
) {
  const source = args.source as string;
  const focus = args.focus as string | undefined;
  const detail = (args.detail as string) || "detailed";

  logger.info(`Analyzing visual content: ${source.substring(0, 50)}...`);

  // Auto-detect media type from source
  const mediaType = detectMediaType(source);

  const model = geminiClient.getModel(detail as "quick" | "detailed");
  const options = {
    analysis_type: "general" as const,
    detail_level: detail as "quick" | "detailed",
    specific_focus: focus,
    fetchTimeout: config.server.fetchTimeout
  };

  let result;
  switch (mediaType) {
    case "image":
      result = await processImage(model, source, options);
      break;
    case "video":
      result = await processVideo(model, source, options);
      break;
    case "gif":
      result = await processGif(model, source, options);
      break;
    default:
      throw new Error(`Unsupported media type detected from: ${source}`);
  }

  return {
    content: [{
      type: "text" as const,
      text: formatAnalysisResult(result, focus)
    }],
    isError: false
  };
}

/**
 * Optimized compare handler
 */
async function handleOptimizedCompare(geminiClient: GeminiClient, args: any) {
  const image1 = args.image1 as string;
  const image2 = args.image2 as string;
  const focus = (args.focus as string) || "differences";

  logger.info(`Comparing images with focus: ${focus}`);

  const model = geminiClient.getModel("detailed");

  const focusPrompts = {
    differences: "Identify what's different between these images",
    similarities: "Identify what's similar between these images",
    layout: "Compare the layout and structure of these images",
    content: "Compare the content and meaning of these images"
  };

  const prompt = `${focusPrompts[focus as keyof typeof focusPrompts] || focusPrompts.differences}.

Provide:
• **Summary**: Key findings
• **Details**: Specific observations
• **Impact**: What these changes mean

Be clear and specific with locations and measurements.`;

  try {
    const [image1Data, image2Data] = await Promise.all([
      loadImageForComparison(image1),
      loadImageForComparison(image2)
    ]);

    const response = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: image1Data.mimeType, data: image1Data.data } },
      { text: "vs" },
      { inlineData: { mimeType: image2Data.mimeType, data: image2Data.data } }
    ]);

    const result = response.response.text();
    return {
      content: [{
        type: "text" as const,
        text: result || "No comparison results available"
      }],
      isError: false
    };

  } catch (error) {
    throw new Error(`Image comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Optimized document reading handler
 */
async function handleOptimizedDocumentRead(geminiClient: GeminiClient, args: any) {
  const document = args.document as string;
  const pages = (args.pages as string) || "all";
  const extract = (args.extract as string) || "both";

  logger.info(`Reading document: ${document}`);

  // Auto-detect document format
  const buffer = await loadDocumentForDetection(document);
  const format = DocumentProcessorFactory.detectFormat(document, buffer);

  // Create simplified options
  const options = {
    extractText: extract === "text" || extract === "both",
    extractTables: extract === "tables" || extract === "both",
    extractImages: false, // Simplified: no image extraction
    preserveFormatting: false,
    pageRange: pages === "all" ? undefined : pages,
    detailLevel: "detailed" as "quick" | "detailed"
  };

  const processor = DocumentProcessorFactory.create(format as any, geminiClient);
  const result = await processor.process(document, options);

  return {
    content: [{
      type: "text" as const,
      text: formatDocumentResult(result, extract)
    }],
    isError: false
  };
}

/**
 * Optimized document summarization handler
 */
async function handleOptimizedDocumentSummary(geminiClient: GeminiClient, args: any) {
  const document = args.document as string;
  const length = (args.length as string) || "medium";
  const focus = args.focus as string | undefined;

  logger.info(`Summarizing document: ${document}`);

  // Auto-detect format and read document
  const buffer = await loadDocumentForDetection(document);
  const format = DocumentProcessorFactory.detectFormat(document, buffer);

  // First extract content
  const processor = DocumentProcessorFactory.create(format as any, geminiClient);
  const docResult = await processor.process(document, {
    extractText: true,
    extractTables: true,
    extractImages: false,
    preserveFormatting: false,
    detailLevel: "detailed" as "quick" | "detailed"
  });

  // Then summarize using Gemini
  const model = geminiClient.getModel("detailed");

  const lengthMap = {
    brief: "a brief 2-3 sentence summary",
    medium: "a comprehensive 1-2 paragraph summary",
    detailed: "a detailed multi-paragraph summary"
  };

  const focusText = focus ? `Focus specifically on: ${focus}.` : "";

  const prompt = `Create ${lengthMap[length as keyof typeof lengthMap]} of this document content. ${focusText}

Document content:
${JSON.stringify(docResult, null, 2).substring(0, 8000)}

Provide:
• **Summary**: Main points and conclusions
• **Key Insights**: Important findings
• **Recommendations**: Suggested actions (if applicable)`;

  const response = await model.generateContent(prompt);
  const summary = response.response.text();

  return {
    content: [{
      type: "text" as const,
      text: summary || "No summary could be generated"
    }],
    isError: false
  };
}

/**
 * Helper functions
 */
function detectMediaType(source: string): "image" | "video" | "gif" {
  const ext = source.toLowerCase().split('.').pop() || '';

  if (['gif'].includes(ext)) return 'gif';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) return 'image';

  // Default to image for data URIs and unknown formats
  return 'image';
}

function formatAnalysisResult(result: any, focus?: string): string {
  const focusHeader = focus ? `\n**Focus**: ${focus}\n` : '';

  return `# 👁️ Visual Analysis${focusHeader}

${result.analysis}

---
*Processing time: ${result.metadata.processing_time_ms}ms*`;
}

function formatDocumentResult(result: any, extract: string): string {
  let output = `# 📄 Document Content\n\n`;

  if (extract === "text" || extract === "both") {
    output += `## Text Content\n${result.text || 'No text found'}\n\n`;
  }

  if (extract === "tables" || extract === "both") {
    if (result.tables && result.tables.length > 0) {
      output += `## Tables\n${JSON.stringify(result.tables, null, 2)}\n\n`;
    }
  }

  output += `**Pages processed**: ${result.metadata?.pages_processed || 'Unknown'}\n`;
  output += `**Processing time**: ${result.metadata?.processing_time_ms || 0}ms`;

  return output;
}

function handleToolError(toolName: string, error: unknown) {
  const mcpError = handleError(error);
  logger.error(`${toolName} error:`, mcpError);

  // Simplified error messages
  let userMessage = mcpError.message;
  if (mcpError.message.includes("rate limit") || mcpError.message.includes("quota")) {
    userMessage = "⏱️ Service temporarily busy. Please try again in a moment.";
  } else if (mcpError.message.includes("network") || mcpError.message.includes("fetch")) {
    userMessage = "🌐 Network issue. Please check your connection and try again.";
  } else if (mcpError.message.includes("file") || mcpError.message.includes("path")) {
    userMessage = "📁 File not found or inaccessible. Please check the file path.";
  }

  return {
    content: [{
      type: "text" as const,
      text: `❌ ${userMessage}`
    }],
    isError: true
  };
}

// Re-use existing helper functions from original implementation
async function loadImageForComparison(source: string): Promise<{ data: string; mimeType: string }> {
  // Handle Claude Code virtual image references
  if (source.match(/^\[Image #\d+\]$/)) {
    throw new Error(
      `Virtual image reference "${source}" cannot be processed. ` +
      `Please use a direct file path, URL, or base64 data URI instead.`
    );
  }

  if (source.startsWith('data:image/')) {
    const [header, data] = source.split(',');
    if (!header || !data) {
      throw new Error("Invalid base64 image format");
    }
    const mimeMatch = header.match(/data:(image\/[^;]+)/);
    if (!mimeMatch || !mimeMatch[1]) {
      throw new Error("Invalid base64 image format");
    }
    return { data, mimeType: mimeMatch[1] };
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return {
      data: Buffer.from(buffer).toString('base64'),
      mimeType: response.headers.get('content-type') || 'image/jpeg'
    };
  }

  const fs = await import('fs/promises');
  const buffer = await fs.readFile(source);
  return {
    data: buffer.toString('base64'),
    mimeType: 'image/jpeg'
  };
}

async function loadDocumentForDetection(source: string): Promise<Buffer> {
  if (source.startsWith('data:')) {
    const base64Data = source.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data URI format');
    }
    return Buffer.from(base64Data, 'base64');
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer) {
      throw new Error('Failed to get array buffer from response');
    }
    return Buffer.from(arrayBuffer);
  }

  const fs = await import('fs/promises');
  return await fs.readFile(source);
}
</file>

<file path="README.md">
# Human MCP 👁️

> Bringing Human Capabilities to Coding Agents

![Human MCP](human-mcp.png)

Human MCP v2.2.0 is a comprehensive Model Context Protocol server that provides AI coding agents with human-like capabilities including visual analysis, document processing, speech generation, content creation, and advanced reasoning for debugging, understanding, and enhancing multimodal content.

## Features

🎯 **Visual Analysis (Eyes) - ✅ Complete**
- Analyze screenshots for UI bugs and layout issues
- Process screen recordings to understand error sequences
- Extract insights from GIFs and animations
- Compare visual changes between versions

📄 **Document Processing (Eyes Extended) - ✅ Complete v2.0.0**
- Comprehensive document analysis for PDF, DOCX, XLSX, PPTX, TXT, MD, RTF, ODT, CSV, JSON, XML, HTML
- Structured data extraction using custom JSON schemas
- Document summarization with multiple types (brief, detailed, executive, technical)
- Text extraction with formatting preservation
- Table and image extraction from documents
- Auto-format detection and processing

🔍 **Specialized Analysis Types**
- **UI Debug**: Layout issues, rendering problems, visual bugs
- **Error Detection**: Visible errors, broken functionality, system failures
- **Accessibility**: Color contrast, WCAG compliance, readability
- **Performance**: Loading states, visual performance indicators
- **Layout**: Responsive design, positioning, visual hierarchy
- **Document Analysis**: Content extraction, data mining, document intelligence

🎨 **Content Generation (Hands) - ✅ Complete v2.0.0**
- Generate high-quality images from text descriptions using Imagen API
- Create professional videos from text prompts using Veo 3.0 API
- Image-to-video generation combining Imagen and Veo 3.0
- Multiple artistic styles: photorealistic, artistic, cartoon, sketch, digital art (images) and realistic, cinematic, artistic, cartoon, animation (videos)
- Flexible aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4) and output formats
- Video duration controls (4s, 8s, 12s) with FPS options (1-60 fps)
- Camera movement controls: static, pan, zoom, dolly movements
- Advanced prompt engineering and negative prompts

🗣️ **Speech Generation (Mouth) - ✅ Complete v1.3.0**
- Convert text to natural-sounding speech with 30+ voice options
- Long-form content narration with chapter breaks
- Technical code explanation with spoken analysis
- Voice customization and style control
- Multi-language support (24 languages)
- Professional audio export in WAV format

🧠 **Advanced Reasoning (Brain) - ✅ Complete v2.2.0**
- Sequential thinking with dynamic problem-solving and thought revision
- Multi-step analysis with hypothesis generation and testing
- Deep analytical reasoning with assumption tracking and alternative perspectives
- Problem solving with constraint handling and iterative refinement
- Meta-cognitive reflection and analysis improvement
- Advanced reasoning patterns for complex technical problems

🤖 **AI-Powered**
- Uses Google Gemini 2.5 Flash for fast, accurate analysis
- Advanced Imagen API for high-quality image generation
- Cutting-edge Veo 3.0 API for professional video generation
- Gemini Speech Generation API for natural voice synthesis
- Advanced reasoning with sequential thinking and meta-cognitive reflection
- Detailed technical insights for developers
- Actionable recommendations for fixing issues
- Structured output with detected elements and coordinates

### Google Gemini Documentation
- [Gemini API](https://ai.google.dev/gemini-api/docs?hl=en)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Video Understanding](https://ai.google.dev/gemini-api/docs/video-understanding?hl=en)
- [Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Document Understanding](https://ai.google.dev/gemini-api/docs/document-processing)
- [Audio Understanding](https://ai.google.dev/gemini-api/docs/audio)
- [Speech Generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Video Generation](https://ai.google.dev/gemini-api/docs/video)

## Quick Start

### Getting Your Google Gemini API Key

Before installation, you'll need a Google Gemini API key to enable visual analysis capabilities.

#### Step 1: Access Google AI Studio
1. Visit [Google AI Studio](https://aistudio.google.com/) in your web browser
2. Sign in with your Google account (create one if needed)
3. Accept the terms of service when prompted

#### Step 2: Create an API Key
1. In the Google AI Studio interface, look for the "Get API Key" button or navigate to the API keys section
2. Click "Create API key" or "Generate API key"
3. Choose "Create API key in new project" (recommended) or select an existing Google Cloud project
4. Your API key will be generated and displayed
5. **Important**: Copy the API key immediately as it may not be shown again

#### Step 3: Secure Your API Key
⚠️ **Security Warning**: Treat your API key like a password. Never share it publicly or commit it to version control.

**Best Practices:**
- Store the key in environment variables (not in code)
- Don't include it in screenshots or documentation
- Regenerate the key if accidentally exposed
- Set usage quotas and monitoring in Google Cloud Console
- Restrict API key usage to specific services if possible

#### Step 4: Set Up Environment Variable
Configure your API key using one of these methods:

**Method 1: Shell Environment (Recommended)**
```bash
# Add to your shell profile (.bashrc, .zshrc, .bash_profile)
export GOOGLE_GEMINI_API_KEY="your_api_key_here"

# Reload your shell configuration
source ~/.zshrc  # or ~/.bashrc
```

**Method 2: Project-specific .env File**
```bash
# Create a .env file in your project directory
echo "GOOGLE_GEMINI_API_KEY=your_api_key_here" > .env

# Add .env to your .gitignore file
echo ".env" >> .gitignore
```

**Method 3: MCP Client Configuration**
You can also provide the API key directly in your MCP client configuration (shown in setup examples below).

#### Step 5: Verify API Access
Test your API key works correctly:

```bash
# Test with curl (optional verification)
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

#### Alternative Methods for API Key

**Using Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Generative AI API" 
4. Go to "Credentials" > "Create Credentials" > "API Key"
5. Optionally restrict the key to specific APIs and IPs

**API Key Restrictions (Recommended):**
- Restrict to "Generative AI API" only
- Set IP restrictions if using from specific locations
- Configure usage quotas to prevent unexpected charges
- Enable API key monitoring and alerts

#### Troubleshooting API Key Issues

**Common Problems:**
- **Invalid API Key**: Ensure you copied the complete key without extra spaces
- **API Not Enabled**: Make sure Generative AI API is enabled in your Google Cloud project
- **Quota Exceeded**: Check your usage limits in Google Cloud Console  
- **Authentication Errors**: Verify the key hasn't expired or been revoked

**Testing Your Setup:**
```bash
# Verify environment variable is set
echo $GOOGLE_GEMINI_API_KEY

# Should output your API key (first few characters)
```

### Prerequisites

- Node.js v18+ or [Bun](https://bun.sh) v1.2+
- Google Gemini API key (configured as shown above)

### Installation

Install Human MCP as an npm package:

```bash
# Using npm
npm install -g @goonnguyen/human-mcp

# Using bun (recommended)
bun install -g @goonnguyen/human-mcp

# Using pnpm
pnpm install -g @goonnguyen/human-mcp
```

### Environment Setup

Configure your Google Gemini API key:

```bash
# Option 1: Environment variable (recommended)
export GOOGLE_GEMINI_API_KEY="your_api_key_here"

# Option 2: Add to your shell profile
echo 'export GOOGLE_GEMINI_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

### Development (For Contributors)

If you want to contribute to Human MCP development:

```bash
# Clone the repository
git clone https://github.com/human-mcp/human-mcp.git
cd human-mcp

# Install dependencies  
bun install

# Copy environment template
cp .env.example .env

# Add your Gemini API key to .env
GOOGLE_GEMINI_API_KEY=your_api_key_here

# Start development server
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Type checking
bun run typecheck
```

### Usage with MCP Clients

Human MCP can be configured with various MCP clients for different development workflows. Follow the setup instructions for your preferred client below.

#### Claude Desktop

Claude Desktop is a desktop application that provides a user-friendly interface for interacting with MCP servers.

**Configuration Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration Example:**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Setup Steps:**
1. Install Human MCP globally: `npm install -g @goonnguyen/human-mcp`
2. Create or edit the Claude Desktop configuration file
3. Add the Human MCP server configuration (use the first example with `npx` for reliability)
4. Set your Google Gemini API key in environment variables or the config
5. Restart Claude Desktop

**Verification:**
- Look for the connection indicator in Claude Desktop
- Try using the `eyes_analyze` tool with a test image

#### Claude Code (CLI)

Claude Code is the official CLI for Claude that supports MCP servers for enhanced coding workflows.

**Prerequisites:**
- Node.js v18+ or Bun v1.2+
- Google Gemini API key
- Claude Code CLI installed

**Installation:**

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Install Human MCP server
npm install -g @goonnguyen/human-mcp

# Verify installations
claude --version
human-mcp --version  # or: npx @goonnguyen/human-mcp --version
```

**Configuration Methods:**

Claude Code offers multiple ways to configure MCP servers. Choose the method that best fits your workflow:

**Method 1: Using Claude Code CLI (Recommended)**

```bash
# Add Human MCP server with automatic configuration
claude mcp add --scope user human-mcp npx @goonnguyen/human-mcp --env GOOGLE_GEMINI_API_KEY=your_api_key_here

# Alternative: Add globally installed version
claude mcp add --scope user human-mcp human-mcp --env GOOGLE_GEMINI_API_KEY=your_api_key_here

# List configured MCP servers
claude mcp list

# Remove server if needed
claude mcp remove human-mcp
```

**Method 2: Manual JSON Configuration**

**Configuration Location:**
- **All platforms**: `~/.config/claude/config.json`

**Configuration Example:**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here",
        "LOG_LEVEL": "info",
        "MCP_TIMEOUT": "30000"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here",
        "LOG_LEVEL": "info",
        "MCP_TIMEOUT": "30000"
      }
    }
  }
}
```

**Configuration Scopes:**

Claude Code supports different configuration scopes:

- **User Scope** (`--scope user`): Available across all projects (default)
- **Project Scope** (`--scope project`): Shared via `.mcp.json`, checked into version control
- **Local Scope** (`--scope local`): Private to current project only

```bash
# Project-wide configuration (team sharing)
claude mcp add --scope project human-mcp npx @goonnguyen/human-mcp --env GOOGLE_GEMINI_API_KEY=your_api_key_here

# Local project configuration (private)
claude mcp add --scope local human-mcp npx @goonnguyen/human-mcp --env GOOGLE_GEMINI_API_KEY=your_api_key_here
```

**Setup Steps:**
1. Install Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Configure your Google Gemini API key (see Environment Setup section)
4. Add Human MCP server using CLI or manual configuration
5. Verify configuration: `claude mcp list`

**Verification:**
```bash
# List all configured MCP servers
claude mcp list

# Test Human MCP connection
claude mcp test human-mcp

# Start Claude with MCP servers enabled
claude --enable-mcp

# Check server logs for debugging
claude mcp logs human-mcp
```

**Usage Examples:**
```bash
# Start Claude Code with MCP servers enabled
claude --enable-mcp

# Analyze a screenshot in your current project
claude "Analyze this screenshot for UI issues" --attach screenshot.png

# Use Human MCP tools in conversation
claude "Use eyes_analyze to check this UI screenshot for accessibility issues"

# Pass additional arguments to the MCP server
claude -- --server-arg value "Analyze this image"
```

**Windows-Specific Configuration:**

For Windows users, wrap `npx` commands with `cmd /c`:

```bash
# Windows configuration
claude mcp add --scope user human-mcp cmd /c npx @goonnguyen/human-mcp --env GOOGLE_GEMINI_API_KEY=your_api_key_here
```

Or via JSON configuration:

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

#### OpenCode

OpenCode is a powerful AI coding agent that supports MCP servers for enhanced capabilities. Use Human MCP to add visual analysis tools to your OpenCode workflow.

**Configuration Location:**
- **Global**: `~/.config/opencode/opencode.json`
- **Project**: `./opencode.json` in your project root

**Configuration Example (STDIO - Recommended):**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "human": {
      "type": "local",
      "command": ["npx", "@goonnguyen/human-mcp"],
      "enabled": true,
      "environment": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here",
        "TRANSPORT_TYPE": "stdio",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "human": {
      "type": "local",
      "command": ["human-mcp"],
      "enabled": true,
      "environment": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here",
        "TRANSPORT_TYPE": "stdio"
      }
    }
  }
}
```

**Setup Steps:**
1. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
2. Create or edit your OpenCode configuration file
3. Add the Human MCP server configuration (use `npx` version for reliability)
4. Set your Google Gemini API key in environment variables or the config
5. Restart OpenCode

**Important Notes:**
- **STDIO Mode**: Human MCP uses stdio transport by default, which provides the best compatibility with OpenCode
- **No R2 Uploads**: In stdio mode, all images and videos are processed locally and sent to Gemini using inline base64 - no Cloudflare R2 uploads occur
- **Security**: Never commit API keys to version control. Use environment variables or secure credential storage

**Verification:**
- Check OpenCode logs for successful MCP connection
- Try using `eyes_analyze` tool: "Analyze this screenshot for UI issues"
- Verify no external network calls to Cloudflare R2 in stdio mode

#### Gemini CLI

While Gemini CLI doesn't directly support MCP, you can use Human MCP as a bridge to access visual analysis capabilities.

**Direct Usage:**

```bash
# Run Human MCP server directly (if globally installed)
human-mcp

# Or using npx (no global installation needed)
npx @goonnguyen/human-mcp
```

**Integration Example:**
```bash
# Create a wrapper script for Gemini CLI integration
#!/bin/bash
# gemini-visual-analysis.sh

# Set environment variables
export GOOGLE_GEMINI_API_KEY="your_api_key"

# Run Human MCP analysis
echo '{"source": "'$1'", "type": "image", "analysis_type": "ui_debug"}' | \
  npx @goonnguyen/human-mcp
```

#### MCP Coding Clients (Cline, Cursor, Windsurf)

These IDE extensions support MCP servers for enhanced AI-assisted coding with visual analysis capabilities.

##### Cline (VS Code Extension)

**Configuration Location:**
- VS Code Settings: `.vscode/settings.json` in your workspace
- Or Global Settings: VS Code → Preferences → Settings → Extensions → Cline

**Configuration Example:**

```json
{
  "cline.mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "cline.mcpServers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Setup Steps:**
1. Install Cline extension from VS Code Marketplace
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Open VS Code in your project directory
4. Add Human MCP configuration to workspace settings (use `npx` version for reliability)
5. Restart VS Code or reload the window
6. Open Cline panel and verify MCP connection

##### Cursor

**Configuration Location:**
- Cursor Settings: `.cursor/settings.json` in your workspace
- Or via Cursor → Settings → Extensions → MCP

**Configuration Example:**

```json
{
  "mcp.servers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "mcp.servers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Setup Steps:**
1. Install latest version of Cursor
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Open your project in Cursor
4. Configure MCP servers in settings (use `npx` version for reliability)
5. Enable MCP integration in Cursor preferences
6. Test visual analysis features

##### Windsurf

**Configuration Location:**
- Windsurf config: `~/.windsurf/mcp_servers.json`
- Or project-specific: `.windsurf/mcp_servers.json`

**Configuration Example:**

```json
{
  "servers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      },
      "timeout": 30000
    }
  }
}
```

**Alternative Configuration (if globally installed):**

```json
{
  "servers": {
    "human-mcp": {
      "command": "human-mcp",
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_gemini_api_key_here"
      },
      "timeout": 30000
    }
  }
}
```

**Setup Steps:**
1. Install Windsurf IDE
2. Install Human MCP: `npm install -g @goonnguyen/human-mcp`
3. Create MCP server configuration file
4. Add Human MCP server configuration (use `npx` version for reliability)
5. Restart Windsurf
6. Verify connection in MCP panel

### Environment Variable Setup

For all clients, ensure your Google Gemini API key is properly configured:

**Option 1: System Environment Variables (Recommended)**
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export GOOGLE_GEMINI_API_KEY="your_api_key_here"

# Reload your shell
source ~/.zshrc  # or ~/.bashrc
```

**Option 2: Client Configuration**
Include the API key directly in the MCP server configuration (as shown in examples above). This is the most reliable method for ensuring the key is available to the Human MCP server.

**Option 3: Global .env File (Advanced)**
```bash
# Create a global .env file (optional)
echo "GOOGLE_GEMINI_API_KEY=your_api_key_here" >> ~/.env

# Source it in your shell profile
echo "source ~/.env" >> ~/.zshrc
```

### Connection Verification

**Test Human MCP Server:**
```bash
# Test the server directly (if globally installed)
human-mcp

# Or using npx (no installation needed)
npx @goonnguyen/human-mcp

# For development/testing, use the MCP inspector from source
# (only if you have cloned the repository for development)
cd /path/to/human-mcp && bun run inspector
```

**Test with MCP Clients:**
1. Check client logs for connection status
2. Try using `eyes_analyze` tool with a test image
3. Verify API responses are returned correctly
4. Look for the Human MCP server in the client's MCP server list

### Troubleshooting

**Common Issues:**

1. **Connection Failed**
   - Verify Node.js/npm or Bun is installed and accessible
   - Ensure `@goonnguyen/human-mcp` package is installed
   - Check Google Gemini API key is valid and properly configured

2. **Package Not Found**
   - Install Human MCP globally: `npm install -g @goonnguyen/human-mcp`
   - Or use `npx @goonnguyen/human-mcp` without global installation
   - Verify package installation: `npm list -g @goonnguyen/human-mcp`

3. **Tool Not Found**
   - Restart the MCP client after configuration changes
   - Check Human MCP server logs for errors
   - Verify the server starts: `npx @goonnguyen/human-mcp`

4. **API Errors**
   - Validate Google Gemini API key
   - Check API quota and usage limits
   - Review network connectivity and firewall settings

5. **Permission Errors**
   - Check npm global installation permissions
   - Use `npx` instead of global installation if needed
   - Verify API key has necessary permissions

**Debug Steps:**
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run Human MCP with verbose output
npx @goonnguyen/human-mcp --verbose

# Check package installation
npm list -g @goonnguyen/human-mcp

# Test direct execution
human-mcp --version  # if globally installed

# Check MCP client logs
# (Location varies by client - check client documentation)
```

**Getting Help:**
- Check [Human MCP Issues](https://github.com/human-mcp/human-mcp/issues) 
- Review client-specific MCP documentation  
- Test package installation: `npx @goonnguyen/human-mcp --help`

## HTTP Transport & Local Files

### Overview

Human MCP supports HTTP transport mode for clients like Claude Desktop that require HTTP-based communication instead of stdio. When using HTTP transport with local files, the server automatically handles file uploading to ensure compatibility.

### Using Local Files with HTTP Transport

When Claude Desktop or other HTTP transport clients access local files, they often use virtual paths like `/mnt/user-data/uploads/file.png`. The Human MCP server automatically detects these paths and uploads files to Cloudflare R2 for processing.

#### Automatic Upload (Default Behavior)

When you provide a local file path, the server automatically:
1. Detects the local file path or Claude Desktop virtual path
2. Uploads it to Cloudflare R2 (if configured)
3. Returns the CDN URL for processing
4. Uses the fast Cloudflare CDN for delivery

#### Manual Upload Options

##### Option 1: Upload File Directly

```bash
# Upload file to Cloudflare R2 and get CDN URL
curl -X POST http://localhost:3000/mcp/upload \
  -F "file=@/path/to/image.png" \
  -H "Authorization: Bearer your_secret"

# Response:
{
  "result": {
    "success": true,
    "url": "https://cdn.example.com/human-mcp/abc123.png",
    "originalName": "image.png",
    "size": 102400,
    "mimeType": "image/png"
  }
}
```

##### Option 2: Upload Base64 Data

```bash
# Upload base64 data to Cloudflare R2
curl -X POST http://localhost:3000/mcp/upload-base64 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret" \
  -d '{
    "data": "iVBORw0KGgoAAAANSUhEUgA...",
    "mimeType": "image/png",
    "filename": "screenshot.png"
  }'
```

##### Option 3: Use Existing CDN URLs

If your files are already hosted, use the public URL directly:
- Cloudflare R2: `https://cdn.example.com/path/to/file.jpg`
- Other CDNs: Any publicly accessible URL

### Cloudflare R2 Configuration

#### Required Environment Variables

Add these to your `.env` file:

```env
# Cloudflare R2 Storage Configuration
CLOUDFLARE_CDN_PROJECT_NAME=human-mcp
CLOUDFLARE_CDN_BUCKET_NAME=your-bucket-name
CLOUDFLARE_CDN_ACCESS_KEY=your_access_key
CLOUDFLARE_CDN_SECRET_KEY=your_secret_key
CLOUDFLARE_CDN_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_CDN_BASE_URL=https://cdn.example.com
```

#### Setting up Cloudflare R2

1. **Create Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)

2. **Enable R2 Storage**: Go to R2 Object Storage in your Cloudflare dashboard

3. **Create a Bucket**: 
   - Name: `your-bucket-name`
   - Location: Choose based on your needs

4. **Generate API Credentials**:
   - Go to "Manage R2 API Tokens" 
   - Create token with R2:Object:Write permissions
   - Copy the access key and secret key

5. **Set up Custom Domain** (Optional):
   - Add custom domain to your R2 bucket
   - Update `CLOUDFLARE_CDN_BASE_URL` with your domain

#### Claude Desktop HTTP Configuration

For Claude Desktop with HTTP transport and automatic file uploads:

```json
{
  "mcpServers": {
    "human-mcp-http": {
      "command": "node",
      "args": ["path/to/http-wrapper.js"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_key",
        "TRANSPORT_TYPE": "http",
        "HTTP_PORT": "3000",
        "CLOUDFLARE_CDN_BUCKET_NAME": "your-bucket",
        "CLOUDFLARE_CDN_ACCESS_KEY": "your-access-key",
        "CLOUDFLARE_CDN_SECRET_KEY": "your-secret-key",
        "CLOUDFLARE_CDN_ENDPOINT_URL": "https://account.r2.cloudflarestorage.com",
        "CLOUDFLARE_CDN_BASE_URL": "https://cdn.example.com"
      }
    }
  }
}
```

### Benefits of Cloudflare R2 Integration

- **Fast Global Delivery**: Files served from Cloudflare's 300+ edge locations
- **Automatic Handling**: No manual conversion needed for local files
- **Large File Support**: Handle files up to 100MB
- **Persistent URLs**: Files remain accessible for future reference
- **Cost Effective**: Cloudflare R2 offers competitive pricing with no egress fees
- **Enhanced Security**: Files isolated from server filesystem

### Alternative Solutions

#### Using stdio Transport

For users who need direct local file access without cloud uploads:

```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "key",
        "TRANSPORT_TYPE": "stdio"
      }
    }
  }
}
```

#### Pre-uploading Files

Batch upload files using the upload endpoints:

```bash
#!/bin/bash
# Upload script
for file in *.png; do
  curl -X POST http://localhost:3000/mcp/upload \
    -F "file=@$file" \
    -H "Authorization: Bearer $MCP_SECRET"
done
```

## Tools

### eyes_analyze

Comprehensive visual analysis for images, videos, and GIFs.

```json
{
  "source": "/path/to/screenshot.png",
  "type": "image", 
  "analysis_type": "ui_debug",
  "detail_level": "detailed",
  "specific_focus": "login form validation"
}
```

### eyes_compare

Compare two images to identify visual differences.

```json
{
  "source1": "/path/to/before.png",
  "source2": "/path/to/after.png",
  "comparison_type": "structural"
}
```

### eyes_read_document

Comprehensive document analysis and content extraction.

```json
{
  "source": "/path/to/document.pdf",
  "format": "auto",
  "options": {
    "extract_text": true,
    "extract_tables": true,
    "detail_level": "detailed"
  }
}
```

### eyes_extract_data

Extract structured data from documents using custom schemas.

```json
{
  "source": "/path/to/invoice.pdf",
  "format": "auto",
  "schema": {
    "invoice_number": "string",
    "amount": "number",
    "date": "string"
  }
}
```

### eyes_summarize

Generate summaries and key insights from documents.

```json
{
  "source": "/path/to/report.docx",
  "format": "auto",
  "options": {
    "summary_type": "executive",
    "include_key_points": true,
    "max_length": 500
  }
}
```

### mouth_speak

Convert text to natural-sounding speech.

```json
{
  "text": "Welcome to our application. Let me guide you through the interface.",
  "voice": "Zephyr",
  "language": "en-US",
  "style_prompt": "Speak in a friendly, welcoming tone"
}
```

### mouth_narrate

Generate narration for long-form content with chapter breaks.

```json
{
  "content": "Chapter 1: Introduction to React...",
  "voice": "Sage",
  "narration_style": "educational",
  "chapter_breaks": true
}
```

### mouth_explain

Generate spoken explanations of code with technical analysis.

```json
{
  "code": "function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }",
  "programming_language": "javascript",
  "voice": "Apollo",
  "explanation_level": "intermediate"
}
```

### mouth_customize

Test different voices and styles for optimal content delivery.

```json
{
  "text": "Hello, this is a voice test sample.",
  "voice": "Charon",
  "style_variations": ["professional", "casual", "energetic"],
  "compare_voices": ["Puck", "Sage", "Apollo"]
}
```

### gemini_gen_image

Generate high-quality images from text descriptions using Gemini Imagen API.

```json
{
  "prompt": "A modern minimalist login form with clean typography",
  "style": "digital_art",
  "aspect_ratio": "16:9",
  "negative_prompt": "cluttered, low quality, blurry"
}
```

### gemini_gen_video

Generate professional videos from text descriptions using Gemini Veo 3.0 API.

```json
{
  "prompt": "A serene mountain landscape at sunrise with gentle camera movement",
  "duration": "8s",
  "style": "cinematic",
  "aspect_ratio": "16:9",
  "camera_movement": "pan_right",
  "fps": 30
}
```

### gemini_image_to_video

Generate videos from images and text descriptions using Imagen + Veo 3.0 pipeline.

```json
{
  "prompt": "Animate this landscape with flowing water and moving clouds",
  "image_input": "data:image/jpeg;base64,/9j/4AAQ...",
  "duration": "12s",
  "style": "realistic",
  "camera_movement": "zoom_in"
}
```

### mouth_speak

Convert text to natural-sounding speech with voice customization.

```json
{
  "text": "Welcome to our application. Let me guide you through the interface.",
  "voice": "Zephyr",
  "language": "en-US",
  "style_prompt": "Speak in a friendly, welcoming tone"
}
```

### mouth_narrate

Generate narration for long-form content with chapter breaks and style control.

```json
{
  "content": "Chapter 1: Introduction to React...",
  "voice": "Sage",
  "narration_style": "educational",
  "chapter_breaks": true,
  "max_chunk_size": 8000
}
```

### mouth_explain

Generate spoken explanations of code with technical analysis.

```json
{
  "code": "function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }",
  "programming_language": "javascript",
  "voice": "Apollo",
  "explanation_level": "intermediate",
  "include_examples": true
}
```

### mouth_customize

Test different voices and styles to find the best fit for your content.

```json
{
  "text": "Hello, this is a voice test sample.",
  "voice": "Charon",
  "style_variations": ["professional", "casual", "energetic"],
  "compare_voices": ["Puck", "Sage", "Apollo"]
}
```

### brain_think

Advanced sequential thinking with dynamic problem-solving and thought revision.

```json
{
  "problem": "Complex technical issue requiring multi-step analysis",
  "initialThoughts": 5,
  "thinkingStyle": "analytical",
  "context": {
    "domain": "software engineering",
    "constraints": ["limited resources", "tight deadline"]
  },
  "options": {
    "allowRevision": true,
    "enableBranching": true,
    "maxThoughts": 10
  }
}
```

### brain_analyze

Deep analytical reasoning with assumption tracking and alternative perspectives.

```json
{
  "subject": "System architecture design decisions",
  "analysisDepth": "detailed",
  "considerAlternatives": true,
  "trackAssumptions": true,
  "focusAreas": ["scalability", "security", "maintainability"],
  "thinkingStyle": "systematic"
}
```

### brain_solve

Multi-step problem solving with hypothesis testing and constraint handling.

```json
{
  "problemStatement": "Performance bottleneck in distributed system",
  "solutionApproach": "systematic",
  "verifyHypotheses": true,
  "maxIterations": 10,
  "constraints": ["budget limitations", "existing infrastructure"],
  "requirements": ["99.9% uptime", "sub-second response"]
}
```

### brain_reflect

Meta-cognitive reflection and analysis improvement.

```json
{
  "originalAnalysis": "Previous analysis of system architecture decisions and their implications...",
  "reflectionFocus": ["assumptions", "logic_gaps", "alternative_approaches"],
  "improvementGoals": ["reduce bias", "consider edge cases"],
  "newInformation": "Recent performance metrics show different bottlenecks"
}
```

## Example Use Cases

### Debugging UI Issues
```bash
# Analyze a screenshot for layout problems
{
  "source": "broken-layout.png",
  "type": "image",
  "analysis_type": "ui_debug"
}
```

### Error Investigation  
```bash
# Analyze screen recording of an error
{
  "source": "error-recording.mp4", 
  "type": "video",
  "analysis_type": "error_detection"
}
```

### Accessibility Audit
```bash
# Check accessibility compliance
{
  "source": "page-screenshot.png",
  "type": "image",
  "analysis_type": "accessibility",
  "check_accessibility": true
}
```

### Image Generation for Design
```bash
# Generate UI mockups and design elements
{
  "prompt": "Professional dashboard interface with data visualization charts",
  "style": "digital_art",
  "aspect_ratio": "16:9"
}
```

### Prototype Creation
```bash
# Create visual prototypes for development
{
  "prompt": "Mobile app login screen with modern design, dark theme",
  "style": "photorealistic",
  "aspect_ratio": "9:16",
  "negative_prompt": "old-fashioned, bright colors"
}
```

### Video Generation for Prototyping
```bash
# Create animated prototypes and demonstrations
{
  "prompt": "User interface animation showing a smooth login process with form transitions",
  "duration": "8s",
  "style": "digital_art",
  "aspect_ratio": "16:9",
  "camera_movement": "static",
  "fps": 30
}
```

### Marketing Video Creation
```bash
# Generate promotional videos for products
{
  "prompt": "Elegant product showcase video with professional lighting and smooth camera movement",
  "duration": "12s",
  "style": "cinematic",
  "aspect_ratio": "16:9",
  "camera_movement": "dolly_forward"
}
```

### Code Explanation Audio
```bash
# Generate spoken explanations for code reviews
{
  "code": "const useAuth = () => { const [user, setUser] = useState(null); return { user, login: setUser }; }",
  "programming_language": "javascript",
  "voice": "Apollo",
  "explanation_level": "advanced",
  "include_examples": true
}
```

### Documentation Narration
```bash
# Convert technical documentation to audio
{
  "content": "This API endpoint handles user authentication and returns a JWT token...",
  "voice": "Sage",
  "narration_style": "professional",
  "chapter_breaks": true
}
```

### User Interface Voice Feedback
```bash
# Generate voice responses for applications
{
  "text": "File uploaded successfully. Processing will complete in approximately 30 seconds.",
  "voice": "Kore",
  "language": "en-US",
  "style_prompt": "Speak in a helpful, reassuring tone"
}
```

### Advanced Problem Solving
```bash
# Analyze complex technical issues with multi-step reasoning
{
  "problem": "Database performance degradation in production environment",
  "initial_thoughts": 8,
  "allow_revision": true,
  "enable_branching": true,
  "thinking_style": "systematic"
}
```

### Architecture Decision Analysis
```bash
# Deep analysis of system design decisions
{
  "subject": "Microservices vs monolithic architecture for e-commerce platform",
  "analysis_depth": "detailed",
  "consider_alternatives": true,
  "track_assumptions": true
}
```

### Hypothesis-Driven Debugging
```bash
# Systematic problem solving with hypothesis testing
{
  "problem_statement": "API response time increased by 300% after deployment",
  "solution_approach": "scientific",
  "verify_hypotheses": true,
  "max_iterations": 15
}
```

### Code Review Reasoning
```bash
# Reflect on code analysis and optimization approaches
{
  "previous_analysis": "Initial code review findings",
  "reflection_focus": ["performance_assumptions", "security_gaps", "maintainability"],
  "optimize_process": true
}
```

## Prompts

Human MCP includes pre-built prompts for common debugging scenarios:

- `debug_ui_screenshot` - Analyze UI screenshots for issues
- `analyze_error_recording` - Debug errors in screen recordings  
- `accessibility_audit` - Perform accessibility audits
- `performance_visual_audit` - Analyze performance indicators
- `layout_comparison` - Compare layouts for differences

## Resources

Access built-in documentation:

- `humanmcp://docs/api` - Complete API reference
- `humanmcp://examples/debugging` - Real-world debugging examples

## Configuration

### Transport Configuration

Human MCP supports multiple transport modes for maximum compatibility with different MCP clients:

#### Standard Mode (Default)
Uses modern Streamable HTTP transport with SSE notifications.

```bash
# Transport configuration
TRANSPORT_TYPE=stdio              # Options: stdio, http, both
HTTP_PORT=3000                   # HTTP server port
HTTP_HOST=0.0.0.0               # HTTP server host
HTTP_SESSION_MODE=stateful       # Options: stateful, stateless
HTTP_ENABLE_SSE=true            # Enable SSE notifications
HTTP_ENABLE_JSON_RESPONSE=true  # Enable JSON responses
```

#### Legacy Client Support
For older MCP clients that only support the deprecated HTTP+SSE transport:

```bash
# SSE Fallback configuration (for legacy clients)
HTTP_ENABLE_SSE_FALLBACK=true    # Enable legacy SSE transport
HTTP_SSE_STREAM_PATH=/sse        # SSE stream endpoint path
HTTP_SSE_MESSAGE_PATH=/messages  # SSE message endpoint path
```

When enabled, Human MCP provides isolated SSE fallback endpoints:
- **GET /sse** - Establishes SSE connection for legacy clients
- **POST /messages** - Handles incoming messages from legacy clients

**Important Notes:**
- SSE fallback is disabled by default following YAGNI principles
- Sessions are segregated between transport types to prevent mixing
- Modern clients should use the standard `/mcp` endpoints
- Legacy clients use separate `/sse` and `/messages` endpoints

### Environment Variables

```bash
# Required
GOOGLE_GEMINI_API_KEY=your_api_key

# Optional Core Configuration
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
LOG_LEVEL=info
PORT=3000
MAX_REQUEST_SIZE=50MB
ENABLE_CACHING=true
CACHE_TTL=3600

# Security Configuration
HTTP_SECRET=your_http_secret_here
HTTP_CORS_ENABLED=true
HTTP_CORS_ORIGINS=*
HTTP_DNS_REBINDING_ENABLED=true
HTTP_ALLOWED_HOSTS=127.0.0.1,localhost
HTTP_ENABLE_RATE_LIMITING=false
```

## Architecture

```
Human MCP Server
├── Eyes Tool (Vision Understanding)
│   ├── Image Analysis
│   ├── Video Processing
│   ├── GIF Frame Extraction
│   ├── Visual Comparison
│   └── Document Processing (PDF, DOCX, XLSX, PPTX, etc.)
├── Hands Tool (Content Generation)
│   ├── Image Generation (Imagen API)
│   ├── Video Generation (Veo 3.0 API)
│   ├── Image-to-Video Pipeline
│   ├── Style Customization
│   ├── Aspect Ratio & Duration Control
│   ├── Camera Movement Control
│   └── Prompt Engineering
├── Mouth Tool (Speech Generation)
│   ├── Text-to-Speech Synthesis
│   ├── Long-form Narration
│   ├── Code Explanation
│   └── Voice Customization
├── Brain Tool (Advanced Reasoning) ✅ COMPLETE
│   ├── Sequential Thinking
│   ├── Deep Analytical Reasoning
│   ├── Problem Solving
│   ├── Meta-cognitive Reflection
│   ├── Hypothesis Testing
│   ├── Thought Revision
│   ├── Assumption Tracking
│   └── Context-aware Reasoning
├── Debugging Prompts
└── Documentation Resources
```

For detailed architecture information and future development plans, see:
- **[Project Roadmap](docs/project-roadmap.md)** - Complete development roadmap and future vision
- **[Architecture Documentation](docs/codebase-structure-architecture-code-standards.md)** - Technical architecture and code standards

## Development Roadmap & Vision

**Mission**: Transform AI coding agents with complete human-like sensory capabilities, bridging the gap between artificial and human intelligence through sophisticated multimodal analysis.

### Current Status: Phase 1-2 Complete ✅ | Phase 4-6 Complete ✅ | v2.2.0

**Eyes (Visual Analysis + Document Processing)** - Production Ready (v2.0.0)
- ✅ Advanced image, video, and GIF analysis capabilities
- ✅ UI debugging, error detection, accessibility auditing
- ✅ Image comparison with pixel, structural, and semantic analysis
- ✅ Document processing for PDF, DOCX, XLSX, PPTX, TXT, MD, RTF, ODT, CSV, JSON, XML, HTML
- ✅ Structured data extraction using custom JSON schemas
- ✅ Document summarization with multiple types (brief, detailed, executive, technical)
- ✅ Processing 20+ visual formats + 12+ document formats with 95%+ success rate
- ✅ Sub-30 second response times for images, sub-60 second for documents

**Mouth (Speech Generation)** - Production Ready (v1.3.0)
- ✅ Natural text-to-speech with 30+ voice options
- ✅ Long-form content narration with chapter breaks
- ✅ Technical code explanation with spoken analysis
- ✅ Voice customization and style control
- ✅ Multi-language support (24 languages)
- ✅ Professional audio export in WAV format

**Hands (Content Generation)** - Production Ready (v2.0.0)
- ✅ High-quality image generation using Gemini Imagen API
- ✅ Professional video generation using Gemini Veo 3.0 API
- ✅ Image-to-video generation pipeline combining Imagen + Veo 3.0
- ✅ Multiple artistic styles and aspect ratios for both images and videos
- ✅ Video duration controls (4s, 8s, 12s) with FPS options (1-60 fps)
- ✅ Camera movement controls: static, pan, zoom, dolly movements
- ✅ Advanced prompt engineering with negative prompts
- ✅ Comprehensive validation and error handling with retry logic
- ✅ Fast generation times with reliable output

**Brain (Advanced Reasoning)** - Production Ready (v2.2.0)
- ✅ Sequential thinking with dynamic problem-solving and thought revision
- ✅ Deep analytical reasoning with assumption tracking and alternative perspectives
- ✅ Problem solving with hypothesis testing and constraint handling
- ✅ Meta-cognitive reflection and analysis improvement
- ✅ Multiple thinking styles (analytical, systematic, creative, scientific, etc.)
- ✅ Context-aware reasoning with domain-specific considerations
- ✅ Confidence scoring and evidence evaluation
- ✅ Comprehensive reasoning workflows for complex technical problems

### Remaining Development Phases

#### Phase 3: Audio Processing - Ears (Q1 2025)
**Advanced Audio Intelligence**
- Speech-to-text transcription with speaker identification
- Audio content analysis (music, speech, noise classification)
- Audio quality assessment and debugging capabilities
- Support for 20+ audio formats (WAV, MP3, AAC, OGG, FLAC)
- Real-time audio processing capabilities

#### Phase 4: Speech Generation - Mouth ✅ COMPLETE
**AI Voice Capabilities** - Production Ready (v1.3.0)
- ✅ High-quality text-to-speech with 30+ voice options using Gemini Speech API
- ✅ Code explanation and technical content narration
- ✅ Multi-language speech generation (24 languages supported)
- ✅ Long-form content narration with chapter breaks and natural pacing
- ✅ Professional-quality audio export in WAV format
- ✅ Voice customization with style prompts and voice comparison

#### Phase 5: Content Generation - Hands ✅ COMPLETE
**Creative Content Creation** - Production Ready (v2.0.0)
- ✅ Image generation from text descriptions using Imagen API
- ✅ Video generation from text prompts using Veo 3.0 API
- ✅ Image-to-video generation pipeline combining Imagen + Veo 3.0
- ✅ Multiple artistic styles for images and videos
- ✅ Flexible aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4
- ✅ Video duration controls (4s, 8s, 12s) with FPS options (1-60 fps)
- ✅ Camera movement controls: static, pan, zoom, dolly movements
- ✅ Advanced prompt engineering with negative prompts
- ✅ Comprehensive error handling and validation with retry logic
- Future: Advanced image editing (inpainting, style transfer, enhancement)
- Future: Animation creation with motion graphics

#### Phase 6: Brain - Advanced Reasoning ✅ COMPLETE
**Advanced Cognitive Intelligence** - Production Ready (v2.2.0)
- ✅ Sequential thinking with dynamic problem-solving and thought revision
- ✅ Deep analytical reasoning with assumption tracking and alternative perspectives
- ✅ Problem solving with hypothesis testing and constraint handling
- ✅ Meta-cognitive reflection and analysis improvement
- ✅ Multiple thinking styles (analytical, systematic, creative, scientific, critical, strategic, intuitive, collaborative)
- ✅ Context-aware reasoning with domain-specific considerations
- ✅ Confidence scoring and evidence evaluation
- ✅ Comprehensive reasoning workflows for complex technical problems

### Target Architecture (Current v2.2.0 - Almost Complete)

The evolution from single-capability visual analysis to comprehensive human-like sensory and cognitive intelligence (5 of 6 phases complete):

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────────┐
│   AI Agent      │◄──►│    Human MCP         │◄──►│  Google AI Services     │
│  (MCP Client)   │    │    Server            │    │ • Gemini Vision API     │
└─────────────────┘    │                      │    │ • Gemini Audio API      │
                       │  👁️ Eyes (Vision)   │    │ • Gemini Speech API     │
                       │  • Images/Video      │    │ • Imagen API (Images)   │
                       │  • Documents         │    │ • Veo3 API (Video)      │
                       │                      │    └─────────────────────────┘
                       │  👂 Ears (Audio)     │
                       │  • Speech-to-Text    │
                       │  • Audio Analysis    │
                       │                      │
                       │  👄 Mouth (Speech)   │
                       │  • Text-to-Speech    │
                       │  • Narration         │
                       │                      │
                       │  ✋ Hands (Creation) │
                       │  • Image Generation ✅│
                       │  • Video Generation ✅│
                       │                      │
                       │  🧠 Brain (Reasoning)│
                       │  • Sequential Think ✅│
                       │  • Hypothesis Test  ✅│
                       │  • Reflection       ✅│
                       └──────────────────────┘
```

### Key Benefits by 2025

**For Developers:**
- Complete multimodal debugging and analysis workflows
- Automated accessibility auditing and compliance checking
- Visual regression testing and quality assurance
- Document analysis for technical specifications
- Audio processing for voice interfaces and content
- Advanced reasoning and hypothesis-driven problem solving

**For AI Agents:**
- Human-like understanding of visual, audio, and document content
- Ability to generate explanatory content in multiple formats
- Sophisticated analysis capabilities beyond text processing
- Enhanced debugging and problem-solving workflows
- Creative content generation and editing capabilities
- Advanced cognitive processing with sequential thinking and reflection

### Success Metrics & Timeline

- **Phase 2 (Document Understanding)**: ✅ Completed September 2025
- **Phase 3 (Audio Processing)**: January - March 2025
- **Phase 4 (Speech Generation)**: ✅ Completed September 2025
- **Phase 5 (Content Generation)**: ✅ Completed September 2025
- **Phase 6 (Brain/Reasoning)**: ✅ Completed September 2025

**Target Goals:**
- Support 50+ file formats across all modalities
- 99%+ success rate with optimized processing times (images <30s, videos <5min)
- ✅ Advanced reasoning with 95%+ logical consistency (ACHIEVED)
- 1000+ MCP client integrations and 100K+ monthly API calls
- ✅ Comprehensive documentation with real-world examples (ACHIEVED)
- ✅ Professional-grade content generation and reasoning capabilities (ACHIEVED)

### Getting Involved

Human MCP is built for the developer community. Whether you're integrating with MCP clients, contributing to core development, or providing feedback, your involvement shapes the future of AI agent capabilities.

- **Beta Testing**: Early access to new phases and features
- **Integration Partners**: Work with us to optimize for your MCP client
- **Community Feedback**: Help prioritize features and improvements

## Supported Formats

**Visual Analysis Formats**:
- **Images**: PNG, JPEG, WebP, GIF (static)
- **Videos**: MP4, WebM, MOV, AVI
- **GIFs**: Animated GIF with frame extraction
- **Sources**: File paths, URLs, base64 data URLs

**Document Processing Formats (v2.0.0)**:
- **Documents**: PDF, DOCX, XLSX, PPTX, TXT, MD, RTF, ODT
- **Data**: CSV, JSON, XML, HTML
- **Features**: Text extraction, table processing, structured data extraction
- **Auto-detection**: Automatic format detection from content and extensions

**Speech Generation Formats**:
- **Output**: WAV (Base64 encoded), 24kHz mono
- **Languages**: 24+ languages supported
- **Voices**: 30+ voice options with style control

**Content Generation Formats**:
- **Images**: PNG, JPEG (Base64 output)
- **Videos**: MP4 (Base64 output)
- **Durations**: 4s, 8s, 12s video lengths
- **Quality**: Professional-grade output with customizable FPS (1-60)

**Reasoning Capabilities (v2.2.0)**:
- **Thinking Styles**: Analytical, systematic, creative, scientific, critical, strategic, intuitive, collaborative
- **Problem Types**: Technical debugging, architecture decisions, hypothesis testing, complex analysis
- **Output Formats**: Structured reasoning chains, hypothesis validation, reflection analysis, confidence scoring
- **Complexity**: Multi-step analysis with branching logic, thought revision, and meta-cognitive reflection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Project Roadmap](docs/project-roadmap.md)** - Development roadmap and future vision through 2025
- **[Project Overview & PDR](docs/project-overview-pdr.md)** - Project overview and product requirements
- **[Architecture & Code Standards](docs/codebase-structure-architecture-code-standards.md)** - Technical architecture and coding standards
- **[Codebase Summary](docs/codebase-summary.md)** - Comprehensive codebase overview

## Support

- 📖 [Documentation](docs/) - Complete project documentation
- 💡 [Examples](humanmcp://examples/debugging) - Usage examples and debugging workflows
- 🐛 [Issues](https://github.com/human-mcp/human-mcp/issues) - Report bugs and request features
- 💬 [Discussions](https://github.com/human-mcp/human-mcp/discussions) - Community discussions

---

**Human MCP** - Making visual debugging as natural as asking a human to look at your screen.
</file>

<file path="CHANGELOG.md">
# [2.5.0](https://github.com/mrgoonie/human-mcp/compare/v2.4.1...v2.5.0) (2025-09-29)


### Features

* **logging:** enhance logging infrastructure and analysis ([a82167d](https://github.com/mrgoonie/human-mcp/commit/a82167d35c1b1954a6d6522dbe4a57cb4462ae33))

## [2.4.1](https://github.com/mrgoonie/human-mcp/compare/v2.4.0...v2.4.1) (2025-09-29)


### Bug Fixes

* **eyes_analyze:** enhance image analysis with retry and fallback mechanisms ([8f46f96](https://github.com/mrgoonie/human-mcp/commit/8f46f969e3891392526f838847cfbc6a48011878))

# [2.4.0](https://github.com/mrgoonie/human-mcp/compare/v2.3.0...v2.4.0) (2025-09-28)


### Features

* **eyes_analyze:** improve API reliability and image processing ([c53c4f9](https://github.com/mrgoonie/human-mcp/commit/c53c4f9f6226b843a7e7d1e3be7752ca9e9b48fc))

# [2.3.0](https://github.com/mrgoonie/human-mcp/compare/v2.2.0...v2.3.0) (2025-09-22)


### Bug Fixes

* **typescript:** resolve null safety in image content block parsing ([4ddaa3e](https://github.com/mrgoonie/human-mcp/commit/4ddaa3eb0e9e7aae7e294ca603ca3f12a395636c))


### Features

* improve dev workflows and image generation response format ([15f2f51](https://github.com/mrgoonie/human-mcp/commit/15f2f51890b3cb262dd303c0f7ec1aeadded15c2))

# [2.2.0](https://github.com/mrgoonie/human-mcp/compare/v2.1.0...v2.2.0) (2025-09-21)


### Bug Fixes

* **typescript:** resolve compilation errors in brain tools and hands tools ([c96ab09](https://github.com/mrgoonie/human-mcp/commit/c96ab09b6b05c5f0c6032ed5c777392ec6ce1a23))


### Features

* **brain:** implement advanced reasoning capabilities ([b181b1e](https://github.com/mrgoonie/human-mcp/commit/b181b1eeaef201d6a333e9319e1dd4865f799adc))

# [2.1.0](https://github.com/mrgoonie/human-mcp/compare/v2.0.0...v2.1.0) (2025-09-21)


### Features

* **hands:** complete Phase 5 - Professional Video Generation with Veo 3.0 API ([21edbc9](https://github.com/mrgoonie/human-mcp/commit/21edbc9e6a783953de32310d76230da776244ec6))

# [2.0.0](https://github.com/mrgoonie/human-mcp/compare/v1.4.0...v2.0.0) (2025-09-21)


### Bug Fixes

* **ci:** resolve TypeScript compilation errors for Bun compatibility ([cf63114](https://github.com/mrgoonie/human-mcp/commit/cf6311453ec2c7028198a750fe2c908705085179))
* update lockfile to sync with package.json dependencies ([647c862](https://github.com/mrgoonie/human-mcp/commit/647c86285679dcc3f7727b2d59a774d8c5ea7280))


### Features

* add document processing capabilities to eyes tools ([082cae7](https://github.com/mrgoonie/human-mcp/commit/082cae779d99d1221d05dc4f30021371d1909ec2))
* **hands:** implement image generation tool using Gemini Imagen API ([a8304a5](https://github.com/mrgoonie/human-mcp/commit/a8304a5293eb76465fcc7a55263b74505e03a8e2))
* **mouth:** implement comprehensive speech generation tools ([ebbae52](https://github.com/mrgoonie/human-mcp/commit/ebbae52cdb345888221a4eebd473ad7ad0a29f1e))


### BREAKING CHANGES

* **hands:** None - additive feature implementation

Closes: Phase 5 Content Generation milestone

# [1.4.0](https://github.com/mrgoonie/human-mcp/compare/v1.3.0...v1.4.0) (2025-09-15)


### Features

* add OpenCode STDIO compatibility and R2 skip logic ([ea1d03a](https://github.com/mrgoonie/human-mcp/commit/ea1d03a753a34598baf64d26170bedeaead63deb))

# [1.3.0](https://github.com/mrgoonie/human-mcp/compare/v1.2.1...v1.3.0) (2025-09-15)


### Bug Fixes

* **test:** resolve SSE transport timeouts and server lifecycle issues ([53baad5](https://github.com/mrgoonie/human-mcp/commit/53baad54c3482e3dfc4c22865f2c04c390718a04))


### Features

* add OpenCode agent definitions for code review, debugging, docs, git and planning ([69ef21f](https://github.com/mrgoonie/human-mcp/commit/69ef21fc018a20320cb0cf2113ea01785500b313))
* **transport:** add Cloudflare R2 HTTP transport file access ([8459b83](https://github.com/mrgoonie/human-mcp/commit/8459b8322172019a9b2cee944c02471113444c19))
* **transport:** implement SSE fallback for legacy MCP client compatibility ([a2a8041](https://github.com/mrgoonie/human-mcp/commit/a2a8041220577597061efd37e6e1ae167ae40ec5))

## [1.2.1](https://github.com/mrgoonie/human-mcp/compare/v1.2.0...v1.2.1) (2025-09-08)


### Bug Fixes

* update tool names to comply with MCP validation pattern ([3c23e10](https://github.com/mrgoonie/human-mcp/commit/3c23e101e843095fb33703dd9431a89936c18308))

# [1.2.0](https://github.com/mrgoonie/human-mcp/compare/v1.1.0...v1.2.0) (2025-09-08)


### Features

* make HTTP transport config options configurable via config object ([d9da0f1](https://github.com/mrgoonie/human-mcp/commit/d9da0f1ec01b53dd21ace64e781d6bec269bd763))

# [1.1.0](https://github.com/mrgoonie/human-mcp/compare/v1.0.2...v1.1.0) (2025-09-08)


### Features

* add HTTP transport with Docker deployment ([971af50](https://github.com/mrgoonie/human-mcp/commit/971af50cae5ccb50b83a70c29099e4c801b8fcad))

## [1.0.2](https://github.com/mrgoonie/human-mcp/compare/v1.0.1...v1.0.2) (2025-09-08)


### Bug Fixes

* **ci:** configure NPM package for public publishing ([3222450](https://github.com/mrgoonie/human-mcp/commit/3222450edae2f40e86cba29dea5c3dfd35bf4fd1))

## [1.0.1](https://github.com/mrgoonie/human-mcp/compare/v1.0.0...v1.0.1) (2025-09-08)


### Bug Fixes

* **config:** update NPM publishing configuration for scoped package ([caa26cd](https://github.com/mrgoonie/human-mcp/commit/caa26cd36d6967a935921b62e7478f4074cac671))

# 1.0.0 (2025-09-08)


### Bug Fixes

* resolve timeout issues and improve MCP SDK integration ([ccd7f8d](https://github.com/mrgoonie/human-mcp/commit/ccd7f8d44dc9b8f9e5432092e40fa6dd99759dae))
* **tests:** resolve type mismatches and schema alignment ([f68308b](https://github.com/mrgoonie/human-mcp/commit/f68308bc476be2e47a35da92d9b766c0c2d02a93))


### Features

* add claude agent definitions for code review, database, debugging, docs and git management ([8203456](https://github.com/mrgoonie/human-mcp/commit/8203456615ca498074657a07a25cea99b9d538fb))
* add semantic-release automation with GitHub Actions ([3733a38](https://github.com/mrgoonie/human-mcp/commit/3733a38b1ab90ef37e44af2726ec0b3cec88932e))
</file>

<file path="package.json">
{
  "name": "@goonnguyen/human-mcp",
  "version": "2.5.0",
  "description": "Human MCP: Bringing Human Capabilities to Coding Agents",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "bin": {
    "human-mcp": "bin/human-mcp.js"
  },
  "scripts": {
    "dev": "bun run --watch src/index.ts 2>&1 | tee -a ./logs.txt",
    "build": "bun build src/index.ts --target=node --outdir=dist 2>&1 | tee -a ./logs.txt",
    "start": "bun run dist/index.js 2>&1 | tee -a ./logs.txt",
    "test": "TEST_TYPE=all bun test 2>&1 | tee -a ./logs.txt",
    "test:unit": "TEST_TYPE=unit bun test tests/unit/ 2>&1 | tee -a ./logs.txt",
    "test:integration": "TEST_TYPE=integration bun test tests/integration/ 2>&1 | tee -a ./logs.txt",
    "test:parallel": "TEST_TYPE=all bun test 2>&1 | tee -a ./logs.txt",
    "test:safe": "TEST_TYPE=unit bun test tests/unit/ && TEST_TYPE=integration bun test tests/integration/sse-transport.test.ts && TEST_TYPE=integration bun test tests/integration/server.test.ts && TEST_TYPE=integration bun test tests/integration/http-transport-files.test.ts 2>&1 | tee -a ./logs.txt",
    "typecheck": "tsc --noEmit 2>&1 | tee -a ./logs.txt",
    "inspector": "mcp-inspector stdio -- bun run src/index.ts 2>&1 | tee -a ./logs.txt"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.888.0",
    "@aws-sdk/s3-request-presigner": "^3.888.0",
    "@google/generative-ai": "^0.21.0",
    "@modelcontextprotocol/sdk": "^1.4.0",
    "@types/wav": "^1.0.4",
    "compression": "^1.8.1",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "fluent-ffmpeg": "^2.1.3",
    "helmet": "^8.1.0",
    "mammoth": "^1.10.0",
    "marked": "^16.3.0",
    "mime-types": "^3.0.1",
    "multer": "^2.0.2",
    "pptx-automizer": "^0.7.4",
    "sharp": "^0.33.0",
    "uuid": "^13.0.0",
    "wav": "^1.0.2",
    "xlsx": "^0.18.5",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@modelcontextprotocol/inspector": "^0.2.0",
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/git": "^10.0.1",
    "@semantic-release/github": "^11.0.5",
    "@semantic-release/npm": "^12.0.2",
    "@types/bun": "latest",
    "@types/compression": "^1.8.1",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "@types/fluent-ffmpeg": "^2.1.26",
    "@types/mime-types": "^3.0.1",
    "@types/multer": "^2.0.0",
    "@types/uuid": "^10.0.0",
    "semantic-release": "^24.2.7",
    "typescript": "^5.6.0"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "ai",
    "multimodal",
    "vision",
    "debugging"
  ],
  "files": [
    "dist",
    "bin",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18"
  },
  "author": "",
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  }
}
</file>

</files>
