import { describe, it, expect } from "bun:test";
import { createPrompt, parseAnalysisResponse } from "../../src/tools/eyes/utils/formatters.js";
import type { AnalysisOptions } from "../../src/types/index.js";

describe("Formatters", () => {
  describe("createPrompt", () => {
    it("should create UI debug prompt", () => {
      const options: AnalysisOptions = {
        analysis_type: "ui_debug",
        detail_level: "detailed"
      };
      
      const prompt = createPrompt(options);
      
      expect(prompt).toContain("UI debugging expert");
      expect(prompt).toContain("layout issues");
      expect(prompt).toContain("thorough analysis");
    });
    
    it("should create accessibility prompt", () => {
      const options: AnalysisOptions = {
        analysis_type: "accessibility", 
        detail_level: "quick"
      };
      
      const prompt = createPrompt(options);
      
      expect(prompt).toContain("accessibility expert");
      expect(prompt).toContain("WCAG guidelines");
      expect(prompt).toContain("Provide a concise analysis");
    });
    
    it("should include specific focus when provided", () => {
      const options: AnalysisOptions = {
        analysis_type: "general",
        detail_level: "detailed",
        specific_focus: "login form errors"
      };
      
      const prompt = createPrompt(options);
      
      expect(prompt).toContain("login form errors");
    });
  });
  
  describe("parseAnalysisResponse", () => {
    it("should parse structured response", () => {
      const response = `
        OVERVIEW: This is a test analysis
        
        KEY FINDINGS: Found several issues
        
        DETAILED ANALYSIS: Detailed breakdown of issues
        
        UI ELEMENTS: Button at 100,200 size 150x50
        
        RECOMMENDATIONS: Fix the layout issues
        
        DEBUGGING INSIGHTS: Consider responsive design
      `;
      
      const parsed = parseAnalysisResponse(response);
      
      expect(parsed.description).toContain("This is a test analysis");
      expect(parsed.analysis).toContain("Detailed breakdown of issues");
      expect(parsed.recommendations).toContain("Fix the layout issues");
      expect(parsed.insights).toContain("Consider responsive design");
      expect(parsed.elements).toHaveLength(1);
      expect(parsed.elements?.[0]?.location).toEqual({
        x: 100, y: 200, width: 150, height: 50
      });
    });
    
    it("should handle missing sections gracefully", () => {
      const response = "Simple analysis without sections";
      
      const parsed = parseAnalysisResponse(response);
      
      expect(parsed.description).toBe("Simple analysis without sections");
      expect(parsed.analysis).toBe("Simple analysis without sections");
      expect(parsed.elements).toEqual([]);
      expect(parsed.insights).toEqual([]);
    });
  });
});