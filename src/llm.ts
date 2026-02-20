/**
 * Multi-provider LLM calls.
 *
 * Supports: OpenAI, Anthropic, Gemini.
 * Auto-detects based on which API key is set.
 */

type LLMProvider = "openai" | "anthropic" | "gemini";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function getLLMProvider(): LLMProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  throw new Error(
    "No LLM provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.",
  );
}

async function callOpenAI(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
): Promise<string> {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: message },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content || "No response generated.";
}

async function callAnthropic(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.LLM_MODEL || "claude-sonnet-4-5-20250929";

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: message },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages,
      max_tokens: 512,
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${await res.text()}`);
  const data = await res.json();
  return data.content[0]?.text || "No response generated.";
}

async function callGemini(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.LLM_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

/** Call the configured LLM with RAG context */
export async function callLLM(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
): Promise<string> {
  const provider = getLLMProvider();

  switch (provider) {
    case "openai":
      return callOpenAI(systemPrompt, history, message);
    case "anthropic":
      return callAnthropic(systemPrompt, history, message);
    case "gemini":
      return callGemini(systemPrompt, history, message);
  }
}
