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