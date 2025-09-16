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

export class PowerPointProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['pptx']);
  }

  /**
   * Process PowerPoint presentation using Gemini's native capabilities
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing PowerPoint document: ${source}`);

      const buffer = await this.loadDocument(source);

      // Use Gemini's native document processing
      const geminiResult = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
      logger.error(`PowerPoint processing error for ${source}:`, error);
      throw new APIError(`Failed to process PowerPoint document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from PowerPoint using Gemini
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        { extractText: true, extractTables: false, extractImages: false }
      );
      return result.content || '';
    } catch (error) {
      logger.error('PowerPoint text extraction error:', error);
      throw new APIError(`Failed to extract text from PowerPoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract metadata using Gemini
   */
  private async extractMetadataWithGemini(buffer: Buffer): Promise<DocumentMetadata> {
    try {
      const result = await this.geminiClient.extractDocumentMetadata(buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      return {
        ...result,
        format: result.format as any // Type assertion for compatibility
      };
    } catch (error) {
      logger.warn('Gemini metadata extraction failed, returning basic metadata:', error);
      return {
        format: 'pptx' as any,
        pageCount: 1,
        wordCount: 0,
        characterCount: buffer.length,
        fileSize: buffer.length,
        title: 'PowerPoint Presentation'
      };
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
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('PowerPoint structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from PowerPoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PowerPoint metadata using Gemini
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.extractMetadataWithGemini(buffer);
    } catch (error) {
      logger.error('PowerPoint metadata extraction error:', error);
      throw new APIError(`Failed to extract PowerPoint metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PowerPoint structure using Gemini
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
      logger.error('PowerPoint structure analysis error:', error);
      throw new APIError(`Failed to analyze PowerPoint structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }





  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}