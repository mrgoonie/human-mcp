import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import { ThoughtManager } from '../utils/thought-manager.js';
import { ReasoningEngine } from '../utils/reasoning-engine.js';
import type {
  BrainAnalyzeInput,
  AnalysisResult,
  ThinkingStyle,
  ThoughtStep
} from '../types.js';

export class AnalyticalReasoningProcessor {
  private geminiClient: GeminiClient;
  private reasoningEngine: ReasoningEngine;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.reasoningEngine = new ReasoningEngine(geminiClient);
  }

  /**
   * Process analytical reasoning request
   */
  async process(input: BrainAnalyzeInput): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting analytical reasoning for: ${input.subject.substring(0, 100)}...`);

      // Initialize thought manager with analytical approach
      const thoughtManager = new ThoughtManager(
        input.subject,
        input.thinkingStyle,
        input.context,
        {
          ...input.options,
          enableBranching: input.considerAlternatives
        }
      );

      // Perform structured analysis
      await this.performStructuredAnalysis(thoughtManager, input);

      // Generate alternative perspectives if requested
      if (input.considerAlternatives) {
        await this.exploreAlternatives(thoughtManager, input);
      }

      // Track and validate assumptions
      if (input.trackAssumptions) {
        await this.analyzeAssumptions(thoughtManager, input);
      }

      // Synthesize comprehensive analysis
      const synthesis = await this.synthesizeAnalysis(thoughtManager, input);

      // Extract key findings and insights
      const keyFindings = await this.extractKeyFindings(thoughtManager, input);

      // Assess evidence quality
      const evidenceQuality = this.assessEvidenceQuality(thoughtManager.getThoughts());

      // Finalize the thought process
      const finalProcess = thoughtManager.finalize();

      const processingTime = Date.now() - startTime;

      return {
        thoughtProcess: finalProcess,
        finalAnswer: synthesis.analysis,
        confidence: synthesis.confidence,
        reasoning: this.buildAnalyticalReasoning(finalProcess),
        recommendations: synthesis.recommendations,
        nextSteps: synthesis.nextSteps,
        keyFindings,
        assumptions: await this.extractAssumptions(thoughtManager.getThoughts()),
        evidenceQuality,
        riskFactors: await this.identifyRiskFactors(thoughtManager, input),
        opportunities: await this.identifyOpportunities(thoughtManager, input),
        processingInfo: {
          totalThoughts: finalProcess.thoughts.length,
          processingTime,
          revisionsUsed: finalProcess.metadata.revisionsCount,
          branchesExplored: finalProcess.metadata.branchesCount,
          hypothesesTested: finalProcess.hypotheses.filter(h => h.tested).length,
          finalConfidence: synthesis.confidence
        }
      };
    } catch (error) {
      logger.error('Analytical reasoning processing failed:', error);
      throw new APIError(`Analytical reasoning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform structured analytical breakdown
   */
  private async performStructuredAnalysis(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<void> {
    const analysisSteps = this.getAnalysisSteps(input.analysisDepth ?? 'detailed', input.focusAreas);

    for (let i = 0; i < analysisSteps.length; i++) {
      const step = analysisSteps[i];

      if (!step) continue;

      try {
        const thoughtResult = await this.generateAnalyticalThought(
          input.subject,
          step,
          thoughtManager.getThoughts(),
          input.thinkingStyle ?? 'analytical',
          input.context
        );

        if (step) {
          thoughtManager.addThought(
            thoughtResult.content,
            thoughtResult.confidence,
            {
              tags: ['analytical', step.category]
            }
          );
        }

        await this.pause(150);
      } catch (error) {
        logger.warn(`Failed to complete analysis step "${step?.name}":`, error);
      }
    }
  }

  /**
   * Explore alternative perspectives and approaches
   */
  private async exploreAlternatives(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<void> {
    try {
      // Create a branch for alternative analysis
      const alternativeBranch = thoughtManager.createBranch(
        thoughtManager.getProcess().currentThought,
        'Alternative Perspectives'
      );

      const alternatives = await this.generateAlternativePerspectives(
        input.subject,
        thoughtManager.getThoughts(),
        input.context
      );

      for (const alternative of alternatives) {
        const thoughtResult = await this.generateAnalyticalThought(
          input.subject,
          {
            name: 'Alternative Perspective',
            prompt: alternative.prompt,
            category: 'alternative'
          },
          thoughtManager.getThoughts(),
          'critical', // Use critical thinking for alternatives
          input.context
        );

        thoughtManager.addThought(
          thoughtResult.content,
          thoughtResult.confidence,
          {
            branchId: alternativeBranch.id,
            branchFromThought: alternativeBranch.fromThought,
            tags: ['alternative', alternative.type]
          }
        );

        await this.pause(200);
      }
    } catch (error) {
      logger.warn('Failed to explore alternatives:', error);
    }
  }

  /**
   * Analyze and track assumptions
   */
  private async analyzeAssumptions(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<void> {
    try {
      const assumptionAnalysisPrompt = this.buildAssumptionAnalysisPrompt(
        input.subject,
        thoughtManager.getThoughts()
      );

      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(assumptionAnalysisPrompt);
      const content = response.response.text();

      if (content) {
        thoughtManager.addThought(
          content,
          0.8,
          {
            tags: ['assumptions', 'meta-analysis']
          }
        );
      }
    } catch (error) {
      logger.warn('Failed to analyze assumptions:', error);
    }
  }

  /**
   * Get analysis steps based on depth and focus areas
   */
  private getAnalysisSteps(
    depth: 'surface' | 'detailed' | 'comprehensive',
    focusAreas?: string[]
  ): Array<{ name: string; prompt: string; category: string }> {
    const baseSteps = [
      {
        name: 'Problem Definition',
        prompt: 'Clearly define and scope the subject for analysis',
        category: 'definition'
      },
      {
        name: 'Context Analysis',
        prompt: 'Analyze the broader context and environment',
        category: 'context'
      },
      {
        name: 'Component Breakdown',
        prompt: 'Break down the subject into key components',
        category: 'breakdown'
      }
    ];

    const detailedSteps = [
      {
        name: 'Stakeholder Analysis',
        prompt: 'Identify and analyze key stakeholders and their interests',
        category: 'stakeholders'
      },
      {
        name: 'Constraint Analysis',
        prompt: 'Identify constraints, limitations, and dependencies',
        category: 'constraints'
      },
      {
        name: 'Impact Assessment',
        prompt: 'Assess potential impacts and consequences',
        category: 'impact'
      }
    ];

    const comprehensiveSteps = [
      {
        name: 'Trend Analysis',
        prompt: 'Analyze relevant trends and patterns',
        category: 'trends'
      },
      {
        name: 'Risk Analysis',
        prompt: 'Identify and evaluate potential risks',
        category: 'risks'
      },
      {
        name: 'Opportunity Analysis',
        prompt: 'Identify potential opportunities and benefits',
        category: 'opportunities'
      },
      {
        name: 'Competitive Analysis',
        prompt: 'Analyze competitive landscape and positioning',
        category: 'competition'
      }
    ];

    let steps = [...baseSteps];

    if (depth === 'detailed' || depth === 'comprehensive') {
      steps.push(...detailedSteps);
    }

    if (depth === 'comprehensive') {
      steps.push(...comprehensiveSteps);
    }

    // Add focus area specific steps
    if (focusAreas && focusAreas.length > 0) {
      for (const area of focusAreas) {
        steps.push({
          name: `${area} Focus`,
          prompt: `Provide detailed analysis specifically focused on ${area}`,
          category: 'focus'
        });
      }
    }

    return steps;
  }

  /**
   * Generate an analytical thought for a specific step
   */
  private async generateAnalyticalThought(
    subject: string,
    step: { name: string; prompt: string; category: string },
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    context?: any
  ): Promise<{ content: string; confidence: number }> {
    const prompt = this.buildStepPrompt(subject, step, previousThoughts, thinkingStyle, context);

    const model = this.geminiClient.getModel('detailed');
    const response = await model.generateContent(prompt);
    const result = response.response;
    const content = result.text();

    if (!content) {
      throw new APIError(`No content generated for analysis step: ${step.name}`);
    }

    const confidence = this.estimateStepConfidence(content, step.category);

    return {
      content: this.cleanStepContent(content, step.name),
      confidence
    };
  }

  /**
   * Build prompt for analysis step
   */
  private buildStepPrompt(
    subject: string,
    step: { name: string; prompt: string; category: string },
    previousThoughts: ThoughtStep[],
    thinkingStyle: ThinkingStyle,
    context?: any
  ): string {
    const contextInfo = context ? this.formatContext(context) : '';
    const thoughtsContext = this.formatPreviousThoughts(previousThoughts);

    return `You are performing ${step.name} as part of a comprehensive analytical process.

**Subject for Analysis:**
${subject}

${contextInfo}

**Analysis Step:** ${step.name}
**Objective:** ${step.prompt}

**Previous Analysis:**
${thoughtsContext}

**Instructions:**
- Use ${thinkingStyle} thinking approach
- Be specific and evidence-based
- Build upon previous analysis without repeating
- Identify key insights and patterns
- Consider multiple perspectives
- Provide actionable insights

**Your ${step.name} analysis:`;
  }

  /**
   * Generate alternative perspectives
   */
  private async generateAlternativePerspectives(
    subject: string,
    thoughts: ThoughtStep[],
    context?: any
  ): Promise<Array<{ type: string; prompt: string }>> {
    const alternatives = [
      {
        type: 'contrarian',
        prompt: 'Challenge the main assumptions and provide a contrarian perspective'
      },
      {
        type: 'optimistic',
        prompt: 'Analyze from an optimistic viewpoint, focusing on positive outcomes'
      },
      {
        type: 'pessimistic',
        prompt: 'Consider potential negative outcomes and worst-case scenarios'
      },
      {
        type: 'outsider',
        prompt: 'Analyze from an external or outsider perspective'
      }
    ];

    return alternatives;
  }

  /**
   * Build assumption analysis prompt
   */
  private buildAssumptionAnalysisPrompt(subject: string, thoughts: ThoughtStep[]): string {
    const thoughtsText = thoughts.map(t => t.content).join('\n\n');

    return `Analyze the assumptions made in the previous analysis.

**Subject:** ${subject}

**Analysis so far:**
${thoughtsText}

**Task:** Identify and evaluate the key assumptions underlying this analysis.

**Focus on:**
- Explicit and implicit assumptions
- Validity and strength of each assumption
- Potential risks if assumptions are wrong
- Evidence supporting or contradicting assumptions
- Alternative assumptions that could be considered

**Your assumption analysis:`;
  }

  /**
   * Synthesize comprehensive analysis
   */
  private async synthesizeAnalysis(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<{ analysis: string; confidence: number; recommendations: string[]; nextSteps: string[] }> {
    return await this.reasoningEngine.synthesizeAnalysis(
      input.subject,
      thoughtManager.getThoughts(),
      thoughtManager.getProcess().hypotheses,
      input.thinkingStyle ?? 'analytical',
      input.context
    );
  }

  /**
   * Extract key findings from analysis
   */
  private async extractKeyFindings(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<string[]> {
    try {
      const findings: string[] = [];
      const thoughts = thoughtManager.getThoughts();

      // Extract insights from high-confidence thoughts
      const highConfidenceThoughts = thoughts.filter(t => t.confidence > 0.7);
      for (const thought of highConfidenceThoughts) {
        if (thought.content.includes('finding:') || thought.content.includes('insight:')) {
          findings.push(thought.content);
        }
      }

      // Extract findings from different analysis categories
      const categories = ['definition', 'context', 'breakdown', 'stakeholders', 'constraints'];
      for (const category of categories) {
        const categoryThoughts = thoughts.filter(t => t.tags?.includes(category));
        if (categoryThoughts.length > 0) {
          const bestThought = categoryThoughts.sort((a, b) => b.confidence - a.confidence)[0];
          if (bestThought) {
            findings.push(`${category}: ${bestThought.content.substring(0, 200)}...`);
          }
        }
      }

      return findings.slice(0, 10); // Limit to top 10 findings
    } catch (error) {
      logger.warn('Failed to extract key findings:', error);
      return ['Analysis completed with multiple insights identified'];
    }
  }

  /**
   * Extract assumptions from thoughts
   */
  private async extractAssumptions(thoughts: ThoughtStep[]): Promise<string[]> {
    const assumptions: string[] = [];

    for (const thought of thoughts) {
      if (thought.tags?.includes('assumptions')) {
        // Extract assumption statements from the content
        const lines = thought.content.split('\n');
        for (const line of lines) {
          if (line.includes('assume') || line.includes('given that') || line.includes('if we consider')) {
            assumptions.push(line.trim());
          }
        }
      }
    }

    return assumptions.slice(0, 8); // Limit to most relevant assumptions
  }

  /**
   * Assess quality of evidence in analysis
   */
  private assessEvidenceQuality(thoughts: ThoughtStep[]): 'strong' | 'moderate' | 'weak' | 'insufficient' {
    const evidenceIndicators = {
      strong: ['data shows', 'research indicates', 'proven', 'demonstrated', 'evidence suggests'],
      moderate: ['likely', 'probably', 'indicates', 'suggests', 'appears'],
      weak: ['might', 'could', 'possibly', 'perhaps', 'speculation']
    };

    let strongCount = 0;
    let moderateCount = 0;
    let weakCount = 0;

    for (const thought of thoughts) {
      const content = thought.content.toLowerCase();

      for (const indicator of evidenceIndicators.strong) {
        if (content.includes(indicator)) strongCount++;
      }
      for (const indicator of evidenceIndicators.moderate) {
        if (content.includes(indicator)) moderateCount++;
      }
      for (const indicator of evidenceIndicators.weak) {
        if (content.includes(indicator)) weakCount++;
      }
    }

    const totalIndicators = strongCount + moderateCount + weakCount;
    if (totalIndicators === 0) return 'insufficient';

    const strongRatio = strongCount / totalIndicators;
    const moderateRatio = moderateCount / totalIndicators;

    if (strongRatio > 0.6) return 'strong';
    if (strongRatio + moderateRatio > 0.7) return 'moderate';
    return 'weak';
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<string[]> {
    const riskThoughts = thoughtManager.getThoughts().filter(t =>
      t.tags?.includes('risks') ||
      t.content.toLowerCase().includes('risk') ||
      t.content.toLowerCase().includes('threat') ||
      t.content.toLowerCase().includes('danger')
    );

    return riskThoughts
      .map(t => this.extractRiskStatements(t.content))
      .flat()
      .slice(0, 5);
  }

  /**
   * Identify opportunities
   */
  private async identifyOpportunities(
    thoughtManager: ThoughtManager,
    input: BrainAnalyzeInput
  ): Promise<string[]> {
    const opportunityThoughts = thoughtManager.getThoughts().filter(t =>
      t.tags?.includes('opportunities') ||
      t.content.toLowerCase().includes('opportunity') ||
      t.content.toLowerCase().includes('benefit') ||
      t.content.toLowerCase().includes('advantage')
    );

    return opportunityThoughts
      .map(t => this.extractOpportunityStatements(t.content))
      .flat()
      .slice(0, 5);
  }

  /**
   * Extract risk statements from content
   */
  private extractRiskStatements(content: string): string[] {
    const riskKeywords = ['risk of', 'threat of', 'danger of', 'potential for'];
    const statements: string[] = [];

    for (const keyword of riskKeywords) {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 150);
        statements.push(content.substring(start, end).trim());
      }
    }

    return statements;
  }

  /**
   * Extract opportunity statements from content
   */
  private extractOpportunityStatements(content: string): string[] {
    const opportunityKeywords = ['opportunity to', 'benefit of', 'advantage of', 'potential to'];
    const statements: string[] = [];

    for (const keyword of opportunityKeywords) {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 150);
        statements.push(content.substring(start, end).trim());
      }
    }

    return statements;
  }

  /**
   * Build analytical reasoning chain
   */
  private buildAnalyticalReasoning(process: any): string {
    const thoughts = process.thoughts;
    const categories = this.groupThoughtsByCategory(thoughts);

    let reasoning = 'Analytical Reasoning Process:\n\n';

    for (const [category, categoryThoughts] of Object.entries(categories)) {
      reasoning += `${category.toUpperCase()}:\n`;
      for (const thought of categoryThoughts as any[]) {
        reasoning += `• ${thought.content.substring(0, 200)}...\n`;
      }
      reasoning += '\n';
    }

    return reasoning;
  }

  /**
   * Group thoughts by category
   */
  private groupThoughtsByCategory(thoughts: ThoughtStep[]): Record<string, ThoughtStep[]> {
    const categories: Record<string, ThoughtStep[]> = {};

    for (const thought of thoughts) {
      const category = thought.tags?.[1] || 'general';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(thought);
    }

    return categories;
  }

  /**
   * Utility methods
   */
  private formatContext(context: any): string {
    // Implementation similar to ReasoningEngine.formatContext
    return context ? `**Context:** ${JSON.stringify(context)}\n` : '';
  }

  private formatPreviousThoughts(thoughts: ThoughtStep[]): string {
    if (thoughts.length === 0) return 'No previous analysis yet.';
    return thoughts.map(t => `${t.number}. ${t.content}`).join('\n\n');
  }

  private estimateStepConfidence(content: string, category: string): number {
    let confidence = 0.7; // Base confidence

    // Category-specific confidence adjustments
    if (category === 'definition' && content.length > 100) confidence += 0.1;
    if (category === 'breakdown' && content.includes('component')) confidence += 0.1;
    if (category === 'evidence' && content.includes('data')) confidence += 0.2;

    return Math.min(confidence, 0.95);
  }

  private cleanStepContent(content: string, stepName: string): string {
    return content
      .replace(new RegExp(`^Your ${stepName} analysis:?\\s*`, 'i'), '')
      .replace(/^\s*[\-•]\s*/, '')
      .trim();
  }

  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}