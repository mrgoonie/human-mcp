import type { Request, Response, NextFunction } from 'express';
import { getCloudflareR2 } from '@/utils/cloudflare-r2.js';
import { logger } from '@/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export async function fileInterceptorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only intercept tool calls with file paths
  if (req.body?.method === 'tools/call' && req.body?.params?.arguments) {
    const args = req.body.params.arguments;
    
    // Check for source fields that might contain file paths
    const fileFields = ['source', 'source1', 'source2', 'path', 'filePath'];
    
    for (const field of fileFields) {
      if (args[field] && typeof args[field] === 'string') {
        const filePath = args[field];
        
        // Detect Claude Desktop virtual paths
        if (filePath.startsWith('/mnt/user-data/') || filePath.startsWith('/mnt/')) {
          logger.info(`Intercepting Claude Desktop virtual path: ${filePath}`);
          
          try {
            // Extract filename
            const filename = path.basename(filePath);
            
            // Check if we have a temporary file saved by Claude Desktop
            const tempPath = path.join('/tmp/claude-uploads', filename);
            
            if (await fs.access(tempPath).then(() => true).catch(() => false)) {
              const cloudflare = getCloudflareR2();
              if (cloudflare) {
                // File exists in temp, upload to Cloudflare
                const buffer = await fs.readFile(tempPath);
                const publicUrl = await cloudflare.uploadFile(buffer, filename);
                
                // Replace the virtual path with CDN URL
                args[field] = publicUrl;
                
                // Clean up temp file
                await fs.unlink(tempPath).catch(() => {});
                
                logger.info(`Replaced virtual path with CDN URL: ${publicUrl}`);
              }
            } else {
              // No temp file, try to extract from request if it's base64
              // This handles cases where Claude Desktop might send base64 inline
              if ((req.body.params as any).fileData && (req.body.params as any).fileData[field]) {
                const base64Data = (req.body.params as any).fileData[field];
                const mimeType = (req.body.params as any).fileMimeTypes?.[field] || 'image/jpeg';
                
                const cloudflare = getCloudflareR2();
                if (cloudflare) {
                  const publicUrl = await cloudflare.uploadBase64(
                    base64Data,
                    mimeType,
                    filename
                  );
                  
                  args[field] = publicUrl;
                  logger.info(`Uploaded inline base64 to CDN: ${publicUrl}`);
                }
              } else {
                // Provide helpful error response
                logger.warn(`Cannot access virtual path: ${filePath}`);
                return res.status(400).json({
                  jsonrpc: '2.0',
                  error: {
                    code: -32602,
                    message: 'File not accessible via HTTP transport',
                    data: {
                      path: filePath,
                      suggestions: [
                        'Upload the file using the /mcp/upload endpoint first',
                        'Use a public URL instead of a local file path',
                        'Convert the image to a base64 data URI',
                        'Switch to stdio transport for local file access'
                      ]
                    }
                  },
                  id: req.body.id
                });
              }
            }
          } catch (error) {
            logger.error(`Error processing virtual path: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
              },
              id: req.body.id
            });
          }
        }
        
        // Handle regular local paths when in HTTP mode
        else if (!filePath.startsWith('http') && !filePath.startsWith('data:')) {
          if (process.env.TRANSPORT_TYPE === 'http') {
            const cloudflare = getCloudflareR2();
            if (cloudflare) {
              try {
                // Check if file exists locally
                await fs.access(filePath);
                
                // Upload to Cloudflare R2
                const buffer = await fs.readFile(filePath);
                const filename = path.basename(filePath);
                const publicUrl = await cloudflare.uploadFile(buffer, filename);
                
                // Replace local path with CDN URL
                args[field] = publicUrl;
                
                logger.info(`Auto-uploaded local file to CDN: ${publicUrl}`);
              } catch (error) {
                if (error instanceof Error && error.message.includes('ENOENT')) {
                  logger.warn(`Local file not found: ${filePath}`);
                }
                // Continue without modification if file doesn't exist or cloudflare not configured
              }
            }
          }
        }
      }
    }
  }
  
  next();
}