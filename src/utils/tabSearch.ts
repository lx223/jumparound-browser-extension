import type { TabInfo } from '../types';

interface SearchResult {
  item: TabInfo;
  score: number;
}

interface MatchResult {
  score: number;
  positions: number[];
}

// Scoring constants inspired by VS Code's fuzzy scorer
const SCORE_BASE = 1; // Base score for each matched character
const SCORE_CONSECUTIVE_BONUS = 5; // Bonus for consecutive matches
const SCORE_WORD_START = 8; // Match at start of word
const SCORE_CAMEL_CASE = 2; // Match at camelCase boundary
const SCORE_SEPARATOR = 4; // Match after separator (/, -, _, .)
const SCORE_CASE_MATCH = 1; // Exact case match bonus

// Quality thresholds
const MIN_SCORE_PER_CHAR = 2; // Minimum average score per query character
const MAX_MATCH_SPAN_RATIO = 8; // Max ratio of match span to query length
const GAP_PENALTY = 0.5; // Penalty per character gap
const MAX_AVERAGE_GAP = 15; // If average gap > 15 chars, probably not a good match

// Separators that indicate word boundaries
const SEPARATORS = new Set(['/', '\\', '-', '_', '.', ' ', ':', ',', ';', '|', '(', ')', '[', ']', '{', '}']);

/**
 * VS Code-inspired fuzzy search optimized for tab switching.
 * Features:
 * - Consecutive character bonus
 * - Position-based scoring (word start, camelCase, separators)
 * - Case sensitivity awareness
 * - Sequential matching
 * - Gap penalties and match quality checks
 */
export function createTabSearcher(tabs: TabInfo[]) {
  return {
    search: (query: string): SearchResult[] => {
      if (!query.trim()) {
        return tabs.map(tab => ({ item: tab, score: 0 }));
      }

      const results = tabs.map(tab => {
        // Score both title and URL, prioritize title
        const titleMatch = fuzzyScore(tab.title, query);
        const urlMatch = fuzzyScore(tab.url, query);

        // Title is 2x more important than URL
        const matchScore = Math.max(
          titleMatch ? titleMatch.score * 2 : 0,
          urlMatch ? urlMatch.score : 0
        );

        // Add recency bonus for recently accessed tabs
        const recencyBonus = calculateRecencyBonus(tab.lastAccessed);

        return {
          item: tab,
          score: matchScore + recencyBonus,
        };
      });

      // Filter out non-matches and sort by score descending
      return results
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);
    },
  };
}

/**
 * VS Code-inspired fuzzy scoring algorithm with quality checks.
 *
 * Key improvements:
 * - Gap penalties for scattered matches
 * - Minimum score threshold
 * - Match density checks
 * - Rejects low-quality matches
 */
function fuzzyScore(target: string, query: string): MatchResult | null {
  if (!target || !query) return null;

  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

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

  // Quick contains check for short queries (boost for substring matches)
  if (query.length >= 3 && targetLower.includes(queryLower)) {
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
      // Character matched!
      positions.push(targetIndex);

      // Calculate gap from last match
      if (lastMatchIndex !== -1) {
        const gap = targetIndex - lastMatchIndex - 1;
        totalGap += gap;

        // Apply gap penalty for large gaps
        if (gap > 0) {
          score -= gap * GAP_PENALTY;
        }
      }

      // Base score
      let charScore = SCORE_BASE;

      // Consecutive bonus
      if (lastMatchIndex === targetIndex - 1) {
        consecutiveCount++;
        charScore += SCORE_CONSECUTIVE_BONUS;
      } else {
        consecutiveCount = 0;
      }

      // Position-based bonuses
      if (targetIndex === 0) {
        // Start of string (very strong)
        charScore += SCORE_WORD_START;
      } else {
        const prevChar = target[targetIndex - 1];

        // After separator (strong)
        if (SEPARATORS.has(prevChar)) {
          charScore += SCORE_SEPARATOR;
        }
        // camelCase or PascalCase (moderate)
        else if (
          isLowerCase(prevChar) &&
          isUpperCase(targetChar)
        ) {
          charScore += SCORE_CAMEL_CASE;
        }
        // After number (moderate)
        else if (isDigit(prevChar) && !isDigit(targetChar)) {
          charScore += SCORE_CAMEL_CASE;
        }
      }

      // Case sensitivity bonus
      if (targetChar === queryChar) {
        charScore += SCORE_CASE_MATCH;
      }

      score += charScore;
      lastMatchIndex = targetIndex;
      queryIndex++;
    }

    targetIndex++;
  }

  // If we didn't match all query characters, no match
  if (queryIndex < query.length) {
    return null;
  }

  // Quality checks - reject low-quality matches

  // 1. Check minimum score threshold
  const minScore = query.length * MIN_SCORE_PER_CHAR;
  if (score < minScore) {
    return null;
  }

  // 2. Check match density - span should be reasonable relative to query length
  const matchSpan = positions[positions.length - 1] - positions[0] + 1;
  const spanRatio = matchSpan / query.length;
  if (spanRatio > MAX_MATCH_SPAN_RATIO) {
    // Match is too spread out
    return null;
  }

  // 3. Check average gap size
  const averageGap = positions.length > 1 ? totalGap / (positions.length - 1) : 0;
  if (averageGap > MAX_AVERAGE_GAP) {
    // Characters are too scattered
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
    // Give bonus for long consecutive sequences
    score += maxConsecutive * 3;
  }

  return { score, positions };
}

/**
 * Calculate recency bonus based on lastAccessed timestamp
 * More recent tabs get a small boost (max 50 points)
 */
function calculateRecencyBonus(lastAccessed: number): number {
  const now = Date.now();
  const ageInMinutes = (now - lastAccessed) / (1000 * 60);

  // Tabs accessed within last 5 minutes get full bonus
  if (ageInMinutes < 5) return 50;
  // Linear decay over 60 minutes
  if (ageInMinutes < 60) return 50 * (1 - ageInMinutes / 60);
  // Older tabs get minimal bonus
  return 5;
}

// Helper functions for character classification
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
  if (isUrl(query)) {
    return query.startsWith('http') ? query : `https://${query}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
