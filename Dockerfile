FROM oven/bun:1.2.19-alpine

WORKDIR /app

# Install system dependencies for video processing
RUN apk add --no-cache ffmpeg

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run dist/index.js --help || exit 1

# Run the application
CMD ["bun", "run", "dist/index.js"]