/**
 * mcp-ragchat — MCP server that adds RAG-powered AI chat to any website.
 *
 * Tools:
 *   ragchat_setup     — Initialize a domain from markdown content
 *   ragchat_test      — Test chat with a message
 *   ragchat_serve     — Start the chat HTTP server
 *   ragchat_widget    — Generate embeddable chat widget HTML
 *   ragchat_status    — List configured domains and stats
 *
 * Usage:
 *   node dist/mcp-server.js
 *
 * Claude Code config (~/.claude/mcp.json):
 *   {
 *     "mcpServers": {
 *       "ragchat": {
 *         "command": "node",
 *         "args": ["/path/to/mcp-ragchat/dist/mcp-server.js"],
 *         "env": { "OPENAI_API_KEY": "sk-..." }
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  addDocument,
  saveDomainConfig,
  loadDomainConfig,
  listDomains,
  searchByEmbedding,
  loadVectors,
  type VectorDocument,
} from "./vector-store";
import { generateEmbedding } from "./embeddings";
import { callLLM, type ChatMessage } from "./llm";
import { startChatServer, stopChatServer } from "./chat-server";
import { generateWidget } from "./widget";

// ============ HELPERS ============

/** Split markdown by ## headers into sections */
function splitMarkdown(
  content: string,
): Array<{ title: string; text: string }> {
  const sections = content.split(/^## /m).filter((s) => s.trim());
  return sections.map((section) => {
    const title = section.split("\n")[0].trim();
    const text = section.substring(title.length).trim();
    return { title, text };
  });
}

// ============ MCP SERVER ============

const server = new McpServer(
  {
    name: "mcp-ragchat",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions:
      "RAG-powered chat for any website. Setup a domain with markdown content, test it, serve it, and embed a widget. Requires an LLM API key (OpenAI, Anthropic, or Gemini).",
  },
);

// ---------- Tool 1: Setup ----------

server.tool(
  "ragchat_setup",
  "Initialize a domain with a knowledge base from markdown content. Each ## section becomes a searchable document with vector embeddings. This is the first step — run this before testing or serving.",
  {
    domain: z
      .string()
      .describe("Domain name (e.g. 'mysite.com' or 'acme')"),
    content: z
      .string()
      .describe(
        "Markdown content with ## headers. Each section becomes a searchable document. Minimum 50 chars per section.",
      ),
    systemPrompt: z
      .string()
      .describe(
        "System prompt for the chat assistant (e.g. 'You are the Acme support agent. Answer questions about Acme products.')",
      ),
  },
  async ({ domain, content, systemPrompt }) => {
    try {
      const sections = splitMarkdown(content);
      const validSections = sections.filter((s) => s.text.length >= 50);

      if (validSections.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No sections found with enough content (min 50 chars). Use ## headers to split your content.",
            },
          ],
        };
      }

      // Save domain config
      saveDomainConfig(domain, {
        domain,
        systemPrompt,
        createdAt: new Date().toISOString(),
      });

      // Embed and store each section
      let seeded = 0;
      const errors: string[] = [];

      for (let i = 0; i < validSections.length; i++) {
        const { title, text } = validSections[i];
        try {
          const embedding = await generateEmbedding(text);
          const doc: VectorDocument = {
            id: `${domain}-${i + 1}`,
            title,
            content: text,
            embedding,
            createdAt: new Date().toISOString(),
          };
          addDocument(domain, doc);
          seeded++;
        } catch (err: any) {
          errors.push(`"${title}": ${err.message}`);
        }
      }

      let result = `Domain "${domain}" configured with ${seeded}/${validSections.length} documents.`;
      if (errors.length > 0) {
        result += `\n\nErrors:\n${errors.join("\n")}`;
      }
      result += `\n\nNext steps:\n1. ragchat_test — send a test message\n2. ragchat_serve — start the chat server\n3. ragchat_widget — get the embed code`;

      return { content: [{ type: "text" as const, text: result }] };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

// ---------- Tool 2: Test ----------

server.tool(
  "ragchat_test",
  "Send a test message to a domain's chat. Uses RAG search + LLM to generate a response, same as production. Good for verifying the knowledge base works.",
  {
    domain: z.string().describe("Domain to test"),
    message: z
      .string()
      .describe("Test message (e.g. 'What is your product?')"),
  },
  async ({ domain, message }) => {
    try {
      const config = loadDomainConfig(domain);
      if (!config) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Domain "${domain}" not found. Run ragchat_setup first.`,
            },
          ],
        };
      }

      const startMs = Date.now();

      // RAG search
      let ragContext = "";
      let sources: string[] = [];
      try {
        const queryEmbed = await generateEmbedding(message);
        const results = searchByEmbedding(domain, queryEmbed, 3);
        if (results.length > 0) {
          ragContext = results.map((r) => r.content).join("\n---\n");
          sources = results.map(
            (r) => `${r.id} (${r.score.toFixed(2)})`,
          );
        }
      } catch {
        // RAG failure
      }

      const systemPrompt = ragContext
        ? `${config.systemPrompt}\n\nRELEVANT CONTEXT:\n${ragContext}\n\nUse this context to answer accurately.`
        : config.systemPrompt;

      const reply = await callLLM(systemPrompt, [], message);
      const latencyMs = Date.now() - startMs;

      return {
        content: [
          {
            type: "text" as const,
            text: `**Test: ${domain}**\n\nQuery: "${message}"\n\n**Reply:**\n${reply}\n\n**RAG Sources:** ${sources.length > 0 ? sources.join(", ") : "none"}\n**Latency:** ${latencyMs}ms`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

// ---------- Tool 3: Serve ----------

server.tool(
  "ragchat_serve",
  "Start a local HTTP chat server for a domain. The server runs on localhost and handles POST /chat requests. Use ragchat_widget to get the embed code that connects to this server.",
  {
    domain: z.string().describe("Domain to serve"),
    port: z
      .number()
      .optional()
      .describe("Port to listen on (default: 3456)"),
  },
  async ({ domain, port }) => {
    try {
      const config = loadDomainConfig(domain);
      if (!config) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Domain "${domain}" not found. Run ragchat_setup first.`,
            },
          ],
        };
      }

      const result = await startChatServer(domain, port || 3456);

      return {
        content: [
          {
            type: "text" as const,
            text: `Chat server running for "${domain}" at ${result.url}\n\nEndpoints:\n- GET  /      — health check\n- POST /chat  — send messages\n\nThe server will keep running until the MCP session ends.\nUse ragchat_widget to get the embed code.`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

// ---------- Tool 4: Widget ----------

server.tool(
  "ragchat_widget",
  "Generate an embeddable chat widget. Returns a <script> tag that creates a floating chat bubble on any webpage. Connects to the chat server started with ragchat_serve.",
  {
    domain: z.string().describe("Domain name (used in widget title)"),
    chatUrl: z
      .string()
      .optional()
      .describe(
        "Chat server URL (default: http://localhost:3456). Change this when deploying to production.",
      ),
    title: z
      .string()
      .optional()
      .describe("Widget header title (default: 'Chat with us')"),
    color: z
      .string()
      .optional()
      .describe("Accent color hex (default: '#22c55e')"),
  },
  async ({ domain, chatUrl, title, color }) => {
    const widget = generateWidget(chatUrl || "http://localhost:3456", {
      domain,
      title,
      accentColor: color,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `**Chat Widget for ${domain}**\n\nPaste this into any HTML page:\n\n\`\`\`html\n${widget}\n\`\`\`\n\nMake sure the chat server is running (ragchat_serve) before testing.\nFor production, change the chatUrl to your deployed server address.`,
        },
      ],
    };
  },
);

// ---------- Tool 5: Status ----------

server.tool(
  "ragchat_status",
  "List all configured domains with document counts and config status. Shows what's been set up and what's ready to serve.",
  async () => {
    try {
      const domains = listDomains();

      if (domains.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No domains configured yet. Use ragchat_setup to create one.",
            },
          ],
        };
      }

      const lines = domains.map((d) => {
        const config = loadDomainConfig(d.domain);
        return `- **${d.domain}**\n  Documents: ${d.documentCount}\n  Created: ${d.createdAt || "unknown"}\n  Prompt: ${(config?.systemPrompt || "").slice(0, 60)}...`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Configured domains (${domains.length}):\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

// ============ MAIN ============

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`mcp-ragchat error: ${err.message}\n`);
  process.exit(1);
});
