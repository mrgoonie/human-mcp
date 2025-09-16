export interface DocumentResult {
  content: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  extractedData?: any;
  processingInfo: ProcessingInfo;
}

export interface DocumentMetadata {
  format: DocumentFormat;
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

export interface DocumentStructure {
  sections: Section[];
  tables: Table[];
  images: Image[];
  links: Link[];
  headings: Heading[];
}

export interface Section {
  id: string;
  title?: string;
  content: string;
  level: number;
  startPage?: number;
  endPage?: number;
  wordCount: number;
}

export interface Table {
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

export interface Image {
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

export interface Link {
  id: string;
  text: string;
  url: string;
  pageNumber?: number;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
  pageNumber?: number;
}

export interface ProcessingInfo {
  processingTimeMs: number;
  modelUsed: string;
  extractionMethod: string;
  confidence?: number;
  warnings?: string[];
  errors?: string[];
}

export interface ProcessOptions {
  extractText?: boolean;
  extractTables?: boolean;
  extractImages?: boolean;
  preserveFormatting?: boolean;
  pageRange?: string;
  detailLevel?: 'quick' | 'detailed';
  language?: string;
  timeout?: number;
}

export interface ExtractionOptions {
  schema: object;
  strictMode?: boolean;
  fallbackValues?: Record<string, any>;
  validateOutput?: boolean;
}

export interface DocumentResponse {
  content: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  extractedData?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface SourceReference {
  field: string;
  pageNumber?: number;
  section?: string;
  confidence: number;
}

export interface FormattedContent {
  html: string;
  markdown: string;
  plainText: string;
}

export interface FormulaAnalysis {
  formulas: Array<{
    cell: string;
    formula: string;
    dependencies: string[];
    result?: any;
  }>;
  summary: {
    totalFormulas: number;
    complexFormulas: number;
    circularReferences: string[];
  };
}

export interface FormData {
  fields: Array<{
    name: string;
    type: string;
    value?: any;
    required?: boolean;
    options?: string[];
  }>;
}

export type DocumentFormat =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'txt'
  | 'md'
  | 'rtf'
  | 'odt'
  | 'csv'
  | 'json'
  | 'xml'
  | 'html';

export interface DocumentProcessorConfig {
  maxFileSize: number;
  supportedFormats: DocumentFormat[];
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  ocrEnabled: boolean;
}