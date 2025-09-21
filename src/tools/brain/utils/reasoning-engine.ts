import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import type {
  ThinkingStyle,
  ThinkingContext,
  ProcessingOptions,
  ThoughtStep,
  Hypothesis,
  ReasoningResult
} from '../types.js';

export class ReasoningEngine {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * Generate a single thought based on current context
   */
  async generateThought(
    problem: string,
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    thoughtNumber: number,
    context?: ThinkingContext
  ): Promise<{ content: string; confidence: number }> {
    const prompt = this.buildThoughtPrompt(
      problem,
      previousThoughts,
      thinkingStyle,
      thoughtNumber,
      context
    );

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No content generated from reasoning engine');
      }

      // Parse confidence if provided in response, otherwise estimate
      const confidence = this.extractConfidence(content) || this.estimateConfidence(content, previousThoughts);

      logger.debug(`Generated thought ${thoughtNumber}: ${content.substring(0, 100)}...`);
      return {
        content: this.cleanThoughtContent(content),
        confidence
      };
    } catch (error) {
      logger.error(`Failed to generate thought ${thoughtNumber}:`, error);
      throw new APIError(`Failed to generate thought: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a hypothesis based on current analysis
   */
  async generateHypothesis(
    problem: string,
    thoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle
  ): Promise<{ statement: string; confidence: number; evidence: string[] }> {
    const prompt = this.buildHypothesisPrompt(problem, thoughts, thinkingStyle);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No hypothesis generated');
      }

      const parsed = this.parseHypothesisResponse(content);
      logger.debug(`Generated hypothesis: ${parsed.statement}`);

      return parsed;
    } catch (error) {
      logger.error('Failed to generate hypothesis:', error);
      throw new APIError(`Failed to generate hypothesis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test a hypothesis against available evidence
   */
  async testHypothesis(
    hypothesis: Hypothesis,
    thoughts: ThoughtStep[],
    additionalContext?: string
  ): Promise<{ result: 'confirmed' | 'rejected' | 'inconclusive'; evidence: string[]; reasoning: string }> {
    const prompt = this.buildHypothesisTestPrompt(hypothesis, thoughts, additionalContext);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No hypothesis test result generated');
      }

      const parsed = this.parseHypothesisTestResponse(content);
      logger.info(`Tested hypothesis "${hypothesis.statement}": ${parsed.result}`);

      return parsed;
    } catch (error) {
      logger.error('Failed to test hypothesis:', error);
      throw new APIError(`Failed to test hypothesis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a final analysis based on all thoughts and conclusions
   */
  async synthesizeAnalysis(
    problem: string,
    thoughts: ThoughtStep[],
    hypotheses: Hypothesis[],
    thinkingStyle: ThinkingStyle,
    context?: ThinkingContext
  ): Promise<{ analysis: string; confidence: number; recommendations: string[]; nextSteps: string[] }> {
    const prompt = this.buildSynthesisPrompt(problem, thoughts, hypotheses, thinkingStyle, context);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(prompt);
      const result = response.response;
      const content = result.text();

      if (!content) {
        throw new APIError('No synthesis generated');
      }

      const parsed = this.parseSynthesisResponse(content);
      logger.info(`Synthesized analysis with confidence ${parsed.confidence}`);

      return parsed;
    } catch (error) {
      logger.error('Failed to synthesize analysis:', error);
      throw new APIError(`Failed to synthesize analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build a prompt for generating a single thought
   */
  private buildThoughtPrompt(
    problem: string,
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    thoughtNumber: number,
    context?: ThinkingContext
  ): string {
    const styleInstructions = this.getStyleInstructions(thinkingStyle);
    const thoughtsContext = this.formatPreviousThoughts(previousThoughts);
    const contextInfo = context ? this.formatContext(context) : '';

    return `You are an expert reasoning system using ${thinkingStyle} thinking to analyze problems step by step.

${styleInstructions}

**Problem to analyze:**
${problem}

${contextInfo}

**Previous thoughts (${previousThoughts.length}):**
${thoughtsContext}

**Current task:**
Generate thought #${thoughtNumber} that builds on previous analysis. Be specific, logical, and provide actionable insights.

**Requirements:**
- Build upon previous thoughts without repeating them
- Provide specific, concrete insights
- Include confidence assessment
- Consider evidence and assumptions
- Identify gaps or questions if any

**Response format:**
Provide your thought followed by [Confidence: X.XX] where X.XX is a decimal between 0.00 and 1.00.

Your thought #${thoughtNumber}:`;
  }

  /**
   * Build a prompt for generating hypotheses
   */
  private buildHypothesisPrompt(
    problem: string,
    thoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle
  ): string {
    const thoughtsContext = this.formatPreviousThoughts(thoughts);

    return `Based on the analysis so far, generate a testable hypothesis about the problem.

**Problem:**
${problem}

**Analysis so far:**
${thoughtsContext}

**Task:**
Generate a specific, testable hypothesis that could explain or solve the problem.

**Requirements:**
- Make it specific and testable
- Provide supporting evidence from the analysis
- Include confidence level
- Suggest how it could be tested

**Response format:**
HYPOTHESIS: [Your hypothesis statement]
EVIDENCE: [Supporting evidence points, one per line]
CONFIDENCE: [0.00-1.00]

Your response:`;
  }

  /**
   * Build a prompt for testing hypotheses
   */
  private buildHypothesisTestPrompt(
    hypothesis: Hypothesis,
    thoughts: ThoughtStep[],
    additionalContext?: string
  ): string {
    const thoughtsContext = this.formatPreviousThoughts(thoughts);

    return `Evaluate the following hypothesis based on available evidence and reasoning.

**Hypothesis to test:**
${hypothesis.statement}

**Supporting evidence:**
${hypothesis.evidence.map(e => `- ${e}`).join('\n')}

**Counter evidence:**
${hypothesis.counterEvidence.map(e => `- ${e}`).join('\n')}

**Analysis context:**
${thoughtsContext}

${additionalContext ? `**Additional context:**\n${additionalContext}\n` : ''}

**Task:**
Evaluate whether this hypothesis is confirmed, rejected, or inconclusive based on the evidence.

**Response format:**
RESULT: [CONFIRMED|REJECTED|INCONCLUSIVE]
REASONING: [Detailed reasoning for your conclusion]
EVIDENCE: [Additional evidence supporting your conclusion, one per line]

Your evaluation:`;
  }

  /**
   * Build a prompt for synthesizing final analysis
   */
  private buildSynthesisPrompt(
    problem: string,
    thoughts: ThoughtStep[],
    hypotheses: Hypothesis[],
    thinkingStyle: ThinkingStyle,
    context?: ThinkingContext
  ): string {
    const thoughtsContext = this.formatPreviousThoughts(thoughts);
    const hypothesesContext = this.formatHypotheses(hypotheses);
    const contextInfo = context ? this.formatContext(context) : '';

    return `Synthesize a comprehensive analysis based on all the reasoning completed so far.

**Original problem:**
${problem}

${contextInfo}

**Complete thought process:**
${thoughtsContext}

**Hypotheses tested:**
${hypothesesContext}

**Task:**
Provide a comprehensive final analysis that synthesizes all insights, conclusions, and recommendations.

**Requirements:**
- Summarize key findings and insights
- Provide clear conclusions with confidence levels
- Include actionable recommendations
- Suggest logical next steps
- Acknowledge limitations or uncertainties

**Response format:**
ANALYSIS: [Comprehensive analysis and conclusions]
CONFIDENCE: [0.00-1.00]
RECOMMENDATIONS: [Actionable recommendations, one per line]
NEXT_STEPS: [Logical next steps, one per line]

Your synthesis:`;
  }

  /**
   * Get thinking style specific instructions
   */
  private getStyleInstructions(style: ThinkingStyle): string {
    const instructions = {
      analytical: 'Use logical, step-by-step analysis. Break down complex problems into components. Focus on cause-and-effect relationships.',
      systematic: 'Follow a methodical, structured approach. Use frameworks and established methodologies. Ensure completeness and consistency.',
      creative: 'Think outside the box. Consider unconventional approaches. Generate innovative solutions and alternatives.',
      scientific: 'Use hypothesis-driven investigation. Seek evidence and test assumptions. Apply scientific method principles.',
      critical: 'Question assumptions and evaluate evidence critically. Consider biases and alternative perspectives. Challenge conventional thinking.',
      strategic: 'Think long-term and high-level. Consider broader implications and context. Focus on strategic planning and positioning.',
      intuitive: 'Use pattern recognition and experience-based insights. Trust experienced judgment while validating with evidence.',
      collaborative: 'Consider multiple perspectives and stakeholder viewpoints. Seek consensus and collaborative solutions.'
    };

    return instructions[style] || instructions.analytical;
  }

  /**
   * Format previous thoughts for context
   */
  private formatPreviousThoughts(thoughts: ThoughtStep[]): string {
    if (thoughts.length === 0) {
      return 'No previous thoughts yet.';
    }

    return thoughts
      .map(thought => {
        const revisionNote = thought.isRevision ? ' (REVISION)' : '';
        const branchNote = thought.branchId ? ' (BRANCH)' : '';
        return `${thought.number}. ${thought.content} [Confidence: ${thought.confidence.toFixed(2)}]${revisionNote}${branchNote}`;
      })
      .join('\n\n');
  }

  /**
   * Format hypotheses for context
   */
  private formatHypotheses(hypotheses: Hypothesis[]): string {
    if (hypotheses.length === 0) {
      return 'No hypotheses tested yet.';
    }

    return hypotheses
      .map(hyp => {
        const status = hyp.tested ? ` - ${hyp.result?.toUpperCase()}` : ' - NOT TESTED';
        return `- ${hyp.statement} [Confidence: ${hyp.confidence.toFixed(2)}]${status}`;
      })
      .join('\n');
  }

  /**
   * Format context information
   */
  private formatContext(context: ThinkingContext): string {
    const parts = [];

    if (context.domain) parts.push(`**Domain:** ${context.domain}`);
    if (context.background) parts.push(`**Background:** ${context.background}`);
    if (context.constraints?.length) parts.push(`**Constraints:** ${context.constraints.join(', ')}`);
    if (context.requirements?.length) parts.push(`**Requirements:** ${context.requirements.join(', ')}`);
    if (context.timeframe) parts.push(`**Timeframe:** ${context.timeframe}`);

    return parts.length > 0 ? parts.join('\n') + '\n' : '';
  }

  /**
   * Extract confidence score from response text
   */
  private extractConfidence(content: string): number | null {
    const confidenceMatch = content.match(/\[Confidence:\s*(\d*\.?\d+)\]/i);
    if (confidenceMatch && confidenceMatch[1]) {
      const confidence = parseFloat(confidenceMatch[1]);
      return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
    }
    return null;
  }

  /**
   * Estimate confidence based on content quality and context
   */
  private estimateConfidence(content: string, previousThoughts: ThoughtStep[]): number {
    let confidence = 0.5; // Base confidence

    // Length and detail bonus
    if (content.length > 200) confidence += 0.1;
    if (content.length > 500) confidence += 0.1;

    // Specificity indicators
    if (content.includes('specifically') || content.includes('evidence') || content.includes('data')) {
      confidence += 0.1;
    }

    // Reference to previous thoughts
    if (previousThoughts.length > 0 && (content.includes('previous') || content.includes('building on'))) {
      confidence += 0.1;
    }

    // Uncertainty indicators (reduce confidence)
    if (content.includes('might') || content.includes('possibly') || content.includes('unclear')) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0.1), 0.9); // Clamp between 0.1 and 0.9
  }

  /**
   * Clean thought content by removing confidence markers and formatting
   */
  private cleanThoughtContent(content: string): string {
    return content
      .replace(/\[Confidence:\s*\d*\.?\d+\]/gi, '')
      .replace(/^Your thought #\d+:\s*/i, '')
      .replace(/^Thought #?\d+:?\s*/i, '')
      .trim();
  }

  /**
   * Parse hypothesis response
   */
  private parseHypothesisResponse(content: string): { statement: string; confidence: number; evidence: string[] } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let statement = '';
    let confidence = 0.5;
    const evidence: string[] = [];

    for (const line of lines) {
      if (line.startsWith('HYPOTHESIS:')) {
        statement = line.replace('HYPOTHESIS:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        const confMatch = line.match(/(\d*\.?\d+)/);
        if (confMatch && confMatch[1]) {
          confidence = Math.min(Math.max(parseFloat(confMatch[1]), 0), 1);
        }
      } else if (line.startsWith('EVIDENCE:')) {
        // Skip the header line
        continue;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        evidence.push(line.replace(/^[-*]\s*/, ''));
      }
    }

    return {
      statement: statement || 'Generated hypothesis',
      confidence,
      evidence
    };
  }

  /**
   * Parse hypothesis test response
   */
  private parseHypothesisTestResponse(content: string): {
    result: 'confirmed' | 'rejected' | 'inconclusive';
    evidence: string[];
    reasoning: string;
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let result: 'confirmed' | 'rejected' | 'inconclusive' = 'inconclusive';
    let reasoning = '';
    const evidence: string[] = [];

    for (const line of lines) {
      if (line.startsWith('RESULT:')) {
        const resultText = line.replace('RESULT:', '').trim().toLowerCase();
        if (resultText.includes('confirmed')) result = 'confirmed';
        else if (resultText.includes('rejected')) result = 'rejected';
        else result = 'inconclusive';
      } else if (line.startsWith('REASONING:')) {
        reasoning = line.replace('REASONING:', '').trim();
      } else if (line.startsWith('EVIDENCE:')) {
        continue; // Skip header
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        evidence.push(line.replace(/^[-*]\s*/, ''));
      }
    }

    return { result, evidence, reasoning };
  }

  /**
   * Parse synthesis response
   */
  private parseSynthesisResponse(content: string): {
    analysis: string;
    confidence: number;
    recommendations: string[];
    nextSteps: string[];
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let analysis = '';
    let confidence = 0.7;
    const recommendations: string[] = [];
    const nextSteps: string[] = [];

    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('ANALYSIS:')) {
        currentSection = 'analysis';
        analysis = line.replace('ANALYSIS:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        const confMatch = line.match(/(\d*\.?\d+)/);
        if (confMatch && confMatch[1]) {
          confidence = Math.min(Math.max(parseFloat(confMatch[1]), 0), 1);
        }
      } else if (line.startsWith('RECOMMENDATIONS:')) {
        currentSection = 'recommendations';
      } else if (line.startsWith('NEXT_STEPS:')) {
        currentSection = 'nextSteps';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '');
        if (currentSection === 'recommendations') {
          recommendations.push(item);
        } else if (currentSection === 'nextSteps') {
          nextSteps.push(item);
        }
      } else if (currentSection === 'analysis' && line) {
        analysis += (analysis ? ' ' : '') + line;
      }
    }

    return {
      analysis: analysis || 'Analysis completed',
      confidence,
      recommendations,
      nextSteps
    };
  }
}