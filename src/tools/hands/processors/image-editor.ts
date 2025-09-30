import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiClient } from "../../eyes/utils/gemini-client.js";
import type { ImageEditingOptions, ImageEditingResult } from "../schemas.js";
import { logger } from "@/utils/logger.js";
import { saveBase64ToFile } from "@/utils/file-storage.js";
import type { Config } from "@/utils/config.js";
import { loadImageForProcessing } from "@/utils/image-loader.js";

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
    // Image editing requires gemini-2.5-flash-image-preview model
    const model = geminiClient.getImageGenerationModel();

    // Build the request content based on operation type
    const requestContent = await buildRequestContent(options, processedInputImage, editingPrompt);

    // Generate the edited image using Gemini API
    const response = await model.generateContent(requestContent);
    const result = response.response;

    // Extract image data from the response
    const candidates = result.candidates;

    // Debug: Log the full response structure
    logger.debug(`Gemini API response structure: ${JSON.stringify({
      hasCandidates: !!candidates,
      candidatesLength: candidates?.length,
      firstCandidate: candidates?.[0] ? {
        hasContent: !!candidates[0].content,
        hasParts: !!candidates[0].content?.parts,
        partsLength: candidates[0].content?.parts?.length
      } : null
    })}`);

    if (!candidates || candidates.length === 0) {
      logger.error("No candidates in Gemini response. Full response:", JSON.stringify(result, null, 2));
      throw new Error("No image candidates returned from Gemini API. This may indicate the API doesn't support image editing yet, or the request format is incorrect.");
    }

    const candidate = candidates[0];
    if (!candidate || !candidate.content) {
      logger.error("Invalid candidate structure:", JSON.stringify(candidate, null, 2));
      throw new Error("Invalid response format from Gemini API: missing candidate content");
    }

    if (!candidate.content.parts || candidate.content.parts.length === 0) {
      logger.error("No parts in candidate content:", JSON.stringify(candidate.content, null, 2));
      throw new Error("Invalid response format from Gemini API: missing content parts. Note: Gemini image editing may not be available in the current API version.");
    }

    // Look for image data in the response parts
    let imageData: string | null = null;
    let mimeType = "image/jpeg";

    logger.debug(`Searching for image data in ${candidate.content.parts.length} parts`);

    for (const part of candidate.content.parts) {
      logger.debug(`Part type: ${JSON.stringify(Object.keys(part))}`);
      if ('inlineData' in part && part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/jpeg";
        logger.info(`Found image data: ${imageData.length} bytes, type: ${mimeType}`);
        break;
      }
    }

    if (!imageData) {
      logger.error("No image data found in response parts:", JSON.stringify(candidate.content.parts, null, 2));
      throw new Error("No image data found in Gemini response. The API may have returned text instead of an edited image.");
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
    // Use centralized image loader that handles file paths, URLs, and base64
    const result = await loadImageForProcessing(inputImage, {
      fetchTimeout: 30000,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 85
    });

    return {
      data: result.data,
      mimeType: result.mimeType
    };
  } catch (error) {
    throw new Error(`Failed to process input image: ${error instanceof Error ? error.message : error}`);
  }
}

function buildEditingPrompt(options: ImageEditingOptions): string {
  let prompt = options.prompt;

  // Gemini 2.5 Flash uses conversational, descriptive prompts without masks
  // Be hyper-specific about what to change and what to preserve
  switch (options.operation) {
    case "inpaint":
      // For inpainting, describe what to add/modify and where
      if (options.maskPrompt) {
        prompt = `Using the provided image, ${prompt}. Focus on ${options.maskPrompt}. Keep all other parts of the image unchanged.`;
      } else {
        prompt = `Using the provided image, ${prompt}. Ensure the changes blend naturally with the existing image style, lighting, and perspective.`;
      }
      break;

    case "outpaint":
      // For outpainting, describe what to add beyond the borders
      const direction = options.expandDirection || 'all directions';
      prompt = `Expand the provided image ${direction === 'all' ? 'in all directions' : `to the ${direction}`} and add: ${prompt}. Match the original image's style, lighting, and perspective. Seamlessly blend the new content with the existing image.`;
      if (options.expansionRatio && options.expansionRatio !== 1.5) {
        prompt += ` Expand by approximately ${Math.round(options.expansionRatio * 100)}%.`;
      }
      break;

    case "style_transfer":
      // For style transfer, describe the desired style clearly
      prompt = `Transform the provided image to have this style: ${prompt}. Maintain the original composition, objects, and structure while applying the new artistic style.`;
      if (options.styleStrength) {
        const strength = options.styleStrength > 0.8 ? 'strongly' : options.styleStrength > 0.5 ? 'moderately' : 'subtly';
        prompt += ` Apply the style ${strength}.`;
      }
      break;

    case "object_manipulation":
      // For object manipulation, be very specific about what to change
      if (options.targetObject) {
        const action = options.manipulationType || 'modify';
        prompt = `In the provided image, ${action} the ${options.targetObject}: ${prompt}`;
        if (options.targetPosition) {
          prompt += `. Position: ${options.targetPosition}`;
        }
        prompt += `. Keep all other elements unchanged.`;
      }
      break;

    case "multi_image_compose":
      // For composition, describe how to combine images
      prompt = `Combine the provided images: ${prompt}`;
      if (options.compositionLayout) {
        prompt += `. Use a ${options.compositionLayout} layout`;
      }
      prompt += `. Ensure natural blending and consistent lighting across the composition.`;
      break;
  }

  // Add quality modifiers as descriptive instructions
  if (options.quality === "high") {
    prompt += " Generate a high-quality result with fine details and professional finish.";
  } else if (options.quality === "draft") {
    prompt += " Provide a quick draft version.";
  }

  // Add negative prompt as avoidance instructions
  if (options.negativePrompt) {
    prompt += ` Do not include: ${options.negativePrompt}.`;
  }

  return prompt;
}

async function buildRequestContent(
  options: ImageEditingOptions,
  processedInputImage: { data: string; mimeType: string },
  editingPrompt: string
): Promise<any[]> {
  // Gemini 2.5 Flash uses conversational/text-based editing without masks
  // Format: [image, text_prompt] or [text_prompt, image]
  const content: any[] = [
    {
      inlineData: {
        data: processedInputImage.data,
        mimeType: processedInputImage.mimeType
      }
    },
    {
      text: editingPrompt
    }
  ];

  // For style transfer, add reference image
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

  // For composition, add secondary images (up to 3 total images)
  if (options.operation === "multi_image_compose" && options.secondaryImages) {
    let imageCount = 1; // Already have the main image
    for (const secondaryImage of options.secondaryImages) {
      if (imageCount >= 3) {
        logger.warn("Gemini supports up to 3 images. Skipping additional images.");
        break;
      }
      try {
        const processedSecondary = await processImageForEditing(secondaryImage);
        content.push({
          inlineData: {
            data: processedSecondary.data,
            mimeType: processedSecondary.mimeType
          }
        });
        imageCount++;
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