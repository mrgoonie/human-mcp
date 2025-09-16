import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  Table,
  Image,
  FormattedContent
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import mammoth from 'mammoth';

export class WordProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['docx']);
  }

  /**
   * Process Word document
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing Word document: ${source}`);

      const buffer = await this.loadDocument(source);

      // Extract text content
      const textResult = await mammoth.extractRawText({ buffer });
      const textContent = textResult.value;

      // Extract with formatting if requested
      let formattedContent: FormattedContent | undefined;
      if (options.preserveFormatting) {
        formattedContent = await this.extractWithFormatting(buffer);
      }

      // Get metadata
      const metadata = await this.extractMetadata(buffer);

      // Analyze structure
      const structure = await this.analyzeStructure(buffer, options);

      // Use Gemini for enhanced analysis if detailed processing requested
      let enhancedContent = textContent;
      let extractedData = undefined;

      if (options.detailLevel === 'detailed') {
        const geminiResult = await this.geminiClient.processDocumentWithRetry(
          buffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          options
        );
        enhancedContent = geminiResult.content || textContent;
        extractedData = geminiResult.extractedData;
      }

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: options.detailLevel === 'detailed' ? this.geminiClient.getDocumentModel().model : 'mammoth',
        extractionMethod: 'mammoth + gemini',
        confidence: 0.95
      };

      return {
        content: enhancedContent,
        metadata: {
          ...metadata,
          wordCount: this.countWords(enhancedContent),
          characterCount: enhancedContent.length
        },
        structure,
        extractedData,
        processingInfo
      };
    } catch (error) {
      logger.error(`Word document processing error for ${source}:`, error);
      throw new APIError(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from Word document
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Word text extraction error:', error);
      throw new APIError(`Failed to extract text from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('Word structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Word document metadata
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.extractMetadata(buffer);
    } catch (error) {
      logger.error('Word metadata extraction error:', error);
      throw new APIError(`Failed to extract Word document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Word document structure
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      return await this.analyzeStructure(buffer, {});
    } catch (error) {
      logger.error('Word structure analysis error:', error);
      throw new APIError(`Failed to analyze Word document structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content with formatting preserved
   */
  async extractWithFormatting(buffer: Buffer): Promise<FormattedContent> {
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer });

      // For markdown, we'll use the HTML and convert it, or fall back to plain text
      const plainText = await this.extractText();

      return {
        html: htmlResult.value,
        markdown: plainText, // Placeholder - would need additional markdown conversion
        plainText
      };
    } catch (error) {
      logger.warn('Formatting extraction failed:', error);
      const plainText = await this.extractText();
      return {
        html: plainText,
        markdown: plainText,
        plainText
      };
    }
  }

  /**
   * Extract embedded images from Word document
   */
  async extractImages(buffer: Buffer): Promise<Image[]> {
    try {
      const images: Image[] = [];

      // Use Gemini for image detection since mammoth image extraction is complex
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
      logger.warn('Word image extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract tables from Word document
   */
  async extractTables(buffer: Buffer): Promise<Table[]> {
    try {
      const tables: Table[] = [];

      // Use Gemini for table extraction since mammoth doesn't provide structured table data
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
      logger.warn('Word table extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract metadata from Word document
   */
  private async extractMetadata(buffer: Buffer): Promise<DocumentMetadata> {
    try {
      // For now, return basic metadata. In a full implementation,
      // you might use a library like office-document-properties
      const textContent = await this.extractText();

      return {
        format: 'docx',
        pageCount: 1, // Word documents don't have inherent page count
        wordCount: 0, // Will be calculated later
        characterCount: 0, // Will be calculated later
        fileSize: buffer.length
        // Additional metadata would be extracted from document properties
      };
    } catch (error) {
      logger.warn('Metadata extraction failed:', error);
      return {
        format: 'docx',
        pageCount: 1,
        wordCount: 0,
        characterCount: 0,
        fileSize: buffer.length
      };
    }
  }

  /**
   * Analyze document structure
   */
  private async analyzeStructure(buffer: Buffer, options: ProcessOptions): Promise<DocumentStructure> {
    try {
      const result = await this.geminiClient.processDocumentWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        {
          extractText: false,
          extractTables: true,
          extractImages: options.extractImages || false,
          preserveFormatting: true
        }
      );

      return result.structure || {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    } catch (error) {
      logger.warn('Structure analysis failed:', error);
      return {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
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