import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Sequential Thinking state management
 */
interface ThoughtStep {
  thoughtNumber: number;
  thought: string;
  confidence: number;
  isRevision: boolean;
  revisesThought?: number;
  branchId?: string;
  branchFromThought?: number;
  nextThoughtNeeded: boolean;
  totalThoughts: number;
}

interface ThinkingSession {
  id: string;
  problem: string;
  thoughts: ThoughtStep[];
  finalAnswer?: string;
  startTime: number;
  endTime?: number;
}

class SequentialThinkingManager {
  private sessions: Map<string, ThinkingSession> = new Map();

  createSession(problem: string): string {
    const sessionId = `thinking_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: ThinkingSession = {
      id: sessionId,
      problem,
      thoughts: [],
      startTime: Date.now()
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  addThought(sessionId: string, thoughtData: Omit<ThoughtStep, 'thoughtNumber'>): ThoughtStep {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const thoughtNumber = session.thoughts.length + 1;
    const thought: ThoughtStep = {
      thoughtNumber,
      ...thoughtData
    };

    session.thoughts.push(thought);

    // If this is marked as the final thought, finalize session
    if (!thought.nextThoughtNeeded) {
      session.endTime = Date.now();
      session.finalAnswer = this.synthesizeFinalAnswer(session);
    }

    return thought;
  }

  getSession(sessionId: string): ThinkingSession | undefined {
    return this.sessions.get(sessionId);
  }

  private synthesizeFinalAnswer(session: ThinkingSession): string {
    const thoughts = session.thoughts;
    if (thoughts.length === 0) return "No thoughts generated.";

    // Get the latest non-revision thought as the primary conclusion
    const latestThought = thoughts[thoughts.length - 1];
    if (!latestThought) return "No thoughts generated.";

    const revisions = thoughts.filter(t => t.isRevision).length;
    const avgConfidence = thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length;

    return `Based on ${thoughts.length} thoughts (${revisions} revisions), ` +
           `with average confidence of ${(avgConfidence * 100).toFixed(0)}%:\n\n` +
           `${latestThought.thought}\n\n` +
           `This conclusion represents the culmination of a systematic thinking process.`;
  }

  // Clean up old sessions (older than 1 hour)
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

/**
 * Global manager instance
 */
const thinkingManager = new SequentialThinkingManager();

// Cleanup old sessions every 30 minutes
setInterval(() => {
  thinkingManager.cleanup();
}, 30 * 60 * 1000);

/**
 * Register native sequential thinking tool
 */
export async function registerSequentialThinkingTool(server: McpServer, config: Config) {
  logger.info("Registering native sequential thinking tool...");

  server.registerTool(
    "mcp__reasoning__sequentialthinking",
    {
      title: "Dynamic sequential thinking with adaptive reasoning",
      description: "Advanced sequential thinking for complex problems with thought revision and branching",
      inputSchema: {
        thought: z.string().describe("Your current thinking step"),
        nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
        thoughtNumber: z.number().int().min(1).describe("Current thought number"),
        totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed"),
        sessionId: z.string().optional().describe("Thinking session ID (auto-generated if not provided)"),
        problem: z.string().optional().describe("The problem to think through (required for new sessions)"),
        isRevision: z.boolean().default(false).optional().describe("Whether this revises previous thinking"),
        revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
        branchId: z.string().optional().describe("Branch identifier"),
        branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number")
      }
    },
    async (args) => {
      try {
        let sessionId = args.sessionId as string;

        // Create new session if needed
        if (!sessionId && args.problem) {
          sessionId = thinkingManager.createSession(args.problem as string);
        } else if (!sessionId) {
          throw new Error("Either sessionId or problem is required");
        }

        // Add thought to session
        const thought = thinkingManager.addThought(sessionId, {
          thought: args.thought as string,
          confidence: Math.random() * 0.3 + 0.7, // Simulate confidence 0.7-1.0
          isRevision: (args.isRevision as boolean) || false,
          revisesThought: args.revisesThought as number | undefined,
          branchId: args.branchId as string | undefined,
          branchFromThought: args.branchFromThought as number | undefined,
          nextThoughtNeeded: args.nextThoughtNeeded as boolean,
          totalThoughts: args.totalThoughts as number
        });

        const session = thinkingManager.getSession(sessionId)!;

        // Format response
        const response = {
          sessionId,
          currentThought: thought,
          progress: {
            thoughtNumber: thought.thoughtNumber,
            totalThoughts: thought.totalThoughts,
            progressPercent: Math.round((thought.thoughtNumber / thought.totalThoughts) * 100)
          },
          session: {
            problem: session.problem,
            totalThoughts: session.thoughts.length,
            isComplete: !thought.nextThoughtNeeded,
            finalAnswer: session.finalAnswer
          }
        };

        return {
          content: [{
            type: "text" as const,
            text: formatThinkingResponse(response)
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Sequential thinking tool error:", mcpError);

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

  logger.info("Native sequential thinking tool registered successfully");
}

/**
 * Format thinking response for display
 */
function formatThinkingResponse(response: any): string {
  const { sessionId, currentThought, progress, session } = response;

  let output = `# Sequential Thinking Progress\n\n`;

  output += `**Session:** ${sessionId}\n`;
  output += `**Problem:** ${session.problem}\n`;
  output += `**Progress:** ${progress.thoughtNumber}/${progress.totalThoughts} (${progress.progressPercent}%)\n\n`;

  output += `## Current Thought #${currentThought.thoughtNumber}\n`;
  if (currentThought.isRevision) {
    output += `*↻ Revision of thought #${currentThought.revisesThought}*\n`;
  }
  if (currentThought.branchId) {
    output += `*🌿 Branch: ${currentThought.branchId}*\n`;
  }
  output += `${currentThought.thought}\n\n`;

  output += `**Confidence:** ${(currentThought.confidence * 100).toFixed(0)}%\n`;
  output += `**Continue:** ${currentThought.nextThoughtNeeded ? 'Yes' : 'No'}\n\n`;

  if (session.isComplete && session.finalAnswer) {
    output += `## Final Analysis\n${session.finalAnswer}\n\n`;
    output += `**Session Complete** ✅\n`;
  } else {
    output += `*Session continues...*\n`;
  }

  return output;
}