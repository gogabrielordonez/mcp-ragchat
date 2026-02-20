/**
 * Local file-based vector store.
 *
 * Stores embeddings as JSON in ~/.mcp-ragchat/domains/{domain}/
 * Uses cosine similarity for search. Zero external dependencies.
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.join(process.env.HOME || "~", ".mcp-ragchat", "domains");

export interface VectorDocument {
  id: string;
  title: string;
  content: string;
  embedding: number[];
  createdAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
}

function domainDir(domain: string): string {
  const dir = path.join(BASE_DIR, domain.replace(/[^a-zA-Z0-9.-]/g, "_"));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function vectorsPath(domain: string): string {
  return path.join(domainDir(domain), "vectors.json");
}

function configPath(domain: string): string {
  return path.join(domainDir(domain), "config.json");
}

/** Load all vectors for a domain */
export function loadVectors(domain: string): VectorDocument[] {
  const p = vectorsPath(domain);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

/** Save vectors for a domain */
export function saveVectors(domain: string, docs: VectorDocument[]): void {
  fs.writeFileSync(vectorsPath(domain), JSON.stringify(docs, null, 2));
}

/** Add a document with its embedding */
export function addDocument(
  domain: string,
  doc: VectorDocument,
): void {
  const docs = loadVectors(domain);
  // Replace if same ID exists
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.push(doc);
  saveVectors(domain, docs);
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/** Search documents by embedding similarity */
export function searchByEmbedding(
  domain: string,
  queryEmbedding: number[],
  limit = 3,
  minScore = 0.3,
): SearchResult[] {
  const docs = loadVectors(domain);
  if (docs.length === 0) return [];

  const scored = docs
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/** Save domain config (system prompt, LLM settings) */
export function saveDomainConfig(
  domain: string,
  config: Record<string, any>,
): void {
  fs.writeFileSync(configPath(domain), JSON.stringify(config, null, 2));
}

/** Load domain config */
export function loadDomainConfig(
  domain: string,
): Record<string, any> | null {
  const p = configPath(domain);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

/** List all configured domains */
export function listDomains(): Array<{
  domain: string;
  documentCount: number;
  createdAt: string | null;
}> {
  if (!fs.existsSync(BASE_DIR)) return [];
  return fs
    .readdirSync(BASE_DIR)
    .filter((d) => {
      const full = path.join(BASE_DIR, d);
      return fs.statSync(full).isDirectory();
    })
    .map((d) => {
      const config = loadDomainConfig(d);
      const docs = loadVectors(d);
      return {
        domain: config?.domain || d,
        documentCount: docs.length,
        createdAt: config?.createdAt || null,
      };
    });
}

/** Delete a domain and all its data */
export function deleteDomain(domain: string): void {
  const dir = domainDir(domain);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
}
