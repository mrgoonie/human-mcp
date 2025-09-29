import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "@/tools/eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

// Import processors
import { SequentialThinkingProcessor } from "./processors/sequential-thinking.js";
import { AnalyticalReasoningProcessor } from "./processors/analytical-reasoning.js";
import { ProblemSolverProcessor } from "./processors/problem-solver.js";
import { ReflectionProcessor } from "./processors/reflection.js";

// Import types
import type {
  BrainThinkInput,
  BrainAnalyzeInput,
  BrainSolveInput,
  BrainReflectInput
} from "./types.js";

/**
 * Register all Brain tools with the MCP server
 */
export async function registerBrainTools(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);

  // Initialize processors
  const sequentialThinkingProcessor = new SequentialThinkingProcessor(geminiClient);
  const analyticalReasoningProcessor = new AnalyticalReasoningProcessor(geminiClient);
  const problemSolverProcessor = new ProblemSolverProcessor(geminiClient);
  const reflectionProcessor = new ReflectionProcessor(geminiClient);

  logger.info("Registering Brain tools for advanced reasoning capabilities...");

  // Register brain_think tool
  server.registerTool(
    "brain_think",
    {
      title: "Sequential Thinking Tool",
      description: "Advanced sequential thinking with dynamic problem-solving and thought revision",
      inputSchema: {
        problem: z.string().min(10).max(2000).describe("The problem or question to think through step by step"),
        initialThoughts: z.number().min(1).max(20).default(5).optional().describe("Number of initial thoughts to generate"),
        thinkingStyle: z.enum(["analytical", "systematic", "creative", "scientific", "critical", "strategic", "intuitive", "collaborative"]).default("analytical").optional().describe("Approach to use for thinking"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Additional context for the problem"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          problem: args.problem,
          initialThoughts: args.initialThoughts || 5,
          thinkingStyle: args.thinkingStyle || 'analytical',
          context: args.context,
          options: args.options
        };
        const result = await sequentialThinkingProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatThinkingResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_think error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register brain_analyze tool
  server.registerTool(
    "brain_analyze",
    {
      title: "Deep Analytical Reasoning Tool",
      description: "Comprehensive analysis with branching exploration and assumption tracking",
      inputSchema: {
        subject: z.string().min(10).max(2000).describe("The subject or topic to analyze deeply"),
        analysisDepth: z.enum(["surface", "detailed", "comprehensive"]).default("detailed").optional().describe("Depth of analysis to perform"),
        focusAreas: z.array(z.string()).optional().describe("Specific areas to focus analysis on"),
        thinkingStyle: z.enum(["analytical", "systematic", "creative", "scientific", "critical", "strategic", "intuitive", "collaborative"]).default("analytical").optional().describe("Analytical approach to use"),
        considerAlternatives: z.boolean().default(true).optional().describe("Whether to explore alternative perspectives"),
        trackAssumptions: z.boolean().default(true).optional().describe("Whether to explicitly track assumptions"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Context for the analysis"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          subject: args.subject,
          analysisDepth: args.analysisDepth || 'detailed',
          focusAreas: args.focusAreas,
          thinkingStyle: args.thinkingStyle || 'analytical',
          considerAlternatives: args.considerAlternatives !== false,
          trackAssumptions: args.trackAssumptions !== false,
          context: args.context,
          options: args.options
        };
        const result = await analyticalReasoningProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatAnalysisResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_analyze error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register brain_solve tool
  server.registerTool(
    "brain_solve",
    {
      title: "Problem Solving Tool",
      description: "Multi-step problem solving with hypothesis testing and solution evaluation",
      inputSchema: {
        problemStatement: z.string().min(10).max(2000).describe("Clear statement of the problem to solve"),
        solutionApproach: z.enum(["systematic", "creative", "scientific", "iterative"]).default("systematic").optional().describe("Approach to problem solving"),
        constraints: z.array(z.string()).optional().describe("Constraints that limit possible solutions"),
        requirements: z.array(z.string()).optional().describe("Requirements the solution must meet"),
        verifyHypotheses: z.boolean().default(true).optional().describe("Whether to test hypotheses scientifically"),
        maxIterations: z.number().min(1).max(20).default(10).optional().describe("Maximum solution iterations to attempt"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Context for the problem"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          problemStatement: args.problemStatement,
          solutionApproach: args.solutionApproach || 'systematic',
          constraints: args.constraints,
          requirements: args.requirements,
          verifyHypotheses: args.verifyHypotheses !== false,
          maxIterations: args.maxIterations || 10,
          context: args.context,
          options: args.options
        };
        const result = await problemSolverProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatSolutionResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_solve error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Register brain_reflect tool
  server.registerTool(
    "brain_reflect",
    {
      title: "Thought Reflection Tool",
      description: "Reflect on and improve previous analysis through meta-cognitive examination",
      inputSchema: {
        originalAnalysis: z.string().min(50).max(5000).describe("The original analysis or reasoning to reflect on"),
        reflectionFocus: z.array(z.enum(["assumptions", "logic_gaps", "alternative_approaches", "evidence_quality", "bias_detection", "consistency_check", "completeness", "feasibility"])).min(1).describe("Aspects to focus reflection on"),
        improvementGoals: z.array(z.string()).optional().describe("Specific goals for improvement"),
        newInformation: z.string().optional().describe("Any new information to consider"),
        alternativeViewpoints: z.array(z.string()).optional().describe("Alternative perspectives to consider"),
        context: z.object({
          domain: z.string().optional(),
          background: z.string().optional(),
          constraints: z.array(z.string()).optional(),
          requirements: z.array(z.string()).optional(),
          stakeholders: z.array(z.string()).optional(),
          timeframe: z.string().optional(),
          resources: z.array(z.string()).optional()
        }).optional().describe("Context for the reflection"),
        options: z.object({
          maxThoughts: z.number().min(1).max(50).default(10).optional(),
          allowRevision: z.boolean().default(true).optional(),
          enableBranching: z.boolean().default(true).optional(),
          requireEvidence: z.boolean().default(false).optional(),
          confidenceThreshold: z.number().min(0).max(1).default(0.7).optional(),
          timeLimit: z.number().min(5).max(300).default(60).optional(),
          outputDetail: z.enum(["summary", "detailed", "complete"]).default("detailed").optional()
        }).optional().describe("Processing options and constraints")
      }
    },
    async (args) => {
      try {
        const input = {
          originalAnalysis: args.originalAnalysis,
          reflectionFocus: args.reflectionFocus,
          improvementGoals: args.improvementGoals,
          newInformation: args.newInformation,
          alternativeViewpoints: args.alternativeViewpoints,
          context: args.context,
          options: args.options
        };
        const result = await reflectionProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatReflectionResult(result)
          }],
          isError: false
        };
      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Tool brain_reflect error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Successfully registered 4 Brain tools: brain_think, brain_analyze, brain_solve, brain_reflect");
}

/**
 * Format thinking result for display
 */
function formatThinkingResult(result: any): string {
  const header = `# Sequential Thinking Results\n\n`;

  const summary = `## Summary\n` +
    `**Problem:** ${result.thoughtProcess.problem}\n` +
    `**Final Answer:** ${result.finalAnswer}\n` +
    `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Thoughts Generated:** ${result.processingInfo.totalThoughts}\n` +
    `**Processing Time:** ${(result.processingInfo.processingTime / 1000).toFixed(1)}s\n\n`;

  const thoughts = `## Thought Process\n` +
    result.thoughtProcess.thoughts.map((thought: any, index: number) => {
      const revisionMark = thought.isRevision ? ' ↻' : '';
      const branchMark = thought.branchId ? ' 🌿' : '';
      return `**${index + 1}.** ${thought.content} [${(thought.confidence * 100).toFixed(0)}%]${revisionMark}${branchMark}`;
    }).join('\n\n') + '\n\n';

  const recommendations = result.recommendations?.length > 0 ?
    `## Recommendations\n${result.recommendations.map((rec: string) => `• ${rec}`).join('\n')}\n\n` : '';

  const nextSteps = result.nextSteps?.length > 0 ?
    `## Next Steps\n${result.nextSteps.map((step: string) => `• ${step}`).join('\n')}\n\n` : '';

  return header + summary + thoughts + recommendations + nextSteps;
}

/**
 * Format analysis result for display
 */
function formatAnalysisResult(result: any): string {
  const header = `# Deep Analysis Results\n\n`;

  const summary = `## Analysis Summary\n` +
    `**Subject:** ${result.thoughtProcess.problem}\n` +
    `**Final Conclusion:** ${result.finalAnswer}\n` +
    `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Evidence Quality:** ${result.evidenceQuality.toUpperCase()}\n\n`;

  const keyFindings = result.keyFindings?.length > 0 ?
    `## Key Findings\n${result.keyFindings.map((finding: string) => `• ${finding}`).join('\n')}\n\n` : '';

  const assumptions = result.assumptions?.length > 0 ?
    `## Key Assumptions\n${result.assumptions.map((assumption: string) => `• ${assumption}`).join('\n')}\n\n` : '';

  const risks = result.riskFactors?.length > 0 ?
    `## Risk Factors\n${result.riskFactors.map((risk: string) => `⚠️ ${risk}`).join('\n')}\n\n` : '';

  const opportunities = result.opportunities?.length > 0 ?
    `## Opportunities\n${result.opportunities.map((opp: string) => `✨ ${opp}`).join('\n')}\n\n` : '';

  return header + summary + keyFindings + assumptions + risks + opportunities;
}

/**
 * Format solution result for display
 */
function formatSolutionResult(result: any): string {
  const header = `# Problem Solving Results\n\n`;

  const summary = `## Solution Summary\n` +
    `**Problem:** ${result.thoughtProcess.problem}\n` +
    `**Proposed Solution:** ${result.proposedSolution}\n` +
    `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Hypotheses Tested:** ${result.processingInfo.hypothesesTested}\n\n`;

  const implementation = result.implementationSteps?.length > 0 ?
    `## Implementation Steps\n${result.implementationSteps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}\n\n` : '';

  const obstacles = result.potentialObstacles?.length > 0 ?
    `## Potential Obstacles\n${result.potentialObstacles.map((obs: string) => `⚠️ ${obs}`).join('\n')}\n\n` : '';

  const success = result.successCriteria?.length > 0 ?
    `## Success Criteria\n${result.successCriteria.map((crit: string) => `✅ ${crit}`).join('\n')}\n\n` : '';

  const fallbacks = result.fallbackOptions?.length > 0 ?
    `## Fallback Options\n${result.fallbackOptions.map((option: string) => `• ${option}`).join('\n')}\n\n` : '';

  return header + summary + implementation + obstacles + success + fallbacks;
}

/**
 * Format reflection result for display
 */
function formatReflectionResult(result: any): string {
  const header = `# Reflection Analysis Results\n\n`;

  const summary = `## Reflection Summary\n` +
    `**Confidence in Analysis:** ${(result.confidence * 100).toFixed(1)}%\n` +
    `**Issues Identified:** ${result.identifiedIssues.length}\n` +
    `**Improvements Suggested:** ${result.improvements.length}\n\n`;

  const issues = result.identifiedIssues?.length > 0 ?
    `## Identified Issues\n` +
    result.identifiedIssues.map((issue: any) => {
      const severity = issue.severity.toUpperCase();
      const icon = severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢';
      return `${icon} **${issue.type.replace('_', ' ').toUpperCase()}:** ${issue.description}\n   *Suggestion:* ${issue.suggestion}`;
    }).join('\n\n') + '\n\n' : '';

  const improvements = result.improvements?.length > 0 ?
    `## Suggested Improvements\n${result.improvements.map((imp: string) => `• ${imp}`).join('\n')}\n\n` : '';

  const revised = result.revisedAnalysis ?
    `## Revised Analysis\n${result.revisedAnalysis}\n\n` : '';

  const actions = result.recommendedActions?.length > 0 ?
    `## Recommended Actions\n${result.recommendedActions.map((action: string) => `• ${action}`).join('\n')}\n\n` : '';

  return header + summary + issues + improvements + revised + actions;
}