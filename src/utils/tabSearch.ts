import type { TabInfo, SearchResult } from '../types';

interface MatchResult {
  score: number;
  positions: number[];
}

// Scoring constants
const SCORE_BASE = 1;
const SCORE_CONSECUTIVE_BONUS = 5;
const SCORE_WORD_START = 8;
const SCORE_CAMEL_CASE = 2;
const SCORE_SEPARATOR = 4;
const SCORE_CASE_MATCH = 1;

// Quality thresholds
const MIN_SCORE_PER_CHAR = 2;
const MAX_MATCH_SPAN_RATIO = 8;
const GAP_PENALTY = 0.5;
const MAX_AVERAGE_GAP = 15;

// Separators that indicate word boundaries
const SEPARATORS = new Set(['/', '\\', '-', '_', '.', ' ', ':', ',', ';', '|', '(', ')', '[', ']', '{', '}']);

interface SearchField {
  text: string;
  lower: string;
  field: 'url' | 'title';
  offset: number;
  weight: number;
}

// Keep offsets into the original URL so highlights also work with escaped URLs.
function indexFields(tab: TabInfo): SearchField[] {
  const fields: SearchField[] = [];
  const add = (text: string, field: 'url' | 'title', offset = 0, weight = 1) => {
    if (text) fields.push({ text, lower: text.toLowerCase(), field, offset, weight });
  };
  add(tab.title, 'title');
  const parts = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)([^?#]*)/i.exec(tab.url);
  if (parts) {
    add(parts[1], 'url', parts[0].indexOf(parts[1]));
    add(parts[2], 'url', parts[0].length - parts[2].length, 0.9);
  }
  // Full URLs remain searchable, but incidental query/fragment matches rank lower.
  add(tab.url, 'url', 0, parts ? 0.4 : 1);
  return fields;
}

/** Search every query word across title and URL; prefer open tabs to history. */
export function createTabSearcher(tabs: TabInfo[], historyTabs: TabInfo[] = []) {
  const allItems = [
    ...tabs.map(tab => ({ tab, tierPrefix: 'tabs' as const })),
    ...historyTabs.map(tab => ({ tab, tierPrefix: 'history' as const })),
  ].map(item => ({ ...item, fields: indexFields(item.tab) }));

  return {
    search: (input: string): SearchResult[] => {
      const query = input.trim();
      if (!query) {
        return allItems.map(({ tab, tierPrefix }) => ({
          item: tab,
          score: 0,
          matchedField: 'url' as const,
          searchTier: `${tierPrefix}-url` as const,
        }));
      }
      const words = [...new Set(query.toLowerCase().split(/\s+/))];
      const results: SearchResult[] = [];
      for (const { tab, tierPrefix, fields } of allItems) {
        let score = 0;
        const positions = { title: new Set<number>(), url: new Set<number>() };
        const fieldScores = { title: 0, url: 0 };
        let matched = true;
        for (const word of words) {
          let best: (MatchResult & { field: SearchField }) | null = null;
          for (const field of fields) {
            const match = fuzzyScore(field.text, word, field.lower, word);
            if (!match) continue;
            // An explicitly typed URL should retain its full exact/prefix score.
            const weight = field.field === 'url' && field.text === tab.url && word.includes('://')
              ? 1 : field.weight;
            const weighted = match.score * weight;
            if (!best || weighted > best.score) best = { ...match, score: weighted, field };
          }
          if (!best) {
            matched = false;
            break;
          }
          score += best.score;
          fieldScores[best.field.field] += best.score;
          for (const position of best.positions) positions[best.field.field].add(position + best.field.offset);
        }
        if (!matched) continue;
        const matchedField = fieldScores.url >= fieldScores.title ? 'url' : 'title';
        results.push({
          item: tab,
          score,
          matchedField,
          searchTier: `${tierPrefix}-${matchedField}` as const,
          ...(positions.title.size ? {
            titleHighlight: { text: tab.title, positions: [...positions.title].sort((a, b) => a - b) },
          } : {}),
          ...(positions.url.size ? {
            urlHighlight: { text: tab.url, positions: [...positions.url].sort((a, b) => a - b) },
          } : {}),
        });
      }
      // Match quality wins within each source; recency resolves equally good matches.
      return results.sort((a, b) =>
        Number(Boolean(a.item.isHistoryTab)) - Number(Boolean(b.item.isHistoryTab)) ||
        b.score - a.score || b.item.lastAccessed - a.item.lastAccessed,
      );
    },
  };
}

/**
 * Fuzzy scoring algorithm with quality checks and position tracking.
 */
function fuzzyScore(target: string, query: string, targetLower: string, queryLower: string): MatchResult | null {
  if (!target || !query) return null;

  // Quick exact match check
  if (targetLower === queryLower) {
    return {
      score: SCORE_WORD_START * query.length + query.length * 100,
      positions: Array.from({ length: query.length }, (_, i) => i),
    };
  }

  // Quick prefix check
  if (targetLower.startsWith(queryLower)) {
    return {
      score: SCORE_WORD_START * query.length + query.length * 50,
      positions: Array.from({ length: query.length }, (_, i) => i),
    };
  }

  // Prefer contiguous matches even for one- and two-character queries.
  if (targetLower.includes(queryLower)) {
    const index = targetLower.indexOf(queryLower);
    let bonusScore = 0;

    // Bonus if it starts at a word boundary
    if (index === 0 || SEPARATORS.has(target[index - 1])) {
      bonusScore = SCORE_WORD_START * query.length;
    }

    return {
      score: query.length * 20 + bonusScore,
      positions: Array.from({ length: query.length }, (_, i) => index + i),
    };
  }

  // Fuzzy matching with position tracking and gap penalties
  let targetIndex = 0;
  let queryIndex = 0;
  let score = 0;
  let consecutiveCount = 0;
  let lastMatchIndex = -1;
  const positions: number[] = [];
  let totalGap = 0;

  while (targetIndex < target.length && queryIndex < query.length) {
    const targetChar = target[targetIndex];
    const targetCharLower = targetLower[targetIndex];
    const queryChar = query[queryIndex];
    const queryCharLower = queryLower[queryIndex];

    if (targetCharLower === queryCharLower) {
      positions.push(targetIndex);

      if (lastMatchIndex !== -1) {
        const gap = targetIndex - lastMatchIndex - 1;
        totalGap += gap;

        if (gap > 0) {
          score -= gap * GAP_PENALTY;
        }
      }

      let charScore = SCORE_BASE;

      if (lastMatchIndex === targetIndex - 1) {
        consecutiveCount++;
        charScore += SCORE_CONSECUTIVE_BONUS;
      } else {
        consecutiveCount = 0;
      }

      if (targetIndex === 0) {
        charScore += SCORE_WORD_START;
      } else {
        const prevChar = target[targetIndex - 1];

        if (SEPARATORS.has(prevChar)) {
          charScore += SCORE_SEPARATOR;
        } else if (
          isLowerCase(prevChar) &&
          isUpperCase(targetChar)
        ) {
          charScore += SCORE_CAMEL_CASE;
        } else if (isDigit(prevChar) && !isDigit(targetChar)) {
          charScore += SCORE_CAMEL_CASE;
        }
      }

      if (targetChar === queryChar) {
        charScore += SCORE_CASE_MATCH;
      }

      score += charScore;
      lastMatchIndex = targetIndex;
      queryIndex++;
    }

    targetIndex++;
  }

  if (queryIndex < query.length) {
    return null;
  }

  // Quality checks
  const minScore = query.length * MIN_SCORE_PER_CHAR;
  if (score < minScore) {
    return null;
  }

  const matchSpan = positions[positions.length - 1] - positions[0] + 1;
  const spanRatio = matchSpan / query.length;
  if (spanRatio > MAX_MATCH_SPAN_RATIO) {
    return null;
  }

  const averageGap = positions.length > 1 ? totalGap / (positions.length - 1) : 0;
  if (averageGap > MAX_AVERAGE_GAP) {
    return null;
  }

  // Bonus for matching more characters consecutively
  if (positions.length > 1) {
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] === positions[i - 1] + 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    score += maxConsecutive * 3;
  }

  return { score, positions };
}

// Helper functions
function isUpperCase(char: string): boolean {
  return char >= 'A' && char <= 'Z';
}

function isLowerCase(char: string): boolean {
  return char >= 'a' && char <= 'z';
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

// URL detection and creation helpers
export function isUrl(text: string): boolean {
  try {
    new URL(text.startsWith('http') ? text : `http://${text}`);
    return text.includes('.') || text.startsWith('http');
  } catch {
    return false;
  }
}

export function createSearchUrl(query: string): string {
  query = query.trim();
  if (isUrl(query)) {
    return query.startsWith('http') ? query : `https://${query}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
