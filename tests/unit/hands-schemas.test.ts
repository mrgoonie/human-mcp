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