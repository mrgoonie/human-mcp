import { z } from "zod";

const ConfigSchema = z.object({
  gemini: z.object({
    apiKey: z.string().min(1, "Google Gemini API key is required"),
    model: z.string().default("gemini-2.0-flash-latest"),
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
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    gemini: {
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
      model: process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash",
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
  });
}