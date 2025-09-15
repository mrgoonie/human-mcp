import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { logger } from './logger.js';

export class CloudflareR2Client {
  private s3Client: S3Client;
  private bucketName: string;
  private baseUrl: string;

  constructor() {
    // Check if required environment variables are set
    const requiredVars = [
      'CLOUDFLARE_CDN_ACCESS_KEY',
      'CLOUDFLARE_CDN_SECRET_KEY', 
      'CLOUDFLARE_CDN_ENDPOINT_URL',
      'CLOUDFLARE_CDN_BUCKET_NAME',
      'CLOUDFLARE_CDN_BASE_URL'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing required Cloudflare R2 environment variables: ${missing.join(', ')}`);
    }

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
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadBase64(base64Data: string, mimeType: string, originalName?: string): Promise<string> {
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = mimeType.split('/')[1] || 'bin';
    const fileName = originalName || `upload-${Date.now()}.${extension}`;
    
    return this.uploadFile(buffer, fileName);
  }

  isConfigured(): boolean {
    try {
      const requiredVars = [
        'CLOUDFLARE_CDN_ACCESS_KEY',
        'CLOUDFLARE_CDN_SECRET_KEY', 
        'CLOUDFLARE_CDN_ENDPOINT_URL',
        'CLOUDFLARE_CDN_BUCKET_NAME',
        'CLOUDFLARE_CDN_BASE_URL'
      ];
      return requiredVars.every(varName => process.env[varName]);
    } catch {
      return false;
    }
  }
}

// Singleton instance with lazy initialization
let cloudflareR2Instance: CloudflareR2Client | null = null;

export function getCloudflareR2(): CloudflareR2Client | null {
  if (!cloudflareR2Instance) {
    try {
      cloudflareR2Instance = new CloudflareR2Client();
    } catch (error) {
      logger.warn('Cloudflare R2 not configured:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  return cloudflareR2Instance;
}