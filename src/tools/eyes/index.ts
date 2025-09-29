import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { processImage } from "./processors/image.js";
import { processVideo } from "./processors/video.js";
import { processGif } from "./processors/gif.js";
import { DocumentProcessorFactory } from "./processors/factory.js";
import { GeminiClient } from "./utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Register optimized Eyes tools following Anthropic best practices
 *
 * Key optimizations:
 * - Simplified schemas (2-4 essential parameters)
 * - Clear, action-oriented descriptions
 * - Natural language tool names
 * - Reduced parameter complexity
 */
export async function registerEyesTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  logger.info("Registering optimized Eyes tools...");

  // Vision analysis tool (simplified)
  server.registerTool(
    "eyes_analyze",
    {
      title: "Analyze visual content",
      description: "Understand images, videos, and GIFs with AI vision",
      inputSchema: {
        source: z.string().describe("File path, URL, or image to analyze"),
        focus: z.string().optional().describe("What to focus on in the analysis"),
        detail: z.enum(["quick", "detailed"]).default("detailed").optional().describe("Analysis depth")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedAnalyze(geminiClient, args, config);
      } catch (error) {
        return handleToolError("vision analysis", error);
      }
    }
  );

  // Image comparison tool (simplified)
  server.registerTool(
    "eyes_compare",
    {
      title: "Compare two images",
      description: "Find differences between images",
      inputSchema: {
        image1: z.string().describe("First image path or URL"),
        image2: z.string().describe("Second image path or URL"),
        focus: z.enum(["differences", "similarities", "layout", "content"]).default("differences").optional().describe("What to compare")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedCompare(geminiClient, args);
      } catch (error) {
        return handleToolError("image comparison", error);
      }
    }
  );

  // Document reading tool (simplified)
  server.registerTool(
    "eyes_read_document",
    {
      title: "Read document content",
      description: "Extract text and data from documents",
      inputSchema: {
        document: z.string().describe("Document path or URL"),
        pages: z.string().default("all").optional().describe("Page range (e.g., '1-5' or 'all')"),
        extract: z.enum(["text", "tables", "both"]).default("both").optional().describe("What to extract")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedDocumentRead(geminiClient, args);
      } catch (error) {
        return handleToolError("document reading", error);
      }
    }
  );

  // Document summarization tool (simplified)
  server.registerTool(
    "eyes_summarize_document",
    {
      title: "Summarize document content",
      description: "Create summaries from documents",
      inputSchema: {
        document: z.string().describe("Document path or URL"),
        length: z.enum(["brief", "medium", "detailed"]).default("medium").optional().describe("Summary length"),
        focus: z.string().optional().describe("Specific topics to focus on")
      }
    },
    async (args) => {
      try {
        return await handleOptimizedDocumentSummary(geminiClient, args);
      } catch (error) {
        return handleToolError("document summarization", error);
      }
    }
  );

  logger.info("✅ Optimized Eyes tools registered:");
  logger.info("   • eyes_analyze: Visual content analysis");
  logger.info("   • eyes_compare: Image comparison");
  logger.info("   • eyes_read_document: Document reading");
  logger.info("   • eyes_summarize_document: Document summarization");
  logger.info("   • Average parameters reduced from 8-12 to 2-3");
}

/**
 * Optimized analyze handler with simplified parameters
 */
async function handleOptimizedAnalyze(
  geminiClient: GeminiClient,
  args: any,
  config: Config
) {
  const source = args.source as string;
  const focus = args.focus as string | undefined;
  const detail = (args.detail as string) || "detailed";

  logger.info(`Analyzing visual content: ${source.substring(0, 50)}...`);

  // Auto-detect media type from source
  const mediaType = detectMediaType(source);

  const model = geminiClient.getModel(detail as "quick" | "detailed");
  const options = {
    analysis_type: "general" as const,
    detail_level: detail as "quick" | "detailed",
    specific_focus: focus,
    fetchTimeout: config.server.fetchTimeout
  };

  let result;
  switch (mediaType) {
    case "image":
      result = await processImage(model, source, options);
      break;
    case "video":
      result = await processVideo(model, source, options);
      break;
    case "gif":
      result = await processGif(model, source, options);
      break;
    default:
      throw new Error(`Unsupported media type detected from: ${source}`);
  }

  return {
    content: [{
      type: "text" as const,
      text: formatAnalysisResult(result, focus)
    }],
    isError: false
  };
}

/**
 * Optimized compare handler
 */
async function handleOptimizedCompare(geminiClient: GeminiClient, args: any) {
  const image1 = args.image1 as string;
  const image2 = args.image2 as string;
  const focus = (args.focus as string) || "differences";

  logger.info(`Comparing images with focus: ${focus}`);

  const model = geminiClient.getModel("detailed");

  const focusPrompts = {
    differences: "Identify what's different between these images",
    similarities: "Identify what's similar between these images",
    layout: "Compare the layout and structure of these images",
    content: "Compare the content and meaning of these images"
  };

  const prompt = `${focusPrompts[focus as keyof typeof focusPrompts] || focusPrompts.differences}.

Provide:
• **Summary**: Key findings
• **Details**: Specific observations
• **Impact**: What these changes mean

Be clear and specific with locations and measurements.`;

  try {
    const [image1Data, image2Data] = await Promise.all([
      loadImageForComparison(image1),
      loadImageForComparison(image2)
    ]);

    const response = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: image1Data.mimeType, data: image1Data.data } },
      { text: "vs" },
      { inlineData: { mimeType: image2Data.mimeType, data: image2Data.data } }
    ]);

    const result = response.response.text();
    return {
      content: [{
        type: "text" as const,
        text: result || "No comparison results available"
      }],
      isError: false
    };

  } catch (error) {
    throw new Error(`Image comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Optimized document reading handler
 */
async function handleOptimizedDocumentRead(geminiClient: GeminiClient, args: any) {
  const document = args.document as string;
  const pages = (args.pages as string) || "all";
  const extract = (args.extract as string) || "both";

  logger.info(`Reading document: ${document}`);

  // Auto-detect document format
  const buffer = await loadDocumentForDetection(document);
  const format = DocumentProcessorFactory.detectFormat(document, buffer);

  // Create simplified options
  const options = {
    extractText: extract === "text" || extract === "both",
    extractTables: extract === "tables" || extract === "both",
    extractImages: false, // Simplified: no image extraction
    preserveFormatting: false,
    pageRange: pages === "all" ? undefined : pages,
    detailLevel: "detailed" as "quick" | "detailed"
  };

  const processor = DocumentProcessorFactory.create(format as any, geminiClient);
  const result = await processor.process(document, options);

  return {
    content: [{
      type: "text" as const,
      text: formatDocumentResult(result, extract)
    }],
    isError: false
  };
}

/**
 * Optimized document summarization handler
 */
async function handleOptimizedDocumentSummary(geminiClient: GeminiClient, args: any) {
  const document = args.document as string;
  const length = (args.length as string) || "medium";
  const focus = args.focus as string | undefined;

  logger.info(`Summarizing document: ${document}`);

  // Auto-detect format and read document
  const buffer = await loadDocumentForDetection(document);
  const format = DocumentProcessorFactory.detectFormat(document, buffer);

  // First extract content
  const processor = DocumentProcessorFactory.create(format as any, geminiClient);
  const docResult = await processor.process(document, {
    extractText: true,
    extractTables: true,
    extractImages: false,
    preserveFormatting: false,
    detailLevel: "detailed" as "quick" | "detailed"
  });

  // Then summarize using Gemini
  const model = geminiClient.getModel("detailed");

  const lengthMap = {
    brief: "a brief 2-3 sentence summary",
    medium: "a comprehensive 1-2 paragraph summary",
    detailed: "a detailed multi-paragraph summary"
  };

  const focusText = focus ? `Focus specifically on: ${focus}.` : "";

  const prompt = `Create ${lengthMap[length as keyof typeof lengthMap]} of this document content. ${focusText}

Document content:
${JSON.stringify(docResult, null, 2).substring(0, 8000)}

Provide:
• **Summary**: Main points and conclusions
• **Key Insights**: Important findings
• **Recommendations**: Suggested actions (if applicable)`;

  const response = await model.generateContent(prompt);
  const summary = response.response.text();

  return {
    content: [{
      type: "text" as const,
      text: summary || "No summary could be generated"
    }],
    isError: false
  };
}

/**
 * Helper functions
 */
function detectMediaType(source: string): "image" | "video" | "gif" {
  const ext = source.toLowerCase().split('.').pop() || '';

  if (['gif'].includes(ext)) return 'gif';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) return 'image';

  // Default to image for data URIs and unknown formats
  return 'image';
}

function formatAnalysisResult(result: any, focus?: string): string {
  const focusHeader = focus ? `\n**Focus**: ${focus}\n` : '';

  return `# 👁️ Visual Analysis${focusHeader}

${result.analysis}

---
*Processing time: ${result.metadata.processing_time_ms}ms*`;
}

function formatDocumentResult(result: any, extract: string): string {
  let output = `# 📄 Document Content\n\n`;

  if (extract === "text" || extract === "both") {
    output += `## Text Content\n${result.text || 'No text found'}\n\n`;
  }

  if (extract === "tables" || extract === "both") {
    if (result.tables && result.tables.length > 0) {
      output += `## Tables\n${JSON.stringify(result.tables, null, 2)}\n\n`;
    }
  }

  output += `**Pages processed**: ${result.metadata?.pages_processed || 'Unknown'}\n`;
  output += `**Processing time**: ${result.metadata?.processing_time_ms || 0}ms`;

  return output;
}

function handleToolError(toolName: string, error: unknown) {
  const mcpError = handleError(error);
  logger.error(`${toolName} error:`, mcpError);

  // Simplified error messages
  let userMessage = mcpError.message;
  if (mcpError.message.includes("rate limit") || mcpError.message.includes("quota")) {
    userMessage = "⏱️ Service temporarily busy. Please try again in a moment.";
  } else if (mcpError.message.includes("network") || mcpError.message.includes("fetch")) {
    userMessage = "🌐 Network issue. Please check your connection and try again.";
  } else if (mcpError.message.includes("file") || mcpError.message.includes("path")) {
    userMessage = "📁 File not found or inaccessible. Please check the file path.";
  }

  return {
    content: [{
      type: "text" as const,
      text: `❌ ${userMessage}`
    }],
    isError: true
  };
}

// Re-use existing helper functions from original implementation
async function loadImageForComparison(source: string): Promise<{ data: string; mimeType: string }> {
  // Handle Claude Code virtual image references
  if (source.match(/^\[Image #\d+\]$/)) {
    throw new Error(
      `Virtual image reference "${source}" cannot be processed. ` +
      `Please use a direct file path, URL, or base64 data URI instead.`
    );
  }

  if (source.startsWith('data:image/')) {
    const [header, data] = source.split(',');
    if (!header || !data) {
      throw new Error("Invalid base64 image format");
    }
    const mimeMatch = header.match(/data:(image\/[^;]+)/);
    if (!mimeMatch || !mimeMatch[1]) {
      throw new Error("Invalid base64 image format");
    }
    return { data, mimeType: mimeMatch[1] };
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return {
      data: Buffer.from(buffer).toString('base64'),
      mimeType: response.headers.get('content-type') || 'image/jpeg'
    };
  }

  const fs = await import('fs/promises');
  const buffer = await fs.readFile(source);
  return {
    data: buffer.toString('base64'),
    mimeType: 'image/jpeg'
  };
}

async function loadDocumentForDetection(source: string): Promise<Buffer> {
  if (source.startsWith('data:')) {
    const base64Data = source.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data URI format');
    }
    return Buffer.from(base64Data, 'base64');
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer) {
      throw new Error('Failed to get array buffer from response');
    }
    return Buffer.from(arrayBuffer);
  }

  const fs = await import('fs/promises');
  return await fs.readFile(source);
}