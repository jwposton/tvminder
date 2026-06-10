import type { TmdbSearchResult } from "@/lib/tmdb";

export function normalizeShowName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 0 = no match; higher is better (100 = exact). */
export function scoreMatchConfidence(inputName: string, showName: string): number {
  const q = inputName.toLowerCase().trim();
  const n = showName.toLowerCase().trim();
  if (!q || !n) return 0;
  if (q === n) return 100;

  const qn = normalizeShowName(q);
  const nn = normalizeShowName(n);
  if (qn === nn) return 95;

  if (nn.includes(qn) || qn.includes(nn)) {
    const shorter = Math.min(qn.length, nn.length);
    const longer = Math.max(qn.length, nn.length);
    return 70 + Math.round((shorter / longer) * 15);
  }

  const qWords = qn.split(" ").filter(Boolean);
  const nWords = new Set(nn.split(" ").filter(Boolean));
  if (qWords.length === 0) return 0;

  const overlap = qWords.filter((w) => nWords.has(w)).length;
  const ratio = overlap / qWords.length;
  if (ratio >= 0.5) return 40 + Math.round(ratio * 25);

  return 15;
}

export function pickBestMatch(
  query: string,
  results: TmdbSearchResult[]
): { match: TmdbSearchResult | null; confidence: number } {
  if (results.length === 0) return { match: null, confidence: 0 };

  let best = results[0];
  let bestScore = scoreMatchConfidence(query, best.name);

  for (const candidate of results.slice(1)) {
    const score = scoreMatchConfidence(query, candidate.name);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return { match: best, confidence: bestScore };
}

export function matchConfidenceLabel(confidence: number): string {
  if (confidence === 0) return "No match";
  if (confidence >= 95) return "Exact match";
  if (confidence >= 70) return "Strong match";
  if (confidence >= 40) return "Partial match";
  return "Low confidence";
}

export function sortByMatchConfidence<
  T extends { matchConfidence: number; line: number },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.matchConfidence !== b.matchConfidence) {
      return a.matchConfidence - b.matchConfidence;
    }
    return a.line - b.line;
  });
}
