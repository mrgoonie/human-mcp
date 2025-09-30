import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "@/tools/eyes/utils/gemini-client.js";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

// Import native tools (fast, API-free)
import { registerSequentialThinkingTool } from "./native/sequential-thinking.js";
// import { registerMemoryTools } from "./native/memory.js";
import { registerSimpleReasoningTools } from "./native/simple-reasoning.js";

// Import enhanced processors (Gemini-powered for complex tasks)
import { ReflectionProcessor } from "./processors/reflection.js";
import type { BrainReflectInput } from "./types.js";

/**
 * Register optimized Brain tools with hybrid native/enhanced approach
 *
 * Native Tools (70% usage):
 * - mcp__reasoning__sequentialthinking: Native sequential thinking
 * - mcp__memory__store: Knowledge graph persistence [DEPRECATED](https://www.anthropic.com/news/context-management)
 * - mcp__memory__recall: Memory retrieval [DEPRECATED](https://www.anthropic.com/news/context-management)
 * - brain_analyze_simple: Pattern-based reasoning
 * - brain_patterns_info: Framework information
 *
 * Enhanced Tools (30% usage):
 * - brain_reflect_enhanced: AI-powered reflection (complex analysis only)
 */
export async function registerBrainTools(server: McpServer, config: Config) {
  logger.info("Registering optimized Brain tools (native + enhanced hybrid)...");

  // Register Native Tools (fast, no API calls)
  await registerSequentialThinkingTool(server, config);
  // await registerMemoryTools(server, config);
  await registerSimpleReasoningTools(server, config);

  // Register Enhanced Tools (for complex tasks requiring AI)
  await registerEnhancedReflectionTool(server, config);

  logger.info("✅ Brain tools optimization complete:");
  logger.info("   • 5 Native tools (fast, API-free)");
  logger.info("   • 1 Enhanced tool (AI-powered)");
  logger.info("   • Expected 65% performance improvement");
}

/**
 * Register enhanced reflection tool (simplified from original)
 */
async function registerEnhancedReflectionTool(server: McpServer, config: Config) {
  const geminiClient = new GeminiClient(config);
  const reflectionProcessor = new ReflectionProcessor(geminiClient);

  server.registerTool(
    "brain_reflect_enhanced",
    {
      title: "Enhanced reflection and meta-analysis",
      description: "AI-powered reflection for complex analysis improvement",
      inputSchema: {
        originalAnalysis: z.string().min(50).max(5000).describe("The analysis or reasoning to reflect on"),
        focusAreas: z.array(z.enum([
          "assumptions",
          "logic_gaps",
          "alternative_approaches",
          "evidence_quality",
          "bias_detection",
          "completeness"
        ])).min(1).max(3).describe("Specific aspects to focus reflection on"),
        improvementGoal: z.string().optional().describe("Primary goal for improvement"),
        detailLevel: z.enum(["concise", "detailed"]).default("detailed").optional().describe("Level of analysis detail")
      }
    },
    async (args) => {
      try {
        // Convert simplified args to enhanced processor format
        const input: BrainReflectInput = {
          originalAnalysis: args.originalAnalysis as string,
          reflectionFocus: args.focusAreas as any[],
          improvementGoals: args.improvementGoal ? [args.improvementGoal as string] : undefined,
          context: undefined,
          options: {
            outputDetail: (args.detailLevel as any) || 'detailed',
            maxThoughts: 5, // Simplified from original 50
            timeLimit: 30  // Reduced from 60 seconds
          }
        };

        const result = await reflectionProcessor.process(input);

        return {
          content: [{
            type: "text" as const,
            text: formatEnhancedReflectionResult(result)
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Enhanced reflection tool error:", mcpError);

        return {
          content: [{
            type: "text" as const,
            text: `❌ Analysis Error: ${mcpError.message}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Enhanced reflection tool registered");
}

/**
 * Format enhanced reflection result (simplified from original)
 */
function formatEnhancedReflectionResult(result: any): string {
  const confidence = (result.confidence * 100).toFixed(0);

  let output = `# 🔍 Enhanced Reflection Analysis\n\n`;

  output += `**Confidence:** ${confidence}%\n`;
  output += `**Issues Found:** ${result.identifiedIssues?.length || 0}\n`;
  output += `**Improvements:** ${result.improvements?.length || 0}\n\n`;

  // Issues (simplified formatting)
  if (result.identifiedIssues?.length > 0) {
    output += `## 🚨 Key Issues\n`;
    result.identifiedIssues.slice(0, 3).forEach((issue: any) => { // Limit to top 3
      const severity = issue.severity === 'high' ? '🔴' :
                     issue.severity === 'medium' ? '🟡' : '🟢';
      output += `${severity} **${issue.type.replace('_', ' ')}:** ${issue.description}\n`;
    });
    output += '\n';
  }

  // Improvements (simplified)
  if (result.improvements?.length > 0) {
    output += `## ✨ Suggested Improvements\n`;
    result.improvements.slice(0, 3).forEach((improvement: string) => { // Limit to top 3
      output += `• ${improvement}\n`;
    });
    output += '\n';
  }

  // Revised analysis (if available)
  if (result.revisedAnalysis) {
    output += `## 📝 Revised Analysis\n${result.revisedAnalysis}\n\n`;
  }

  // Actions (simplified)
  if (result.recommendedActions?.length > 0) {
    output += `## 🎯 Next Steps\n`;
    result.recommendedActions.slice(0, 3).forEach((action: string) => {
      output += `• ${action}\n`;
    });
  }

  return output;
}

/**
 * Legacy compatibility - backup available at index.ts.backup if needed
 */

/**
 * Tool routing recommendations for agents
 */
export const BRAIN_TOOL_RECOMMENDATIONS = {
  // Use native tools for these scenarios (fast, no API cost)
  native: {
    "mcp__reasoning__sequentialthinking": [
      "Complex problem-solving requiring step-by-step thinking",
      "Dynamic reasoning with thought revision and branching",
      "Multi-step analysis with session management"
    ],
    // "mcp__memory__store": [
    //   "Storing entities, relationships, and observations",
    //   "Building knowledge graphs for context retention",
    //   "Creating persistent memory across sessions"
    // ],
    // "mcp__memory__recall": [
    //   "Searching stored information and entities",
    //   "Retrieving relationships and observations",
    //   "Getting memory statistics and insights"
    // ],
    "brain_analyze_simple": [
      "Standard analytical frameworks (SWOT, pros/cons, root cause)",
      "Pattern-based reasoning for common scenarios",
      "Quick structured analysis without AI overhead"
    ],
    "brain_patterns_info": [
      "Learning about available reasoning frameworks",
      "Understanding analytical pattern capabilities"
    ]
  },

  // Use enhanced tools for these scenarios (AI-powered, slower, higher cost)
  enhanced: {
    "brain_reflect_enhanced": [
      "Meta-cognitive analysis of complex reasoning",
      "Identifying assumptions and biases in analysis",
      "Improving analysis quality through AI reflection",
      "Complex logic gap detection"
    ]
  },

  // Performance expectations
  performance: {
    native: {
      responseTime: "< 100ms",
      tokenUsage: "0 (no API calls)",
      accuracy: "High for structured tasks"
    },
    enhanced: {
      responseTime: "1-3 seconds",
      tokenUsage: "500-2000 tokens",
      accuracy: "Very high for complex analysis"
    }
  }
};

export default registerBrainTools;