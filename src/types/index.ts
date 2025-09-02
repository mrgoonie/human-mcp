export interface AnalysisOptions {
  analysis_type: "general" | "ui_debug" | "error_detection" | "accessibility" | "performance" | "layout";
  detail_level: "basic" | "detailed" | "extreme";
  specific_focus?: string;
  extract_text?: boolean;
  detect_ui_elements?: boolean;
  analyze_colors?: boolean;
  check_accessibility?: boolean;
}

export interface ProcessingResult {
  description: string;
  analysis: string;
  elements: DetectedElement[];
  insights: string[];
  recommendations: string[];
  metadata: {
    processing_time_ms: number;
    model_used: string;
    frames_analyzed?: number;
  };
}

export interface DetectedElement {
  type: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties: Record<string, any>;
}

export interface VideoOptions extends AnalysisOptions {
  max_frames?: number;
  sample_rate?: number;
}

export type LogLevel = "debug" | "info" | "warn" | "error";