# Human MCP Server - Production Dockerfile
FROM oven/bun:1-alpine AS base

# Install system dependencies needed for video processing
RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    dumb-init \
    wget

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (production only)
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Change ownership of the app directory
RUN chown -R mcp:nodejs /app
USER mcp

# Set production environment variables
ENV NODE_ENV=production
ENV TRANSPORT_TYPE=http
ENV HTTP_PORT=3000
ENV HTTP_HOST=0.0.0.0
ENV HTTP_SESSION_MODE=stateful
ENV HTTP_CORS_ENABLED=true

# Expose the port
EXPOSE 3000

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["bun", "run", "dist/index.js"]