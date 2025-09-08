# Human MCP Server - VPS Deployment Guide

This guide explains how to deploy the Human MCP Server on a VPS using Docker and Docker Compose.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Domain name (optional, for SSL/HTTPS)
- Google Gemini API key

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd human-mcp
```

### 2. Configure Environment

```bash
# Copy the production environment template
cp .env.production .env

# Edit the configuration
nano .env
```

**Required Configuration:**
- Set your `GOOGLE_GEMINI_API_KEY`
- Update `DOMAIN` if using Traefik with SSL
- Set `ACME_EMAIL` for Let's Encrypt certificates

### 3. Deploy with Docker Compose

#### Basic Deployment (HTTP only)
```bash
docker-compose up -d human-mcp
```

#### Production Deployment (with HTTPS and Traefik)
```bash
# Create necessary directories
mkdir -p data letsencrypt

# Deploy with Traefik reverse proxy
docker-compose --profile proxy up -d
```

#### With Redis (for session scaling)
```bash
docker-compose --profile redis --profile proxy up -d
```

## Deployment Options

### Option 1: Basic HTTP Deployment

Suitable for development or internal networks.

```bash
# Just the MCP server
docker-compose up -d human-mcp
```

Access: `http://your-server-ip:3000`

### Option 2: Production HTTPS Deployment

Includes Traefik reverse proxy with automatic SSL certificates.

```bash
# Full production stack
docker-compose --profile proxy up -d
```

Access: `https://your-domain.com`

### Option 3: Scalable Deployment

Adds Redis for session storage (enables horizontal scaling).

```bash
# Production with Redis
docker-compose --profile redis --profile proxy up -d
```

## Configuration Guide

### Environment Variables

Key environment variables in `.env`:

```bash
# Core
GOOGLE_GEMINI_API_KEY=your_api_key_here
DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com

# Security
HTTP_CORS_ORIGINS=https://your-domain.com
HTTP_ALLOWED_HOSTS=127.0.0.1,localhost,your-domain.com
HTTP_SECRET=your_secret_token_here

# Performance
HTTP_ENABLE_RATE_LIMITING=true
RATE_LIMIT_REQUESTS=100
LOG_LEVEL=warn
```

### Security Recommendations

1. **Set Authentication Secret**
   ```bash
   HTTP_SECRET=your_strong_secret_here
   ```

2. **Limit CORS Origins**
   ```bash
   HTTP_CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
   ```

3. **Configure Allowed Hosts**
   ```bash
   HTTP_ALLOWED_HOSTS=127.0.0.1,localhost,your-domain.com
   ```

4. **Enable Rate Limiting**
   ```bash
   HTTP_ENABLE_RATE_LIMITING=true
   RATE_LIMIT_REQUESTS=100
   RATE_LIMIT_WINDOW=60000
   ```

## Server Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f human-mcp
```

### Update Deployment
```bash
# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Health Check
```bash
# Check service health
curl http://localhost:3000/health

# Or with domain
curl https://your-domain.com/health
```

## API Usage

### Initialize Session
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "your-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'
```

### List Available Tools
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

## Monitoring

### Resource Usage
```bash
# Check container stats
docker stats human-mcp-server

# Check logs for errors
docker-compose logs human-mcp | grep ERROR
```

### Health Monitoring
The service includes health checks accessible at `/health`:

```bash
# Check health
curl https://your-domain.com/health

# Expected response
{
  "status": "healthy",
  "transport": "streamable-http"
}
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs
   docker-compose logs human-mcp
   
   # Verify configuration
   docker-compose config
   ```

2. **SSL certificate issues**
   ```bash
   # Check Traefik logs
   docker-compose logs traefik
   
   # Verify domain DNS points to server
   nslookup your-domain.com
   ```

3. **API requests failing**
   ```bash
   # Check CORS and allowed hosts
   # Verify API key is set correctly
   # Check rate limiting settings
   ```

### Service Restart
```bash
# Restart specific service
docker-compose restart human-mcp

# Restart all services
docker-compose restart
```

### Clean Deployment
```bash
# Stop and remove containers
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Fresh deployment
docker-compose up -d --build
```

## Performance Tuning

### Resource Limits
Adjust in `docker-compose.yaml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
```

### Scaling
For high traffic, consider:

1. Enable Redis for session storage
2. Use multiple MCP server instances
3. Configure load balancing in Traefik
4. Monitor resource usage and scale accordingly

## Backup

### Important Data
- Environment configuration (`.env`)
- SSL certificates (`letsencrypt/`)
- Application data (`data/`)

### Backup Commands
```bash
# Create backup
tar -czf human-mcp-backup-$(date +%Y%m%d).tar.gz .env letsencrypt/ data/

# Restore backup
tar -xzf human-mcp-backup-YYYYMMDD.tar.gz
```

## Support

- Check application logs for errors
- Verify environment configuration
- Ensure all required services are running
- Test health endpoint accessibility