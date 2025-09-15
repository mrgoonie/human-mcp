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
  
  try {
    logger.debug(`Processing image: ${source.substring(0, 50)}...`);
    
    const { imageData, mimeType } = await loadImage(source, options.fetchTimeout);
    const prompt = createPrompt(options);
    
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
    
    if (!analysisText) {
      throw new ProcessingError("No analysis result from Gemini");
    }
    
    const parsed = parseAnalysisResponse(analysisText);
    const processingTime = Date.now() - startTime;
    
    return {
      description: parsed.description || "Image analysis completed",
      analysis: parsed.analysis || analysisText,
      elements: parsed.elements || [],
      insights: parsed.insights || [],
      recommendations: parsed.recommendations || [],
      metadata: {
        processing_time_ms: processingTime,
        model_used: model.model,
      }
    };
    
  } catch (error) {
    logger.error("Image processing error:", error);
    throw new ProcessingError(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function loadImage(source: string, fetchTimeout?: number): Promise<{ imageData: string; mimeType: string }> {
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
    
    // Optional: For large base64 images, upload to Cloudflare R2 if configured
    const cloudflare = getCloudflareR2();
    if (cloudflare && data.length > 1024 * 1024) { // > 1MB base64
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