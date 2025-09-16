import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  DocumentFormat
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import path from 'path';

export class TextProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['txt', 'md', 'csv', 'json', 'xml', 'html']);
  }

  /**
   * Process text-based document
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing text document: ${source}`);

      const buffer = await this.loadDocument(source);
      const content = buffer.toString('utf8');

      // Detect format from file extension or content
      const format = this.detectTextFormat(source, content) as DocumentFormat;

      // Process content based on format
      const processedContent = await this.processContentByFormat(content, format, options);

      // Get metadata
      const metadata = this.extractMetadata(content, format, buffer.length);

      // Analyze structure
      const structure = await this.analyzeStructure(content, format, options);

      // Use Gemini for enhanced analysis if requested
      let enhancedContent = processedContent;
      let extractedData = undefined;

      if (options.detailLevel === 'detailed') {
        const geminiResult = await this.geminiClient.processDocumentWithRetry(
          buffer,
          this.getMimeType(format),
          options
        );
        enhancedContent = geminiResult.content || processedContent;
        extractedData = geminiResult.extractedData;
      }

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: options.detailLevel === 'detailed' ? this.geminiClient.getDocumentModel().model : 'text-parser',
        extractionMethod: 'text-parser + gemini',
        confidence: 0.98
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
      logger.error(`Text document processing error for ${source}:`, error);
      throw new APIError(`Failed to process text document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content (returns the content as-is for text files)
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      return buffer.toString('utf8');
    } catch (error) {
      logger.error('Text extraction error:', error);
      throw new APIError(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructuredData(schema: object, options: ProcessOptions = {}): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      const content = buffer.toString('utf8');
      const format = this.detectTextFormat('current', content);

      // For JSON files, try to parse directly first
      if (format === 'json') {
        try {
          const jsonData = JSON.parse(content);
          return jsonData;
        } catch {
          // Fall back to Gemini processing
        }
      }

      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        this.getMimeType(format),
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('Text structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get text document metadata
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      const content = buffer.toString('utf8');
      const format = this.detectTextFormat('current', content) as DocumentFormat;
      return this.extractMetadata(content, format, buffer.length);
    } catch (error) {
      logger.error('Text metadata extraction error:', error);
      throw new APIError(`Failed to extract text metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get text document structure
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const content = buffer.toString('utf8');
      const format = this.detectTextFormat('current', content) as DocumentFormat;
      return await this.analyzeStructure(content, format, {});
    } catch (error) {
      logger.error('Text structure analysis error:', error);
      throw new APIError(`Failed to analyze text structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect text format from file extension or content
   */
  private detectTextFormat(source: string, content: string): DocumentFormat {
    // Check file extension first
    const extension = path.extname(source).toLowerCase();

    const extensionMap: Record<string, string> = {
      '.txt': 'txt',
      '.md': 'md',
      '.markdown': 'md',
      '.csv': 'csv',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.htm': 'html'
    };

    if (extension && extensionMap[extension]) {
      const format = extensionMap[extension];
      if (format) {
        return format as DocumentFormat;
      }
    }

    // Content-based detection
    const trimmed = content.trim();

    // JSON detection
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json' as DocumentFormat;
      } catch {
        // Not valid JSON
      }
    }

    // XML/HTML detection
    if (trimmed.startsWith('<')) {
      if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE html')) {
        return 'html' as DocumentFormat;
      }
      return 'xml' as DocumentFormat;
    }

    // CSV detection (simple heuristic)
    const lines = trimmed.split('\n');
    if (lines.length > 1) {
      const firstLine = lines[0];
      const secondLine = lines[1];
      if (firstLine && firstLine.includes(',') && secondLine && secondLine.includes(',')) {
        return 'csv' as DocumentFormat;
      }
    }

    // Markdown detection
    if (trimmed.includes('# ') || trimmed.includes('**') || trimmed.includes('[') && trimmed.includes('](')) {
      return 'md' as DocumentFormat;
    }

    // Default to plain text
    return 'txt' as DocumentFormat;
  }

  /**
   * Process content based on format
   */
  private async processContentByFormat(content: string, format: string, options: ProcessOptions): Promise<string> {
    switch (format) {
      case 'md':
        return options.preserveFormatting ? content : this.stripMarkdown(content);
      case 'html':
        return options.preserveFormatting ? content : this.stripHtml(content);
      case 'json':
        return this.formatJson(content);
      case 'xml':
        return options.preserveFormatting ? content : this.stripXml(content);
      case 'csv':
        return this.formatCsv(content);
      default:
        return content;
    }
  }

  /**
   * Extract metadata from content
   */
  private extractMetadata(content: string, format: string, fileSize: number): DocumentMetadata {
    const lines = content.split('\n');
    const wordCount = this.countWords(content);

    return {
      format: format as any,
      pageCount: 1, // Text files are single "page"
      wordCount,
      characterCount: content.length,
      language: this.detectLanguage(content),
      fileSize
    };
  }

  /**
   * Analyze document structure
   */
  private async analyzeStructure(content: string, format: string, options: ProcessOptions): Promise<DocumentStructure> {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];
    const headings: Array<{ id: string; text: string; level: number; pageNumber?: number }> = [];

    try {
      switch (format) {
        case 'md':
          return this.analyzeMarkdownStructure(content);
        case 'html':
          return this.analyzeHtmlStructure(content);
        case 'json':
          return this.analyzeJsonStructure(content);
        case 'xml':
          return this.analyzeXmlStructure(content);
        default:
          // For plain text, create basic structure
          sections.push({
            id: 'content',
            content,
            level: 1,
            wordCount: this.countWords(content)
          });
          break;
      }
    } catch (error) {
      logger.warn('Structure analysis failed:', error);
    }

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings
    };
  }

  /**
   * Analyze Markdown structure
   */
  private analyzeMarkdownStructure(content: string): DocumentStructure {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];
    const headings: Array<{ id: string; text: string; level: number; pageNumber?: number }> = [];

    const lines = content.split('\n');
    let currentSection = '';
    let currentTitle = '';
    let currentLevel = 1;

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        // Save previous section if exists
        if (currentSection.trim()) {
          sections.push({
            id: `section_${sections.length + 1}`,
            title: currentTitle,
            content: currentSection.trim(),
            level: currentLevel,
            wordCount: this.countWords(currentSection)
          });
        }

        // Start new section
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        currentSection = '';
        currentTitle = title;
        currentLevel = level;

        headings.push({
          id: `heading_${headings.length + 1}`,
          text: title,
          level,
          pageNumber: 1
        });
      } else {
        currentSection += line + '\n';
      }
    });

    // Add final section
    if (currentSection.trim()) {
      sections.push({
        id: `section_${sections.length + 1}`,
        title: currentTitle,
        content: currentSection.trim(),
        level: currentLevel,
        wordCount: this.countWords(currentSection)
      });
    }

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings
    };
  }

  /**
   * Analyze HTML structure
   */
  private analyzeHtmlStructure(content: string): DocumentStructure {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];
    const headings: Array<{ id: string; text: string; level: number; pageNumber?: number }> = [];

    // Simple HTML parsing - extract headings and sections
    const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1] || '1');
      const text = match[2]?.trim() || '';

      headings.push({
        id: `heading_${headings.length + 1}`,
        text,
        level,
        pageNumber: 1
      });
    }

    // Extract title
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      sections.push({
        id: 'title',
        title: titleMatch[1].trim(),
        content: titleMatch[1].trim(),
        level: 1,
        wordCount: this.countWords(titleMatch[1])
      });
    }

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings
    };
  }

  /**
   * Analyze JSON structure
   */
  private analyzeJsonStructure(content: string): DocumentStructure {
    try {
      const data = JSON.parse(content);
      const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];

      sections.push({
        id: 'json_content',
        title: 'JSON Content',
        content: JSON.stringify(data, null, 2),
        level: 1,
        wordCount: this.countWords(JSON.stringify(data))
      });

      return {
        sections,
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    } catch {
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
   * Analyze XML structure
   */
  private analyzeXmlStructure(content: string): DocumentStructure {
    const sections: Array<{ id: string; title?: string; content: string; level: number; startPage?: number; endPage?: number; wordCount: number }> = [];

    sections.push({
      id: 'xml_content',
      title: 'XML Content',
      content: content,
      level: 1,
      wordCount: this.countWords(content)
    });

    return {
      sections,
      tables: [],
      images: [],
      links: [],
      headings: []
    };
  }

  /**
   * Strip Markdown formatting
   */
  private stripMarkdown(content: string): string {
    return content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1'); // Remove images
  }

  /**
   * Strip HTML tags
   */
  private stripHtml(content: string): string {
    return content.replace(/<[^>]*>/g, '');
  }

  /**
   * Strip XML tags
   */
  private stripXml(content: string): string {
    return this.stripHtml(content);
  }

  /**
   * Format JSON content
   */
  private formatJson(content: string): string {
    try {
      const data = JSON.parse(content);
      return JSON.stringify(data, null, 2);
    } catch {
      return content;
    }
  }

  /**
   * Format CSV content
   */
  private formatCsv(content: string): string {
    const lines = content.split('\n');
    if (lines.length === 0) return content;

    const firstLine = lines[0];
    if (!firstLine) return content;

    const headers = firstLine.split(',');
    let formatted = `CSV Data:\n\nHeaders: ${headers.join(', ')}\n\n`;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim()) {
        const values = line.split(',');
        formatted += `Row ${i}: ${values.join(', ')}\n`;
      }
    }

    return formatted;
  }

  /**
   * Detect language from content
   */
  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
    const spanishWords = /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por)\b/gi;
    const frenchWords = /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par)\b/gi;

    const englishMatches = (content.match(englishWords) || []).length;
    const spanishMatches = (content.match(spanishWords) || []).length;
    const frenchMatches = (content.match(frenchWords) || []).length;

    const maxMatches = Math.max(englishMatches, spanishMatches, frenchMatches);

    if (maxMatches === englishMatches && englishMatches > 0) return 'en';
    if (maxMatches === spanishMatches && spanishMatches > 0) return 'es';
    if (maxMatches === frenchMatches && frenchMatches > 0) return 'fr';

    return 'unknown';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}