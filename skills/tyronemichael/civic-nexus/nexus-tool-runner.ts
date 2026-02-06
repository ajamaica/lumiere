#!/usr/bin/env npx tsx
/**
 * Nexus Tool Runner - Execute any Civic Nexus MCP tool dynamically
 *
 * This script connects to Civic Nexus and allows you to:
 * - List all available tools
 * - Search tools by name/description
 * - View tool schemas
 * - Call any tool with arguments
 *
 * Usage:
 *   npx tsx nexus-tool-runner.ts --list
 *   npx tsx nexus-tool-runner.ts --search postgres
 *   npx tsx nexus-tool-runner.ts --schema postgres-list_schemas
 *   npx tsx nexus-tool-runner.ts --call postgres-list_schemas
 *   npx tsx nexus-tool-runner.ts --call help --args '{"query": "how to search"}'
 *
 * Environment:
 *   NEXUS_URL   - The Nexus MCP URL (default: https://nexus.civic.com/hub/mcp)
 *   NEXUS_TOKEN - Your access token (required)
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult,Tool } from "@modelcontextprotocol/sdk/types.js";

// ============================================================================
// MCP Client
// ============================================================================

class NexusClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;
  private tools: Map<string, Tool> = new Map();

  constructor(url: string, token: string) {
    const userAgent = `openclaw/1.0.0 node/${process.version.slice(1)} (${process.platform}; ${process.arch})`;
    this.transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": userAgent,
        },
      },
    });
    this.client = new Client(
      { name: "nexus-tool-runner", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  async connect(): Promise<void> {
    await this.client.connect(this.transport);
    const { tools } = await this.client.listTools();
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  searchTools(query: string): Tool[] {
    const q = query.toLowerCase();
    return this.getTools().filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return (await this.client.callTool({ name, arguments: args })) as CallToolResult;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatToolList(tools: Tool[]): void {
  // Group by prefix
  const groups = new Map<string, Tool[]>();
  for (const tool of tools) {
    const prefix = tool.name.split("-")[0] || "other";
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(tool);
  }

  console.log(`\nTotal: ${tools.length} tools\n`);

  for (const [prefix, groupTools] of Array.from(groups.entries()).sort()) {
    console.log(`## ${prefix} (${groupTools.length} tools)`);
    for (const tool of groupTools.sort((a, b) => a.name.localeCompare(b.name))) {
      const desc = tool.description?.slice(0, 60) ?? "";
      console.log(`  ${tool.name}`);
      if (desc) console.log(`    ${desc}${tool.description!.length > 60 ? "..." : ""}`);
    }
    console.log();
  }
}

function formatToolSchema(tool: Tool): void {
  console.log(`\n## ${tool.name}\n`);
  console.log(`Description: ${tool.description ?? "No description"}\n`);
  console.log("Input Schema:");
  console.log(JSON.stringify(tool.inputSchema, null, 2));
}

function formatToolResult(result: CallToolResult): void {
  console.log("\n## Result\n");

  if (!result.content || result.content.length === 0) {
    console.log("(empty result)");
    return;
  }

  for (const item of result.content) {
    if (item.type === "text") {
      // Try to parse and pretty-print JSON
      try {
        const parsed = JSON.parse(item.text);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(item.text);
      }
    } else if (item.type === "resource" && "resource" in item) {
      const resource = item.resource as { _meta?: { name?: string }; text?: string };
      if (resource._meta?.name === "authorization_url") {
        console.log("\n⚠️  AUTHORIZATION REQUIRED");
        console.log(`\nPlease visit this URL to authorize:\n${resource.text}\n`);
      } else if (resource._meta?.name === "continue_job_id") {
        console.log(`\nAfter authorizing, run:`);
        console.log(`  npx tsx nexus-tool-runner.ts --call continue_job --args '{"job_id": "${resource.text}"}'`);
      } else {
        console.log(JSON.stringify(item, null, 2));
      }
    } else {
      console.log(JSON.stringify(item, null, 2));
    }
  }
}

// ============================================================================
// CLI
// ============================================================================

function printHelp(): void {
  console.log(`
Nexus Tool Runner - Execute any Civic Nexus MCP tool

Usage:
  npx tsx nexus-tool-runner.ts [command] [options]

Commands:
  --list              List all available tools (grouped by category)
  --search <query>    Search tools by name or description
  --schema <tool>     Show the input schema for a tool
  --call <tool>       Call a tool
  --args <json>       JSON arguments for the tool call
  --help              Show this help message

Examples:
  # List all tools
  npx tsx nexus-tool-runner.ts --list

  # Search for database tools
  npx tsx nexus-tool-runner.ts --search postgres

  # See what parameters a tool needs
  npx tsx nexus-tool-runner.ts --schema postgres-execute_sql

  # Call a tool without arguments
  npx tsx nexus-tool-runner.ts --call postgres-list_schemas

  # Call a tool with arguments
  npx tsx nexus-tool-runner.ts --call postgres-execute_sql --args '{"query": "SELECT 1"}'

  # Search Gmail
  npx tsx nexus-tool-runner.ts --call google-gmail-search_gmail_messages --args '{"query": "is:unread"}'

Environment Variables:
  NEXUS_URL    MCP server URL (default: https://nexus.civic.com/hub/mcp)
  NEXUS_TOKEN  Your Nexus access token (required)
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const url = process.env.NEXUS_URL ?? "https://nexus.civic.com/hub/mcp";
  const token = process.env.NEXUS_TOKEN;

  if (!token) {
    console.error("Error: NEXUS_TOKEN environment variable is required");
    console.error("\nSet it with:");
    console.error('  export NEXUS_TOKEN="your-token-here"');
    process.exit(1);
  }

  const client = new NexusClient(url, token);

  try {
    console.log("Connecting to Nexus...");
    await client.connect();
    console.log(`Connected. Found ${client.getTools().length} tools.`);

    // Parse commands
    const listIdx = args.indexOf("--list");
    const searchIdx = args.indexOf("--search");
    const schemaIdx = args.indexOf("--schema");
    const callIdx = args.indexOf("--call");
    const argsIdx = args.indexOf("--args");

    if (listIdx !== -1) {
      formatToolList(client.getTools());
    } else if (searchIdx !== -1 && args[searchIdx + 1]) {
      const query = args[searchIdx + 1];
      const results = client.searchTools(query);
      console.log(`\nFound ${results.length} tools matching "${query}":`);
      formatToolList(results);
    } else if (schemaIdx !== -1 && args[schemaIdx + 1]) {
      const toolName = args[schemaIdx + 1];
      const tool = client.getTool(toolName);
      if (!tool) {
        console.error(`Tool not found: ${toolName}`);
        console.error("\nUse --list to see all available tools");
        process.exit(1);
      }
      formatToolSchema(tool);
    } else if (callIdx !== -1 && args[callIdx + 1]) {
      const toolName = args[callIdx + 1];
      let toolArgs: Record<string, unknown> = {};

      if (argsIdx !== -1 && args[argsIdx + 1]) {
        try {
          toolArgs = JSON.parse(args[argsIdx + 1]);
        } catch (e) {
          console.error("Error: Invalid JSON in --args");
          console.error("Make sure to use single quotes around the JSON:");
          console.error(`  --args '{"key": "value"}'`);
          process.exit(1);
        }
      }

      console.log(`\nCalling: ${toolName}`);
      if (Object.keys(toolArgs).length > 0) {
        console.log(`Args: ${JSON.stringify(toolArgs)}`);
      }

      const result = await client.callTool(toolName, toolArgs);
      formatToolResult(result);
    } else {
      console.error("Invalid command. Use --help for usage.");
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);
    } else {
      console.error("\nError:", error);
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
