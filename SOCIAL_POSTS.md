# Social Media Posts — mcp-ragchat Launch

## X (Twitter)

### Post 1 — Launch
```
I built an MCP server that adds AI chat to any website from Claude Code.

One command: "Add AI chat to mysite.com"

It seeds a local vector store from your markdown, starts a chat server, and generates an embed snippet.

No cloud. No database. Just your API key.

github.com/gogabrielordonez/mcp-ragchat
```

### Post 2 — Technical Thread
```
How mcp-ragchat works (thread):

1/ Your markdown gets split by ## headers into sections
2/ Each section gets embedded (OpenAI, Gemini, or Bedrock)
3/ Vectors stored locally as JSON — zero cloud dependency
4/ When a user asks a question, cosine similarity finds top 3 chunks
5/ RAG context + system prompt + user message → LLM → reply

5 MCP tools. TypeScript. MIT license.

github.com/gogabrielordonez/mcp-ragchat
```

### Post 3 — Positioning
```
Open-core AI chat:

Free: mcp-ragchat
- Local vector store
- Bring your own LLM key
- Self-hosted chat server

Enterprise: Supersonic (adwaizer.com/supersonic)
- Multi-tenant DynamoDB
- 8-layer security stack
- A2A + MCP protocols
- Managed infrastructure

Same RAG pipeline. Different scale.
```

---

## LinkedIn

### Post 1 — Professional
```
Just open-sourced mcp-ragchat — an MCP server that lets AI developer tools (Claude Code, Cursor) add RAG-powered chat to any website with a single command.

The problem: Adding AI chat to a website typically requires setting up a vector database, building a RAG pipeline, creating an API endpoint, and embedding a widget. That's days of work.

The solution: Tell Claude Code "add AI chat to mysite.com with my product docs" and it handles everything — seeds a local vector store, starts an HTTP chat server, and generates an embeddable widget.

Technical details:
- Local JSON-based vector store with cosine similarity search
- Multi-provider support: OpenAI, Anthropic, Gemini
- Self-contained Node.js chat server with CORS and input sanitization
- Zero cloud infrastructure required

This is the open-source version of the RAG pipeline that powers Supersonic, my multi-agent AI orchestration platform currently serving multiple Canadian businesses.

MIT License. TypeScript. Node.js 20+.

github.com/gogabrielordonez/mcp-ragchat

#MCP #AI #RAG #OpenSource #TypeScript #ClaudeCode
```

---

## Reddit

### r/ClaudeAI
```
Title: I built an MCP server that adds AI chat to any website — "ragchat_setup" seeds your docs, "ragchat_serve" starts the server, paste the widget

Body:
Been building multi-agent AI systems and kept needing to add chat to different websites. Got tired of the same setup every time: vector DB, embeddings, RAG pipeline, API, widget.

So I extracted the core into an MCP server. You add it to Claude Code, say "add AI chat to mysite.com using my FAQ markdown", and it:

1. Splits your markdown by ## headers
2. Generates embeddings (OpenAI/Gemini/Bedrock)
3. Stores vectors locally as JSON
4. Starts a chat HTTP server on localhost
5. Gives you an embeddable <script> tag

Everything runs locally. No cloud. No database. Bring your own API key.

5 tools: ragchat_setup, ragchat_test, ragchat_serve, ragchat_widget, ragchat_status

GitHub: github.com/gogabrielordonez/mcp-ragchat
License: MIT
```

### r/MachineLearning
```
Title: [P] mcp-ragchat: MCP server for adding RAG chat to any website from Claude Code

Body:
Open-sourced an MCP server that automates the full RAG chat pipeline:

- Markdown → section splitting → embedding generation → local vector store
- Cosine similarity search at query time → top-k retrieval
- System prompt + RAG context → LLM (OpenAI/Anthropic/Gemini) → response
- Self-contained HTTP server + embeddable widget

Local JSON-based vector store (no external DB). Multi-provider embedding support. MIT licensed.

Built as the open-source layer of a production multi-agent system (Supersonic) that handles multi-tenant chat for several businesses.

github.com/gogabrielordonez/mcp-ragchat
```

### r/LocalLLaMA (if adding Ollama support)
```
Title: mcp-ragchat — MCP server for RAG chat, supports local embeddings

Body: [similar to above but emphasize local/self-hosted aspect]
```

---

## Hacker News

```
Title: Show HN: MCP server that adds RAG-powered AI chat to any website

URL: https://github.com/gogabrielordonez/mcp-ragchat
```

---

## Dev.to / Hashnode Blog Post Outline

Title: "I Built an MCP Server That Adds AI Chat to Any Website in 60 Seconds"

1. The problem (adding chat to websites is repetitive)
2. The MCP approach (let Claude Code handle it)
3. Architecture (local vector store, cosine similarity, multi-provider)
4. Demo walkthrough
5. Open-core model (free local version, enterprise Supersonic)
6. What's next (npm install, Smithery registry, Ollama support)

---

## MCP Registry Submissions

1. **Smithery** — smithery.ai (smithery.yaml already in repo)
   Submit at: https://smithery.ai/submit

2. **MCP Hub** — mcphub.io
   Submit at: https://mcphub.io/submit

3. **Awesome MCP Servers** — github.com/punkpeye/awesome-mcp-servers
   Open a PR adding mcp-ragchat to the list

4. **MCP.so** — mcp.so
   Submit at: https://mcp.so/submit

5. **Glama MCP directory** — glama.ai/mcp/servers
   Submit at: https://glama.ai/mcp/servers/submit
