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

// History threshold: 24 hours in milliseconds
const HISTORY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Separators that indicate word boundaries
const SEPARATORS = new Set(['/', '\\', '-', '_', '.', ' ', ':', ',', ';', '|', '(', ')', '[', ']', '{', '}']);

/**
 * Two-tier fuzzy search system:
 * Tier 1 (Active tabs):
 *   1. Search by URL
 *   2. If no matches, search by title
 *
 * Tier 2 (History tabs - last 24 hours):
 *   3. If still no matches, search history by URL
 *   4. If still no matches, search history by title
 */
export function createTabSearcher(tabs: TabInfo[]) {
  return {
    search: (query: string): SearchResult[] => {
      if (!query.trim()) {
        return tabs
          .filter(tab => !tab.isHistoryTab)
          .map(tab => ({
            item: tab,
            score: 0,
            matchedField: 'url' as const,
            searchTier: 'tabs-url' as const,
          }));
      }

      // Separate active tabs from history tabs
      const activeTabs = tabs.filter(tab => !tab.isHistoryTab);
      const historyTabs = tabs.filter(tab => tab.isHistoryTab);

      // Tier 1.1: Search active tabs by URL
      let results = searchByField(activeTabs, query, 'url', 'tabs-url');
      if (results.length > 0) {
        return results;
      }

      // Tier 1.2: Search active tabs by title
      results = searchByField(activeTabs, query, 'title', 'tabs-title');
      if (results.length > 0) {
        return results;
      }

      // Tier 2.1: Search history tabs by URL
      results = searchByField(historyTabs, query, 'url', 'history-url');
      if (results.length > 0) {
        return results;
      }

      // Tier 2.2: Search history tabs by title
      results = searchByField(historyTabs, query, 'title', 'history-title');
      return results;
    },
  };
}

/**
 * Search tabs by a specific field (url or title)
 */
function searchByField(
  tabs: TabInfo[],
  query: string,
  field: 'url' | 'title',
  tier: SearchResult['searchTier']
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const tab of tabs) {
    const target = field === 'url' ? tab.url : tab.title;
    const match = fuzzyScore(target, query);

    if (match) {
      const result: SearchResult = {
        item: tab,
        score: match.score,
        matchedField: field,
        searchTier: tier,
      };

      // Add highlight information
      if (field === 'url') {
        result.urlHighlight = {
          text: tab.url,
          positions: match.positions,
        };
      } else {
        result.titleHighlight = {
          text: tab.title,
          positions: match.positions,
        };
      }

      results.push(result);
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Fuzzy scoring algorithm with quality checks and position tracking.
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
  if (isUrl(query)) {
    return query.startsWith('http') ? query : `https://${query}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Check if a tab should be considered a history tab (older than 24 hours)
 */
export function isHistoryTab(lastAccessed: number): boolean {
  return Date.now() - lastAccessed > HISTORY_THRESHOLD_MS;
}
