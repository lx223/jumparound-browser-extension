import type { TabInfo } from '../types';

interface SearchResult {
  item: TabInfo;
  score: number;
}

enum MatchType {
  EXACT = 1000,
  PREFIX = 800,
  WORD_BOUNDARY = 600,
  CONTAINS = 400,
  FUZZY = 200,
  NO_MATCH = 0,
}

/**
 * Hybrid search that prioritizes exact/prefix matches, then falls back to fuzzy matching.
 * Also considers tab recency as a tie-breaker.
 */
export function createTabSearcher(tabs: TabInfo[]) {
  return {
    search: (query: string): SearchResult[] => {
      if (!query.trim()) {
        return tabs.map(tab => ({ item: tab, score: 0 }));
      }

      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

      const results = tabs.map(tab => {
        const titleScore = scoreText(tab.title, queryLower, queryWords);
        const urlScore = scoreText(tab.url, queryLower, queryWords);

        // Title is more important than URL
        const matchScore = Math.max(titleScore * 2, urlScore);

        // Add recency bonus (more recent tabs get slight boost)
        const recencyBonus = calculateRecencyBonus(tab.lastAccessed);

        return {
          item: tab,
          score: matchScore + recencyBonus,
        };
      });

      // Filter out non-matches and sort by score descending
      return results
        .filter(r => r.score > MatchType.NO_MATCH)
        .sort((a, b) => b.score - a.score);
    },
  };
}

/**
 * Score a text against query and query words.
 * Prioritizes: exact > prefix > word boundary > contains > fuzzy
 */
function scoreText(text: string, query: string, queryWords: string[]): number {
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower === query) {
    return MatchType.EXACT;
  }

  // Prefix match
  if (textLower.startsWith(query)) {
    return MatchType.PREFIX;
  }

  // Multi-word query: check if all words match
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every(word => {
      // Check word boundaries or contains
      const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(word)}`, 'i');
      return wordBoundaryRegex.test(text) || textLower.includes(word);
    });

    if (allWordsMatch) {
      // Check if query words appear in order
      const inOrder = isInOrder(textLower, queryWords);
      return inOrder ? MatchType.WORD_BOUNDARY : MatchType.CONTAINS;
    }
  }

  // Single word or fallback: word boundary match
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(query)}`, 'i');
  if (wordBoundaryRegex.test(text)) {
    return MatchType.WORD_BOUNDARY;
  }

  // Contains match
  if (textLower.includes(query)) {
    return MatchType.CONTAINS;
  }

  // Fuzzy match (characters in sequence)
  const fuzzyScore = fuzzyMatch(textLower, query);
  if (fuzzyScore > 0.6) {
    // Require at least 60% character match
    return MatchType.FUZZY * fuzzyScore;
  }

  return MatchType.NO_MATCH;
}

/**
 * Check if words appear in order in the text
 */
function isInOrder(text: string, words: string[]): boolean {
  let lastIndex = -1;
  for (const word of words) {
    const index = text.indexOf(word, lastIndex + 1);
    if (index === -1) return false;
    lastIndex = index;
  }
  return true;
}

/**
 * Fuzzy match: check if query characters appear in sequence in text
 * Returns a score between 0 and 1
 */
function fuzzyMatch(text: string, query: string): number {
  let textIndex = 0;
  let queryIndex = 0;
  let matchCount = 0;

  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      matchCount++;
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === query.length ? matchCount / query.length : 0;
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

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
