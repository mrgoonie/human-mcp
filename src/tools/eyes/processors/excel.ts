import { DocumentProcessor } from './document.js';
import type {
  DocumentResult,
  DocumentMetadata,
  ProcessOptions,
  DocumentStructure,
  ProcessingInfo,
  Table,
  FormulaAnalysis
} from '../types/document.js';
import { GeminiClient } from '../utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import XLSX from 'xlsx';

export class ExcelProcessor extends DocumentProcessor {
  constructor(geminiClient: GeminiClient) {
    super(geminiClient, ['xlsx']);
  }

  /**
   * Process Excel spreadsheet
   */
  async process(source: string, options: ProcessOptions = {}): Promise<DocumentResult> {
    const startTime = Date.now();

    try {
      logger.info(`Processing Excel document: ${source}`);

      const buffer = await this.loadDocument(source);
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Extract data from all sheets
      const sheetsData = this.extractSheetsData(workbook);

      // Get metadata
      const metadata = this.extractMetadata(workbook, buffer.length);

      // Analyze structure and formulas
      const structure = await this.analyzeStructure(workbook, options);
      const formulaAnalysis = await this.analyzeFormulas(workbook);

      // Generate summary content
      const content = this.generateContentSummary(sheetsData, formulaAnalysis);

      // Use Gemini for enhanced analysis if requested
      let enhancedContent = content;
      let extractedData = undefined;

      if (options.detailLevel === 'detailed') {
        const geminiResult = await this.geminiClient.processDocumentWithRetry(
          buffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          options
        );
        enhancedContent = geminiResult.content || content;
        extractedData = geminiResult.extractedData;
      }

      const processingInfo: ProcessingInfo = {
        processingTimeMs: Date.now() - startTime,
        modelUsed: options.detailLevel === 'detailed' ? this.geminiClient.getDocumentModel().model : 'xlsx',
        extractionMethod: 'xlsx + gemini',
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
      logger.error(`Excel processing error for ${source}:`, error);
      throw new APIError(`Failed to process Excel document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from Excel (converts to readable format)
   */
  async extractText(): Promise<string> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetsData = this.extractSheetsData(workbook);
      return this.generateContentSummary(sheetsData);
    } catch (error) {
      logger.error('Excel text extraction error:', error);
      throw new APIError(`Failed to extract text from Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        schema,
        { strictMode: options.detailLevel === 'quick' }
      );
    } catch (error) {
      logger.error('Excel structured data extraction error:', error);
      throw new APIError(`Failed to extract structured data from Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Excel metadata
   */
  async getMetadata(): Promise<DocumentMetadata> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      return this.extractMetadata(workbook, buffer.length);
    } catch (error) {
      logger.error('Excel metadata extraction error:', error);
      throw new APIError(`Failed to extract Excel metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Excel structure
   */
  async getStructure(): Promise<DocumentStructure> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      return await this.analyzeStructure(workbook, {});
    } catch (error) {
      logger.error('Excel structure analysis error:', error);
      throw new APIError(`Failed to analyze Excel structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract data with schema validation
   */
  async extractDataWithSchema(schema: object): Promise<any> {
    try {
      const buffer = await this.loadDocument('current');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetsData = this.extractSheetsData(workbook);

      // Use Gemini to map the data to the provided schema
      return await this.geminiClient.extractStructuredDataWithRetry(
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        schema,
        { strictMode: true }
      );
    } catch (error) {
      logger.error('Excel schema-based extraction error:', error);
      throw new APIError(`Failed to extract data with schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze formulas in the spreadsheet
   */
  async analyzeFormulas(workbook: XLSX.WorkBook): Promise<FormulaAnalysis> {
    try {
      const formulas: FormulaAnalysis['formulas'] = [];
      let complexFormulasCount = 0;
      const circularRefs: string[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddress];

            if (cell && cell.f) {
              // This cell contains a formula
              const formula = cell.f;
              const result = cell.v || cell.w || 'N/A';

              formulas.push({
                cell: cellAddress,
                formula,
                dependencies: this.extractDependencies(formula),
                result
              });

              // Check for complex formulas
              if (this.isComplexFormula(formula)) {
                complexFormulasCount++;
              }

              // Check for potential circular references
              if (this.hasCircularReference(formula, cellAddress)) {
                circularRefs.push(cellAddress);
              }
            }
          }
        }
      });

      return {
        formulas,
        summary: {
          totalFormulas: formulas.length,
          complexFormulas: complexFormulasCount,
          circularReferences: circularRefs
        }
      } as FormulaAnalysis;
    } catch (error) {
      logger.warn('Formula analysis failed:', error);
      return {
        formulas: [],
        summary: {
          totalFormulas: 0,
          complexFormulas: 0,
          circularReferences: []
        }
      };
    }
  }

  /**
   * Extract sheets data from workbook
   */
  private extractSheetsData(workbook: XLSX.WorkBook): Array<{ name: string; data: any[][]; headers?: string[] }> {
    const sheetsData: Array<{ name: string; data: any[][]; headers?: string[] }> = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Extract headers from first row if it looks like headers
      const firstRow = jsonData[0] as any[];
      const headers = this.detectHeaders(firstRow) ? firstRow.map(String) : undefined;

      sheetsData.push({
        name: sheetName,
        data: jsonData as any[][],
        headers
      });
    });

    return sheetsData;
  }

  /**
   * Extract metadata from workbook
   */
  private extractMetadata(workbook: XLSX.WorkBook, fileSize: number): DocumentMetadata {
    const props = workbook.Props || {};

    return {
      format: 'xlsx',
      pageCount: workbook.SheetNames.length, // Sheets as "pages"
      wordCount: 0, // Will be calculated from content
      characterCount: 0, // Will be calculated from content
      title: props.Title,
      author: props.Author,
      subject: props.Subject,
      createdAt: props.CreatedDate ? new Date(props.CreatedDate) : undefined,
      modifiedAt: props.ModifiedDate ? new Date(props.ModifiedDate) : undefined,
      fileSize
    };
  }

  /**
   * Analyze document structure
   */
  private async analyzeStructure(workbook: XLSX.WorkBook, options: ProcessOptions): Promise<DocumentStructure> {
    try {
      const sheetsData = this.extractSheetsData(workbook);
      const tables: Table[] = [];

      // Convert sheets to table format
      sheetsData.forEach((sheet, index) => {
        if (sheet.data.length > 0 && sheet.data[0]) {
          const headers = sheet.headers || sheet.data[0].map((_, i) => `Column ${i + 1}`);
          const rows = sheet.headers ? sheet.data.slice(1) : sheet.data;

          tables.push({
            id: `sheet_${index + 1}`,
            title: sheet.name,
            headers,
            rows: rows.map(row => row.map(String)),
            pageNumber: index + 1
          });
        }
      });

      return {
        sections: [], // Excel doesn't have traditional sections
        tables,
        images: [], // Would need additional processing for embedded images
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
   * Generate content summary from sheets data
   */
  private generateContentSummary(
    sheetsData: Array<{ name: string; data: any[][]; headers?: string[] }>,
    formulaAnalysis?: FormulaAnalysis
  ): string {
    let summary = `Excel Workbook Summary:\n\n`;

    sheetsData.forEach(sheet => {
      summary += `Sheet: ${sheet.name}\n`;
      summary += `Rows: ${sheet.data.length}\n`;
      if (sheet.headers) {
        summary += `Columns: ${sheet.headers.length} (${sheet.headers.join(', ')})\n`;
      }
      summary += '\n';
    });

    if (formulaAnalysis && formulaAnalysis.formulas.length > 0) {
      summary += `Formulas: ${formulaAnalysis.formulas.length} total\n`;
      summary += `Complex Formulas: ${formulaAnalysis.summary.complexFormulas}\n`;
      if (formulaAnalysis.summary.circularReferences.length > 0) {
        summary += `⚠️  Circular References: ${formulaAnalysis.summary.circularReferences.length}\n`;
      }
      summary += '\n';
    }

    return summary;
  }

  /**
   * Detect if first row contains headers
   */
  private detectHeaders(firstRow: any[]): boolean {
    if (!firstRow || firstRow.length === 0) return false;

    // Check if most values look like strings (potential headers)
    const stringCount = firstRow.filter(cell => typeof cell === 'string' && cell.trim().length > 0).length;
    return (stringCount / firstRow.length) > 0.7; // 70% strings = likely headers
  }

  /**
   * Extract formula dependencies
   */
  private extractDependencies(formula: string): string[] {
    // Simple regex to extract cell references from formulas
    const cellRefRegex = /\$?[A-Z]+\$?\d+/g;
    const matches = formula.match(cellRefRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Check if formula is complex
   */
  private isComplexFormula(formula: string): boolean {
    const complexPatterns = [
      /SUMIFS|COUNTIFS|AVERAGEIFS/i,
      /VLOOKUP|HLOOKUP|INDEX|MATCH/i,
      /IF\(/i,
      /SUMPRODUCT/i,
      /ARRAYFORMULA/i
    ];

    return complexPatterns.some(pattern => pattern.test(formula));
  }

  /**
   * Check for circular references
   */
  private hasCircularReference(formula: string, cellAddress: string): boolean {
    // Simple check - if formula references its own cell
    const normalizedFormula = formula.replace(/\$/g, '');
    const normalizedAddress = cellAddress.replace(/\$/g, '');
    return normalizedFormula.includes(normalizedAddress);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}