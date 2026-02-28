import { describe, it, expect } from "bun:test";
import { SfxGenerationInputSchema, ElevenLabsMusicGenerationInputSchema } from "../../src/tools/hands/schemas.js";

describe("SfxGenerationInputSchema", () => {
  it("parses valid input with all fields", () => {
    const result = SfxGenerationInputSchema.parse({
      text: "Thunder rumbling in the distance",
      duration_seconds: 5,
      prompt_influence: 0.5,
      loop: true,
    });
    expect(result.text).toBe("Thunder rumbling in the distance");
    expect(result.duration_seconds).toBe(5);
    expect(result.prompt_influence).toBe(0.5);
    expect(result.loop).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = SfxGenerationInputSchema.parse({
      text: "Birds chirping",
    });
    expect(result.prompt_influence).toBe(0.3);
    expect(result.loop).toBe(false);
    expect(result.duration_seconds).toBeUndefined();
  });

  it("rejects empty text", () => {
    expect(() => SfxGenerationInputSchema.parse({ text: "" })).toThrow();
  });

  it("rejects duration out of range", () => {
    expect(() => SfxGenerationInputSchema.parse({ text: "test", duration_seconds: 0.1 })).toThrow();
    expect(() => SfxGenerationInputSchema.parse({ text: "test", duration_seconds: 31 })).toThrow();
  });

  it("rejects prompt_influence out of range", () => {
    expect(() => SfxGenerationInputSchema.parse({ text: "test", prompt_influence: -0.1 })).toThrow();
    expect(() => SfxGenerationInputSchema.parse({ text: "test", prompt_influence: 1.1 })).toThrow();
  });
});

describe("ElevenLabsMusicGenerationInputSchema", () => {
  it("parses valid input with all fields", () => {
    const result = ElevenLabsMusicGenerationInputSchema.parse({
      prompt: "An upbeat electronic track",
      music_length_ms: 60000,
      force_instrumental: true,
    });
    expect(result.prompt).toBe("An upbeat electronic track");
    expect(result.music_length_ms).toBe(60000);
    expect(result.force_instrumental).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = ElevenLabsMusicGenerationInputSchema.parse({
      prompt: "A chill beat",
    });
    expect(result.music_length_ms).toBe(30000);
    expect(result.force_instrumental).toBe(false);
  });

  it("rejects empty prompt", () => {
    expect(() => ElevenLabsMusicGenerationInputSchema.parse({ prompt: "" })).toThrow();
  });

  it("rejects duration below minimum", () => {
    expect(() => ElevenLabsMusicGenerationInputSchema.parse({ prompt: "test", music_length_ms: 2000 })).toThrow();
  });

  it("rejects duration above maximum", () => {
    expect(() => ElevenLabsMusicGenerationInputSchema.parse({ prompt: "test", music_length_ms: 700000 })).toThrow();
  });
});
