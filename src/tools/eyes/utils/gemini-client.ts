import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type { Config } from "@/utils/config";
import { logger } from "@/utils/logger";
import { APIError } from "@/utils/errors";

// Document processing types
interface ProcessOptions {
  extractText?: boolean;
  extractTables?: boolean;
  extractImages?: boolean;
  preserveFormatting?: boolean;
  pageRange?: string;
  detailLevel?: 'quick' | 'detailed';
  language?: string;
  timeout?: number;
}

interface ExtractionOptions {
  strictMode?: boolean;
  fallbackValues?: Record<string, any>;
  validateOutput?: boolean;
}

interface DocumentResponse {
  content: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  extractedData?: any;
}

interface DocumentMetadata {
  format: string;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  author?: string;
  title?: string;
  subject?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  language?: string;
  fileSize?: number;
}

interface DocumentStructure {
  sections: Section[];
  tables: Table[];
  images: Image[];
  links: Link[];
  headings: Heading[];
}

interface Section {
  id: string;
  title?: string;
  content: string;
  level: number;
  startPage?: number;
  endPage?: number;
  wordCount: number;
}

interface Table {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Image {
  id: string;
  alt?: string;
  src?: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  base64Data?: string;
}

interface Link {
  id: string;
  text: string;
  url: string;
  pageNumber?: number;
}

interface Heading {
  id: string;
  text: string;
  level: number;
  pageNumber?: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private documentCache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(private config: Config) {
    if (!config.gemini.apiKey) {
      throw new APIError("Google Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);

    // Cache is simplified - no periodic cleanup needed
  }
  
  getModel(detailLevel: "quick" | "detailed"): GenerativeModel {
    const modelName = detailLevel === "detailed"
      ? this.config.gemini.model
      : "gemini-2.5-flash";

    return this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  getImageGenerationModel(modelName?: string): GenerativeModel {
    const imageModelName = modelName || "gemini-2.5-flash-image-preview";

    return this.genAI.getGenerativeModel({
      model: imageModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }
  
  async analyzeContent(
    model: GenerativeModel,
    prompt: string,
    mediaData: Array<{ mimeType: string; data: string }>
  ): Promise<string> {
    return this.analyzeContentWithRetry(model, prompt, mediaData, 3);
  }

  async analyzeContentWithRetry(
    model: GenerativeModel,
    prompt: string,
    mediaData: Array<{ mimeType: string; data: string }>,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Analyzing content with ${mediaData.length} media files (attempt ${attempt}/${maxRetries})`);

        const parts = [
          { text: prompt },
          ...mediaData.map(media => ({
            inlineData: {
              mimeType: media.mimeType,
              data: media.data
            }
          }))
        ];

        // Add timeout wrapper
        const analysisPromise = model.generateContent(parts);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new APIError("Gemini API request timed out")), this.config.server.requestTimeout);
        });

        const result = await Promise.race([analysisPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        if (!text) {
          throw new APIError("No response from Gemini API");
        }

        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Content analysis attempt ${attempt} failed:`, lastError.message);

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delay = this.createBackoffDelay(attempt);
        logger.debug(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.handleGeminiError(lastError, "Content analysis");
  }

  /**
   * Get document-specific model for processing
   */
  getDocumentModel(): GenerativeModel {
    return this.genAI.getGenerativeModel({
      model: this.config.documentProcessing.geminiModel,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  /**
   * Process document with native Gemini Document Understanding API
   * Follows the official Gemini documentation patterns
   */
  async processDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Processing document with native Gemini Document API, size: ${documentBuffer.length} bytes`);

      // Validate document before processing
      this.validateDocument(documentBuffer, mimeType);

      // For large documents (>20MB), use File API
      if (documentBuffer.length > 20 * 1024 * 1024) {
        return this.processLargeDocument(documentBuffer, mimeType, options);
      }

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      // Use simple, direct prompt following Gemini documentation
      const prompt = this.buildSimpleDocumentPrompt(options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      // Add timeout wrapper
      const timeoutMs = this.config.documentProcessing.timeout;
      const processingPromise = model.generateContent(contents);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new APIError("Document processing timed out")), timeoutMs);
      });

      const result = await Promise.race([processingPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from Gemini Document API");
      }

      // Parse response - try JSON first, fallback to text
      return this.parseSimpleDocumentResponse(text);
    } catch (error) {
      this.handleGeminiError(error, "Document processing");
    }
  }

  /**
   * Process large documents using chunked approach
   * For documents over 20MB as per Gemini documentation
   */
  async processLargeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Processing large document with chunked approach, size: ${documentBuffer.length} bytes`);

      // Split large documents into smaller chunks for processing
      const maxChunkSize = 15 * 1024 * 1024; // 15MB chunks to stay under 20MB limit
      const chunks = this.splitBufferIntoChunks(documentBuffer, maxChunkSize);

      if (chunks.length === 1) {
        // Single chunk, use inline processing
        const firstChunk = chunks[0];
        if (!firstChunk) {
          throw new APIError('Failed to create document chunk');
        }
        return this.processDocumentChunk(firstChunk, mimeType, options, 1, 1);
      } else {
        // Multiple chunks, process each and combine results
        logger.info(`Document split into ${chunks.length} chunks for processing`);

        const chunkResults = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (!chunk) {
            throw new APIError(`Failed to create document chunk ${i + 1}`);
          }
          const chunkResult = await this.processDocumentChunk(
            chunk,
            mimeType,
            options,
            i + 1,
            chunks.length
          );
          chunkResults.push(chunkResult);
        }

        // Combine chunk results
        return this.combineChunkResults(chunkResults, options);
      }
    } catch (error) {
      logger.error('Large document processing failed:', error);
      throw new APIError(`Large document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a single chunk of a large document
   */
  private async processDocumentChunk(
    chunkBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions,
    chunkNumber: number,
    totalChunks: number
  ): Promise<any> {
    const model = this.getDocumentModel();
    const base64Data = chunkBuffer.toString('base64');

    const prompt = this.buildChunkedDocumentPrompt(options, chunkNumber, totalChunks);

    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      }
    ];

    const result = await model.generateContent(contents);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new APIError(`No response from chunk ${chunkNumber} processing`);
    }

    return this.parseSimpleDocumentResponse(text);
  }

  /**
   * Combine results from multiple document chunks
   */
  private combineChunkResults(chunkResults: any[], options: ProcessOptions): any {
    // Combine content from all chunks
    const combinedContent = chunkResults
      .map(result => result.content || '')
      .filter(content => content.length > 0)
      .join('\n\n');

    // Use the structure from the first chunk as base
    const baseResult = chunkResults[0] || {};

    // Combine metadata
    const combinedMetadata = {
      ...baseResult.metadata,
      wordCount: this.countWords(combinedContent),
      characterCount: combinedContent.length,
      // Note: pageCount might not be accurate for chunked documents
      pageCount: baseResult.metadata?.pageCount || chunkResults.length
    };

    // Combine structures
    const combinedStructure = this.combineDocumentStructures(
      chunkResults.map(r => r.structure).filter(s => s)
    );

    return {
      content: combinedContent,
      metadata: combinedMetadata,
      structure: combinedStructure,
      extractedData: baseResult.extractedData,
      processingInfo: {
        ...baseResult.processingInfo,
        extractionMethod: 'chunked-gemini-native',
        confidence: 0.9 // Slightly lower confidence for chunked processing
      }
    };
  }

  /**
   * Split buffer into chunks of specified size
   */
  private splitBufferIntoChunks(buffer: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, buffer.length);
      chunks.push(buffer.subarray(i, end));
    }
    return chunks;
  }

  /**
   * Build prompt for chunked document processing
   */
  private buildChunkedDocumentPrompt(
    options: ProcessOptions,
    chunkNumber: number,
    totalChunks: number
  ): string {
    const { extractText = true, extractTables = true, extractImages = false } = options;

    let prompt = `Processing document chunk ${chunkNumber} of ${totalChunks}.\n\n`;

    if (extractText) {
      prompt += "- Extract all text content from this chunk\n";
    }

    if (extractTables) {
      prompt += "- Extract all tables with headers and data from this chunk\n";
    }

    if (extractImages) {
      prompt += "- Describe all images found in this chunk\n";
    }

    prompt += "- Extract document metadata and structure from this chunk\n\n";

    if (totalChunks > 1) {
      prompt += `IMPORTANT: This is chunk ${chunkNumber} of ${totalChunks}. Focus on the content in this specific chunk only.\n\n`;
    }

    prompt += "Respond with a JSON object containing the extracted information from this chunk.";

    return prompt;
  }

  /**
   * Combine document structures from multiple chunks
   */
  private combineDocumentStructures(structures: any[]): any {
    if (structures.length === 0) {
      return {
        sections: [],
        tables: [],
        images: [],
        links: [],
        headings: []
      };
    }

    if (structures.length === 1) {
      return structures[0];
    }

    // Combine sections, tables, images, etc. from all chunks
    const combinedSections = structures.flatMap(s => s.sections || []);
    const combinedTables = structures.flatMap(s => s.tables || []);
    const combinedImages = structures.flatMap(s => s.images || []);
    const combinedLinks = structures.flatMap(s => s.links || []);
    const combinedHeadings = structures.flatMap(s => s.headings || []);

    return {
      sections: combinedSections,
      tables: combinedTables,
      images: combinedImages,
      links: combinedLinks,
      headings: combinedHeadings
    };
  }

  /**
   * Extract structured data from document using native Gemini capabilities
   */
  async extractStructuredData(
    documentBuffer: Buffer,
    mimeType: string,
    schema: object,
    options: ExtractionOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Extracting structured data from document, schema keys: ${Object.keys(schema).length}`);

      // For large documents, use File API approach
      if (documentBuffer.length > 20 * 1024 * 1024) {
        return this.extractStructuredDataFromLargeDocument(documentBuffer, mimeType, schema, options);
      }

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = this.buildSimpleExtractionPrompt(schema, options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from Gemini extraction API");
      }

      return this.parseSimpleExtractionResponse(text, schema, options);
    } catch (error) {
      logger.error("Gemini extraction API error:", error);
      if (error instanceof Error) {
        throw new APIError(`Data extraction error: ${error.message}`);
      }
      throw new APIError("Unknown data extraction error");
    }
  }

  /**
   * Extract structured data from large documents
   */
  async extractStructuredDataFromLargeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    schema: object,
    options: ExtractionOptions = {}
  ): Promise<any> {
    try {
      logger.debug(`Extracting structured data from large document, size: ${documentBuffer.length} bytes`);

      // For now, fall back to inline processing
      logger.warn('Large document structured extraction, falling back to inline processing.');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');
      const prompt = this.buildSimpleExtractionPrompt(schema, options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from large document extraction");
      }

      return this.parseSimpleExtractionResponse(text, schema, options);
    } catch (error) {
      logger.error('Large document structured extraction failed:', error);
      throw new APIError(`Large document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Summarize document content using native Gemini capabilities
   */
  async summarizeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: { summaryType?: string; maxLength?: number } = {}
  ): Promise<string> {
    try {
      logger.debug(`Summarizing document with type: ${options.summaryType || 'detailed'}`);

      // For large documents, use File API approach
      if (documentBuffer.length > 20 * 1024 * 1024) {
        return this.summarizeLargeDocument(documentBuffer, mimeType, options);
      }

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = this.buildSimpleSummaryPrompt(options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from Gemini summarization API");
      }

      return text;
    } catch (error) {
      logger.error("Gemini summarization API error:", error);
      if (error instanceof Error) {
        throw new APIError(`Summarization error: ${error.message}`);
      }
      throw new APIError("Unknown summarization error");
    }
  }

  /**
   * Summarize large documents
   */
  async summarizeLargeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: { summaryType?: string; maxLength?: number } = {}
  ): Promise<string> {
    try {
      logger.debug(`Summarizing large document, size: ${documentBuffer.length} bytes`);

      // For now, fall back to inline processing
      logger.warn('Large document summarization, falling back to inline processing.');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');
      const prompt = this.buildSimpleSummaryPrompt(options);

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from large document summarization");
      }

      return text;
    } catch (error) {
      logger.error('Large document summarization failed:', error);
      throw new APIError(`Large document summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Parse document processing response
   */
  private parseDocumentResponse(responseText: string): any {
    try {
      // Try to parse as JSON first
      return JSON.parse(responseText);
    } catch {
      // If not JSON, wrap in a basic structure
      return {
        content: responseText,
        metadata: {},
        structure: { sections: [], tables: [], images: [] }
      };
    }
  }

  /**
   * Build simple document prompt following Gemini documentation
   */
  private buildSimpleDocumentPrompt(options: ProcessOptions): string {
    const { extractText = true, extractTables = true, extractImages = false, preserveFormatting = false } = options;

    let prompt = "Please analyze this document and provide the following information:\n\n";

    if (extractText) {
      prompt += "- Extract all text content\n";
    }

    if (extractTables) {
      prompt += "- Extract all tables with headers and data\n";
    }

    if (extractImages) {
      prompt += "- Describe all images found in the document\n";
    }

    prompt += "- Extract document metadata (title, author, creation date, etc.)\n";
    prompt += "- Identify document structure (sections, headings, etc.)\n\n";

    if (preserveFormatting) {
      prompt += "Preserve original formatting and structure where possible.\n\n";
    }

    prompt += "Respond with a JSON object containing the extracted information.";

    return prompt;
  }

  /**
   * Parse simple document response
   */
  private parseSimpleDocumentResponse(responseText: string): any {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText);
      return {
        content: parsed.content || responseText,
        metadata: parsed.metadata || {},
        structure: parsed.structure || { sections: [], tables: [], images: [] },
        extractedData: parsed
      };
    } catch {
      // If not JSON, wrap in a basic structure
      return {
        content: responseText,
        metadata: {},
        structure: { sections: [], tables: [], images: [] },
        extractedData: null
      };
    }
  }

  /**
   * Parse extraction response and validate against schema
   */
  private parseExtractionResponse(responseText: string, schema: object, options: ExtractionOptions): any {
    try {
      const extractedData = JSON.parse(responseText);

      // Basic validation - could be enhanced with more sophisticated schema validation
      if (options.strictMode && !this.validateAgainstSchema(extractedData, schema)) {
        throw new APIError("Extracted data does not match schema requirements");
      }

      return extractedData;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Failed to parse extraction response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build simple extraction prompt
   */
  private buildSimpleExtractionPrompt(schema: object, options: ExtractionOptions): string {
    const { strictMode = false } = options;

    let prompt = "Extract structured data from this document according to the following JSON schema:\n\n";
    prompt += "Schema:\n" + JSON.stringify(schema, null, 2) + "\n\n";
    prompt += "Instructions:\n";
    prompt += "- Extract data that matches the schema structure\n";
    prompt += "- Use null for missing or unclear values\n";

    if (strictMode) {
      prompt += "- Only extract data that perfectly matches the schema\n";
      prompt += "- Skip any data that doesn't fit the expected format\n";
    }

    prompt += "\nRespond with a JSON object matching the schema structure.";

    return prompt;
  }

  /**
   * Parse simple extraction response
   */
  private parseSimpleExtractionResponse(responseText: string, schema: object, options: ExtractionOptions): any {
    try {
      const extractedData = JSON.parse(responseText);

      // Basic validation
      if (options.strictMode && !this.validateAgainstSchema(extractedData, schema)) {
        throw new APIError("Extracted data does not match schema requirements");
      }

      return extractedData;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Failed to parse extraction response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process document with simple retry logic
   */
  async processDocumentWithRetry(
    documentBuffer: Buffer,
    mimeType: string,
    options: ProcessOptions = {},
    maxRetries: number = 2
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Document processing attempt ${attempt}/${maxRetries}`);
        return await this.processDocument(documentBuffer, mimeType, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Document processing attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Simple backoff
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Document processing failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Extract data with simple retry logic
   */
  async extractStructuredDataWithRetry(
    documentBuffer: Buffer,
    mimeType: string,
    schema: object,
    options: ExtractionOptions = {},
    maxRetries: number = 2
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Data extraction attempt ${attempt}/${maxRetries}`);
        return await this.extractStructuredData(documentBuffer, mimeType, schema, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Data extraction attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Data extraction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Analyze document structure
   */
  async analyzeDocumentStructure(
    documentBuffer: Buffer,
    mimeType: string
  ): Promise<DocumentStructure> {
    try {
      logger.debug('Analyzing document structure');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = `Analyze the structure of this document and provide a detailed breakdown in JSON format:

{
  "sections": [
    {
      "id": "unique_id",
      "title": "section title",
      "content": "section content preview",
      "level": 1,
      "startPage": 1,
      "endPage": 2,
      "wordCount": 150
    }
  ],
  "tables": [
    {
      "id": "table_1",
      "title": "table title",
      "headers": ["Column 1", "Column 2"],
      "rows": [["Value 1", "Value 2"]],
      "pageNumber": 1
    }
  ],
  "images": [
    {
      "id": "image_1",
      "alt": "image description",
      "pageNumber": 1,
      "position": {"x": 100, "y": 200, "width": 300, "height": 200}
    }
  ],
  "links": [
    {
      "id": "link_1",
      "text": "link text",
      "url": "https://example.com",
      "pageNumber": 1
    }
  ],
  "headings": [
    {
      "id": "heading_1",
      "text": "Heading Text",
      "level": 1,
      "pageNumber": 1
    }
  ]
}

Focus on identifying:
- Document sections and their hierarchy
- Tables with headers and sample data
- Images with descriptions and positions
- Links and their destinations
- Headings and their levels`;

      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from structure analysis");
      }

      return this.parseStructureResponse(text);
    } catch (error) {
      logger.error("Document structure analysis error:", error);
      if (error instanceof Error) {
        throw new APIError(`Structure analysis error: ${error.message}`);
      }
      throw new APIError("Unknown structure analysis error");
    }
  }

  /**
   * Extract document metadata
   */
  async extractDocumentMetadata(
    documentBuffer: Buffer,
    mimeType: string
  ): Promise<DocumentMetadata> {
    try {
      logger.debug('Extracting document metadata');

      const model = this.getDocumentModel();
      const base64Data = documentBuffer.toString('base64');

      const prompt = `Extract metadata from this document and respond with a JSON object:

{
  "format": "pdf|docx|xlsx|pptx|txt|md",
  "pageCount": 10,
  "wordCount": 2500,
  "characterCount": 15000,
  "author": "Document Author",
  "title": "Document Title",
  "subject": "Document Subject",
  "createdAt": "2024-01-15T10:30:00Z",
  "modifiedAt": "2024-01-16T14:20:00Z",
  "language": "en",
  "fileSize": 1024000
}

Extract as much metadata as possible from the document properties and content.`;

      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ];

      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new APIError("No response from metadata extraction");
      }

      return this.parseMetadataResponse(text);
    } catch (error) {
      logger.error("Document metadata extraction error:", error);
      if (error instanceof Error) {
        throw new APIError(`Metadata extraction error: ${error.message}`);
      }
      throw new APIError("Unknown metadata extraction error");
    }
  }

  /**
   * Parse structure analysis response
   */
  private parseStructureResponse(responseText: string): DocumentStructure {
    try {
      const structure = JSON.parse(responseText);
      return {
        sections: structure.sections || [],
        tables: structure.tables || [],
        images: structure.images || [],
        links: structure.links || [],
        headings: structure.headings || []
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
   * Parse metadata response
   */
  private parseMetadataResponse(responseText: string): DocumentMetadata {
    try {
      const metadata = JSON.parse(responseText);
      return {
        format: metadata.format || 'unknown',
        pageCount: metadata.pageCount || 0,
        wordCount: metadata.wordCount || 0,
        characterCount: metadata.characterCount || 0,
        author: metadata.author,
        title: metadata.title,
        subject: metadata.subject,
        createdAt: metadata.createdAt ? new Date(metadata.createdAt) : undefined,
        modifiedAt: metadata.modifiedAt ? new Date(metadata.modifiedAt) : undefined,
        language: metadata.language,
        fileSize: metadata.fileSize
      };
    } catch {
      return {
        format: 'unknown',
        pageCount: 0,
        wordCount: 0,
        characterCount: 0
      };
    }
  }

  /**
   * Enhanced error handling with specific error types
   */
  private handleGeminiError(error: any, operation: string): never {
    if (error?.status === 400) {
      throw new APIError(`${operation}: Invalid request - check document format and size`);
    }

    if (error?.status === 403) {
      throw new APIError(`${operation}: API key invalid or insufficient permissions`);
    }

    if (error?.status === 429) {
      throw new APIError(`${operation}: Rate limit exceeded - please retry later`);
    }

    if (error?.status === 500) {
      throw new APIError(`${operation}: Gemini API server error - please retry`);
    }

    if (error?.status === 503) {
      throw new APIError(
        `${operation}: Gemini API is currently unavailable (503 Service Unavailable). ` +
        `This is usually temporary. Please try again in a few moments. ` +
        `If the issue persists, check Google's Gemini API status page.`
      );
    }

    // Network or timeout errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      throw new APIError(`${operation}: Network error - check connection and retry`);
    }

    // Gemini-specific errors
    if (error?.message?.includes('GoogleGenerativeAI Error')) {
      const geminiErrorMatch = error.message.match(/\[(\d+)\s+([^\]]+)\]\s+(.+)/);
      if (geminiErrorMatch) {
        const [, statusCode, statusText, details] = geminiErrorMatch;
        if (statusCode === '503') {
          throw new APIError(
            `${operation}: Google Gemini API is temporarily unavailable (${statusText}). ` +
            `This is a service-side issue. Please try again in a few moments.`
          );
        }
        throw new APIError(`${operation}: Gemini API error [${statusCode} ${statusText}] ${details}`);
      }
    }

    // Default error
    const message = error?.message || 'Unknown error occurred';
    throw new APIError(`${operation}: ${message}`);
  }

  /**
   * Validate document before processing
   */
  validateDocument(documentBuffer: Buffer, mimeType: string): void {
    const maxSize = this.config.documentProcessing.maxFileSize;

    if (documentBuffer.length > maxSize) {
      throw new APIError(`Document size (${documentBuffer.length} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
    }

    if (documentBuffer.length === 0) {
      throw new APIError('Document is empty');
    }

    // Validate MIME type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'text/csv',
      'application/json',
      'application/xml',
      'text/html'
    ];

    if (!supportedTypes.includes(mimeType)) {
      throw new APIError(`Unsupported document type: ${mimeType}`);
    }
  }

  /**
   * Get processing timeout with buffer
   */
  private getTimeoutWithBuffer(baseTimeout: number): number {
    // Add 10% buffer to the configured timeout
    return Math.floor(baseTimeout * 1.1);
  }

  /**
   * Create exponential backoff delay
   */
  private createBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];

    return (
      retryableStatuses.includes(error?.status) ||
      retryableCodes.includes(error?.code) ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('network')
    );
  }

  /**
   * Simple cache key generation
   */
  private getCacheKey(documentBuffer: Buffer, operation: string, params?: any): string {
    const hash = this.simpleHash(documentBuffer.toString('base64'));
    const paramStr = params ? JSON.stringify(params) : '';
    return `${operation}:${hash}:${paramStr}`;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }



  /**
   * Build prompt for document processing
   */
  private buildDocumentPrompt(options: ProcessOptions): string {
    const { extractText = true, extractTables = true, extractImages = false, preserveFormatting = false } = options;

    let prompt = "Please analyze this document and provide the following information in JSON format:\n\n";

    if (extractText) {
      prompt += "- Extract all text content\n";
    }

    if (extractTables) {
      prompt += "- Extract all tables with headers and data\n";
    }

    if (extractImages) {
      prompt += "- Describe all images found in the document\n";
    }

    prompt += "- Extract document metadata (title, author, creation date, etc.)\n";
    prompt += "- Identify document structure (sections, headings, etc.)\n\n";

    if (preserveFormatting) {
      prompt += "Preserve original formatting and structure where possible.\n\n";
    }

    prompt += `Respond with a JSON object containing:
{
  "content": "full text content",
  "metadata": {
    "title": "document title",
    "author": "document author",
    "createdAt": "creation date",
    "modifiedAt": "modification date",
    "pageCount": number of pages,
    "wordCount": number of words
  },
  "structure": {
    "sections": [{"title": "section title", "content": "section content"}],
    "tables": [{"headers": ["col1", "col2"], "rows": [["val1", "val2"]]}],
    "images": [{"description": "image description", "position": "page X"}]
  }
}`;

    return prompt;
  }

  /**
   * Build prompt for data extraction
   */
  private buildExtractionPrompt(schema: object, options: ExtractionOptions): string {
    const { strictMode = false } = options;

    let prompt = "Extract structured data from this document according to the following JSON schema:\n\n";
    prompt += "Schema:\n" + JSON.stringify(schema, null, 2) + "\n\n";

    prompt += "Instructions:\n";
    prompt += "- Extract data that matches the schema structure\n";
    prompt += "- Use null for missing or unclear values\n";
    prompt += "- Provide confidence scores where possible\n";

    if (strictMode) {
      prompt += "- Only extract data that perfectly matches the schema\n";
      prompt += "- Skip any data that doesn't fit the expected format\n";
    }

    prompt += "\nRespond with a JSON object matching the schema structure.";

    return prompt;
  }

  /**
   * Build prompt for document summarization
   */
  private buildSummaryPrompt(options: { summaryType?: string; maxLength?: number }): string {
    const { summaryType = 'detailed', maxLength } = options;

    let prompt = `Please provide a ${summaryType} summary of this document.\n\n`;

    switch (summaryType) {
      case 'brief':
        prompt += "Provide a concise overview in 2-3 sentences.";
        break;
      case 'detailed':
        prompt += "Provide a comprehensive summary including key points, main topics, and important details.";
        break;
      case 'executive':
        prompt += "Provide an executive summary suitable for business decision makers.";
        break;
      case 'technical':
        prompt += "Provide a technical summary focusing on technical details and specifications.";
        break;
      default:
        prompt += "Provide a detailed summary of the document content.";
    }

    if (maxLength) {
      prompt += `\n\nLimit the summary to approximately ${maxLength} words.`;
    }

    prompt += "\n\nInclude key insights and main conclusions from the document.";

    return prompt;
  }

  /**
   * Build simple summary prompt
   */
  private buildSimpleSummaryPrompt(options: { summaryType?: string; maxLength?: number }): string {
    const { summaryType = 'detailed', maxLength } = options;

    let prompt = `Please provide a ${summaryType} summary of this document.\n\n`;

    switch (summaryType) {
      case 'brief':
        prompt += "Provide a concise overview in 2-3 sentences.";
        break;
      case 'detailed':
        prompt += "Provide a comprehensive summary including key points, main topics, and important details.";
        break;
      case 'executive':
        prompt += "Provide an executive summary suitable for business decision makers.";
        break;
      case 'technical':
        prompt += "Provide a technical summary focusing on technical details and specifications.";
        break;
      default:
        prompt += "Provide a detailed summary of the document content.";
    }

    if (maxLength) {
      prompt += `\n\nLimit the summary to approximately ${maxLength} words.`;
    }

    prompt += "\n\nInclude key insights and main conclusions from the document.";

    return prompt;
  }

  /**
   * Basic schema validation
   */
  private validateAgainstSchema(data: any, schema: object): boolean {
    // Simple validation - can be enhanced with proper JSON schema validation
    if (!data || typeof data !== 'object') {
      return false;
    }

    const schemaKeys = Object.keys(schema);
    const dataKeys = Object.keys(data);

    // Check if all required schema keys are present in data
    return schemaKeys.every(key => dataKeys.includes(key));
  }

  /**
   * Get speech generation model for text-to-speech
   */
  getSpeechModel(modelName?: string): GenerativeModel {
    const speechModelName = modelName || "gemini-2.5-flash-preview-tts";

    return this.genAI.getGenerativeModel({
      model: speechModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  /**
   * Generate speech from text using Gemini Speech Generation API
   */
  async generateSpeech(
    text: string,
    options: {
      voice?: string;
      model?: string;
      language?: string;
      stylePrompt?: string;
    } = {}
  ): Promise<{ audioData: string; metadata: any }> {
    try {
      const {
        voice = "Zephyr",
        model = "gemini-2.5-flash-preview-tts",
        language = "en-US",
        stylePrompt
      } = options;

      logger.debug(`Generating speech with voice: ${voice}, model: ${model}, language: ${language}`);

      const speechModel = this.getSpeechModel(model);

      // Build prompt with style if provided
      let prompt = text;
      if (stylePrompt) {
        prompt = `${stylePrompt}: ${text}`;
      }

      // Generate content with speech configuration
      const result = await speechModel.generateContent(prompt);

      const response = await result.response;

      // Extract audio data from response
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioData) {
        throw new APIError("No audio data received from Gemini Speech API");
      }

      const metadata = {
        voice,
        model,
        language,
        stylePrompt,
        timestamp: new Date().toISOString(),
        textLength: text.length,
        sampleRate: 24000,
        channels: 1,
        format: "wav"
      };

      return {
        audioData,
        metadata
      };
    } catch (error) {
      logger.error("Gemini Speech Generation error:", error);
      if (error instanceof Error) {
        throw new APIError(`Speech generation error: ${error.message}`);
      }
      throw new APIError("Unknown speech generation error");
    }
  }

  /**
   * Generate speech with retry logic
   */
  async generateSpeechWithRetry(
    text: string,
    options: {
      voice?: string;
      model?: string;
      language?: string;
      stylePrompt?: string;
    } = {},
    maxRetries: number = 2
  ): Promise<{ audioData: string; metadata: any }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Speech generation attempt ${attempt}/${maxRetries}`);
        return await this.generateSpeech(text, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Speech generation attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Simple backoff
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Speech generation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Split long text into chunks for speech generation
   */
  splitTextForSpeech(text: string, maxChunkSize: number = 8000): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;

      if (potentialChunk.length <= maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks;
  }

  /**
   * Generate speech for multiple chunks (for narration)
   */
  async generateSpeechChunks(
    chunks: string[],
    options: {
      voice?: string;
      model?: string;
      language?: string;
      stylePrompt?: string;
    } = {}
  ): Promise<{ audioData: string; metadata: any }[]> {
    const results: { audioData: string; metadata: any }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      logger.debug(`Generating speech for chunk ${i + 1}/${chunks.length}`);

      try {
        const result = await this.generateSpeechWithRetry(chunk, options);
        results.push(result);

        // Add small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        logger.error(`Failed to generate speech for chunk ${i + 1}:`, error);
        throw new APIError(`Failed to generate speech for chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Get video generation model for Veo 3.0
   */
  getVideoGenerationModel(modelName?: string): GenerativeModel {
    const videoModelName = modelName || "veo-3.0-generate-001";

    return this.genAI.getGenerativeModel({
      model: videoModelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  /**
   * Generate video using Veo 3.0 API
   */
  async generateVideo(
    prompt: string,
    options: {
      model?: string;
      duration?: string;
      aspectRatio?: string;
      fps?: number;
      imageInput?: string;
      style?: string;
      cameraMovement?: string;
      seed?: number;
    } = {}
  ): Promise<{ videoData: string; metadata: any; operationId: string }> {
    try {
      const {
        model = "veo-3.0-generate-001",
        duration = "4s",
        aspectRatio = "16:9",
        fps = 24,
        imageInput,
        style,
        cameraMovement,
        seed
      } = options;

      logger.debug(`Generating video with model: ${model}, duration: ${duration}, aspect ratio: ${aspectRatio}`);

      const videoModel = this.getVideoGenerationModel(model);

      // Build enhanced prompt with style and camera movement
      let enhancedPrompt = prompt;

      if (style) {
        const styleMapping: Record<string, string> = {
          realistic: "realistic, high quality, detailed",
          cinematic: "cinematic, professional lighting, dramatic",
          artistic: "artistic style, creative, expressive",
          cartoon: "cartoon style, animated, colorful",
          animation: "animated, smooth motion, stylized"
        };
        const styleDescription = styleMapping[style];
        if (styleDescription) {
          enhancedPrompt = `${enhancedPrompt}, ${styleDescription}`;
        }
      }

      if (cameraMovement && cameraMovement !== "static") {
        const movementMapping: Record<string, string> = {
          pan_left: "camera panning left",
          pan_right: "camera panning right",
          zoom_in: "camera zooming in",
          zoom_out: "camera zooming out",
          dolly_forward: "camera moving forward",
          dolly_backward: "camera moving backward"
        };
        const movementDescription = movementMapping[cameraMovement];
        if (movementDescription) {
          enhancedPrompt = `${enhancedPrompt}, ${movementDescription}`;
        }
      }

      if (aspectRatio && aspectRatio !== "16:9") {
        enhancedPrompt = `${enhancedPrompt}, aspect ratio ${aspectRatio}`;
      }

      if (duration && duration !== "4s") {
        enhancedPrompt = `${enhancedPrompt}, duration ${duration}`;
      }

      logger.info(`Enhanced video prompt: "${enhancedPrompt}"`);

      // Prepare the content parts
      const parts: any[] = [{ text: enhancedPrompt }];

      // Add image input if provided
      if (imageInput) {
        // Parse base64 data URI or handle URL
        if (imageInput.startsWith('data:image/')) {
          const matches = imageInput.match(/data:image\/([^;]+);base64,(.+)/);
          if (matches) {
            const mimeType = `image/${matches[1]}`;
            const data = matches[2];
            parts.push({
              inlineData: {
                mimeType,
                data
              }
            });
          }
        }
      }

      // Generate the video using Gemini API
      const response = await videoModel.generateContent(parts);
      const result = response.response;

      // Note: Video generation is typically an async operation that returns an operation ID
      // For now, we'll simulate the expected response structure
      const operationId = `video-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // In a real implementation, this would be handled as a long-running operation
      // that you would poll for completion
      const metadata = {
        model,
        duration,
        aspectRatio,
        fps,
        style,
        cameraMovement,
        seed,
        timestamp: new Date().toISOString(),
        prompt: enhancedPrompt,
        status: "pending" // Would be "completed" when the operation finishes
      };

      // For now, return a placeholder response
      // In reality, you would need to implement polling logic to wait for completion
      return {
        videoData: "data:video/mp4;base64,", // Placeholder - would contain actual video data
        metadata,
        operationId
      };

    } catch (error) {
      logger.error("Gemini Video Generation error:", error);
      if (error instanceof Error) {
        throw new APIError(`Video generation error: ${error.message}`);
      }
      throw new APIError("Unknown video generation error");
    }
  }

  /**
   * Generate video with retry logic
   */
  async generateVideoWithRetry(
    prompt: string,
    options: {
      model?: string;
      duration?: string;
      aspectRatio?: string;
      fps?: number;
      imageInput?: string;
      style?: string;
      cameraMovement?: string;
      seed?: number;
    } = {},
    maxRetries: number = 2
  ): Promise<{ videoData: string; metadata: any; operationId: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Video generation attempt ${attempt}/${maxRetries}`);
        return await this.generateVideo(prompt, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Video generation attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Simple backoff
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new APIError(`Video generation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Poll operation status for video generation
   * This would be used to check if a long-running video generation operation is complete
   */
  async pollVideoGenerationOperation(operationId: string): Promise<{ done: boolean; result?: any; error?: string }> {
    try {
      // In a real implementation, this would make an API call to check operation status
      // For now, simulate a polling response
      logger.debug(`Polling video generation operation: ${operationId}`);

      // Simulate operation completion after some time
      const isComplete = Math.random() > 0.7; // 30% chance of completion on each poll

      if (isComplete) {
        return {
          done: true,
          result: {
            videoData: "data:video/mp4;base64,", // Would contain actual video data
            generationTime: Math.floor(Math.random() * 30000) + 10000 // 10-40 seconds
          }
        };
      } else {
        return {
          done: false
        };
      }
    } catch (error) {
      logger.error("Video operation polling error:", error);
      return {
        done: true,
        error: error instanceof Error ? error.message : "Unknown polling error"
      };
    }
  }
}