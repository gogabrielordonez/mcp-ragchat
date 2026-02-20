/**
 * Self-contained chat HTTP server.
 *
 * Serves:
 *   POST /chat  — RAG-powered chat endpoint
 *   GET  /       — Health check
 *
 * Runs on localhost. The chat widget connects to this.
 */

import * as http from "http";
import { searchByEmbedding, loadDomainConfig } from "./vector-store";
import { generateEmbedding } from "./embeddings";
import { callLLM, type ChatMessage } from "./llm";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const MAX_INPUT = 1000;

function sanitize(text: string): string {
  return text.slice(0, MAX_INPUT).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

let activeServer: http.Server | null = null;

/** Start the chat server for a domain */
export function startChatServer(
  domain: string,
  port = 3456,
): Promise<{ port: number; url: string }> {
  return new Promise((resolve, reject) => {
    const config = loadDomainConfig(domain);
    if (!config) {
      reject(new Error(`Domain "${domain}" not configured. Run setup first.`));
      return;
    }

    // Stop existing server if running
    if (activeServer) {
      activeServer.close();
      activeServer = null;
    }

    const server = http.createServer(async (req, res) => {
      if (req.method === "OPTIONS") {
        res.writeHead(200, CORS);
        res.end();
        return;
      }

      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", domain }));
        return;
      }

      if (req.method === "POST" && req.url === "/chat") {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString());

          const { message, history } = body;
          if (!message || typeof message !== "string") {
            res.writeHead(400, { ...CORS, "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "message required" }));
            return;
          }

          const clean = sanitize(message);
          const startMs = Date.now();

          // RAG search
          let ragContext = "";
          let sources: string[] = [];
          try {
            const queryEmbed = await generateEmbedding(clean);
            const results = searchByEmbedding(domain, queryEmbed, 3);
            if (results.length > 0) {
              ragContext = results.map((r) => r.content).join("\n---\n");
              sources = results.map((r) => r.id);
            }
          } catch {
            // RAG failure → fall back to system prompt only
          }

          // Build prompt with RAG context
          const systemPrompt = ragContext
            ? `${config.systemPrompt}\n\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n${ragContext}\n\nUse this context to answer accurately. If the context doesn't cover the question, say so.`
            : config.systemPrompt;

          // Sanitize history
          const safeHistory: ChatMessage[] = (Array.isArray(history) ? history : [])
            .slice(-10)
            .filter((h: any) => h?.role && h?.text)
            .map((h: any) => ({ role: h.role, text: sanitize(h.text) }));

          // Call LLM
          const reply = await callLLM(systemPrompt, safeHistory, clean);
          const latencyMs = Date.now() - startMs;

          res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
          res.end(JSON.stringify({ reply, sources, latencyMs }));
        } catch (err: any) {
          res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      res.writeHead(404, CORS);
      res.end("Not Found");
    });

    server.listen(port, () => {
      activeServer = server;
      resolve({ port, url: `http://localhost:${port}` });
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        // Try next port
        startChatServer(domain, port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/** Stop the chat server */
export function stopChatServer(): void {
  if (activeServer) {
    activeServer.close();
    activeServer = null;
  }
}
