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