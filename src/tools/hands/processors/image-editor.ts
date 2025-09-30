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