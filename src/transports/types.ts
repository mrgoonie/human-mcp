import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface TransportConfig {
  type: 'stdio' | 'http' | 'both';
  http?: HttpTransportConfig;
}

export interface HttpTransportConfig {
  port: number;
  host?: string;
  sessionMode: 'stateful' | 'stateless';
  enableSse?: boolean;
  enableJsonResponse?: boolean;
  enableSseFallback?: boolean;
  ssePaths?: {
    stream: string;
    message: string;
  };
  security?: SecurityConfig;
}

export interface SecurityConfig {
  enableCors?: boolean;
  corsOrigins?: string[];
  enableDnsRebindingProtection?: boolean;
  allowedHosts?: string[];
  enableRateLimiting?: boolean;
  secret?: string;
}

export interface TransportSession {
  id: string;
  createdAt: number;
  transport: StreamableHTTPServerTransport;
}

export interface SessionStore {
  get(sessionId: string): Promise<TransportSession | null>;
  set(sessionId: string, session: TransportSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}