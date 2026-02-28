/**
 * Minimax API HTTP Client
 * Shared client for Speech 2.6, Music 2.5, and Hailuo 2.3 Video APIs
 */
import { logger } from "./logger.js";
import type { Config } from "./config.js";

export interface MinimaxApiResponse {
  base_resp: {
    status_code: number;
    status_msg: string;
  };
  data?: Record<string, unknown>;
  extra_info?: Record<string, unknown>;
  trace_id?: string;
  task_id?: string;
  status?: string;
  file_id?: string;
  file?: { file_id: string; download_url: string };
  video_width?: number;
  video_height?: number;
}

export class MinimaxApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public traceId?: string
  ) {
    super(message);
    this.name = "MinimaxApiError";
  }
}

export class MinimaxClient {
  private apiKey: string;
  private apiHost: string;

  constructor(config: Config) {
    const key = config.minimax?.apiKey;
    if (!key) {
      throw new Error("MINIMAX_API_KEY is required");
    }
    this.apiKey = key;
    this.apiHost = config.minimax?.apiHost || "https://api.minimax.io";
  }

  /** POST request to Minimax API */
  async post(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number = 300000
  ): Promise<MinimaxApiResponse> {
    const url = `${this.apiHost}${endpoint}`;
    logger.debug(`Minimax POST ${url}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const result = (await response.json()) as MinimaxApiResponse;
      this.checkError(result);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET request to Minimax API */
  async get(
    endpoint: string,
    params?: Record<string, string>,
    timeoutMs: number = 60000
  ): Promise<MinimaxApiResponse> {
    const url = new URL(`${this.apiHost}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, v)
      );
    }
    logger.debug(`Minimax GET ${url.toString()}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });

      const result = (await response.json()) as MinimaxApiResponse;
      this.checkError(result);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Download binary content from a URL */
  async downloadBuffer(
    downloadUrl: string,
    timeoutMs: number = 120000
  ): Promise<Buffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(downloadUrl, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Check response for Minimax error codes */
  private checkError(response: MinimaxApiResponse): void {
    const code = response.base_resp?.status_code;
    if (code === undefined || code === 0) return;

    const msg = response.base_resp?.status_msg || "Unknown error";
    const traceId = response.trace_id;

    switch (code) {
      case 1002:
      case 1039:
        throw new MinimaxApiError(code, `Rate limit exceeded: ${msg}`, traceId);
      case 1004:
      case 2049:
        throw new MinimaxApiError(code, `Authentication failed: ${msg}`, traceId);
      case 1008:
        throw new MinimaxApiError(code, `Insufficient balance: ${msg}`, traceId);
      case 1026:
      case 1027:
        throw new MinimaxApiError(code, `Content policy violation: ${msg}`, traceId);
      case 2013:
        throw new MinimaxApiError(code, `Invalid parameters: ${msg}`, traceId);
      default:
        throw new MinimaxApiError(code, `Minimax API error ${code}: ${msg}`, traceId);
    }
  }

  /** Check if Minimax is configured (API key present) */
  static isConfigured(config: Config): boolean {
    return !!(config.minimax?.apiKey);
  }
}
