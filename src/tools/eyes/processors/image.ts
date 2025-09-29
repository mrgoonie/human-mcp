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