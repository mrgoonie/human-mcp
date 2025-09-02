import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { processImage } from "./processors/image.js";
import { processVideo } from "./processors/video.js";
import { processGif } from "./processors/gif.js";
import { GeminiClient } from "./utils/gemini-client.js";
import { 
  EyesInputSchema, 
  CompareInputSchema,
  type EyesInput,
  type CompareInput
} from "./schemas.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

export async function registerEyesTool(server: Server, config: Config) {
  const geminiClient = new GeminiClient(config);
  
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case "eyes.analyze":
          return await handleAnalyze(geminiClient, args);
        case "eyes.compare":
          return await handleCompare(geminiClient, args);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error) {
      const mcpError = handleError(error);
      logger.error(`Tool ${name} error:`, mcpError);
      
      throw new McpError(
        ErrorCode.InternalError,
        mcpError.message
      );
    }
  });
  
  // Tools are registered via setRequestHandler above
}

async function handleAnalyze(
  geminiClient: GeminiClient, 
  args: unknown
) {
  const input = EyesInputSchema.parse(args) as EyesInput;
  const { source, type, detail_level } = input;
  
  logger.info(`Analyzing ${type} with detail level: ${detail_level}`);
  
  const model = geminiClient.getModel(detail_level);
  let result;
  
  switch (type) {
    case "image":
      result = await processImage(model, source, input);
      break;
    case "video":
      result = await processVideo(model, source, input);
      break;
    case "gif":
      result = await processGif(model, source, input);
      break;
    default:
      throw new Error(`Unsupported media type: ${type}`);
  }
  
  return {
    content: [
      {
        type: "text",
        text: result.analysis
      }
    ],
    isError: false
  };
}

async function handleCompare(
  geminiClient: GeminiClient,
  args: unknown
) {
  const input = CompareInputSchema.parse(args) as CompareInput;
  const { source1, source2, comparison_type } = input;
  
  logger.info(`Comparing images with type: ${comparison_type}`);
  
  const model = geminiClient.getModel("detailed");
  
  const prompt = `Compare these two images and identify the differences. Focus on:
  
${comparison_type === "pixel" ? 
  "- Exact pixel-level differences\n- Color value changes\n- Any visual artifacts or rendering differences" :
  comparison_type === "structural" ?
  "- Layout changes\n- Element positioning differences\n- Size and proportion changes\n- Structural modifications" :
  "- Semantic meaning differences\n- Content changes\n- Functional differences\n- User experience impact"
}

Please provide:
1. SUMMARY: Brief overview of main differences
2. SPECIFIC DIFFERENCES: Detailed list of changes found
3. IMPACT ASSESSMENT: How these differences might affect users
4. RECOMMENDATIONS: Suggested actions based on the differences

Be precise with locations and measurements where possible.`;
  
  try {
    const [image1Data, image2Data] = await Promise.all([
      loadImageForComparison(source1),
      loadImageForComparison(source2)
    ]);
    
    const response = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: image1Data.mimeType,
          data: image1Data.data
        }
      },
      { text: "Image 1 (above) vs Image 2 (below):" },
      {
        inlineData: {
          mimeType: image2Data.mimeType,
          data: image2Data.data
        }
      }
    ]);
    
    const result = await response.response;
    const comparisonText = result.text();
    
    return {
      content: [
        {
          type: "text",
          text: comparisonText || "No differences detected or analysis failed"
        }
      ],
      isError: false
    };
    
  } catch (error) {
    throw new Error(`Failed to compare images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function loadImageForComparison(source: string): Promise<{ data: string; mimeType: string }> {
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