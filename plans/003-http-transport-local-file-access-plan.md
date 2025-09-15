# Plan: Fix Local File Access in HTTP Transport for Claude Desktop with Cloudflare R2 Integration

## Problem Statement

The Human MCP server's Vision Analysis Tool cannot read local image files when used with HTTP transport in Claude Desktop, while URL images work correctly. The issue occurs because:

1. **Path Translation Issue**: Claude Desktop transforms local file paths to container-style paths (`/mnt/user-data/uploads/`) when using HTTP transport
2. **File Access Limitation**: The HTTP server cannot access files outside its working directory due to security restrictions
3. **Missing File Upload Mechanism**: The current HTTP transport doesn't handle file uploads from the client

## Root Cause Analysis

### Current Behavior
When Claude Desktop uses the HTTP transport with a local file:
1. Claude Desktop sends: `source: "/mnt/user-data/uploads/CleanShot_2025-09-13_at_13_07_56_2x.png"`
2. The server tries to read this path using `fs.readFile()`
3. The file doesn't exist at that path on the server's filesystem
4. Error: `ENOENT: no such file or directory`

### Why URLs Work
- URLs are fetched directly using `fetch()` API
- No filesystem access required
- Data is downloaded and processed in memory

## Solution Design

### Approach 1: Cloudflare R2 Storage Integration (Recommended)
Automatically upload local files to Cloudflare R2 and use CDN URLs.

**Pros:**
- Scalable and reliable cloud storage
- Fast CDN delivery worldwide
- No base64 overhead
- Files accessible via public URLs
- Automatic file management
- Works with all file sizes

**Cons:**
- Requires Cloudflare account setup
- Network dependency for uploads
- Storage costs for large volumes

### Approach 2: File Upload via Base64
Transform local files to base64 data URIs before sending to the server.

**Pros:**
- Works with existing server code
- No external dependencies
- Secure - no filesystem access required

**Cons:**
- Increased payload size (~33% overhead)
- Memory usage for large files
- Size limitations

### Approach 3: Hybrid Approach
Combine Cloudflare R2 for large files and base64 for small files.

**Pros:**
- Optimal for all file sizes
- Fallback mechanism
- Best performance

**Cons:**
- More complex implementation
- Requires both systems

## Recommended Solution: Cloudflare R2 Integration with Automatic Upload

### Implementation Plan

#### Phase 1: Cloudflare R2 Integration

1. **Install Dependencies**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner mime-types uuid
```

2. **Create Cloudflare R2 Client** (`src/utils/cloudflare-r2.ts`)
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { logger } from './logger.js';

export class CloudflareR2Client {
  private s3Client: S3Client;
  private bucketName: string;
  private baseUrl: string;

  constructor() {
    const config = {
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_CDN_ENDPOINT_URL,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_CDN_ACCESS_KEY!,
        secretAccessKey: process.env.CLOUDFLARE_CDN_SECRET_KEY!,
      },
    };

    this.s3Client = new S3Client(config);
    this.bucketName = process.env.CLOUDFLARE_CDN_BUCKET_NAME!;
    this.baseUrl = process.env.CLOUDFLARE_CDN_BASE_URL!;
  }

  async uploadFile(buffer: Buffer, originalName: string): Promise<string> {
    try {
      const fileExtension = originalName.split('.').pop() || 'bin';
      const mimeType = mime.lookup(originalName) || 'application/octet-stream';
      const key = `human-mcp/${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          originalName: originalName,
          uploadedAt: new Date().toISOString(),
          source: 'human-mcp-http-transport'
        }
      });

      await this.s3Client.send(command);
      
      const publicUrl = `${this.baseUrl}/${key}`;
      logger.info(`File uploaded to Cloudflare R2: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      logger.error('Failed to upload to Cloudflare R2:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async uploadBase64(base64Data: string, mimeType: string, originalName?: string): Promise<string> {
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = mimeType.split('/')[1] || 'bin';
    const fileName = originalName || `upload-${Date.now()}.${extension}`;
    
    return this.uploadFile(buffer, fileName);
  }
}

// Singleton instance
export const cloudflareR2 = new CloudflareR2Client();
```

3. **Update File Path Detection with Auto-Upload** (`src/tools/eyes/processors/image.ts`)
```typescript
import { cloudflareR2 } from '@/utils/cloudflare-r2.js';

async function loadImage(source: string, fetchTimeout?: number): Promise<{ imageData: string; mimeType: string }> {
  // Detect Claude Desktop virtual paths and auto-upload to Cloudflare
  if (source.startsWith('/mnt/user-data/') || source.startsWith('/mnt/')) {
    logger.info(`Detected Claude Desktop virtual path: ${source}`);
    
    // Extract filename from path
    const filename = source.split('/').pop() || 'upload.jpg';
    
    // Try to read from a temporary upload directory (if middleware saved it)
    const tempPath = `/tmp/mcp-uploads/${filename}`;
    
    try {
      // Check if file was temporarily saved by middleware
      if (await fs.access(tempPath).then(() => true).catch(() => false)) {
        const buffer = await fs.readFile(tempPath);
        
        // Upload to Cloudflare R2
        const publicUrl = await cloudflareR2.uploadFile(buffer, filename);
        
        // Clean up temp file
        await fs.unlink(tempPath).catch(() => {});
        
        // Now fetch from the CDN URL
        return loadImage(publicUrl, fetchTimeout);
      }
    } catch (error) {
      logger.warn(`Could not process temp file: ${error.message}`);
    }
    
    // If no temp file, provide helpful error with Cloudflare upload instructions
    throw new ProcessingError(
      `Local file access not supported via HTTP transport.\n` +
      `The file path "${source}" is not accessible.\n\n` +
      `Solutions:\n` +
      `1. Upload your file to Cloudflare R2 first using the /mcp/upload endpoint\n` +
      `2. Use a public URL instead of a local file path\n` +
      `3. Convert the image to a base64 data URI\n` +
      `4. Use the stdio transport for local file access`
    );
  }
  
  // Existing base64 handling
  if (source.startsWith('data:image/')) {
    const [header, data] = source.split(',');
    if (!header || !data) {
      throw new ProcessingError("Invalid base64 image format");
    }
    const mimeMatch = header.match(/data:(image\/[^;]+)/);
    if (!mimeMatch || !mimeMatch[1]) {
      throw new ProcessingError("Invalid base64 image format");
    }
    
    // Optional: For large base64 images, upload to Cloudflare R2
    if (data.length > 1024 * 1024) { // > 1MB base64
      logger.info('Large base64 image detected, uploading to Cloudflare R2');
      const publicUrl = await cloudflareR2.uploadBase64(data, mimeMatch[1]);
      return loadImage(publicUrl, fetchTimeout);
    }
    
    return {
      imageData: data,
      mimeType: mimeMatch[1]
    };
  }
  
  // Existing URL handling
  if (source.startsWith('http://') || source.startsWith('https://')) {
    // ... existing code
  }
  
  // Local file handling - auto-upload to Cloudflare for HTTP transport
  try {
    const stats = await fs.stat(source);
    if (!stats.isFile()) {
      throw new ProcessingError(`Path is not a file: ${source}`);
    }
    
    // If using HTTP transport, upload to Cloudflare
    if (process.env.TRANSPORT_TYPE === 'http') {
      logger.info(`HTTP transport detected, uploading local file to Cloudflare R2: ${source}`);
      const buffer = await fs.readFile(source);
      const filename = source.split('/').pop() || 'upload.jpg';
      const publicUrl = await cloudflareR2.uploadFile(buffer, filename);
      
      // Fetch from CDN
      return loadImage(publicUrl, fetchTimeout);
    }
    
    // For stdio transport, process locally as before
    const buffer = await fs.readFile(source);
    const processedImage = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    return {
      imageData: processedImage.toString('base64'),
      mimeType: 'image/jpeg'
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ProcessingError(
        `File not found: ${source}\n` +
        `When using HTTP transport, files are automatically uploaded to Cloudflare R2.`
      );
    }
    throw error;
  }
}
```

4. **Add File Upload Endpoint** (`src/transports/http/routes.ts`)
```typescript
import multer from 'multer';
import { cloudflareR2 } from '@/utils/cloudflare-r2.js';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, and GIFs
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') ||
        file.mimetype === 'image/gif') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// POST /mcp/upload - Handle file uploads to Cloudflare R2
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'No file uploaded'
        },
        id: null
      });
      return;
    }
    
    // Upload to Cloudflare R2
    const publicUrl = await cloudflareR2.uploadFile(
      req.file.buffer,
      req.file.originalname
    );
    
    res.json({
      jsonrpc: '2.0',
      result: {
        success: true,
        url: publicUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        message: 'File uploaded successfully to Cloudflare R2'
      },
      id: req.body?.id || null
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Failed to upload file: ${error.message}`
      },
      id: req.body?.id || null
    });
  }
});

// POST /mcp/upload-base64 - Handle base64 uploads
router.post('/upload-base64', express.json({ limit: '100mb' }), async (req, res) => {
  try {
    const { data, mimeType, filename } = req.body;
    
    if (!data || !mimeType) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Missing required fields: data and mimeType'
        },
        id: null
      });
      return;
    }
    
    // Remove data URI prefix if present
    const base64Data = data.replace(/^data:.*?;base64,/, '');
    
    // Upload to Cloudflare R2
    const publicUrl = await cloudflareR2.uploadBase64(
      base64Data,
      mimeType,
      filename
    );
    
    res.json({
      jsonrpc: '2.0',
      result: {
        success: true,
        url: publicUrl,
        message: 'Base64 data uploaded successfully to Cloudflare R2'
      },
      id: req.body?.id || null
    });
  } catch (error) {
    logger.error('Base64 upload error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Failed to upload base64 data: ${error.message}`
      },
      id: req.body?.id || null
    });
  }
});
```

#### Phase 2: Client Configuration Documentation

1. **Update README.md** with HTTP transport file handling:
```markdown
### Using Local Files with HTTP Transport

When using HTTP transport (common with Claude Desktop), local files need special handling:

#### Option 1: Convert to Base64 (Recommended)
```bash
# Convert image to base64 data URI
base64_image=$(base64 -i image.png)
data_uri="data:image/png;base64,${base64_image}"
```

#### Option 2: Use File Upload Endpoint
```bash
# Upload file and get data URI
curl -X POST http://localhost:3000/mcp/upload \
  -F "file=@/path/to/image.png" \
  -H "Authorization: Bearer your_secret"
```

#### Option 3: Use Public URL
Upload your file to a cloud service and use the public URL.

#### Option 4: Use stdio Transport
For direct local file access, configure stdio transport instead of HTTP.
```

2. **Add Claude Desktop Specific Configuration**:
```json
{
  "mcpServers": {
    "human-mcp-http": {
      "command": "node",
      "args": ["path/to/http-wrapper.js"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "your_key",
        "TRANSPORT_TYPE": "http",
        "HTTP_PORT": "3000",
        "AUTO_CONVERT_FILES": "true"
      }
    }
  }
}
```

#### Phase 3: Create HTTP Wrapper Script

Create `src/transports/http/claude-wrapper.js`:
```javascript
#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { createServer } from 'http';
import express from 'express';
import proxy from 'http-proxy-middleware';

const app = express();
const PORT = process.env.HTTP_PORT || 3000;

// Middleware to intercept and transform requests
app.use(express.json({ limit: '50mb' }));

app.use('/mcp', async (req, res, next) => {
  // Check if request contains file paths
  if (req.body && req.body.params) {
    const params = req.body.params;
    
    // Check for source field (eyes_analyze tool)
    if (params.source && params.source.startsWith('/mnt/')) {
      // Extract actual filename
      const filename = params.source.split('/').pop();
      const localPath = `./uploads/${filename}`;
      
      if (existsSync(localPath)) {
        // Convert to base64
        const buffer = readFileSync(localPath);
        const base64 = buffer.toString('base64');
        params.source = `data:image/jpeg;base64,${base64}`;
      } else {
        // Return helpful error
        return res.status(400).json({
          error: `Local file not accessible via HTTP transport. Please use base64 or URL.`,
          suggestion: 'Convert your file to base64 or upload to a cloud service'
        });
      }
    }
  }
  
  next();
});

// Proxy to actual MCP server
app.use(proxy({
  target: `http://localhost:${PORT + 1}`,
  changeOrigin: true
}));

// Start wrapper server
app.listen(PORT, () => {
  console.log(`Claude Desktop HTTP wrapper listening on port ${PORT}`);
  
  // Start actual MCP server on next port
  const server = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      HTTP_PORT: String(PORT + 1),
      TRANSPORT_TYPE: 'http'
    }
  });
  
  server.stdout.pipe(process.stdout);
  server.stderr.pipe(process.stderr);
});
```

#### Phase 4: Testing Strategy

1. **Unit Tests** (`tests/unit/file-handling.test.ts`):
```typescript
describe('File Handling in HTTP Transport', () => {
  it('should reject /mnt/ paths with helpful error', async () => {
    const result = await processImage(model, '/mnt/user-data/test.png', options);
    expect(result).toContain('Local file access not supported');
  });
  
  it('should accept base64 data URIs', async () => {
    const dataUri = 'data:image/png;base64,iVBORw0KG...';
    const result = await processImage(model, dataUri, options);
    expect(result).toBeDefined();
  });
  
  it('should handle file upload endpoint', async () => {
    const response = await request(app)
      .post('/mcp/upload')
      .attach('file', 'test/fixtures/test.png');
    expect(response.body.dataUri).toMatch(/^data:image/);
  });
});
```

2. **Integration Tests** (`tests/integration/claude-desktop.test.ts`):
```typescript
describe('Claude Desktop Integration', () => {
  it('should handle Claude Desktop file paths gracefully', async () => {
    // Test with mock Claude Desktop request
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'eyes_analyze',
        arguments: {
          source: '/mnt/user-data/uploads/test.png',
          type: 'image'
        }
      }
    };
    
    const response = await sendRequest(request);
    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('base64 or URL');
  });
});
```

## Implementation Checklist

### Immediate Actions (Phase 1)
- [ ] Update `loadImage()` function with better error handling for `/mnt/` paths
- [ ] Add clear error messages with actionable suggestions
- [ ] Update documentation with HTTP transport limitations

### Short-term (Phase 2)
- [ ] Implement file upload endpoint
- [ ] Add multer middleware for multipart handling
- [ ] Create base64 conversion utilities
- [ ] Update README with usage examples

### Medium-term (Phase 3)
- [ ] Create Claude Desktop wrapper script
- [ ] Add automatic file conversion option
- [ ] Implement caching for converted files
- [ ] Add file size optimization

### Long-term (Phase 4)
- [ ] Investigate Claude Desktop API for native file handling
- [ ] Propose MCP specification enhancement for file transfers
- [ ] Create browser extension for automatic conversion
- [ ] Add streaming support for large files

## Security Considerations

1. **Path Traversal Prevention**: Never allow direct filesystem access via HTTP
2. **File Size Limits**: Enforce reasonable limits (50MB default)
3. **MIME Type Validation**: Only accept image/video files
4. **Memory Management**: Stream large files instead of loading into memory
5. **Authentication**: Require auth token for file upload endpoint

## Performance Optimizations

1. **Compression**: Use sharp to compress images before base64 encoding
2. **Caching**: Cache converted files for repeated requests
3. **Lazy Loading**: Only convert files when actually needed
4. **Chunking**: Support chunked uploads for large files

## Alternative Solutions

### Using stdio Transport
For users who need local file access, recommend stdio transport:
```json
{
  "mcpServers": {
    "human-mcp": {
      "command": "npx",
      "args": ["@goonnguyen/human-mcp"],
      "env": {
        "GOOGLE_GEMINI_API_KEY": "key",
        "TRANSPORT_TYPE": "stdio"
      }
    }
  }
}
```

### Using Cloud Storage
Recommend uploading files to cloud storage and using URLs:
- Cloudinary for images
- AWS S3 for general files
- GitHub for public files

## Success Metrics

1. **Error Rate**: Reduce "file not found" errors by 95%
2. **User Experience**: Clear, actionable error messages
3. **Performance**: File processing under 2 seconds
4. **Compatibility**: Works with all MCP clients
5. **Security**: No path traversal vulnerabilities

## Rollout Plan

1. **Week 1**: Implement error handling improvements
2. **Week 2**: Add file upload endpoint and documentation
3. **Week 3**: Create wrapper script and test with Claude Desktop
4. **Week 4**: Gather feedback and iterate

## Conclusion

The recommended solution provides a pragmatic approach to handling local files in HTTP transport while maintaining security and compatibility. The phased implementation allows for immediate improvements while working toward a comprehensive solution.