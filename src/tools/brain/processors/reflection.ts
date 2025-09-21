import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import type {
  BrainReflectInput,
  ReflectionResult,
  ReflectionFocus
} from '../types.js';

export class ReflectionProcessor {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  async process(input: BrainReflectInput): Promise<ReflectionResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting reflection process for analysis of length: ${input.originalAnalysis.length}`);

      // Perform reflection for each focus area
      const reflectionResults = await this.performReflection(input);

      // Identify issues and improvements
      const identifiedIssues = await this.identifyIssues(input, reflectionResults);

      // Generate improvements
      const improvements = await this.generateImprovements(input, identifiedIssues);

      // Create revised analysis if significant issues found
      const revisedAnalysis = await this.createRevisedAnalysis(input, improvements);

      // Calculate final confidence
      const confidence = this.calculateReflectionConfidence(identifiedIssues, improvements);

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(input, improvements);

      const processingTime = Date.now() - startTime;

      return {
        originalAnalysis: input.originalAnalysis,
        revisedAnalysis: revisedAnalysis || undefined,
        identifiedIssues,
        improvements,
        confidence,
        recommendedActions
      };
    } catch (error) {
      logger.error('Reflection processing failed:', error);
      throw new APIError(`Reflection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performReflection(input: BrainReflectInput): Promise<Array<{
    focus: ReflectionFocus;
    analysis: string;
    findings: string[];
  }>> {
    const results: Array<{ focus: ReflectionFocus; analysis: string; findings: string[] }> = [];

    for (const focus of input.reflectionFocus) {
      try {
        const reflectionPrompt = this.buildReflectionPrompt(input, focus);

        const model = this.geminiClient.getModel('detailed');
        const response = await model.generateContent(reflectionPrompt);
        const content = response.response.text();

        if (content) {
          const parsed = this.parseReflectionResponse(content);
          results.push({
            focus,
            analysis: parsed.analysis,
            findings: parsed.findings
          });
        }

        await this.pause(150);
      } catch (error) {
        logger.warn(`Failed to perform reflection for ${focus}:`, error);
      }
    }

    return results;
  }

  private async identifyIssues(
    input: BrainReflectInput,
    reflectionResults: Array<{ focus: ReflectionFocus; analysis: string; findings: string[] }>
  ): Promise<Array<{
    type: ReflectionFocus;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>> {
    const issues: Array<{
      type: ReflectionFocus;
      description: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }> = [];

    for (const result of reflectionResults) {
      const issuePrompt = this.buildIssueIdentificationPrompt(input, result);

      try {
        const model = this.geminiClient.getModel('detailed');
        const response = await model.generateContent(issuePrompt);
        const content = response.response.text();

        if (content) {
          const parsedIssues = this.parseIssueResponse(content, result.focus);
          issues.push(...parsedIssues);
        }

        await this.pause(100);
      } catch (error) {
        logger.warn(`Failed to identify issues for ${result.focus}:`, error);
      }
    }

    return issues;
  }

  private async generateImprovements(
    input: BrainReflectInput,
    issues: Array<{ type: ReflectionFocus; description: string; severity: string; suggestion: string }>
  ): Promise<string[]> {
    if (issues.length === 0) {
      return ['Analysis appears sound', 'Consider additional perspectives if needed'];
    }

    const improvementPrompt = this.buildImprovementPrompt(input, issues);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(improvementPrompt);
      const content = response.response.text();

      if (content) {
        return this.parseImprovementResponse(content);
      }
    } catch (error) {
      logger.warn('Failed to generate improvements:', error);
    }

    // Fallback improvements based on issues
    return issues
      .filter(issue => issue.severity === 'high' || issue.severity === 'medium')
      .map(issue => issue.suggestion)
      .slice(0, 5);
  }

  private async createRevisedAnalysis(
    input: BrainReflectInput,
    improvements: string[]
  ): Promise<string | null> {
    const highImpactImprovements = improvements.filter(imp =>
      imp.includes('significant') || imp.includes('major') || imp.includes('critical')
    );

    if (highImpactImprovements.length === 0) {
      return null; // No significant issues requiring revision
    }

    const revisionPrompt = this.buildRevisionPrompt(input, improvements);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(revisionPrompt);
      const content = response.response.text();

      return content || null;
    } catch (error) {
      logger.warn('Failed to create revised analysis:', error);
      return null;
    }
  }

  private async generateRecommendedActions(
    input: BrainReflectInput,
    improvements: string[]
  ): Promise<string[]> {
    const actionPrompt = this.buildActionPrompt(input, improvements);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(actionPrompt);
      const content = response.response.text();

      if (content) {
        return this.parseActionResponse(content);
      }
    } catch (error) {
      logger.warn('Failed to generate recommended actions:', error);
    }

    return [
      'Review identified issues',
      'Implement suggested improvements',
      'Validate revised analysis',
      'Consider additional perspectives'
    ];
  }

  private buildReflectionPrompt(input: BrainReflectInput, focus: ReflectionFocus): string {
    const focusInstructions = this.getFocusInstructions(focus);
    const contextInfo = this.formatReflectionContext(input);

    return `You are conducting a reflective analysis focused on ${focus.replace('_', ' ')}.

${focusInstructions}

**Original Analysis:**
${input.originalAnalysis}

${contextInfo}

**Task:**
Reflect on the original analysis specifically from the ${focus.replace('_', ' ')} perspective.

**Provide:**
1. ANALYSIS: Your reflection on this aspect
2. FINDINGS: Specific findings or concerns (one per line with - prefix)

**Your reflection on ${focus.replace('_', ' ')}:**`;
  }

  private buildIssueIdentificationPrompt(
    input: BrainReflectInput,
    result: { focus: ReflectionFocus; analysis: string; findings: string[] }
  ): string {
    return `Based on the reflection analysis, identify specific issues that need attention.

**Focus Area:** ${result.focus.replace('_', ' ')}

**Reflection Analysis:**
${result.analysis}

**Key Findings:**
${result.findings.map(f => `- ${f}`).join('\n')}

**Task:**
Identify specific issues that need to be addressed.

**For each issue, provide:**
ISSUE: [Description of the issue]
SEVERITY: [LOW|MEDIUM|HIGH]
SUGGESTION: [How to address this issue]

**Issues identified:`;
  }

  private buildImprovementPrompt(
    input: BrainReflectInput,
    issues: Array<{ type: ReflectionFocus; description: string; severity: string; suggestion: string }>
  ): string {
    const issuesText = issues.map(issue =>
      `- ${issue.type}: ${issue.description} (${issue.severity}) → ${issue.suggestion}`
    ).join('\n');

    return `Generate specific improvements based on identified issues.

**Original Analysis:**
${input.originalAnalysis.substring(0, 500)}...

**Identified Issues:**
${issuesText}

**Improvement Goals:**
${input.improvementGoals?.join(', ') || 'General improvement'}

**Task:**
Generate specific, actionable improvements to address the identified issues.

**Improvements (one per line with - prefix):`;
  }

  private buildRevisionPrompt(input: BrainReflectInput, improvements: string[]): string {
    const improvementsText = improvements.map(imp => `- ${imp}`).join('\n');

    return `Create a revised version of the original analysis incorporating the suggested improvements.

**Original Analysis:**
${input.originalAnalysis}

**Improvements to Incorporate:**
${improvementsText}

**New Information:**
${input.newInformation || 'None provided'}

**Alternative Viewpoints:**
${input.alternativeViewpoints?.join(', ') || 'None provided'}

**Task:**
Create a revised analysis that addresses the identified issues and incorporates the improvements while maintaining the core insights from the original.

**Revised Analysis:**`;
  }

  private buildActionPrompt(input: BrainReflectInput, improvements: string[]): string {
    const improvementsText = improvements.map(imp => `- ${imp}`).join('\n');

    return `Generate recommended actions based on the reflection and improvements.

**Context:**
${input.context ? JSON.stringify(input.context) : 'No context provided'}

**Identified Improvements:**
${improvementsText}

**Improvement Goals:**
${input.improvementGoals?.join(', ') || 'General improvement'}

**Task:**
Generate specific, actionable recommendations for next steps.

**Recommended Actions (one per line with - prefix):`;
  }

  private getFocusInstructions(focus: ReflectionFocus): string {
    const instructions = {
      assumptions: 'Examine the underlying assumptions. Are they valid? Well-supported? What if they are wrong?',
      logic_gaps: 'Look for holes in the logical reasoning. Are there missing steps? Unsupported conclusions?',
      alternative_approaches: 'Consider different methods or perspectives. What other ways could this be approached?',
      evidence_quality: 'Evaluate the strength and reliability of evidence used. Is it sufficient and credible?',
      bias_detection: 'Identify potential biases in reasoning, data selection, or interpretation.',
      consistency_check: 'Check for internal consistency. Are there contradictions or conflicting statements?',
      completeness: 'Assess whether important aspects have been overlooked or inadequately addressed.',
      feasibility: 'Evaluate the practical viability and implementation challenges of conclusions or recommendations.'
    };

    return instructions[focus] || 'Reflect critically on this aspect of the analysis.';
  }

  private formatReflectionContext(input: BrainReflectInput): string {
    const parts = [];

    if (input.newInformation) {
      parts.push(`**New Information:** ${input.newInformation}`);
    }

    if (input.alternativeViewpoints?.length) {
      parts.push(`**Alternative Viewpoints:** ${input.alternativeViewpoints.join(', ')}`);
    }

    if (input.improvementGoals?.length) {
      parts.push(`**Improvement Goals:** ${input.improvementGoals.join(', ')}`);
    }

    return parts.length > 0 ? '\n' + parts.join('\n') + '\n' : '';
  }

  private parseReflectionResponse(content: string): { analysis: string; findings: string[] } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let analysis = '';
    const findings: string[] = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('ANALYSIS:')) {
        currentSection = 'analysis';
        analysis = line.replace('ANALYSIS:', '').trim();
      } else if (line.startsWith('FINDINGS:')) {
        currentSection = 'findings';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (currentSection === 'findings') {
          findings.push(line.replace(/^[-*]\s*/, ''));
        }
      } else if (currentSection === 'analysis' && line) {
        analysis += (analysis ? ' ' : '') + line;
      }
    }

    return {
      analysis: analysis || 'Reflection completed',
      findings
    };
  }

  private parseIssueResponse(content: string, focus: ReflectionFocus): Array<{
    type: ReflectionFocus;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }> {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const issues: Array<{
      type: ReflectionFocus;
      description: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }> = [];

    let currentIssue: any = { type: focus };

    for (const line of lines) {
      if (line.startsWith('ISSUE:')) {
        if (currentIssue.description) {
          issues.push(currentIssue);
        }
        currentIssue = {
          type: focus,
          description: line.replace('ISSUE:', '').trim(),
          severity: 'medium',
          suggestion: ''
        };
      } else if (line.startsWith('SEVERITY:')) {
        const severityText = line.replace('SEVERITY:', '').trim().toLowerCase();
        if (severityText.includes('high')) currentIssue.severity = 'high';
        else if (severityText.includes('low')) currentIssue.severity = 'low';
        else currentIssue.severity = 'medium';
      } else if (line.startsWith('SUGGESTION:')) {
        currentIssue.suggestion = line.replace('SUGGESTION:', '').trim();
      }
    }

    if (currentIssue.description) {
      issues.push(currentIssue);
    }

    return issues;
  }

  private parseImprovementResponse(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 8); // Limit to 8 improvements
  }

  private parseActionResponse(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 6); // Limit to 6 actions
  }

  private calculateReflectionConfidence(
    issues: Array<{ severity: string }>,
    improvements: string[]
  ): number {
    const highSeverityIssues = issues.filter(i => i.severity === 'high').length;
    const mediumSeverityIssues = issues.filter(i => i.severity === 'medium').length;

    let confidence = 0.8; // Base confidence

    // Reduce confidence based on issues found
    confidence -= highSeverityIssues * 0.2;
    confidence -= mediumSeverityIssues * 0.1;

    // Increase confidence if improvements were identified (shows thoroughness)
    if (improvements.length > 0) confidence += 0.1;

    return Math.max(Math.min(confidence, 1.0), 0.1);
  }

  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}