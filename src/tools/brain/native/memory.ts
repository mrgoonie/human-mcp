import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { logger } from "@/utils/logger.js";
import { handleError } from "@/utils/errors.js";
import type { Config } from "@/utils/config.js";

/**
 * Memory structures following the MCP Memory server pattern
 */
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  createdAt: number;
  updatedAt: number;
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
  createdAt: number;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
  metadata: {
    version: string;
    createdAt: number;
    updatedAt: number;
    totalEntities: number;
    totalRelations: number;
  };
}

class MemoryManager {
  private memoryPath: string;
  private graph: KnowledgeGraph;

  constructor(memoryPath?: string) {
    this.memoryPath = memoryPath || join(process.cwd(), 'data', 'memory.json');
    this.graph = {
      entities: [],
      relations: [],
      metadata: {
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalEntities: 0,
        totalRelations: 0
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dir = dirname(this.memoryPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Load existing memory if available
      if (existsSync(this.memoryPath)) {
        await this.loadMemory();
      } else {
        await this.saveMemory();
      }
    } catch (error) {
      logger.warn("Failed to initialize memory:", error);
      // Continue with empty memory
    }
  }

  private async loadMemory(): Promise<void> {
    try {
      const data = await readFile(this.memoryPath, 'utf-8');
      this.graph = JSON.parse(data);

      // Ensure metadata exists (backward compatibility)
      if (!this.graph.metadata) {
        this.graph.metadata = {
          version: "1.0.0",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalEntities: this.graph.entities.length,
          totalRelations: this.graph.relations.length
        };
      }
    } catch (error) {
      logger.error("Failed to load memory:", error);
      throw new Error("Memory file corrupted or unreadable");
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      this.graph.metadata.updatedAt = Date.now();
      this.graph.metadata.totalEntities = this.graph.entities.length;
      this.graph.metadata.totalRelations = this.graph.relations.length;

      await writeFile(this.memoryPath, JSON.stringify(this.graph, null, 2));
    } catch (error) {
      logger.error("Failed to save memory:", error);
      throw new Error("Unable to persist memory");
    }
  }

  async createEntity(name: string, entityType: string, observations: string[] = []): Promise<Entity> {
    // Check if entity already exists
    const existing = this.graph.entities.find(e => e.name === name);
    if (existing) {
      throw new Error(`Entity '${name}' already exists`);
    }

    const entity: Entity = {
      name,
      entityType,
      observations,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.graph.entities.push(entity);
    await this.saveMemory();

    return entity;
  }

  async addObservation(entityName: string, observation: string): Promise<Entity> {
    const entity = this.graph.entities.find(e => e.name === entityName);
    if (!entity) {
      throw new Error(`Entity '${entityName}' not found`);
    }

    entity.observations.push(observation);
    entity.updatedAt = Date.now();
    await this.saveMemory();

    return entity;
  }

  async createRelation(from: string, to: string, relationType: string): Promise<Relation> {
    // Verify entities exist
    const fromEntity = this.graph.entities.find(e => e.name === from);
    const toEntity = this.graph.entities.find(e => e.name === to);

    if (!fromEntity) {
      throw new Error(`Source entity '${from}' not found`);
    }
    if (!toEntity) {
      throw new Error(`Target entity '${to}' not found`);
    }

    // Check if relation already exists
    const existing = this.graph.relations.find(r =>
      r.from === from && r.to === to && r.relationType === relationType
    );
    if (existing) {
      throw new Error(`Relation '${from}' -> '${to}' (${relationType}) already exists`);
    }

    const relation: Relation = {
      from,
      to,
      relationType,
      createdAt: Date.now()
    };

    this.graph.relations.push(relation);
    await this.saveMemory();

    return relation;
  }

  async searchEntities(query: string, limit: number = 10): Promise<Entity[]> {
    const lowerQuery = query.toLowerCase();

    return this.graph.entities
      .filter(entity =>
        entity.name.toLowerCase().includes(lowerQuery) ||
        entity.entityType.toLowerCase().includes(lowerQuery) ||
        entity.observations.some(obs => obs.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }

  async getEntity(name: string): Promise<Entity | null> {
    return this.graph.entities.find(e => e.name === name) || null;
  }

  async getRelatedEntities(entityName: string): Promise<{incoming: Relation[], outgoing: Relation[]}> {
    const incoming = this.graph.relations.filter(r => r.to === entityName);
    const outgoing = this.graph.relations.filter(r => r.from === entityName);

    return { incoming, outgoing };
  }

  getStats(): { entities: number; relations: number; types: string[] } {
    const types = [...new Set(this.graph.entities.map(e => e.entityType))];
    return {
      entities: this.graph.entities.length,
      relations: this.graph.relations.length,
      types
    };
  }
}

/**
 * Global memory manager instance
 */
let memoryManager: MemoryManager;

/**
 * Register memory tools
 */
export async function registerMemoryTools(server: McpServer, config: Config) {
  logger.info("Registering native memory tools...");

  // Initialize memory manager
  memoryManager = new MemoryManager();
  await memoryManager.initialize();

  // Memory store tool
  server.registerTool(
    "mcp__memory__store",
    {
      title: "Store information in memory",
      description: "Create entities, relations, and observations in the knowledge graph",
      inputSchema: {
        action: z.enum(["create_entity", "add_observation", "create_relation"]).describe("The action to perform"),
        entityName: z.string().describe("Name of the entity"),
        entityType: z.string().optional().describe("Type of entity (e.g., person, concept, project)"),
        observation: z.string().optional().describe("Observation to add to entity"),
        targetEntity: z.string().optional().describe("Target entity for relation"),
        relationType: z.string().optional().describe("Type of relation (e.g., 'works_with', 'part_of', 'causes')")
      }
    },
    async (args) => {
      try {
        const action = args.action as string;
        const entityName = args.entityName as string;

        let result: any;

        switch (action) {
          case "create_entity":
            const entityType = args.entityType as string || "general";
            result = await memoryManager.createEntity(entityName, entityType);
            break;

          case "add_observation":
            const observation = args.observation as string;
            if (!observation) {
              throw new Error("Observation is required");
            }
            result = await memoryManager.addObservation(entityName, observation);
            break;

          case "create_relation":
            const targetEntity = args.targetEntity as string;
            const relationType = args.relationType as string;
            if (!targetEntity || !relationType) {
              throw new Error("targetEntity and relationType are required for relations");
            }
            result = await memoryManager.createRelation(entityName, targetEntity, relationType);
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `✅ ${action.replace('_', ' ').toUpperCase()} completed successfully\n\n${JSON.stringify(result, null, 2)}`
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Memory store tool error:", mcpError);

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

  // Memory recall tool
  server.registerTool(
    "mcp__memory__recall",
    {
      title: "Recall information from memory",
      description: "Search and retrieve entities, relations, and observations",
      inputSchema: {
        action: z.enum(["search", "get_entity", "get_relations", "get_stats"]).describe("The recall action to perform"),
        query: z.string().optional().describe("Search query"),
        entityName: z.string().optional().describe("Name of specific entity to retrieve"),
        limit: z.number().int().default(10).optional().describe("Maximum number of results")
      }
    },
    async (args) => {
      try {
        const action = args.action as string;
        let result: any;

        switch (action) {
          case "search":
            const query = args.query as string;
            if (!query) {
              throw new Error("Query is required for search");
            }
            const limit = (args.limit as number) || 10;
            result = await memoryManager.searchEntities(query, limit);
            break;

          case "get_entity":
            const entityName = args.entityName as string;
            if (!entityName) {
              throw new Error("entityName is required");
            }
            result = await memoryManager.getEntity(entityName);
            break;

          case "get_relations":
            const entityNameForRelations = args.entityName as string;
            if (!entityNameForRelations) {
              throw new Error("entityName is required for relations");
            }
            result = await memoryManager.getRelatedEntities(entityNameForRelations);
            break;

          case "get_stats":
            result = memoryManager.getStats();
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: formatMemoryResult(action, result)
          }],
          isError: false
        };

      } catch (error) {
        const mcpError = handleError(error);
        logger.error("Memory recall tool error:", mcpError);

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

  logger.info("Native memory tools registered successfully");
}

/**
 * Format memory recall results
 */
function formatMemoryResult(action: string, result: any): string {
  switch (action) {
    case "search":
      if (!result || result.length === 0) {
        return "🔍 No entities found matching the search criteria.";
      }
      return `🔍 **Search Results** (${result.length} found)\n\n` +
        result.map((entity: Entity) =>
          `**${entity.name}** (${entity.entityType})\n` +
          `Observations: ${entity.observations.length}\n` +
          `${entity.observations.slice(0, 2).map(obs => `• ${obs}`).join('\n')}` +
          (entity.observations.length > 2 ? '\n• ...' : '')
        ).join('\n\n');

    case "get_entity":
      if (!result) {
        return "🚫 Entity not found.";
      }
      return `📋 **Entity: ${result.name}**\n\n` +
        `**Type:** ${result.entityType}\n` +
        `**Created:** ${new Date(result.createdAt).toLocaleString()}\n` +
        `**Updated:** ${new Date(result.updatedAt).toLocaleString()}\n\n` +
        `**Observations (${result.observations.length}):**\n` +
        result.observations.map((obs: string) => `• ${obs}`).join('\n');

    case "get_relations":
      const { incoming, outgoing } = result;
      return `🔗 **Relations for Entity**\n\n` +
        `**Incoming (${incoming.length}):**\n` +
        (incoming.length > 0 ?
          incoming.map((rel: Relation) => `• ${rel.from} --[${rel.relationType}]--> entity`).join('\n') :
          '• None'
        ) + '\n\n' +
        `**Outgoing (${outgoing.length}):**\n` +
        (outgoing.length > 0 ?
          outgoing.map((rel: Relation) => `• entity --[${rel.relationType}]--> ${rel.to}`).join('\n') :
          '• None'
        );

    case "get_stats":
      return `📊 **Memory Statistics**\n\n` +
        `**Entities:** ${result.entities}\n` +
        `**Relations:** ${result.relations}\n` +
        `**Entity Types:** ${result.types.join(', ')}\n`;

    default:
      return JSON.stringify(result, null, 2);
  }
}