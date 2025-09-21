import { z } from 'zod';
import type {
  ThinkingStyle,
  ReflectionFocus,
  ProcessingOptions,
  ThinkingContext
} from './types.js';

// Base schemas
const ThinkingStyleSchema = z.enum([
  'analytical',
  'systematic',
  'creative',
  'scientific',
  'critical',
  'strategic',
  'intuitive',
  'collaborative'
]);

const ReflectionFocusSchema = z.enum([
  'assumptions',
  'logic_gaps',
  'alternative_approaches',
  'evidence_quality',
  'bias_detection',
  'consistency_check',
  'completeness',
  'feasibility'
]);

const ProcessingOptionsSchema = z.object({
  maxThoughts: z.number().min(1).max(50).default(10),
  allowRevision: z.boolean().default(true),
  enableBranching: z.boolean().default(true),
  requireEvidence: z.boolean().default(false),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  timeLimit: z.number().min(5).max(300).default(60), // 5 seconds to 5 minutes
  outputDetail: z.enum(['summary', 'detailed', 'complete']).default('detailed')
}).optional();

const ThinkingContextSchema = z.object({
  domain: z.string().optional(),
  background: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  stakeholders: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  resources: z.array(z.string()).optional()
}).optional();

// Tool-specific input schemas
export const BrainThinkInputSchema = z.object({
  problem: z.string().min(10).max(2000).describe('The problem or question to think through'),
  initialThoughts: z.number().min(1).max(20).default(5).describe('Number of initial thoughts to generate'),
  thinkingStyle: ThinkingStyleSchema.default('analytical').describe('Approach to use for thinking'),
  context: ThinkingContextSchema.describe('Additional context for the problem'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

export const BrainAnalyzeInputSchema = z.object({
  subject: z.string().min(10).max(2000).describe('The subject or topic to analyze deeply'),
  analysisDepth: z.enum(['surface', 'detailed', 'comprehensive']).default('detailed').describe('Depth of analysis'),
  focusAreas: z.array(z.string()).optional().describe('Specific areas to focus analysis on'),
  thinkingStyle: ThinkingStyleSchema.default('analytical').describe('Analytical approach to use'),
  considerAlternatives: z.boolean().default(true).describe('Whether to explore alternative perspectives'),
  trackAssumptions: z.boolean().default(true).describe('Whether to explicitly track assumptions'),
  context: ThinkingContextSchema.describe('Context for the analysis'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

export const BrainSolveInputSchema = z.object({
  problemStatement: z.string().min(10).max(2000).describe('Clear statement of the problem to solve'),
  solutionApproach: z.enum(['systematic', 'creative', 'scientific', 'iterative']).default('systematic').describe('Approach to problem solving'),
  constraints: z.array(z.string()).optional().describe('Constraints that limit possible solutions'),
  requirements: z.array(z.string()).optional().describe('Requirements the solution must meet'),
  verifyHypotheses: z.boolean().default(true).describe('Whether to test hypotheses scientifically'),
  maxIterations: z.number().min(1).max(20).default(10).describe('Maximum solution iterations to attempt'),
  context: ThinkingContextSchema.describe('Context for the problem'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

export const BrainReflectInputSchema = z.object({
  originalAnalysis: z.string().min(50).max(5000).describe('The original analysis or reasoning to reflect on'),
  reflectionFocus: z.array(ReflectionFocusSchema).min(1).describe('Aspects to focus reflection on'),
  improvementGoals: z.array(z.string()).optional().describe('Specific goals for improvement'),
  newInformation: z.string().optional().describe('Any new information to consider'),
  alternativeViewpoints: z.array(z.string()).optional().describe('Alternative perspectives to consider'),
  context: ThinkingContextSchema.describe('Context for the reflection'),
  options: ProcessingOptionsSchema.describe('Processing options and constraints')
});

// Output schemas for validation
export const ThoughtStepSchema = z.object({
  id: z.string(),
  number: z.number(),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
  isRevision: z.boolean(),
  revisesThought: z.number().optional(),
  branchId: z.string().optional(),
  branchFromThought: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export const HypothesisSchema = z.object({
  id: z.string(),
  statement: z.string(),
  evidence: z.array(z.string()),
  counterEvidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  tested: z.boolean(),
  result: z.enum(['confirmed', 'rejected', 'inconclusive']).optional(),
  generatedAt: z.number()
});

export const ReasoningResultSchema = z.object({
  thoughtProcess: z.object({
    id: z.string(),
    problem: z.string(),
    thoughts: z.array(ThoughtStepSchema),
    currentThought: z.number(),
    totalThoughts: z.number(),
    branches: z.array(z.any()), // Simplified for now
    hypotheses: z.array(HypothesisSchema),
    conclusions: z.array(z.any()), // Simplified for now
    metadata: z.object({
      startTime: z.date(),
      endTime: z.date().optional(),
      totalDuration: z.number().optional(),
      thinkingStyle: ThinkingStyleSchema,
      complexity: z.enum(['simple', 'medium', 'complex', 'expert']),
      domain: z.string().optional(),
      revisionsCount: z.number(),
      branchesCount: z.number(),
      hypothesesCount: z.number()
    })
  }),
  finalAnswer: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alternatives: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  processingInfo: z.object({
    totalThoughts: z.number(),
    processingTime: z.number(),
    revisionsUsed: z.number(),
    branchesExplored: z.number(),
    hypothesesTested: z.number(),
    finalConfidence: z.number()
  })
});

// Type exports for use in implementations
export type BrainThinkInput = z.infer<typeof BrainThinkInputSchema>;
export type BrainAnalyzeInput = z.infer<typeof BrainAnalyzeInputSchema>;
export type BrainSolveInput = z.infer<typeof BrainSolveInputSchema>;
export type BrainReflectInput = z.infer<typeof BrainReflectInputSchema>;
export type ReasoningResult = z.infer<typeof ReasoningResultSchema>;

// Validation helpers
export const validateBrainThinkInput = (input: unknown): BrainThinkInput => {
  return BrainThinkInputSchema.parse(input);
};

export const validateBrainAnalyzeInput = (input: unknown): BrainAnalyzeInput => {
  return BrainAnalyzeInputSchema.parse(input);
};

export const validateBrainSolveInput = (input: unknown): BrainSolveInput => {
  return BrainSolveInputSchema.parse(input);
};

export const validateBrainReflectInput = (input: unknown): BrainReflectInput => {
  return BrainReflectInputSchema.parse(input);
};

export const validateReasoningResult = (result: unknown): ReasoningResult => {
  return ReasoningResultSchema.parse(result);
};