import { GeminiClient } from '@/tools/eyes/utils/gemini-client.js';
import { logger } from '@/utils/logger.js';
import { APIError } from '@/utils/errors.js';
import { ThoughtManager } from '../utils/thought-manager.js';
import { ReasoningEngine } from '../utils/reasoning-engine.js';
import type {
  BrainSolveInput,
  SolutionResult,
  Hypothesis
} from '../types.js';

export class ProblemSolverProcessor {
  private geminiClient: GeminiClient;
  private reasoningEngine: ReasoningEngine;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.reasoningEngine = new ReasoningEngine(geminiClient);
  }

  async process(input: BrainSolveInput): Promise<SolutionResult> {
    const startTime = Date.now();

    try {
      logger.info(`Starting problem solving for: ${input.problemStatement.substring(0, 100)}...`);

      const thoughtManager = new ThoughtManager(
        input.problemStatement,
        this.mapSolutionApproachToThinkingStyle(input.solutionApproach ?? 'systematic'),
        input.context,
        {
          ...input.options,
          requireEvidence: input.verifyHypotheses
        }
      );

      // Define the problem clearly
      await this.defineProblem(thoughtManager, input);

      // Generate potential solutions
      await this.generateSolutions(thoughtManager, input);

      // Test hypotheses if requested
      if (input.verifyHypotheses) {
        await this.testSolutionHypotheses(thoughtManager, input);
      }

      // Evaluate and select best solution
      const solution = await this.evaluateAndSelectSolution(thoughtManager, input);

      // Generate implementation plan
      const implementationPlan = await this.generateImplementationPlan(thoughtManager, input, solution);

      const finalProcess = thoughtManager.finalize();
      const processingTime = Date.now() - startTime;

      return {
        thoughtProcess: finalProcess,
        finalAnswer: solution.statement,
        confidence: solution.confidence,
        reasoning: this.buildSolutionReasoning(finalProcess),
        recommendations: solution.recommendations,
        nextSteps: implementationPlan.steps,
        proposedSolution: solution.statement,
        implementationSteps: implementationPlan.steps,
        potentialObstacles: implementationPlan.obstacles,
        successCriteria: implementationPlan.successCriteria,
        testPlan: implementationPlan.testPlan,
        fallbackOptions: solution.alternatives,
        processingInfo: {
          totalThoughts: finalProcess.thoughts.length,
          processingTime,
          revisionsUsed: finalProcess.metadata.revisionsCount,
          branchesExplored: finalProcess.metadata.branchesCount,
          hypothesesTested: finalProcess.hypotheses.filter(h => h.tested).length,
          finalConfidence: solution.confidence
        }
      };
    } catch (error) {
      logger.error('Problem solving processing failed:', error);
      throw new APIError(`Problem solving failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async defineProblem(thoughtManager: ThoughtManager, input: BrainSolveInput): Promise<void> {
    const definitionPrompt = this.buildProblemDefinitionPrompt(input);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(definitionPrompt);
      const content = response.response.text();

      if (content) {
        thoughtManager.addThought(content, 0.9, {
          tags: ['problem_definition', 'foundation']
        });
      }
    } catch (error) {
      logger.warn('Failed to define problem:', error);
    }
  }

  private async generateSolutions(thoughtManager: ThoughtManager, input: BrainSolveInput): Promise<void> {
    const maxIterations = Math.min(input.maxIterations ?? 5, 10);

    for (let i = 1; i <= maxIterations; i++) {
      try {
        const solutionPrompt = this.buildSolutionGenerationPrompt(
          input,
          thoughtManager.getThoughts(),
          i
        );

        const model = this.geminiClient.getModel('detailed');
        const response = await model.generateContent(solutionPrompt);
        const content = response.response.text();

        if (content) {
          const confidence = this.estimateSolutionConfidence(content, i, maxIterations);
          thoughtManager.addThought(content, confidence, {
            tags: ['solution_candidate', `iteration_${i}`]
          });

          // Generate hypothesis for this solution if verification is enabled
          if (input.verifyHypotheses) {
            await this.generateSolutionHypothesis(thoughtManager, content, i);
          }
        }

        await this.pause(200);
      } catch (error) {
        logger.warn(`Failed to generate solution iteration ${i}:`, error);
      }
    }
  }

  private async generateSolutionHypothesis(
    thoughtManager: ThoughtManager,
    solutionContent: string,
    iteration: number
  ): Promise<void> {
    try {
      const hypothesis = thoughtManager.addHypothesis(
        `Solution ${iteration} will effectively address the problem`,
        [solutionContent],
        [],
        0.6
      );

      // Test the hypothesis
      const testResult = await this.reasoningEngine.testHypothesis(
        hypothesis,
        thoughtManager.getThoughts()
      );

      thoughtManager.testHypothesis(hypothesis.id, testResult.result, testResult.evidence);
    } catch (error) {
      logger.warn(`Failed to generate hypothesis for solution ${iteration}:`, error);
    }
  }

  private async testSolutionHypotheses(thoughtManager: ThoughtManager, input: BrainSolveInput): Promise<void> {
    const untested = thoughtManager.getActiveHypotheses();

    for (const hypothesis of untested) {
      try {
        const testResult = await this.reasoningEngine.testHypothesis(
          hypothesis,
          thoughtManager.getThoughts(),
          `Testing solution viability against constraints: ${input.constraints?.join(', ')}`
        );

        thoughtManager.testHypothesis(hypothesis.id, testResult.result, testResult.evidence);
        await this.pause(150);
      } catch (error) {
        logger.warn(`Failed to test hypothesis ${hypothesis.id}:`, error);
      }
    }
  }

  private async evaluateAndSelectSolution(
    thoughtManager: ThoughtManager,
    input: BrainSolveInput
  ): Promise<{
    statement: string;
    confidence: number;
    recommendations: string[];
    alternatives: string[];
  }> {
    const evaluationPrompt = this.buildSolutionEvaluationPrompt(input, thoughtManager);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(evaluationPrompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('No solution evaluation generated');
      }

      const evaluation = this.parseSolutionEvaluation(content);

      thoughtManager.addThought(
        `Selected solution: ${evaluation.statement}`,
        evaluation.confidence,
        { tags: ['final_solution', 'decision'] }
      );

      return evaluation;
    } catch (error) {
      logger.error('Failed to evaluate solutions:', error);

      // Fallback: select highest confidence solution
      const solutions = thoughtManager.getThoughts().filter(t => t.tags?.includes('solution_candidate'));
      const bestSolution = solutions.sort((a, b) => b.confidence - a.confidence)[0];

      return {
        statement: bestSolution?.content || 'Unable to determine optimal solution',
        confidence: bestSolution?.confidence || 0.5,
        recommendations: ['Review solution candidates', 'Consider additional approaches'],
        alternatives: solutions.slice(1, 4).map(s => s.content)
      };
    }
  }

  private async generateImplementationPlan(
    thoughtManager: ThoughtManager,
    input: BrainSolveInput,
    solution: { statement: string; confidence: number }
  ): Promise<{
    steps: string[];
    obstacles: string[];
    successCriteria: string[];
    testPlan: string[];
  }> {
    const implementationPrompt = this.buildImplementationPrompt(input, solution);

    try {
      const model = this.geminiClient.getModel('detailed');
      const response = await model.generateContent(implementationPrompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('No implementation plan generated');
      }

      return this.parseImplementationPlan(content);
    } catch (error) {
      logger.error('Failed to generate implementation plan:', error);

      return {
        steps: ['Plan implementation details', 'Execute solution', 'Monitor results'],
        obstacles: ['Resource constraints', 'Technical challenges'],
        successCriteria: ['Problem is resolved', 'Requirements are met'],
        testPlan: ['Validate solution', 'Monitor outcomes']
      };
    }
  }

  private buildProblemDefinitionPrompt(input: BrainSolveInput): string {
    const constraintsText = input.constraints?.length
      ? `\n**Constraints:** ${input.constraints.join(', ')}`
      : '';
    const requirementsText = input.requirements?.length
      ? `\n**Requirements:** ${input.requirements.join(', ')}`
      : '';

    return `You are defining a problem for systematic solution development.

**Problem Statement:**
${input.problemStatement}
${constraintsText}
${requirementsText}

**Context:**
${input.context ? JSON.stringify(input.context) : 'No additional context provided'}

**Task:**
Provide a clear, comprehensive problem definition that includes:
1. Core problem description
2. Scope and boundaries
3. Key stakeholders affected
4. Success criteria
5. Critical factors to consider

**Your problem definition:`;
  }

  private buildSolutionGenerationPrompt(
    input: BrainSolveInput,
    previousThoughts: any[],
    iteration: number
  ): string {
    const previousSolutions = previousThoughts
      .filter(t => t.tags?.includes('solution_candidate'))
      .map(t => `- ${t.content}`)
      .join('\n');

    const approach = this.getSolutionApproachInstructions(input.solutionApproach ?? 'systematic');

    return `Generate solution candidate #${iteration} for the problem.

**Problem:**
${input.problemStatement}

**Approach:** ${input.solutionApproach ?? 'systematic'}
${approach}

**Constraints:** ${input.constraints?.join(', ') || 'None specified'}
**Requirements:** ${input.requirements?.join(', ') || 'None specified'}

**Previous solution candidates:**
${previousSolutions || 'None yet'}

**Task:**
Generate a ${iteration === 1 ? 'comprehensive' : 'alternative'} solution that:
- Addresses the core problem
- Respects all constraints
- Meets specified requirements
- ${iteration > 1 ? 'Differs meaningfully from previous candidates' : 'Provides a solid foundation'}
- Is practical and implementable

**Solution candidate #${iteration}:`;
  }

  private buildSolutionEvaluationPrompt(input: BrainSolveInput, thoughtManager: ThoughtManager): string {
    const solutions = thoughtManager.getThoughts().filter(t => t.tags?.includes('solution_candidate'));
    const hypotheses = thoughtManager.getTestedHypotheses();

    const solutionsText = solutions.map((s, i) =>
      `**Solution ${i + 1}** (Confidence: ${s.confidence.toFixed(2)}):\n${s.content}`
    ).join('\n\n');

    const hypothesesText = hypotheses.map(h =>
      `- ${h.statement}: ${h.result?.toUpperCase()} (${h.confidence.toFixed(2)})`
    ).join('\n');

    return `Evaluate all solution candidates and select the best one.

**Problem:**
${input.problemStatement}

**Solution Candidates:**
${solutionsText}

**Hypothesis Test Results:**
${hypothesesText || 'No hypotheses tested'}

**Evaluation Criteria:**
- Effectiveness in solving the problem
- Feasibility and practicality
- Resource requirements
- Risk level
- Alignment with requirements and constraints

**Task:**
Select the best solution and provide:

SELECTED_SOLUTION: [Your chosen solution statement]
CONFIDENCE: [0.00-1.00]
REASONING: [Why this solution is best]
RECOMMENDATIONS: [Implementation recommendations, one per line]
ALTERNATIVES: [Alternative solutions to consider, one per line]

**Your evaluation:`;
  }

  private buildImplementationPrompt(
    input: BrainSolveInput,
    solution: { statement: string; confidence: number }
  ): string {
    return `Create a detailed implementation plan for the selected solution.

**Problem:**
${input.problemStatement}

**Selected Solution:**
${solution.statement}

**Constraints:** ${input.constraints?.join(', ') || 'None specified'}
**Requirements:** ${input.requirements?.join(', ') || 'None specified'}

**Task:**
Create a comprehensive implementation plan with:

IMPLEMENTATION_STEPS: [Specific actionable steps, one per line]
POTENTIAL_OBSTACLES: [Challenges that might arise, one per line]
SUCCESS_CRITERIA: [How to measure success, one per line]
TEST_PLAN: [How to validate the solution works, one per line]

**Your implementation plan:`;
  }

  private mapSolutionApproachToThinkingStyle(approach: string): any {
    const mapping = {
      systematic: 'systematic',
      creative: 'creative',
      scientific: 'scientific',
      iterative: 'analytical'
    };
    return mapping[approach as keyof typeof mapping] || 'analytical';
  }

  private getSolutionApproachInstructions(approach: string): string {
    const instructions = {
      systematic: 'Use structured, methodical problem-solving. Break down into components and address systematically.',
      creative: 'Think outside the box. Consider unconventional approaches and innovative solutions.',
      scientific: 'Use hypothesis-driven approach. Test assumptions and validate solutions with evidence.',
      iterative: 'Build solutions incrementally. Start simple and refine through iterations.'
    };
    return instructions[approach as keyof typeof instructions] || instructions.systematic;
  }

  private estimateSolutionConfidence(content: string, iteration: number, maxIterations: number): number {
    let confidence = 0.6; // Base confidence

    // Early iterations might be less refined
    if (iteration === 1) confidence += 0.1;

    // Later iterations benefit from previous learning
    if (iteration > maxIterations / 2) confidence += 0.1;

    // Content quality indicators
    if (content.includes('step') || content.includes('phase')) confidence += 0.1;
    if (content.includes('test') || content.includes('validate')) confidence += 0.1;
    if (content.length > 300) confidence += 0.05;

    return Math.min(confidence, 0.9);
  }

  private parseSolutionEvaluation(content: string): {
    statement: string;
    confidence: number;
    recommendations: string[];
    alternatives: string[];
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    let statement = '';
    let confidence = 0.7;
    const recommendations: string[] = [];
    const alternatives: string[] = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('SELECTED_SOLUTION:')) {
        statement = line.replace('SELECTED_SOLUTION:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        const confMatch = line.match(/(\d*\.?\d+)/);
        if (confMatch && confMatch[1]) {
          confidence = Math.min(Math.max(parseFloat(confMatch[1]), 0), 1);
        }
      } else if (line.startsWith('RECOMMENDATIONS:')) {
        currentSection = 'recommendations';
      } else if (line.startsWith('ALTERNATIVES:')) {
        currentSection = 'alternatives';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '');
        if (currentSection === 'recommendations') {
          recommendations.push(item);
        } else if (currentSection === 'alternatives') {
          alternatives.push(item);
        }
      }
    }

    return {
      statement: statement || 'Solution selected based on evaluation',
      confidence,
      recommendations,
      alternatives
    };
  }

  private parseImplementationPlan(content: string): {
    steps: string[];
    obstacles: string[];
    successCriteria: string[];
    testPlan: string[];
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    const steps: string[] = [];
    const obstacles: string[] = [];
    const successCriteria: string[] = [];
    const testPlan: string[] = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('IMPLEMENTATION_STEPS:')) {
        currentSection = 'steps';
      } else if (line.startsWith('POTENTIAL_OBSTACLES:')) {
        currentSection = 'obstacles';
      } else if (line.startsWith('SUCCESS_CRITERIA:')) {
        currentSection = 'criteria';
      } else if (line.startsWith('TEST_PLAN:')) {
        currentSection = 'test';
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '');
        switch (currentSection) {
          case 'steps': steps.push(item); break;
          case 'obstacles': obstacles.push(item); break;
          case 'criteria': successCriteria.push(item); break;
          case 'test': testPlan.push(item); break;
        }
      }
    }

    return { steps, obstacles, successCriteria, testPlan };
  }

  private buildSolutionReasoning(process: any): string {
    const solutions = process.thoughts.filter((t: any) => t.tags?.includes('solution_candidate'));
    const hypotheses = process.hypotheses;

    let reasoning = 'Problem-Solving Process:\n\n';

    reasoning += `SOLUTION CANDIDATES (${solutions.length}):\n`;
    solutions.forEach((sol: any, i: number) => {
      reasoning += `${i + 1}. ${sol.content.substring(0, 150)}... [${(sol.confidence * 100).toFixed(0)}%]\n`;
    });

    if (hypotheses.length > 0) {
      reasoning += `\nHYPOTHESIS TESTING:\n`;
      hypotheses.forEach((hyp: any) => {
        const status = hyp.tested ? hyp.result?.toUpperCase() : 'NOT_TESTED';
        reasoning += `• ${hyp.statement} → ${status}\n`;
      });
    }

    return reasoning;
  }

  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}