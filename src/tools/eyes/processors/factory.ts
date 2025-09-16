import { DocumentProcessor } from './document.js';
import { PDFProcessor } from './pdf.js';
import { WordProcessor } from './word.js';
import { ExcelProcessor } from './excel.js';
import { PowerPointProcessor } from './powerpoint.js';
import { TextProcessor } from './text.js';
import { GeminiClient } from '../utils/gemini-client.js';
import type { DocumentFormat } from '../types/document.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';

export class DocumentProcessorFactory {
  private static processors = new Map<DocumentFormat, new (geminiClient: GeminiClient) => DocumentProcessor>();

  /**
   * Register all document processors
   */
  static registerProcessors(geminiClient: GeminiClient): void {
    // Register PDF processor
    this.processors.set('pdf', PDFProcessor);

    // Register Word processor
    this.processors.set('docx', WordProcessor);

    // Register Excel processor
    this.processors.set('xlsx', ExcelProcessor);

    // Register PowerPoint processor
    this.processors.set('pptx', PowerPointProcessor);

    // Register text-based processors
    this.processors.set('txt', TextProcessor);
    this.processors.set('md', TextProcessor);
    this.processors.set('csv', TextProcessor);
    this.processors.set('json', TextProcessor);
    this.processors.set('xml', TextProcessor);
    this.processors.set('html', TextProcessor);
    this.processors.set('rtf', TextProcessor);
    this.processors.set('odt', TextProcessor);

    logger.info(`Registered ${this.processors.size} document processors`);
  }

  /**
   * Create a document processor for the given format
   */
  static create(format: DocumentFormat, geminiClient: GeminiClient): DocumentProcessor {
    const ProcessorClass = this.processors.get(format);

    if (!ProcessorClass) {
      throw new APIError(`No processor available for format: ${format}`);
    }

    try {
      return new ProcessorClass(geminiClient);
    } catch (error) {
      logger.error(`Failed to create processor for format ${format}:`, error);
      throw new APIError(`Failed to initialize processor for format: ${format}`);
    }
  }

  /**
   * Get all supported formats
   */
  static getSupportedFormats(): DocumentFormat[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if a format is supported
   */
  static isFormatSupported(format: DocumentFormat): boolean {
    return this.processors.has(format);
  }

  /**
   * Get processor class for a format
   */
  static getProcessorClass(format: DocumentFormat): (new (geminiClient: GeminiClient) => DocumentProcessor) | null {
    return this.processors.get(format) || null;
  }

  /**
   * Auto-detect format from file path or content
   */
  static detectFormat(source: string, content?: Buffer): DocumentFormat {
    // Check file extension first
    const path = require('path');
    const extension = path.extname(source).toLowerCase();

    const extensionMap: Record<string, DocumentFormat> = {
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.xlsx': 'xlsx',
      '.xls': 'xlsx',
      '.pptx': 'pptx',
      '.txt': 'txt',
      '.md': 'md',
      '.markdown': 'md',
      '.csv': 'csv',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.htm': 'html',
      '.rtf': 'rtf',
      '.odt': 'odt'
    };

    if (extension && extensionMap[extension]) {
      return extensionMap[extension];
    }

    // Content-based detection if buffer is provided
    if (content) {
      return this.detectFormatFromContent(content);
    }

    // Default to text
    return 'txt';
  }

  /**
   * Detect format from file content
   */
  private static detectFormatFromContent(buffer: Buffer): DocumentFormat {
    // PDF detection
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return 'pdf';
    }

    // ZIP-based formats (DOCX, XLSX, PPTX, ODT)
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) {
      const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

      if (content.includes('word/')) return 'docx';
      if (content.includes('xl/')) return 'xlsx';
      if (content.includes('ppt/')) return 'pptx';
      if (content.includes('content.xml')) return 'odt';
    }

    // JSON detection
    try {
      const textContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
      JSON.parse(textContent);
      return 'json';
    } catch {
      // Not JSON
    }

    // XML/HTML detection
    const textContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    if (textContent.includes('<?xml') || textContent.includes('<html')) {
      return textContent.includes('<html') ? 'html' : 'xml';
    }

    // Default to text
    return 'txt';
  }

  /**
   * Get format information
   */
  static getFormatInfo(format: DocumentFormat): {
    name: string;
    mimeType: string;
    extensions: string[];
    description: string;
  } {
    const formatInfo: Record<DocumentFormat, {
      name: string;
      mimeType: string;
      extensions: string[];
      description: string;
    }> = {
      pdf: {
        name: 'PDF',
        mimeType: 'application/pdf',
        extensions: ['.pdf'],
        description: 'Portable Document Format'
      },
      docx: {
        name: 'Word Document',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extensions: ['.docx'],
        description: 'Microsoft Word document'
      },
      xlsx: {
        name: 'Excel Spreadsheet',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extensions: ['.xlsx', '.xls'],
        description: 'Microsoft Excel spreadsheet'
      },
      pptx: {
        name: 'PowerPoint Presentation',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        extensions: ['.pptx'],
        description: 'Microsoft PowerPoint presentation'
      },
      txt: {
        name: 'Plain Text',
        mimeType: 'text/plain',
        extensions: ['.txt'],
        description: 'Plain text file'
      },
      md: {
        name: 'Markdown',
        mimeType: 'text/markdown',
        extensions: ['.md', '.markdown'],
        description: 'Markdown formatted text'
      },
      csv: {
        name: 'CSV',
        mimeType: 'text/csv',
        extensions: ['.csv'],
        description: 'Comma-separated values'
      },
      json: {
        name: 'JSON',
        mimeType: 'application/json',
        extensions: ['.json'],
        description: 'JavaScript Object Notation'
      },
      xml: {
        name: 'XML',
        mimeType: 'application/xml',
        extensions: ['.xml'],
        description: 'Extensible Markup Language'
      },
      html: {
        name: 'HTML',
        mimeType: 'text/html',
        extensions: ['.html', '.htm'],
        description: 'HyperText Markup Language'
      },
      rtf: {
        name: 'RTF',
        mimeType: 'application/rtf',
        extensions: ['.rtf'],
        description: 'Rich Text Format'
      },
      odt: {
        name: 'OpenDocument Text',
        mimeType: 'application/vnd.oasis.opendocument.text',
        extensions: ['.odt'],
        description: 'OpenDocument text document'
      }
    };

    return formatInfo[format] || {
      name: 'Unknown',
      mimeType: 'application/octet-stream',
      extensions: [],
      description: 'Unknown format'
    };
  }
}