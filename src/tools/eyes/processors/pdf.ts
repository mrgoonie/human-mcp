import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  Table,
  Image
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';

export class PDFProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['pdf']);
  }

  /**
   * Process PDF document using native Gemini capabilities
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing PDF document: ${source}`);

      const buffer = await this.loadDocument(source);

      // Use Gemini's native document processing
      const geminiResult = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        options
      );

      // Extract metadata using Gemini
      const metadata = await this.extractMetadataWithGemini(buffer);

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: this.geminiClient.getDocumentModel().model,
        extractionMethod: 'gemini-native',
        confidence: 0.95
      };

      return {
        content: geminiResult.content || '',
        metadata: { ...metadata, wordCount: this.countWords(geminiResult.content || '') },
        structure: geminiResult.structure,
        extractedData: geminiResult.extractedData,
        processingInfo
      };
    } catch (error) {
      logger.error(`PDF processing error for ${source}:`, error);
      throw new APIError(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from PDF using Gemini
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        { extractText: true, extractTables: false, extractImages: false }
      );
      return result.content || '';
    } catch (error) {
      logger.error('PDF text extraction error:', error);
      throw new APIError(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructuredData(schema: object, options: ProcessOptions = {}): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        'application/pdf',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('PDF structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PDF metadata using Gemini
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.extractMetadataWithGemini(buffer);
    } catch (error) {
      logger.error('PDF metadata extraction error:', error);
      throw new APIError(`Failed to extract PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PDF structure using Gemini
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        { extractText: false, extractTables: true, extractImages: true }
      );
      return result.structure || {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    } catch (error) {
      logger.error('PDF structure analysis error:', error);
      throw new APIError(`Failed to analyze PDF structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract tables from PDF
   */
  async extractTables(buffer: Buffer): Promise<Table[]> {
    try {
      const tables: Table[] = [];

      // Use Gemini for table extraction
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        {
          extractTables: true,
          extractText: false,
          extractImages: false,
          preserveFormatting: true
        }
      );

      if (result.structure?.tables) {
        tables.push(...result.structure.tables);
      }

      return tables;
    } catch (error) {
      logger.warn('PDF table extraction failed, returning empty array:', error);
      return [];
    }
  }

  /**
   * Extract images from PDF
   */
  async extractImages(buffer: Buffer): Promise<Image[]> {
    try {
      const images: Image[] = [];

      // Use Gemini for image detection and description
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/pdf',
        {
          extractImages: true,
          extractText: false,
          extractTables: false
        }
      );

      if (result.structure?.images) {
        images.push(...result.structure.images);
      }

      return images;
    } catch (error) {
      logger.warn('PDF image extraction failed, returning empty array:', error);
      return [];
    }
  }

  /**
   * Extract metadata using Gemini
   */
  private async extractMetadataWithGemini(buffer: Buffer): Promise<DocumentMetadata> {
    try {
      const result = await this.geminiClient.extractDocumentMetadata(buffer, 'application/pdf');
      return {
        ...result,
        format: result.format as any // Type assertion for compatibility
      };
    } catch (error) {
      logger.warn('Gemini metadata extraction failed, returning basic metadata:', error);
      return {
        format: 'pdf' as any,
        pageCount: 0,
        wordCount: 0,
        characterCount: buffer.length,
        fileSize: buffer.length
      };
    }
  }



  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }


}