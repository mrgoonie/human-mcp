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