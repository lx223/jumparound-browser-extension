import type { TabInfo } from '../types';

interface SearchResult {
  item: TabInfo;
  score: number;
}

enum MatchType {
  EXACT = 1000,
  PREFIX = 800,
  ALL_WORDS_IN_ORDER = 700,
  ALL_WORDS_ANY_ORDER = 650,
  PARTIAL_WORDS = 400, // Base score, scaled by match percentage
  FUZZY = 150, // Base score, scaled by fuzzy score
  NO_MATCH = 0,
}

/**
 * Hybrid search optimized for tab switching with 30-100 tabs.
 * Prioritizes word-boundary matches and strict fuzzy matching.
 * Does NOT match in middle of words to reduce noise.
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

        // Title is significantly more important than URL
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
 * Prioritizes: exact > prefix > all words (in order) > all words (any order) > partial words > fuzzy
 *
 * IMPORTANT: Only matches at word boundaries, not in middle of words.
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

  // For multi-word queries, evaluate word-by-word
  if (queryWords.length > 1) {
    return scoreMultiWord(textLower, text, queryWords);
  }

  // Single word: check word boundary match
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(query)}`, 'i');
  if (wordBoundaryRegex.test(text)) {
    return MatchType.ALL_WORDS_IN_ORDER; // Treat single word boundary match as high score
  }

  // Fuzzy match with strict 80% threshold
  const fuzzyScore = fuzzyMatch(textLower, query);
  if (fuzzyScore >= 0.8) {
    // Require at least 80% character match
    return MatchType.FUZZY * fuzzyScore;
  }

  return MatchType.NO_MATCH;
}

/**
 * Score multi-word queries.
 * Allows partial matches but scores based on percentage of words matched.
 */
function scoreMultiWord(textLower: string, text: string, queryWords: string[]): number {
  const matchedWords: boolean[] = [];
  const wordPositions: number[] = [];

  // Check which words match at word boundaries
  for (const word of queryWords) {
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(word)}`, 'i');
    const match = wordBoundaryRegex.test(text);
    matchedWords.push(match);

    if (match) {
      // Find position for order checking
      const pos = textLower.indexOf(word);
      wordPositions.push(pos);
    } else {
      wordPositions.push(-1);
    }
  }

  const matchCount = matchedWords.filter(m => m).length;

  // No words matched at boundaries
  if (matchCount === 0) {
    return MatchType.NO_MATCH;
  }

  // All words matched
  if (matchCount === queryWords.length) {
    // Check if words appear in order
    const inOrder = isInOrder(wordPositions);
    return inOrder ? MatchType.ALL_WORDS_IN_ORDER : MatchType.ALL_WORDS_ANY_ORDER;
  }

  // Partial word match: scale score by percentage of words matched
  const matchPercentage = matchCount / queryWords.length;

  // Only return results if at least 50% of words match
  if (matchPercentage < 0.5) {
    return MatchType.NO_MATCH;
  }

  // Scale between PARTIAL_WORDS base (400) and ALL_WORDS_ANY_ORDER (650)
  return MatchType.PARTIAL_WORDS + (matchPercentage * 250);
}

/**
 * Check if word positions appear in order (ignoring -1 for non-matches)
 */
function isInOrder(positions: number[]): boolean {
  const validPositions = positions.filter(p => p !== -1);
  if (validPositions.length <= 1) return true;

  for (let i = 1; i < validPositions.length; i++) {
    if (validPositions[i] < validPositions[i - 1]) {
      return false;
    }
  }
  return true;
}

/**
 * Fuzzy match: check if query characters appear in sequence in text
 * Returns a score between 0 and 1
 *
 * Stricter than before - requires 80% threshold instead of 60%
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
