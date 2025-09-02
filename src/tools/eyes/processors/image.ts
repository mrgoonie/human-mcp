import { GenerativeModel } from "@google/generative-ai";
import sharp from "sharp";
import fs from "fs/promises";
import type { AnalysisOptions, ProcessingResult } from "@/types";
import { createPrompt, parseAnalysisResponse } from "../utils/formatters.js";
import { logger } from "@/utils/logger.js";
import { ProcessingError } from "@/utils/errors.js";

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
  if (source.startsWith('data:image/')) {
    const [header, data] = source.split(',');
    if (!header || !data) {
      throw new ProcessingError("Invalid base64 image format");
    }
    const mimeMatch = header.match(/data:(image\/[^;]+)/);
    if (!mimeMatch || !mimeMatch[1]) {
      throw new ProcessingError("Invalid base64 image format");
    }
    return {
      imageData: data,
      mimeType: mimeMatch[1]
    };
  }
  
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
  
  try {
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
    throw new ProcessingError(`Failed to load image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}