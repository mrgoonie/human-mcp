import { z } from "zod";

export const EyesInputSchema = z.object({
  source: z.string().describe("URL, file path, or base64 encoded content"),
  type: z.enum(["image", "video", "gif"]).describe("Type of visual content"),
  analysis_type: z.enum([
    "general",
    "ui_debug", 
    "error_detection",
    "accessibility",
    "performance",
    "layout"
  ]).default("general"),
  detail_level: z.enum(["basic", "detailed", "extreme"]).default("detailed"),
  specific_focus: z.string().optional().describe("Specific areas or elements to focus on"),
  extract_text: z.boolean().default(true),
  detect_ui_elements: z.boolean().default(true),
  analyze_colors: z.boolean().default(false),
  check_accessibility: z.boolean().default(false)
});

export const EyesOutputSchema = z.object({
  analysis: z.string(),
  detected_elements: z.array(z.object({
    type: z.string(),
    location: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }),
    properties: z.record(z.any())
  })),
  debugging_insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  metadata: z.object({
    processing_time_ms: z.number(),
    model_used: z.string(),
    frames_analyzed: z.number().optional()
  })
});

export const CompareInputSchema = z.object({
  source1: z.string(),
  source2: z.string(),
  comparison_type: z.enum(["pixel", "structural", "semantic"]).default("semantic")
});

export type EyesInput = z.infer<typeof EyesInputSchema>;
export type EyesOutput = z.infer<typeof EyesOutputSchema>;
export type CompareInput = z.infer<typeof CompareInputSchema>;