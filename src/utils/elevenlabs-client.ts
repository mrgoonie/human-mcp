/**
 * ElevenLabs API HTTP Client
 * Shared client for TTS, Sound Effects, and Music Generation APIs
 */
import { logger } from "./logger.js";
import type { Config } from "./config.js";

export class ElevenLabsApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = "ElevenLabsApiError";
  }
}

export class ElevenLabsClient {
  private apiKey: string;
  private apiHost: string;

  constructor(config: Config) {
    const key = config.elevenlabs?.apiKey;
    if (!key) {
      throw new Error("ELEVENLABS_API_KEY is required");
    }
    this.apiKey = key;
    this.apiHost = config.elevenlabs?.apiHost || "https://api.elevenlabs.io";
  }

  /**
   * POST request returning binary audio buffer.
   * Used for TTS, SFX, and Music endpoints.
   */
  async postBinary(
    endpoint: string,
    body: Record<string, unknown>,
    queryParams?: Record<string, string>,
    timeoutMs: number = 60000
  ): Promise<Buffer> {
    const url = new URL(`${this.apiHost}${endpoint}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([k, v]) =>
        url.searchParams.set(k, v)
      );
    }
    logger.debug(`ElevenLabs POST (binary) ${url.toString()}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const requestId = response.headers.get("request-id") || undefined;
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          errorMsg = this.extractErrorMessage(errorJson, response.status);
        } catch {
          // response body not JSON
        }
        throw new ElevenLabsApiError(response.status, errorMsg, requestId);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST request returning parsed JSON.
   * Used for non-audio endpoints if needed.
   */
  async postJson<T = unknown>(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number = 60000
  ): Promise<T> {
    const url = `${this.apiHost}${endpoint}`;
    logger.debug(`ElevenLabs POST (json) ${url}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const result = await response.json();
      if (!response.ok) {
        const requestId = response.headers.get("request-id") || undefined;
        const errorMsg = this.extractErrorMessage(result, response.status);
        throw new ElevenLabsApiError(response.status, errorMsg, requestId);
      }
      return result as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Extract human-readable error message from API error response */
  private extractErrorMessage(
    errorJson: any,
    statusCode: number
  ): string {
    if (errorJson?.detail?.message) {
      return errorJson.detail.message;
    }
    if (typeof errorJson?.detail === "string") {
      return errorJson.detail;
    }
    if (Array.isArray(errorJson?.detail)) {
      return errorJson.detail
        .map((d: any) => d.msg || JSON.stringify(d))
        .join("; ");
    }
    return `ElevenLabs API error (HTTP ${statusCode})`;
  }

  /** Check if ElevenLabs is configured (API key present) */
  static isConfigured(config: Config): boolean {
    return !!(config.elevenlabs?.apiKey);
  }
}
