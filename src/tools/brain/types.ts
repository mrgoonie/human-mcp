/**
 * Type definitions for Brain tools - Advanced reasoning and thinking capabilities
 */

export interface ThoughtStep {
  id: string;
  number: number;
  content: string;
  confidence: number;
  timestamp: Date;
  isRevision: boolean;
  revisesThought?: number;
  branchId?: string;
  branchFromThought?: number;
  dependencies?: string[];
  tags?: string[];
}

export interface ThoughtProcess {
  id: string;
  problem: string;
  thoughts: ThoughtStep[];
  currentThought: number;
  totalThoughts: number;
  branches: ThoughtBranch[];
  hypotheses: Hypothesis[];
  conclusions: Conclusion[];
  metadata: ThoughtMetadata;
}

export interface ThoughtBranch {
  id: string;
  name: string;
  fromThought: number;
  thoughts: ThoughtStep[];
  isActive: boolean;
  confidence: number;
}

export interface Hypothesis {
  id: string;
  statement: string;
  evidence: string[];
  counterEvidence: string[];
  confidence: number;
  tested: boolean;
  result?: 'confirmed' | 'rejected' | 'inconclusive';
  generatedAt: number; // thought number
}

export interface Conclusion {
  id: string;
  statement: string;
  supportingThoughts: number[];
  confidence: number;
  reasoning: string;
  alternatives?: string[];
}

export interface ThoughtMetadata {
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  thinkingStyle: ThinkingStyle;
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  domain?: string;
  revisionsCount: number;
  branchesCount: number;
  hypothesesCount: number;
}

export type ThinkingStyle =
  | 'analytical'      // Step-by-step logical analysis
  | 'systematic'      // Methodical and structured approach
  | 'creative'        // Innovative and exploratory thinking
  | 'scientific'      // Hypothesis-driven investigation
  | 'critical'        // Question assumptions and evaluate evidence
  | 'strategic'       // Long-term planning and high-level thinking
  | 'intuitive'       // Pattern recognition and experience-based
  | 'collaborative';  // Multiple perspective consideration

export type ReflectionFocus =
  | 'assumptions'           // Question underlying assumptions
  | 'logic_gaps'           // Identify holes in reasoning
  | 'alternative_approaches' // Consider different methods
  | 'evidence_quality'     // Evaluate strength of evidence
  | 'bias_detection'       // Identify potential biases
  | 'consistency_check'    // Ensure logical consistency
  | 'completeness'         // Check for missing considerations
  | 'feasibility';         // Assess practical viability

export interface ProcessingOptions {
  maxThoughts?: number;
  allowRevision?: boolean;
  enableBranching?: boolean;
  requireEvidence?: boolean;
  confidenceThreshold?: number;
  timeLimit?: number; // in seconds
  outputDetail?: 'summary' | 'detailed' | 'complete';
}

export interface ThinkingContext {
  domain?: string;
  background?: string;
  constraints?: string[];
  requirements?: string[];
  stakeholders?: string[];
  timeframe?: string;
  resources?: string[];
}

export interface ReasoningResult {
  thoughtProcess: ThoughtProcess;
  finalAnswer: string;
  confidence: number;
  reasoning: string;
  alternatives?: string[];
  recommendations?: string[];
  nextSteps?: string[];
  processingInfo: {
    totalThoughts: number;
    processingTime: number;
    revisionsUsed: number;
    branchesExplored: number;
    hypothesesTested: number;
    finalConfidence: number;
  };
}

export interface AnalysisResult extends ReasoningResult {
  keyFindings: string[];
  assumptions: string[];
  evidenceQuality: 'strong' | 'moderate' | 'weak' | 'insufficient';
  riskFactors?: string[];
  opportunities?: string[];
}

export interface SolutionResult extends ReasoningResult {
  proposedSolution: string;
  implementationSteps: string[];
  potentialObstacles: string[];
  successCriteria: string[];
  testPlan?: string[];
  fallbackOptions?: string[];
}

export interface ReflectionResult {
  originalAnalysis: string;
  revisedAnalysis?: string;
  identifiedIssues: Array<{
    type: ReflectionFocus;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  improvements: string[];
  confidence: number;
  recommendedActions: string[];
}

// Input interfaces for Brain tools
export interface BrainThinkInput {
  problem: string;
  initialThoughts?: number;
  thinkingStyle?: ThinkingStyle;
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

export interface BrainAnalyzeInput {
  subject: string;
  analysisDepth?: 'surface' | 'detailed' | 'comprehensive';
  focusAreas?: string[];
  thinkingStyle?: ThinkingStyle;
  considerAlternatives?: boolean;
  trackAssumptions?: boolean;
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

export interface BrainSolveInput {
  problemStatement: string;
  solutionApproach?: 'systematic' | 'creative' | 'scientific' | 'iterative';
  constraints?: string[];
  requirements?: string[];
  verifyHypotheses?: boolean;
  maxIterations?: number;
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

export interface BrainReflectInput {
  originalAnalysis: string;
  reflectionFocus: ReflectionFocus[];
  improvementGoals?: string[];
  newInformation?: string;
  alternativeViewpoints?: string[];
  context?: ThinkingContext;
  options?: ProcessingOptions;
}

// Error types specific to Brain tools
export class ThinkingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'ThinkingError';
  }
}

export class InsufficientThoughtsError extends ThinkingError {
  constructor(currentThoughts: number, requiredThoughts: number) {
    super(
      `Insufficient thoughts for analysis: ${currentThoughts}/${requiredThoughts}`,
      'INSUFFICIENT_THOUGHTS',
      { currentThoughts, requiredThoughts }
    );
  }
}

export class InvalidRevisionError extends ThinkingError {
  constructor(thoughtNumber: number, maxThoughts: number) {
    super(
      `Cannot revise thought ${thoughtNumber}: out of range (max: ${maxThoughts})`,
      'INVALID_REVISION',
      { thoughtNumber, maxThoughts }
    );
  }
}

export class BranchingError extends ThinkingError {
  constructor(reason: string) {
    super(`Branching failed: ${reason}`, 'BRANCHING_ERROR', { reason });
  }
}