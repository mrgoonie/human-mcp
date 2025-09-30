/**
 * Response formatter for MCP tools
 * Handles different response formats based on transport type (stdio vs HTTP)
 *
 * For HTTP transport with large media content:
 * - Use resource links instead of embedded base64 to reduce response size
 * - This prevents timeouts and "Tool execution failed" errors in Claude Desktop
 */

import type { Config } from "./config.js";

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
  type: "text" | "resource" | "image";
  text?: string;
  resource?: {
    uri: string;
    mimeType?: string;
    text?: string;
  };
  data?: string;
  mimeType?: string;
}

/**
 * Format media response based on transport type
 *
 * For HTTP transport: Returns resource link (lightweight, ~2KB)
 * For stdio transport: Returns embedded image (rich, but larger)
 */
export function formatMediaResponse(
  result: MediaResult,
  config: Config,
  contextText?: string
): FormattedResponse[] {
  const isHttpTransport = config.transport.type === "http" ||
                         (config.transport.type === "both" && config.transport.http?.enabled);

  // For HTTP transport, use resource links to minimize response size
  if (isHttpTransport && result.url) {
    const response: FormattedResponse[] = [];

    // Add resource link
    response.push({
      type: "resource",
      resource: {
        uri: result.url,
        mimeType: result.mimeType || "image/png",
        text: contextText || `Generated media available at: ${result.url}`,
      },
    });

    // Add human-readable text
    const details: string[] = [];
    if (result.size) {
      details.push(`Size: ${(result.size / 1024).toFixed(2)} KB`);
    }
    if (result.width && result.height) {
      details.push(`Dimensions: ${result.width}x${result.height}`);
    }

    response.push({
      type: "text",
      text: `✅ Media generated successfully!\n\nURL: ${result.url}${details.length > 0 ? '\n' + details.join(', ') : ''}`,
    });

    return response;
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