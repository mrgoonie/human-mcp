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