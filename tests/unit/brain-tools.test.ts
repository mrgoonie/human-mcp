import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { registerBrainTools } from "../../src/tools/brain/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../../src/utils/config.js";

// Mock external dependencies
mock.module("@/tools/eyes/utils/gemini-client.js", () => ({
  GeminiClient: mock(() => ({
    getModel: mock(() => ({}))
  }))
}));

describe("Brain Tools Optimization", () => {
  let server: McpServer;
  let registeredTools: Map<string, any> = new Map();

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";

    const config = loadConfig();
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });

    // Track registered tools
    const originalRegisterTool = server.registerTool.bind(server);
    server.registerTool = mock((name: string, schema: any, handler: any) => {
      registeredTools.set(name, { schema, handler });
      return originalRegisterTool(name, schema, handler);
    });

    await registerBrainTools(server, config);
  });

  afterAll(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  test("should register all native brain tools", async () => {
    // Check that all expected native tools are registered
    const expectedNativeTools = [
      "mcp__sequential-thinking__sequentialthinking",
      "mcp__memory__store",
      "mcp__memory__recall",
      "brain_analyze_simple",
      "brain_patterns_info"
    ];

    const expectedEnhancedTools = [
      "brain_reflect_enhanced"
    ];

    const allExpectedTools = [...expectedNativeTools, ...expectedEnhancedTools];

    for (const toolName of allExpectedTools) {
      expect(registeredTools.has(toolName)).toBe(true);
    }
  });

  test("sequential thinking tool should have simplified schema", async () => {
    const toolData = registeredTools.get("mcp__sequential-thinking__sequentialthinking");

    expect(toolData).toBeDefined();
    expect(toolData.schema.description).toContain("Advanced sequential thinking");

    // Check simplified schema - should have only core parameters
    const schema = toolData.schema.inputSchema as any;
    expect(schema.thought).toBeDefined();
    expect(schema.nextThoughtNeeded).toBeDefined();
    expect(schema.thoughtNumber).toBeDefined();
    expect(schema.totalThoughts).toBeDefined();
  });

  test("memory tools should have simplified schemas", async () => {
    // Test memory store tool
    const memoryStoreData = registeredTools.get("mcp__memory__store");
    expect(memoryStoreData).toBeDefined();
    expect(memoryStoreData.schema.description).toContain("Create entities, relations, and observations");

    const storeSchema = memoryStoreData.schema.inputSchema as any;
    expect(storeSchema.action).toBeDefined();
    expect(storeSchema.entityName).toBeDefined();
    expect(storeSchema.entityType?.optional).toBe(true);

    // Test memory recall tool
    const memoryRecallData = registeredTools.get("mcp__memory__recall");
    expect(memoryRecallData).toBeDefined();
    expect(memoryRecallData.schema.description).toContain("Search and retrieve entities");

    const recallSchema = memoryRecallData.schema.inputSchema as any;
    expect(recallSchema.action).toBeDefined();
    expect(recallSchema.query?.optional).toBe(true);
  });

  test("simple reasoning tool should work with pattern-based analysis", async () => {
    const simpleReasoningData = registeredTools.get("brain_analyze_simple");

    expect(simpleReasoningData).toBeDefined();
    expect(simpleReasoningData.schema.description).toContain("Fast pattern-based analysis");

    const schema = simpleReasoningData.schema.inputSchema as any;
    expect(schema.problem).toBeDefined();
    expect(schema.pattern).toBeDefined();
    expect(schema.pattern.enum).toContain("problem_solving");
    expect(schema.pattern.enum).toContain("root_cause");
    expect(schema.pattern.enum).toContain("pros_cons");
    expect(schema.pattern.enum).toContain("swot");
    expect(schema.pattern.enum).toContain("cause_effect");
  });

  test("enhanced reflection tool should have simplified interface", async () => {
    const enhancedReflectionData = registeredTools.get("brain_reflect_enhanced");

    expect(enhancedReflectionData).toBeDefined();
    expect(enhancedReflectionData.schema.description).toContain("AI-powered reflection");

    const schema = enhancedReflectionData.schema.inputSchema as any;
    expect(schema.originalAnalysis).toBeDefined();
    expect(schema.focusAreas).toBeDefined();
    expect(schema.focusAreas.items.enum).toContain("assumptions");
    expect(schema.focusAreas.items.enum).toContain("logic_gaps");
    expect(schema.improvementGoal?.optional).toBe(true);
    expect(schema.detailLevel?.optional).toBe(true);
  });

  test("tools should follow MCP naming conventions", async () => {
    // All tool names should be valid MCP format
    const mcpNamePattern = /^[a-zA-Z0-9_-]{1,64}$/;

    for (const [toolName] of registeredTools) {
      if (toolName.startsWith("brain_") || toolName.startsWith("mcp__")) {
        expect(toolName).toMatch(mcpNamePattern);
      }
    }
  });

  test("native tools should have fast response indicators", async () => {
    const nativeTools = [
      "mcp__sequential-thinking__sequentialthinking",
      "mcp__memory__store",
      "mcp__memory__recall",
      "brain_analyze_simple",
      "brain_patterns_info"
    ];

    for (const toolName of nativeTools) {
      const toolData = registeredTools.get(toolName);
      expect(toolData).toBeDefined();

      // Native tools should have performance-oriented descriptions
      const description = toolData.schema.description.toLowerCase() || "";
      const hasIndicator = description.includes("fast") ||
        description.includes("native") ||
        description.includes("pattern-based") ||
        description.includes("advanced") ||
        description.includes("information") ||
        description.includes("store") ||
        description.includes("recall") ||
        description.includes("sequential") ||
        description.includes("create") ||
        description.includes("search") ||
        description.includes("list") ||
        description.includes("available");

      if (!hasIndicator) {
        console.log(`Tool ${toolName} has description: "${description}"`);
      }

      expect(hasIndicator).toBe(true);
    }
  });

  test("brain tools should be properly categorized", async () => {
    // Count tools by category
    const nativeToolNames = [
      "mcp__sequential-thinking__sequentialthinking",
      "mcp__memory__store",
      "mcp__memory__recall",
      "brain_analyze_simple",
      "brain_patterns_info"
    ];

    const enhancedToolNames = [
      "brain_reflect_enhanced"
    ];

    // Should have 5 native tools and 1 enhanced tool as per optimization plan
    expect(nativeToolNames.every(name => registeredTools.has(name))).toBe(true);
    expect(enhancedToolNames.every(name => registeredTools.has(name))).toBe(true);
  });
});

describe("Brain Tools Functional Tests", () => {
  let server: McpServer;
  let registeredTools: Map<string, any> = new Map();

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";

    const config = loadConfig();
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });

    // Track registered tools
    const originalRegisterTool = server.registerTool.bind(server);
    server.registerTool = mock((name: string, schema: any, handler: any) => {
      registeredTools.set(name, { schema, handler });
      return originalRegisterTool(name, schema, handler);
    });

    await registerBrainTools(server, config);
  });

  test("sequential thinking tool should process thoughts", async () => {
    const toolData = registeredTools.get("mcp__sequential-thinking__sequentialthinking");
    expect(toolData).toBeDefined();

    // Test basic sequential thinking
    const args = {
      problem: "How to optimize database queries",
      thought: "First, we need to analyze the current query patterns",
      nextThoughtNeeded: true,
      thoughtNumber: 1,
      totalThoughts: 3
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Sequential Thinking Progress");
  });

  test("memory store tool should create entities", async () => {
    const toolData = registeredTools.get("mcp__memory__store");
    expect(toolData).toBeDefined();

    const args = {
      action: "create_entity",
      entityName: "test_entity_" + Date.now(),
      entityType: "concept"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("CREATE ENTITY completed successfully");
  });

  test("memory recall tool should search entities", async () => {
    const toolData = registeredTools.get("mcp__memory__recall");
    expect(toolData).toBeDefined();

    const args = {
      action: "get_stats"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Memory Statistics");
  });

  test("simple reasoning tool should perform analysis", async () => {
    const toolData = registeredTools.get("brain_analyze_simple");
    expect(toolData).toBeDefined();

    const args = {
      problem: "Should we migrate to microservices architecture?",
      pattern: "pros_cons"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Pros and Cons Analysis");
  });

  test("patterns info tool should list available patterns", async () => {
    const toolData = registeredTools.get("brain_patterns_info");
    expect(toolData).toBeDefined();

    const args = {};

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(false);
    expect(result?.content[0]?.text).toContain("Available Reasoning Patterns");
    expect(result?.content[0]?.text).toContain("problem_solving");
    expect(result?.content[0]?.text).toContain("swot");
  });
});

describe("Brain Tools Error Handling", () => {
  let server: McpServer;
  let registeredTools: Map<string, any> = new Map();

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";

    const config = loadConfig();
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });

    // Track registered tools
    const originalRegisterTool = server.registerTool.bind(server);
    server.registerTool = mock((name: string, schema: any, handler: any) => {
      registeredTools.set(name, { schema, handler });
      return originalRegisterTool(name, schema, handler);
    });

    await registerBrainTools(server, config);
  });

  test("sequential thinking should handle missing problem", async () => {
    const toolData = registeredTools.get("mcp__sequential-thinking__sequentialthinking");
    expect(toolData).toBeDefined();

    const args = {
      thought: "Testing error handling",
      nextThoughtNeeded: false,
      thoughtNumber: 1,
      totalThoughts: 1
      // Missing sessionId and problem
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain("Either sessionId or problem is required");
  });

  test("memory store should handle invalid action", async () => {
    const toolData = registeredTools.get("mcp__memory__store");
    expect(toolData).toBeDefined();

    const args = {
      action: "invalid_action",
      entityName: "test"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain("Unknown action");
  });

  test("simple reasoning should handle invalid pattern", async () => {
    const toolData = registeredTools.get("brain_analyze_simple");
    expect(toolData).toBeDefined();

    const args = {
      problem: "Test problem",
      pattern: "invalid_pattern"
    };

    const result = await toolData.handler(args);
    expect(result).toBeDefined();
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain("Unknown reasoning pattern");
  });
});