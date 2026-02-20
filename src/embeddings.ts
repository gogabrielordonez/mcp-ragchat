/**
 * Multi-provider embeddings.
 *
 * Supports: OpenAI, Anthropic (via Voyage), Gemini, AWS Bedrock.
 * Defaults to OpenAI text-embedding-3-small ($0.02/1M tokens).
 */

type Provider = "openai" | "gemini" | "bedrock";

function getProvider(): Provider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID) return "bedrock";
  throw new Error(
    "No embedding provider configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or AWS credentials.",
  );
}

async function openaiEmbed(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY!;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings failed: ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function geminiEmbed(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.EMBEDDING_MODEL || "text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embeddings failed: ${err}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

async function bedrockEmbed(text: string): Promise<number[]> {
  // Dynamic import to avoid requiring aws-sdk when not using bedrock
  const { BedrockRuntimeClient, InvokeModelCommand } = await import(
    "@aws-sdk/client-bedrock-runtime"
  );

  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const command = new InvokeModelCommand({
    modelId: process.env.EMBEDDING_MODEL || "amazon.titan-embed-text-v2:0",
    body: JSON.stringify({ inputText: text.slice(0, 8000) }),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding;
}

/** Generate an embedding vector for the given text */
export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = getProvider();

  switch (provider) {
    case "openai":
      return openaiEmbed(text);
    case "gemini":
      return geminiEmbed(text);
    case "bedrock":
      return bedrockEmbed(text);
  }
}
