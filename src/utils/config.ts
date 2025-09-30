import { z } from "zod";

const ConfigSchema = z.object({
  gemini: z.object({
    apiKey: z.string().min(1, "Google Gemini API key is required"),
    model: z.string().default("gemini-2.5-flash"),
    imageModel: z.string().default("gemini-2.5-flash-image-preview"),
  }),
  transport: z.object({
    type: z.enum(["stdio", "http", "both"]).default("stdio"),
    http: z.object({
      enabled: z.boolean().default(false),
      port: z.number().default(3000),
      host: z.string().default("0.0.0.0"),
      sessionMode: z.enum(["stateful", "stateless"]).default("stateful"),
      enableSse: z.boolean().default(true),
      enableJsonResponse: z.boolean().default(true),
      enableSseFallback: z.boolean().default(false),
      ssePaths: z.object({
        stream: z.string().default("/sse"),
        message: z.string().default("/messages")
      }).default({ stream: "/sse", message: "/messages" }),
      security: z.object({
        enableCors: z.boolean().default(true),
        corsOrigins: z.array(z.string()).optional(),
        enableDnsRebindingProtection: z.boolean().default(true),
        allowedHosts: z.array(z.string()).default(["127.0.0.1", "localhost"]),
        enableRateLimiting: z.boolean().default(false),
        secret: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
  server: z.object({
    port: z.number().default(3000),
    maxRequestSize: z.string().default("50MB"),
    enableCaching: z.boolean().default(true),
    cacheTTL: z.number().default(3600),
    requestTimeout: z.number().default(300000), // 5 minutes
    fetchTimeout: z.number().default(60000), // 60 seconds for HTTP requests
  }),
  security: z.object({
    secret: z.string().optional(),
    rateLimitRequests: z.number().default(100),
    rateLimitWindow: z.number().default(60000),
  }),
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  }),
  cloudflare: z.object({
    projectName: z.string().optional().default("human-mcp"),
    bucketName: z.string().optional(),
    accessKey: z.string().optional(),
    secretKey: z.string().optional(),
    endpointUrl: z.string().optional(),
    baseUrl: z.string().optional(),
  }).optional(),
  documentProcessing: z.object({
    enabled: z.boolean().default(true),
    maxFileSize: z.number().default(50 * 1024 * 1024), // 50MB
    supportedFormats: z.array(z.string()).default([
      "pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html"
    ]),
    timeout: z.number().default(300000), // 5 minutes
    retryAttempts: z.number().default(3),
    cacheEnabled: z.boolean().default(true),
    ocrEnabled: z.boolean().default(false),
    geminiModel: z.string().default("gemini-2.5-flash"),
  }).default({
    enabled: true,
    maxFileSize: 50 * 1024 * 1024,
    supportedFormats: ["pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html"],
    timeout: 300000,
    retryAttempts: 3,
    cacheEnabled: true,
    ocrEnabled: false,
    geminiModel: "gemini-2.5-flash"
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const corsOrigins = process.env.HTTP_CORS_ORIGINS ? 
    process.env.HTTP_CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
    undefined;
  
  const allowedHosts = process.env.HTTP_ALLOWED_HOSTS ? 
    process.env.HTTP_ALLOWED_HOSTS.split(',').map(host => host.trim()) : 
    ["127.0.0.1", "localhost"];

  return ConfigSchema.parse({
    gemini: {
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
      model: process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash",
      imageModel: process.env.GOOGLE_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview",
    },
    transport: {
      type: (process.env.TRANSPORT_TYPE as any) || "stdio",
      http: {
        enabled: process.env.TRANSPORT_TYPE === "http" || process.env.TRANSPORT_TYPE === "both",
        port: parseInt(process.env.HTTP_PORT || "3000"),
        host: process.env.HTTP_HOST || "0.0.0.0",
        sessionMode: (process.env.HTTP_SESSION_MODE as any) || "stateful",
        enableSse: process.env.HTTP_ENABLE_SSE !== "false",
        enableJsonResponse: process.env.HTTP_ENABLE_JSON_RESPONSE !== "false",
        enableSseFallback: process.env.HTTP_ENABLE_SSE_FALLBACK === "true",
        ssePaths: {
          stream: process.env.HTTP_SSE_STREAM_PATH || "/sse",
          message: process.env.HTTP_SSE_MESSAGE_PATH || "/messages"
        },
        security: {
          enableCors: process.env.HTTP_CORS_ENABLED !== "false",
          corsOrigins,
          enableDnsRebindingProtection: process.env.HTTP_DNS_REBINDING_ENABLED !== "false",
          allowedHosts,
          enableRateLimiting: process.env.HTTP_ENABLE_RATE_LIMITING === "true",
          secret: process.env.HTTP_SECRET,
        },
      },
    },
    server: {
      port: parseInt(process.env.PORT || "3000"),
      maxRequestSize: process.env.MAX_REQUEST_SIZE || "50MB",
      enableCaching: process.env.ENABLE_CACHING !== "false",
      cacheTTL: parseInt(process.env.CACHE_TTL || "3600"),
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "300000"),
      fetchTimeout: parseInt(process.env.FETCH_TIMEOUT || "60000"),
    },
    security: {
      secret: process.env.MCP_SECRET,
      rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || "100"),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"),
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || "info",
    },
    cloudflare: {
      projectName: process.env.CLOUDFLARE_CDN_PROJECT_NAME || "human-mcp",
      bucketName: process.env.CLOUDFLARE_CDN_BUCKET_NAME,
      accessKey: process.env.CLOUDFLARE_CDN_ACCESS_KEY,
      secretKey: process.env.CLOUDFLARE_CDN_SECRET_KEY,
      endpointUrl: process.env.CLOUDFLARE_CDN_ENDPOINT_URL,
      baseUrl: process.env.CLOUDFLARE_CDN_BASE_URL,
    },
    documentProcessing: {
      enabled: process.env.DOCUMENT_PROCESSING_ENABLED !== "false",
      maxFileSize: parseInt(process.env.DOCUMENT_MAX_FILE_SIZE || "52428800"), // 50MB
      supportedFormats: process.env.DOCUMENT_SUPPORTED_FORMATS ?
        process.env.DOCUMENT_SUPPORTED_FORMATS.split(',').map(format => format.trim()) :
        ["pdf", "docx", "xlsx", "pptx", "txt", "md", "rtf", "odt", "csv", "json", "xml", "html"],
      timeout: parseInt(process.env.DOCUMENT_TIMEOUT || "300000"),
      retryAttempts: parseInt(process.env.DOCUMENT_RETRY_ATTEMPTS || "3"),
      cacheEnabled: process.env.DOCUMENT_CACHE_ENABLED !== "false",
      ocrEnabled: process.env.DOCUMENT_OCR_ENABLED === "true",
      geminiModel: process.env.DOCUMENT_GEMINI_MODEL || "gemini-2.0-flash-exp",
    },
  });
}