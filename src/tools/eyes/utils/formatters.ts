import type { AnalysisOptions, ProcessingResult, DetectedElement } from "@/types";

export function createPrompt(options: AnalysisOptions): string {
  const { analysis_type, detail_level, specific_focus } = options;
  
  let basePrompt = "";
  
  switch (analysis_type) {
    case "ui_debug":
      basePrompt = `You are a UI debugging expert. Analyze this visual content for layout issues, rendering problems, misalignments, broken elements, and visual bugs. Focus on identifying what's wrong with the user interface.`;
      break;
    case "error_detection":
      basePrompt = `You are an error detection specialist. Look for visible error messages, error states, broken functionality, missing content, and any signs of system failures or exceptions.`;
      break;
    case "accessibility":
      basePrompt = `You are an accessibility expert. Analyze this content for accessibility issues including color contrast, text readability, missing alt text, poor focus indicators, and compliance with WCAG guidelines.`;
      break;
    case "performance":
      basePrompt = `You are a performance analysis expert. Look for signs of slow loading, layout shifts, render blocking, large images, and other performance-related visual indicators.`;
      break;
    case "layout":
      basePrompt = `You are a layout analysis expert. Focus on responsive design issues, element positioning, spacing, alignment, overflow problems, and overall visual hierarchy.`;
      break;
    default:
      basePrompt = `You are a visual analysis expert. Provide a comprehensive analysis of this visual content.`;
  }
  
  const detailInstructions = {
    basic: "Provide a concise analysis focusing on the most important findings.",
    detailed: "Provide a thorough analysis with specific details about each finding.",
    extreme: "Provide an exhaustive analysis with pixel-level precision and comprehensive technical details."
  };
  
  const focusInstruction = specific_focus 
    ? `\n\nPay special attention to: ${specific_focus}`
    : "";
  
  return `${basePrompt}

${detailInstructions[detail_level]}

Please structure your response as follows:
1. OVERVIEW: Brief summary of what you see
2. KEY FINDINGS: Main issues or points of interest
3. DETAILED ANALYSIS: Comprehensive breakdown
4. UI ELEMENTS: List detected interactive elements with approximate positions
5. RECOMMENDATIONS: Specific actionable suggestions
6. DEBUGGING INSIGHTS: Technical insights for developers

${focusInstruction}

Be specific, technical, and provide exact details where possible. Include coordinates, colors, sizes, and any measurable properties you can identify.`;
}

export function parseAnalysisResponse(response: string): Partial<ProcessingResult> {
  const sections = {
    overview: extractSection(response, "OVERVIEW"),
    findings: extractSection(response, "KEY FINDINGS"),
    analysis: extractSection(response, "DETAILED ANALYSIS"),
    elements: extractSection(response, "UI ELEMENTS"),
    recommendations: extractSection(response, "RECOMMENDATIONS"),
    insights: extractSection(response, "DEBUGGING INSIGHTS")
  };
  
  return {
    description: sections.overview || response.substring(0, 500),
    analysis: sections.analysis || response,
    elements: parseUIElements(sections.elements),
    insights: parseList(sections.insights),
    recommendations: parseList(sections.recommendations)
  };
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n[A-Z]+:|$)`, 'i');
  const match = text.match(regex);
  return match?.[1]?.trim() || "";
}

function parseList(text: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map(line => line.replace(/^[-*•]\s*/, '').trim())
    .filter(line => line.length > 0);
}

function parseUIElements(text: string): DetectedElement[] {
  if (!text) return [];
  
  const elements: DetectedElement[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const coordMatch = line.match(/(\d+),\s*(\d+).*?(\d+)x(\d+)|x:\s*(\d+).*?y:\s*(\d+).*?w:\s*(\d+).*?h:\s*(\d+)/i);
    if (coordMatch) {
      const [, x1, y1, w1, h1, x2, y2, w2, h2] = coordMatch;
      const x = parseInt(x1 || x2 || "0");
      const y = parseInt(y1 || y2 || "0");
      const width = parseInt(w1 || w2 || "0");
      const height = parseInt(h1 || h2 || "0");
      
      if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
        elements.push({
          type: extractElementType(line),
          location: { x, y, width, height },
          properties: { description: line.trim() }
        });
      }
    }
  }
  
  return elements;
}

function extractElementType(line: string): string {
  const types = ["button", "input", "link", "image", "text", "menu", "modal", "form", "icon"];
  const lowerLine = line.toLowerCase();
  
  for (const type of types) {
    if (lowerLine.includes(type)) {
      return type;
    }
  }
  
  return "element";
}