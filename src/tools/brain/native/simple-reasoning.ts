import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Simple reasoning patterns for common analytical tasks
 */
interface ReasoningPattern {
  name: string;
  description: string;
  steps: string[];
  template: string;
}

const REASONING_PATTERNS: Record<string, ReasoningPattern> = {
  "problem_solving": {
    name: "Problem Solving",
    description: "Systematic approach to solving problems",
    steps: [
      "1. Define the problem clearly",
      "2. Identify constraints and requirements",
      "3. Generate potential solutions",
      "4. Evaluate each solution",
      "5. Select and implement the best solution"
    ],
    template: `**Problem Analysis:**
{problem}

**Key Constraints:**
{constraints}

**Potential Solutions:**
{solutions}

**Recommended Approach:**
{recommendation}

**Implementation Steps:**
{steps}`
  },

  "root_cause": {
    name: "Root Cause Analysis",
    description: "Systematic investigation to find the underlying cause",
    steps: [
      "1. Describe the symptom/issue",
      "2. Gather relevant data and evidence",
      "3. Identify potential causes",
      "4. Test hypotheses systematically",
      "5. Identify the root cause"
    ],
    template: `**Issue Description:**
{problem}

**Observable Symptoms:**
{symptoms}

**Potential Causes:**
{causes}

**Root Cause:**
{root_cause}

**Corrective Actions:**
{actions}`
  },

  "pros_cons": {
    name: "Pros and Cons Analysis",
    description: "Balanced evaluation of advantages and disadvantages",
    steps: [
      "1. Clearly state the decision or option",
      "2. List all advantages (pros)",
      "3. List all disadvantages (cons)",
      "4. Weight the importance of each factor",
      "5. Make a recommendation"
    ],
    template: `**Decision/Option:**
{problem}

**Advantages (Pros):**
{pros}

**Disadvantages (Cons):**
{cons}

**Weighted Assessment:**
{assessment}

**Recommendation:**
{recommendation}`
  },

  "swot": {
    name: "SWOT Analysis",
    description: "Strengths, Weaknesses, Opportunities, Threats analysis",
    steps: [
      "1. Identify internal strengths",
      "2. Acknowledge internal weaknesses",
      "3. Recognize external opportunities",
      "4. Assess external threats",
      "5. Develop strategic recommendations"
    ],
    template: `**SWOT Analysis:**
{problem}

**Strengths:**
{strengths}

**Weaknesses:**
{weaknesses}

**Opportunities:**
{opportunities}

**Threats:**
{threats}

**Strategic Recommendations:**
{recommendations}`
  },

  "cause_effect": {
    name: "Cause and Effect Analysis",
    description: "Understanding relationships between causes and effects",
    steps: [
      "1. Identify the effect/outcome",
      "2. Brainstorm potential causes",
      "3. Categorize causes (people, process, environment, etc.)",
      "4. Analyze relationships",
      "5. Prioritize most significant causes"
    ],
    template: `**Effect/Outcome:**
{problem}

**Primary Causes:**
{primary_causes}

**Secondary Causes:**
{secondary_causes}

**Relationships:**
{relationships}

**Priority Actions:**
{actions}`
  }
};

class SimpleReasoningProcessor {
  /**
   * Process reasoning request using pattern-based analysis
   */
  processReasoning(problem: string, pattern: string, context?: string): string {
    const reasoningPattern = REASONING_PATTERNS[pattern];
    if (!reasoningPattern) {
      throw new Error(`Unknown reasoning pattern: ${pattern}. Available: ${Object.keys(REASONING_PATTERNS).join(', ')}`);
    }

    logger.info(`Processing ${pattern} reasoning for: ${problem.substring(0, 50)}...`);

    // Generate reasoning based on the selected pattern
    const analysis = this.generateAnalysis(problem, reasoningPattern, context);

    return this.formatResult(reasoningPattern, analysis, problem);
  }

  /**
   * Generate analysis using the reasoning pattern
   */
  private generateAnalysis(problem: string, pattern: ReasoningPattern, context?: string): any {
    const analysis: any = {};

    switch (pattern.name) {
      case "Problem Solving":
        analysis.constraints = this.extractConstraints(problem, context);
        analysis.solutions = this.generateSolutions(problem);
        analysis.recommendation = this.selectBestSolution(analysis.solutions);
        analysis.steps = this.createImplementationSteps(analysis.recommendation);
        break;

      case "Root Cause Analysis":
        analysis.symptoms = this.identifySymptoms(problem);
        analysis.causes = this.brainstormCauses(problem);
        analysis.root_cause = this.identifyRootCause(analysis.causes);
        analysis.actions = this.suggestCorrectiveActions(analysis.root_cause);
        break;

      case "Pros and Cons Analysis":
        analysis.pros = this.listPros(problem);
        analysis.cons = this.listCons(problem);
        analysis.assessment = this.weightFactors(analysis.pros, analysis.cons);
        analysis.recommendation = this.makeRecommendation(analysis.assessment);
        break;

      case "SWOT Analysis":
        analysis.strengths = this.identifyStrengths(problem, context);
        analysis.weaknesses = this.identifyWeaknesses(problem, context);
        analysis.opportunities = this.identifyOpportunities(problem, context);
        analysis.threats = this.identifyThreats(problem, context);
        analysis.recommendations = this.developStrategicRecommendations(analysis);
        break;

      case "Cause and Effect Analysis":
        analysis.primary_causes = this.identifyPrimaryCauses(problem);
        analysis.secondary_causes = this.identifySecondaryCauses(problem);
        analysis.relationships = this.analyzeRelationships(analysis.primary_causes, analysis.secondary_causes);
        analysis.actions = this.prioritizeActions(analysis.primary_causes);
        break;
    }

    return analysis;
  }

  /**
   * Format the final result
   */
  private formatResult(pattern: ReasoningPattern, analysis: any, problem: string): string {
    let template = pattern.template;

    // Replace template variables
    template = template.replace('{problem}', problem);

    Object.keys(analysis).forEach(key => {
      const value = Array.isArray(analysis[key])
        ? analysis[key].map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')
        : analysis[key];
      template = template.replace(`{${key}}`, value);
    });

    // Add pattern steps
    const stepsSection = `\n\n**Analysis Framework:**\n${pattern.steps.join('\n')}`;

    return `# ${pattern.name}\n\n${template}${stepsSection}`;
  }

  // Analysis helper methods (simplified versions)
  private extractConstraints(problem: string, context?: string): string[] {
    return [
      "Time constraints need consideration",
      "Resource limitations may apply",
      "Technical feasibility must be assessed"
    ];
  }

  private generateSolutions(problem: string): string[] {
    return [
      "Direct approach: Address the problem head-on",
      "Alternative approach: Find a workaround solution",
      "Systematic approach: Break down into smaller parts"
    ];
  }

  private selectBestSolution(solutions: string[]): string {
    return "Systematic approach recommended based on complexity and resource considerations";
  }

  private createImplementationSteps(recommendation: string): string[] {
    return [
      "Plan the implementation approach",
      "Gather necessary resources",
      "Execute in phases",
      "Monitor progress and adjust"
    ];
  }

  private identifySymptoms(problem: string): string[] {
    return [
      "Observable issues or behaviors",
      "Performance indicators",
      "User feedback or complaints"
    ];
  }

  private brainstormCauses(problem: string): string[] {
    return [
      "Process-related factors",
      "Environmental conditions",
      "Human factors",
      "Technical/system issues"
    ];
  }

  private identifyRootCause(causes: string[]): string {
    return "Most likely root cause based on symptom analysis and cause investigation";
  }

  private suggestCorrectiveActions(rootCause: string): string[] {
    return [
      "Address the identified root cause",
      "Implement preventive measures",
      "Monitor for recurrence"
    ];
  }

  private listPros(problem: string): string[] {
    return [
      "Potential benefits and advantages",
      "Positive outcomes and opportunities",
      "Value creation possibilities"
    ];
  }

  private listCons(problem: string): string[] {
    return [
      "Potential risks and disadvantages",
      "Negative consequences",
      "Cost and resource implications"
    ];
  }

  private weightFactors(pros: string[], cons: string[]): string {
    return "Balanced assessment considering the relative importance and impact of each factor";
  }

  private makeRecommendation(assessment: string): string {
    return "Recommended course of action based on the weighted pros and cons analysis";
  }

  private identifyStrengths(problem: string, context?: string): string[] {
    return [
      "Internal capabilities and advantages",
      "Existing resources and competencies",
      "Positive track record"
    ];
  }

  private identifyWeaknesses(problem: string, context?: string): string[] {
    return [
      "Internal limitations and challenges",
      "Resource constraints",
      "Areas needing improvement"
    ];
  }

  private identifyOpportunities(problem: string, context?: string): string[] {
    return [
      "External factors that could be leveraged",
      "Market trends and possibilities",
      "Potential partnerships or collaborations"
    ];
  }

  private identifyThreats(problem: string, context?: string): string[] {
    return [
      "External risks and challenges",
      "Competitive pressures",
      "Environmental or regulatory changes"
    ];
  }

  private developStrategicRecommendations(analysis: any): string[] {
    return [
      "Leverage strengths to capitalize on opportunities",
      "Address weaknesses to mitigate threats",
      "Develop contingency plans"
    ];
  }

  private identifyPrimaryCauses(problem: string): string[] {
    return [
      "Direct causal factors",
      "Immediate contributing elements",
      "Primary drivers"
    ];
  }

  private identifySecondaryCauses(problem: string): string[] {
    return [
      "Supporting or enabling factors",
      "Indirect influences",
      "Background conditions"
    ];
  }

  private analyzeRelationships(primary: string[], secondary: string[]): string {
    return "Analysis of how primary and secondary causes interact and influence each other";
  }

  private prioritizeActions(causes: string[]): string[] {
    return [
      "Address highest impact causes first",
      "Implement quick wins",
      "Plan long-term systematic changes"
    ];
  }
}

/**
 * Global processor instance
 */
const reasoningProcessor = new SimpleReasoningProcessor();

/**
 * Register simple reasoning tools
 */
export async function registerSimpleReasoningTools(server: McpServer, config: Config) {
  logger.info("Registering simple reasoning tools...");

  // Main reasoning tool
  server.registerTool(
    "brain_analyze_simple",
    {
      title: "Simple analytical reasoning",
      description: "Fast pattern-based analysis using proven frameworks",
      inputSchema: {
        problem: z.string().describe("The problem or situation to analyze"),
        pattern: z.enum(["problem_solving", "root_cause", "pros_cons", "swot", "cause_effect"]).describe("Analysis framework to use"),
        context: z.string().optional().describe("Additional context or background information")
      }
    },
    async (args) => {
      try {
        const problem = args.problem as string;
        const pattern = args.pattern as string;
        const context = args.context as string | undefined;

        const result = reasoningProcessor.processReasoning(problem, pattern, context);

        return {
          content: [{
            type: "text" as const,
            text: result
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Simple reasoning tool error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `❌ Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Pattern info tool
  server.registerTool(
    "brain_patterns_info",
    {
      title: "Get reasoning pattern information",
      description: "List available reasoning patterns and their descriptions",
      inputSchema: {
        pattern: z.string().optional().describe("Specific pattern to get info about (optional)")
      }
    },
    async (args) => {
      try {
        const specificPattern = args.pattern as string | undefined;

        if (specificPattern) {
          const pattern = REASONING_PATTERNS[specificPattern];
          if (!pattern) {
            throw new Error(`Pattern '${specificPattern}' not found`);
          }

          const info = `# ${pattern.name}\n\n` +
            `**Description:** ${pattern.description}\n\n` +
            `**Framework Steps:**\n${pattern.steps.join('\n')}\n\n` +
            `**Use Case:** ${getUseCase(specificPattern)}`;

          return {
            content: [{
              type: "text" as const,
              text: info
            }],
            isError: false
          };
        } else {
          // List all patterns
          const patternsList = Object.entries(REASONING_PATTERNS)
            .map(([key, pattern]) => `**${key}**: ${pattern.description}`)
            .join('\n');

          const info = `# Available Reasoning Patterns\n\n${patternsList}\n\n` +
            `Use the pattern name with brain_analyze_simple to apply the framework.`;

          return {
            content: [{
              type: "text" as const,
              text: info
            }],
            isError: false
          };
        }

      } catch (error) {
        const mcpError = handleError(error);
        return {
          content: [{
            type: "text" as const,
            text: `❌ Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Simple reasoning tools registered successfully");
}

/**
 * Get use case description for a pattern
 */
function getUseCase(pattern: string): string {
  const useCases: Record<string, string> = {
    "problem_solving": "Best for: Complex challenges requiring systematic solution development",
    "root_cause": "Best for: Investigating issues to find underlying causes",
    "pros_cons": "Best for: Decision making when evaluating options",
    "swot": "Best for: Strategic planning and competitive analysis",
    "cause_effect": "Best for: Understanding relationships between variables"
  };

  return useCases[pattern] || "General analytical reasoning";
}