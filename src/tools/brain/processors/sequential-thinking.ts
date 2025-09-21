import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import { ThoughtManager } from '../utils/thought-manager.js';
import { ReasoningEngine } from '../utils/reasoning-engine.js';
import type {
  BrainThinkInput,
  ReasoningResult,
  ThinkingStyle,
  ProcessingOptions,
  ThinkingContext
} from '../types.js';

export class SequentialThinkingProcessor {
  private geminiClient: GeminiClient;
  private reasoningEngine: ReasoningEngine;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.reasoningEngine = new ReasoningEngine(geminiClient);
  }

  /**
   * Process sequential thinking request
   */
  async process(input: BrainThinkInput): Promise<ReasoningResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting sequential thinking for: ${input.problem.substring(0, 100)}...`);

      // Initialize thought manager
      const thoughtManager = new ThoughtManager(
        input.problem,
        input.thinkingStyle || 'analytical',
        input.context,
        input.options
      );

      // Generate initial thoughts
      await this.generateInitialThoughts(thoughtManager, input);

      // Continue thinking until completion criteria are met
      await this.continueThinking(thoughtManager, input);

      // Generate hypotheses if enabled
      if (input.options?.requireEvidence) {
        await this.generateHypotheses(thoughtManager, input);
      }

      // Synthesize final analysis
      const synthesis = await this.synthesizeFinalAnalysis(thoughtManager, input);

      // Finalize the thought process
      const finalProcess = thoughtManager.finalize();

      const processingTime = Date.now() - startTime;

      return {
        thoughtProcess: finalProcess,
        finalAnswer: synthesis.analysis,
        confidence: synthesis.confidence,
        reasoning: this.buildReasoningChain(finalProcess),
        recommendations: synthesis.recommendations,
        nextSteps: synthesis.nextSteps,
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
      logger.error('Sequential thinking processing failed:', error);
      throw new APIError(`Sequential thinking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate initial thoughts based on the problem
   */
  private async generateInitialThoughts(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    logger.debug(`Generating ${input.initialThoughts} initial thoughts`);

    for (let i = 1; i <= (input.initialThoughts || 5); i++) {
      try {
        const thoughtResult = await this.reasoningEngine.generateThought(
          input.problem,
          thoughtManager.getThoughts(),
          input.thinkingStyle || 'analytical' || 'analytical',
          i,
          input.context
        );

        thoughtManager.addThought(
          thoughtResult.content,
          thoughtResult.confidence,
          {
            tags: ['initial']
          }
        );

        // Short pause between thoughts to avoid rate limiting
        await this.pause(100);
      } catch (error) {
        logger.warn(`Failed to generate initial thought ${i}:`, error);
        // Continue with other thoughts
      }
    }
  }

  /**
   * Continue thinking process until completion criteria are met
   */
  private async continueThinking(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    const maxThoughts = input.options?.maxThoughts || 10;
    const timeLimit = (input.options?.timeLimit || 60) * 1000; // Convert to milliseconds
    const startTime = Date.now();

    while (thoughtManager.needsMoreThoughts() &&
           thoughtManager.getProcess().thoughts.length < maxThoughts &&
           (Date.now() - startTime) < timeLimit) {

      try {
        const currentThoughts = thoughtManager.getThoughts();
        const nextThoughtNumber = currentThoughts.length + 1;

        // Determine if we should revise or create new thought
        const shouldRevise = this.shouldReviseThought(currentThoughts, input.options);

        if (shouldRevise && input.options?.allowRevision) {
          await this.performRevision(thoughtManager, input);
        } else {
          const thoughtResult = await this.reasoningEngine.generateThought(
            input.problem,
            currentThoughts,
            input.thinkingStyle || 'analytical' || 'analytical',
            nextThoughtNumber,
            input.context
          );

          thoughtManager.addThought(
            thoughtResult.content,
            thoughtResult.confidence,
            {
              tags: ['continuation']
            }
          );
        }

        // Pause between thoughts
        await this.pause(200);
      } catch (error) {
        logger.warn('Failed to continue thinking:', error);
        break; // Stop if we can't continue
      }
    }

    logger.info(`Completed thinking with ${thoughtManager.getProcess().thoughts.length} thoughts`);
  }

  /**
   * Determine if a thought should be revised
   */
  private shouldReviseThought(
    thoughts: any[],
    options?: ProcessingOptions
  ): boolean {
    if (!options?.allowRevision) return false;
    if (thoughts.length < 3) return false; // Need at least 3 thoughts to consider revision

    // Check for low confidence thoughts that could be improved
    const lowConfidenceThoughts = thoughts.filter(t => t.confidence < 0.6);
    const hasRecentRevision = thoughts.slice(-2).some(t => t.isRevision);

    return lowConfidenceThoughts.length > 0 && !hasRecentRevision;
  }

  /**
   * Perform a revision of a previous thought
   */
  private async performRevision(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    const thoughts = thoughtManager.getThoughts();

    // Find a thought to revise (lowest confidence that hasn't been revised recently)
    const candidatesForRevision = thoughts
      .filter(t => !t.isRevision && t.confidence < 0.7)
      .sort((a, b) => a.confidence - b.confidence);

    if (candidatesForRevision.length === 0) return;

    const toRevise = candidatesForRevision[0];

    try {
      // Generate revised thought
      const revisionPrompt = this.buildRevisionPrompt(toRevise, thoughts, input);
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(revisionPrompt);
      const content = response.response.text();

      if (content) {
        thoughtManager.addThought(
          content,
          Math.min((toRevise?.confidence ?? 0.5) + 0.2, 1.0), // Boost confidence for revision
          {
            isRevision: true,
            revisesThought: toRevise?.number,
            tags: ['revision']
          }
        );

        logger.debug(`Revised thought ${toRevise?.number}`);
      }
    } catch (error) {
      logger.warn(`Failed to revise thought ${toRevise?.number}:`, error);
    }
  }

  /**
   * Build a revision prompt for improving a previous thought
   */
  private buildRevisionPrompt(
    originalThought: any,
    allThoughts: any[],
    input: BrainThinkInput
  ): string {
    return `You are revising and improving a previous thought in a sequential thinking process.

**Original Problem:**
${input.problem}

**Original Thought #${originalThought?.number} (Confidence: ${originalThought?.confidence.toFixed(2)}):**
${originalThought?.content}

**Context from other thoughts:**
${allThoughts
  .filter(t => t.number !== originalThought?.number)
  .map(t => `${t.number}. ${t.content}`)
  .join('\n')}

**Task:**
Revise and improve the original thought. Make it more specific, accurate, and insightful.

**Focus on:**
- Adding more specific details or evidence
- Correcting any logical issues
- Connecting better with other thoughts
- Increasing clarity and actionability

**Revised thought:`;
  }

  /**
   * Generate hypotheses for testing
   */
  private async generateHypotheses(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<void> {
    try {
      const hypothesisResult = await this.reasoningEngine.generateHypothesis(
        input.problem,
        thoughtManager.getThoughts(),
        input.thinkingStyle || 'analytical'
      );

      const hypothesis = thoughtManager.addHypothesis(
        hypothesisResult.statement,
        hypothesisResult.evidence,
        [], // No counter-evidence initially
        hypothesisResult.confidence
      );

      // Test the hypothesis
      const testResult = await this.reasoningEngine.testHypothesis(
        hypothesis,
        thoughtManager.getThoughts()
      );

      thoughtManager.testHypothesis(
        hypothesis.id,
        testResult.result,
        testResult.evidence
      );

      logger.info(`Generated and tested hypothesis: ${testResult.result}`);
    } catch (error) {
      logger.warn('Failed to generate hypotheses:', error);
    }
  }

  /**
   * Synthesize final analysis
   */
  private async synthesizeFinalAnalysis(
    thoughtManager: ThoughtManager,
    input: BrainThinkInput
  ): Promise<{ analysis: string; confidence: number; recommendations: string[]; nextSteps: string[] }> {
    try {
      return await this.reasoningEngine.synthesizeAnalysis(
        input.problem,
        thoughtManager.getThoughts(),
        thoughtManager.getProcess().hypotheses,
        input.thinkingStyle || 'analytical',
        input.context
      );
    } catch (error) {
      logger.error('Failed to synthesize analysis:', error);

      // Fallback: create a basic synthesis
      const thoughts = thoughtManager.getThoughts();
      const avgConfidence = thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length;

      return {
        analysis: `Based on ${thoughts.length} thoughts, the analysis suggests multiple approaches to the problem. Key insights include the main themes identified through ${input.thinkingStyle} thinking.`,
        confidence: avgConfidence,
        recommendations: ['Review the thought process', 'Consider implementation'],
        nextSteps: ['Validate assumptions', 'Plan next phase']
      };
    }
  }

  /**
   * Build reasoning chain from thought process
   */
  private buildReasoningChain(process: any): string {
    const thoughts = process.thoughts;
    if (thoughts.length === 0) return 'No reasoning chain available.';

    const chain = thoughts
      .map((thought: any) => {
        const prefix = thought.isRevision ? '↻ ' : '→ ';
        const confidence = `[${(thought.confidence * 100).toFixed(0)}%]`;
        return `${prefix}${thought.content} ${confidence}`;
      })
      .join('\n\n');

    const summary = `\nReasoning Summary:\n- Total thoughts: ${thoughts.length}\n- Revisions: ${process.metadata.revisionsCount}\n- Average confidence: ${((thoughts.reduce((sum: number, t: any) => sum + t.confidence, 0) / thoughts.length) * 100).toFixed(0)}%`;

    return chain + summary;
  }

  /**
   * Utility function to pause execution
   */
  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}