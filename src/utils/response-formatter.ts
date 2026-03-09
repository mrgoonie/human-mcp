/**
 * Response formatter for MCP tools
 * Handles different response formats based on transport type (stdio vs HTTP)
 *
 * For HTTP transport: Returns text with URL (lightweight, avoids base64 payload)
 * For stdio transport: Returns embedded image (rich inline display)
 *
 * NOTE: MCP CallToolResult.content only supports TextContent, ImageContent, AudioContent.
 * EmbeddedResource (type: "resource") is NOT valid for tool results and will cause
 * "Error occurred during tool execution" in Claude Desktop.
 */

import type { Config } from "./config.js";
import { logger } from "./logger.js";

export interface MediaResult {
  url?: string;
  filePath?: string;
  base64?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface FormattedResponse {
  type: "text" | "image";
  text?: string;
  data?: string;
  mimeType?: string;
}

/**
 * Format media response based on transport type
 *
 * For HTTP transport: Returns text with URL (lightweight, ~2KB)
 * For stdio transport: Returns embedded image (rich, but larger)
 */
export function formatMediaResponse(
  result: MediaResult,
  config: Config,
  contextText?: string
): FormattedResponse[] {
  const isHttpTransport = config.transport.type === "http" ||
                         (config.transport.type === "both" && config.transport.http?.enabled);

  logger.info(`formatMediaResponse: transport=${config.transport.type}, isHttp=${isHttpTransport}, hasUrl=${!!result.url}, hasBase64=${!!result.base64}, base64Length=${result.base64?.length || 0}`);

  // For HTTP transport, use text with URL to minimize response size
  // NOTE: "type: resource" (EmbeddedResource) is NOT supported in CallToolResult.content
  // by Claude Desktop - only TextContent, ImageContent, AudioContent are valid for tool results.
  if (isHttpTransport && result.url) {
    const details: string[] = [];
    if (result.size) {
      details.push(`Size: ${(result.size / 1024).toFixed(2)} KB`);
    }
    if (result.width && result.height) {
      details.push(`Dimensions: ${result.width}x${result.height}`);
    }

    const summaryText = contextText
      ? `${contextText}\n\nURL: ${result.url}${details.length > 0 ? '\n' + details.join(', ') : ''}`
      : `✅ Media generated successfully!\n\nURL: ${result.url}${details.length > 0 ? '\n' + details.join(', ') : ''}`;

    return [
      {
        type: "text",
        text: summaryText,
      },
    ];
  }

  // For stdio transport, use embedded image for richer experience
  if (result.base64) {
    return [
      {
        type: "image",
        data: result.base64,
        mimeType: result.mimeType || "image/png",
      },
      {
        type: "text",
        text: contextText || (result.url ? `Image URL: ${result.url}` : "Image generated successfully"),
      },
    ];
  }

  // Fallback: text with URL
  if (result.url) {
    return [
      {
        type: "text",
        text: `${contextText || 'Media generated successfully'}\n\nURL: ${result.url}`,
      },
    ];
  }

  // Fallback: text only
  return [
    {
      type: "text",
      text: contextText || "Media generated successfully",
    },
  ];
}

/**
 * Format text response (no special handling needed)
 */
export function formatTextResponse(text: string): FormattedResponse[] {
  return [
    {
      type: "text",
      text,
    },
  ];
}

/**
 * Format error response
 */
export function formatErrorResponse(error: Error | string): FormattedResponse[] {
  const errorMessage = typeof error === "string" ? error : error.message;
  return [
    {
      type: "text",
      text: `❌ Error: ${errorMessage}`,
    },
  ];
}