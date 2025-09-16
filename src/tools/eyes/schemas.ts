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
  detail_level: z.enum(["quick", "detailed"]).default("detailed"),
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

// Document processing schemas
export const DocumentInputSchema = z.object({
  source: z.string().describe("Path, URL, or base64 data URI of the document"),
  format: z.enum([
    "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
  ]).default("auto").describe("Document format. Use 'auto' for automatic detection"),
  options: z.object({
    extract_text: z.boolean().default(true).describe("Extract text content"),
    extract_tables: z.boolean().default(true).describe("Extract tables"),
    extract_images: z.boolean().default(false).describe("Extract images"),
    preserve_formatting: z.boolean().default(false).describe("Preserve original formatting"),
    page_range: z.string().optional().describe("Page range (e.g., '1-5', '2,4,6')"),
    detail_level: z.enum(["quick", "detailed"]).default("detailed").describe("Level of detail in processing")
  }).optional().describe("Processing options")
});

export const DataExtractionSchema = z.object({
  source: z.string().describe("Document source"),
  format: z.enum([
    "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
  ]).default("auto").describe("Document format"),
  schema: z.record(z.any()).describe("JSON schema for data extraction"),
  options: z.object({
    strict_mode: z.boolean().default(false).describe("Strict schema validation"),
    fallback_values: z.record(z.any()).optional().describe("Fallback values for missing data")
  }).optional().describe("Extraction options")
});

export const SummarizationSchema = z.object({
  source: z.string().describe("Document source"),
  format: z.enum([
    "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html", "auto"
  ]).default("auto").describe("Document format"),
  options: z.object({
    summary_type: z.enum(["brief", "detailed", "executive", "technical"]).default("detailed").describe("Type of summary"),
    max_length: z.number().optional().describe("Maximum summary length in words"),
    focus_areas: z.array(z.string()).optional().describe("Specific areas to focus on"),
    include_key_points: z.boolean().default(true).describe("Include key points"),
    include_recommendations: z.boolean().default(true).describe("Include recommendations")
  }).optional().describe("Summarization options")
});

export type DocumentInput = z.infer<typeof DocumentInputSchema>;
export type DataExtractionInput = z.infer<typeof DataExtractionSchema>;
export type SummarizationInput = z.infer<typeof SummarizationSchema>;