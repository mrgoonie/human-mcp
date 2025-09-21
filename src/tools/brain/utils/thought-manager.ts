import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';
import type {
  ThoughtStep,
  ThoughtProcess,
  ThoughtBranch,
  Hypothesis,
  Conclusion,
  ThinkingStyle,
  ThinkingContext,
  ProcessingOptions,
  ThoughtMetadata
} from '../types.js';
import {
  InvalidRevisionError,
  BranchingError
} from '../types.js';

export class ThoughtManager {
  private process: ThoughtProcess;
  private options: ProcessingOptions;

  constructor(
    problem: string,
    thinkingStyle: ThinkingStyle = 'analytical',
    context?: ThinkingContext,
    options: ProcessingOptions = {}
  ) {
    this.options = {
      maxThoughts: 10,
      allowRevision: true,
      enableBranching: true,
      requireEvidence: false,
      confidenceThreshold: 0.7,
      timeLimit: 60,
      outputDetail: 'detailed',
      ...options
    };

    this.process = {
      id: uuidv4(),
      problem,
      thoughts: [],
      currentThought: 0,
      totalThoughts: this.options.maxThoughts || 10,
      branches: [],
      hypotheses: [],
      conclusions: [],
      metadata: {
        startTime: new Date(),
        thinkingStyle,
        complexity: this.determineComplexity(problem),
        domain: context?.domain,
        revisionsCount: 0,
        branchesCount: 0,
        hypothesesCount: 0
      }
    };

    logger.info(`Starting thought process for: ${problem.substring(0, 100)}...`);
  }

  /**
   * Add a new thought to the process
   */
  addThought(
    content: string,
    confidence: number = 0.8,
    options: {
      isRevision?: boolean;
      revisesThought?: number;
      branchId?: string;
      branchFromThought?: number;
      dependencies?: string[];
      tags?: string[];
    } = {}
  ): ThoughtStep {
    const thoughtStep: ThoughtStep = {
      id: uuidv4(),
      number: this.process.currentThought + 1,
      content,
      confidence: Math.min(Math.max(confidence, 0), 1), // Clamp between 0 and 1
      timestamp: new Date(),
      isRevision: options.isRevision || false,
      revisesThought: options.revisesThought,
      branchId: options.branchId,
      branchFromThought: options.branchFromThought,
      dependencies: options.dependencies,
      tags: options.tags
    };

    // Handle revisions
    if (options.isRevision && options.revisesThought) {
      if (!this.options.allowRevision) {
        throw new Error('Revision not allowed in current processing mode');
      }
      if (options.revisesThought > this.process.thoughts.length) {
        throw new InvalidRevisionError(options.revisesThought, this.process.thoughts.length);
      }
      this.process.metadata.revisionsCount++;
      thoughtStep.tags = [...(thoughtStep.tags || []), 'revision'];
    }

    // Handle branching
    if (options.branchId && options.branchFromThought) {
      if (!this.options.enableBranching) {
        throw new Error('Branching not allowed in current processing mode');
      }
      this.process.metadata.branchesCount++;
      thoughtStep.tags = [...(thoughtStep.tags || []), 'branch'];
    }

    this.process.thoughts.push(thoughtStep);
    this.process.currentThought = thoughtStep.number;

    logger.debug(`Added thought ${thoughtStep.number}: ${content.substring(0, 100)}...`);
    return thoughtStep;
  }

  /**
   * Create a new branch from a specific thought
   */
  createBranch(
    fromThought: number,
    name: string,
    initialThought?: string
  ): ThoughtBranch {
    if (!this.options.enableBranching) {
      throw new BranchingError('Branching is disabled');
    }

    if (fromThought < 1 || fromThought > this.process.thoughts.length) {
      throw new BranchingError(`Invalid thought number: ${fromThought}`);
    }

    const branch: ThoughtBranch = {
      id: uuidv4(),
      name,
      fromThought,
      thoughts: [],
      isActive: true,
      confidence: 0.5 // Initial confidence for new branch
    };

    // Add initial thought to branch if provided
    if (initialThought) {
      const branchThought = this.addThought(initialThought, 0.6, {
        branchId: branch.id,
        branchFromThought: fromThought,
        tags: ['branch_start']
      });
      branch.thoughts.push(branchThought);
    }

    this.process.branches.push(branch);
    logger.info(`Created branch "${name}" from thought ${fromThought}`);

    return branch;
  }

  /**
   * Add a hypothesis to test
   */
  addHypothesis(
    statement: string,
    evidence: string[] = [],
    counterEvidence: string[] = [],
    confidence: number = 0.5
  ): Hypothesis {
    const hypothesis: Hypothesis = {
      id: uuidv4(),
      statement,
      evidence,
      counterEvidence,
      confidence: Math.min(Math.max(confidence, 0), 1),
      tested: false,
      generatedAt: this.process.currentThought
    };

    this.process.hypotheses.push(hypothesis);
    this.process.metadata.hypothesesCount++;

    logger.debug(`Added hypothesis: ${statement}`);
    return hypothesis;
  }

  /**
   * Test a hypothesis and update its status
   */
  testHypothesis(
    hypothesisId: string,
    result: 'confirmed' | 'rejected' | 'inconclusive',
    additionalEvidence?: string[]
  ): Hypothesis {
    const hypothesis = this.process.hypotheses.find(h => h.id === hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    hypothesis.tested = true;
    hypothesis.result = result;

    if (additionalEvidence) {
      if (result === 'confirmed') {
        hypothesis.evidence.push(...additionalEvidence);
      } else if (result === 'rejected') {
        hypothesis.counterEvidence.push(...additionalEvidence);
      }
    }

    // Update confidence based on test result
    if (result === 'confirmed') {
      hypothesis.confidence = Math.min(hypothesis.confidence + 0.3, 1.0);
    } else if (result === 'rejected') {
      hypothesis.confidence = Math.max(hypothesis.confidence - 0.4, 0.0);
    }

    logger.info(`Tested hypothesis "${hypothesis.statement}": ${result}`);
    return hypothesis;
  }

  /**
   * Add a conclusion based on current thoughts
   */
  addConclusion(
    statement: string,
    supportingThoughts: number[],
    reasoning: string,
    confidence: number = 0.8,
    alternatives?: string[]
  ): Conclusion {
    const conclusion: Conclusion = {
      id: uuidv4(),
      statement,
      supportingThoughts,
      confidence: Math.min(Math.max(confidence, 0), 1),
      reasoning,
      alternatives
    };

    this.process.conclusions.push(conclusion);
    logger.info(`Added conclusion: ${statement}`);

    return conclusion;
  }

  /**
   * Get current thought process state
   */
  getProcess(): ThoughtProcess {
    return { ...this.process };
  }

  /**
   * Get thoughts filtered by criteria
   */
  getThoughts(filter?: {
    branchId?: string;
    tags?: string[];
    minConfidence?: number;
    isRevision?: boolean;
  }): ThoughtStep[] {
    let thoughts = [...this.process.thoughts];

    if (filter) {
      if (filter.branchId) {
        thoughts = thoughts.filter(t => t.branchId === filter.branchId);
      }
      if (filter.tags) {
        thoughts = thoughts.filter(t =>
          t.tags && filter.tags!.some(tag => t.tags!.includes(tag))
        );
      }
      if (filter.minConfidence !== undefined) {
        thoughts = thoughts.filter(t => t.confidence >= filter.minConfidence!);
      }
      if (filter.isRevision !== undefined) {
        thoughts = thoughts.filter(t => t.isRevision === filter.isRevision);
      }
    }

    return thoughts;
  }

  /**
   * Get active hypotheses that haven't been tested
   */
  getActiveHypotheses(): Hypothesis[] {
    return this.process.hypotheses.filter(h => !h.tested);
  }

  /**
   * Get tested hypotheses with their results
   */
  getTestedHypotheses(): Hypothesis[] {
    return this.process.hypotheses.filter(h => h.tested);
  }

  /**
   * Check if more thoughts are needed based on confidence and completeness
   */
  needsMoreThoughts(): boolean {
    const avgConfidence = this.getAverageConfidence();
    const hasConclusions = this.process.conclusions.length > 0;
    const underThoughtLimit = this.process.currentThought < (this.options.maxThoughts || 10);
    const underConfidenceThreshold = avgConfidence < (this.options.confidenceThreshold || 0.7);

    return underThoughtLimit && (underConfidenceThreshold || !hasConclusions);
  }

  /**
   * Finalize the thought process
   */
  finalize(): ThoughtProcess {
    this.process.metadata.endTime = new Date();
    this.process.metadata.totalDuration =
      this.process.metadata.endTime.getTime() - this.process.metadata.startTime.getTime();

    logger.info(`Finalized thought process with ${this.process.thoughts.length} thoughts`);
    return this.process;
  }

  /**
   * Calculate average confidence across all thoughts
   */
  private getAverageConfidence(): number {
    if (this.process.thoughts.length === 0) return 0;

    const totalConfidence = this.process.thoughts.reduce((sum, thought) => sum + thought.confidence, 0);
    return totalConfidence / this.process.thoughts.length;
  }

  /**
   * Determine problem complexity based on content analysis
   */
  private determineComplexity(problem: string): 'simple' | 'medium' | 'complex' | 'expert' {
    const length = problem.length;
    const technicalTerms = this.countTechnicalTerms(problem);
    const questionComplexity = this.analyzeQuestionComplexity(problem);

    if (length < 100 && technicalTerms < 2 && questionComplexity === 'simple') {
      return 'simple';
    } else if (length < 300 && technicalTerms < 5 && questionComplexity !== 'expert') {
      return 'medium';
    } else if (length < 800 && technicalTerms < 10) {
      return 'complex';
    } else {
      return 'expert';
    }
  }

  /**
   * Count technical terms in the problem statement
   */
  private countTechnicalTerms(text: string): number {
    const technicalPatterns = [
      /\b(algorithm|architecture|database|server|client|API|framework|library|protocol|interface|implementation|optimization|performance|scalability|security|authentication|authorization|encryption|deployment|infrastructure|microservice|container|docker|kubernetes|cloud|aws|azure|gcp)\b/gi,
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\w+\.(js|ts|py|java|cpp|c|go|rust|php|rb|cs)\b/g // File extensions
    ];

    return technicalPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Analyze question complexity based on structure and keywords
   */
  private analyzeQuestionComplexity(text: string): 'simple' | 'medium' | 'complex' | 'expert' {
    const complexKeywords = ['why', 'how', 'analyze', 'compare', 'evaluate', 'design', 'optimize', 'troubleshoot'];
    const expertKeywords = ['architect', 'strategy', 'paradigm', 'methodology', 'framework', 'ecosystem'];

    const hasComplexKeywords = complexKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );
    const hasExpertKeywords = expertKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );

    if (hasExpertKeywords) return 'expert';
    if (hasComplexKeywords) return 'complex';
    if (text.includes('?') || text.includes('explain')) return 'medium';
    return 'simple';
  }
}