import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentFormat,
  DocumentStructure,
  ProcessingInfo
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError, ValidationError } from '@/utils/errors.js';
import { promises as fs } from 'fs';
import path from 'path';

export abstract class DocumentProcessor {
  protected geminiClient: GeminiClient;
  protected supportedFormats: DocumentFormat[];

  constructor(geminiClient: GeminiClient, supportedFormats: DocumentFormat[]) {
    this.geminiClient = geminiClient;
    this.supportedFormats = supportedFormats;
  }

  /**
   * Process a document from various sources (file path, URL, base64)
   */
  abstract process(source: string, options?: ProcessOptions): Promise<DocumentResult>;

  /**
   * Extract text content from the document
   */
  abstract extractText(): Promise<string>;

  /**
   * Extract structured data using a provided schema
   */
  abstract extractStructuredData(schema: object, options?: ProcessOptions): Promise<any>;

  /**
   * Get document metadata
   */
  abstract getMetadata(): Promise<DocumentMetadata>;

  /**
   * Get document structure (sections, tables, etc.)
   */
  abstract getStructure(): Promise<DocumentStructure>;

  /**
   * Validate if the processor can handle the given format
   */
  canProcess(format: DocumentFormat): boolean {
    return this.supportedFormats.includes(format);
  }

  /**
   * Load document content from various sources
   */
  protected async loadDocument(source: string): Promise<Buffer> {
    try {
      // Handle base64 data URI
      if (source.startsWith('data:')) {
        const base64Data = source.split(',')[1];
        if (!base64Data) {
          throw new ValidationError('Invalid base64 data URI format');
        }
        return Buffer.from(base64Data, 'base64');
      }

      // Handle URLs
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const response = await fetch(source);
        if (!response.ok) {
          throw new APIError(`Failed to fetch document: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // Handle file paths
      const resolvedPath = path.resolve(source);
      return await fs.readFile(resolvedPath);
    } catch (error) {
      logger.error(`Failed to load document from ${source}:`, error);
      if (error instanceof Error) {
        throw new APIError(`Failed to load document: ${error.message}`);
      }
      throw new APIError('Failed to load document: Unknown error');
    }
  }

  /**
   * Detect document format from file extension or content
   */
  protected detectFormat(source: string, buffer?: Buffer): DocumentFormat {
    // Check file extension first
    const extension = path.extname(source).toLowerCase();

    const extensionMap: Record<string, DocumentFormat> = {
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.xlsx': 'xlsx',
      '.pptx': 'pptx',
      '.txt': 'txt',
      '.md': 'md',
      '.rtf': 'rtf',
      '.odt': 'odt',
      '.csv': 'csv',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html'
    };

    if (extension && extensionMap[extension]) {
      return extensionMap[extension];
    }

    // Fallback to content-based detection if buffer is available
    if (buffer) {
      return this.detectFormatFromContent(buffer);
    }

    throw new ValidationError(`Unable to detect document format for: ${source}`);
  }

  /**
   * Detect format from file content (magic bytes)
   */
  private detectFormatFromContent(buffer: Buffer): DocumentFormat {
    // PDF detection
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return 'pdf';
    }

    // ZIP-based formats (DOCX, XLSX, PPTX, ODT)
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) {
      // Check for specific file signatures within ZIP
      const zipContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

      if (zipContent.includes('word/')) return 'docx';
      if (zipContent.includes('xl/')) return 'xlsx';
      if (zipContent.includes('ppt/')) return 'pptx';
      if (zipContent.includes('content.xml')) return 'odt';
    }

    // JSON detection
    try {
      JSON.parse(buffer.toString('utf8', 0, Math.min(1024, buffer.length)));
      return 'json';
    } catch {
      // Not JSON
    }

    // XML/HTML detection
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    if (content.includes('<?xml') || content.includes('<html')) {
      return content.includes('<html') ? 'html' : 'xml';
    }

    // Default to text
    return 'txt';
  }

  /**
   * Create processing info object
   */
  protected createProcessingInfo(
    startTime: number,
    modelUsed: string,
    extractionMethod: string,
    confidence?: number,
    warnings?: string[],
    errors?: string[]
  ): ProcessingInfo {
    return {
      processingTimeMs: Date.now() - startTime,
      modelUsed,
      extractionMethod,
      confidence,
      warnings,
      errors
    };
  }

  /**
   * Validate processing options
   */
  protected validateOptions(options?: ProcessOptions): ProcessOptions {
    return {
      extractText: options?.extractText ?? true,
      extractTables: options?.extractTables ?? true,
      extractImages: options?.extractImages ?? false,
      preserveFormatting: options?.preserveFormatting ?? false,
      pageRange: options?.pageRange,
      detailLevel: options?.detailLevel ?? 'detailed',
      language: options?.language,
      timeout: options?.timeout ?? 30000
    };
  }

  /**
   * Get MIME type for document format
   */
  protected getMimeType(format: DocumentFormat): string {
    const mimeTypes: Record<DocumentFormat, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      md: 'text/markdown',
      rtf: 'application/rtf',
      odt: 'application/vnd.oasis.opendocument.text',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html'
    };

    return mimeTypes[format] || 'application/octet-stream';
  }
}