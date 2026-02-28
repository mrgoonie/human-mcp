/**
 * ZhipuAI (Z.AI / GLM) HTTP Client
 * Shared client for GLM-4.6V Vision, CogView-4 Image, CogVideoX-3 Video, and GLM-TTS APIs
 */
import { logger } from "./logger.js";
import type { Config } from "./config.js";

export class ZhipuAIApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = "ZhipuAIApiError";
  }
}

export class ZhipuAIClient {
  private apiKey: string;
  private apiHost: string;

  constructor(config: Config) {
    const key = config.zhipuai?.apiKey;
    if (!key) {
      throw new Error("ZHIPUAI_API_KEY is required");
    }
    this.apiKey = key;
    this.apiHost = config.zhipuai?.apiHost || "https://api.z.ai/api/paas/v4";
  }

  /** POST request to ZhipuAI API */
  async post<T = Record<string, unknown>>(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number = 300000
  ): Promise<T> {
    const url = `${this.apiHost}${endpoint}`;
    logger.debug(`ZhipuAI POST ${url}`);

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

      if (!response.ok) {
        const errorBody = await response.text();
        this.handleHttpError(response.status, errorBody);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET request to ZhipuAI API */
  async get<T = Record<string, unknown>>(
    endpoint: string,
    params?: Record<string, string>,
    timeoutMs: number = 60000
  ): Promise<T> {
    const url = new URL(`${this.apiHost}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    logger.debug(`ZhipuAI GET ${url.toString()}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.handleHttpError(response.status, errorBody);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Fetch raw binary response (for TTS audio streaming) */
  async fetchRaw(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number = 60000
  ): Promise<Buffer> {
    const url = `${this.apiHost}${endpoint}`;
    logger.debug(`ZhipuAI POST (raw) ${url}`);

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

      if (!response.ok) {
        const errorBody = await response.text();
        this.handleHttpError(response.status, errorBody);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
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

  /** Map HTTP error status codes to meaningful errors */
  private handleHttpError(status: number, body: string): never {
    let parsed: any = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      // not JSON
    }

    const msg = parsed?.error?.message || parsed?.msg || body.substring(0, 200);
    const requestId = parsed?.request_id;

    switch (status) {
      case 401:
        throw new ZhipuAIApiError(status, `Authentication failed: ${msg}`, requestId);
      case 429:
        throw new ZhipuAIApiError(status, `Rate limit exceeded: ${msg}`, requestId);
      case 400:
        throw new ZhipuAIApiError(status, `Bad request: ${msg}`, requestId);
      case 403:
        throw new ZhipuAIApiError(status, `Forbidden: ${msg}`, requestId);
      default:
        throw new ZhipuAIApiError(status, `ZhipuAI API error ${status}: ${msg}`, requestId);
    }
  }

  /** Check if ZhipuAI is configured (API key present) */
  static isConfigured(config: Config): boolean {
    return !!(config.zhipuai?.apiKey);
  }
}
