# mcp-ragchat

Add AI chat to any website from Claude Code. One command.

```
"Add AI chat to mysite.com using my product docs"
```

An MCP server that sets up RAG-powered chat: seeds a vector store from your markdown, starts an HTTP chat server, and generates an embeddable widget. Works with OpenAI, Anthropic, or Gemini.

## Setup

```bash
git clone https://github.com/gogabrielordonez/mcp-ragchat
cd mcp-ragchat
npm install && npm run build
```

Add to Claude Code (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "ragchat": {
      "command": "node",
      "args": ["/path/to/mcp-ragchat/dist/mcp-server.js"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `ragchat_setup` | Seed a knowledge base from markdown content |
| `ragchat_test` | Send a test message to verify RAG works |
| `ragchat_serve` | Start the chat HTTP server |
| `ragchat_widget` | Generate embeddable `<script>` tag |
| `ragchat_status` | List all configured domains |

## How It Works

```
Your Markdown → ragchat_setup → Local Vector Store (JSON)
                                        ↓
User Question → Embedding → Cosine Search → Top 3 chunks
                                        ↓
                              System Prompt + RAG Context → LLM → Reply
```

Everything runs locally. No cloud infrastructure required. Bring your own LLM key.

## LLM Providers

Set one of these environment variables:

| Provider | Env Var | Default Model |
|----------|---------|---------------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5-20250929` |
| Gemini | `GEMINI_API_KEY` | `gemini-2.0-flash` |

Override the model with `LLM_MODEL` and embedding model with `EMBEDDING_MODEL`.

## Example

In Claude Code:

> "Set up AI chat for my bakery website. Here's our menu and FAQ: [paste markdown]"

Claude Code calls:
1. `ragchat_setup` — seeds 15 documents from your markdown
2. `ragchat_test` — sends "What are your hours?" to verify
3. `ragchat_serve` — starts chat server on localhost:3456
4. `ragchat_widget` — generates the embed code

Paste the widget `<script>` into your HTML. Done.

## Architecture

```
~/.mcp-ragchat/domains/
  mysite.com/
    config.json     ← system prompt, settings
    vectors.json    ← documents + embeddings
```

- **Vector store**: Local JSON files with cosine similarity search
- **Embeddings**: OpenAI `text-embedding-3-small`, Gemini `text-embedding-004`, or AWS Bedrock Titan
- **Chat server**: Node.js HTTP server with CORS, input sanitization
- **Widget**: Self-contained `<script>` tag, no dependencies

## Production

For production deployments with multi-tenancy, security guardrails, audit trails, and managed infrastructure, see [Supersonic](https://adwaizer.com/supersonic) — the enterprise platform built on the same RAG pipeline.

## License

MIT
