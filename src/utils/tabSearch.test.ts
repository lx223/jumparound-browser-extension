import { describe, it, expect, beforeEach } from 'vitest';
import { createTabSearcher } from './tabSearch';
import type { TabInfo } from '../types';

describe('tabSearch - fuzzy search system', () => {
  let mockTabs: TabInfo[];
  const now = Date.now();

  beforeEach(() => {
    mockTabs = [
      {
        id: 1,
        title: 'GitHub - My Repository',
        url: 'https://github.com/user/my-repo',
        windowId: 1,
        active: false,
        lastAccessed: now - 1000,
      },
      {
        id: 2,
        title: 'Stack Overflow - Question',
        url: 'https://stackoverflow.com/questions/12345',
        windowId: 1,
        active: false,
        lastAccessed: now - 2000,
      },
      {
        id: 3,
        title: 'Google Search Results',
        url: 'https://www.google.com/search?q=test',
        windowId: 1,
        active: true,
        lastAccessed: now,
      },
    ];
  });

  describe('Tier 1.1: Search active tabs by URL', () => {
    it('should match tabs by URL fuzzy search', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('github');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(1);
    });

    it('should highlight matched characters', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('github');

      // Best match field gets highlight (could be URL or title depending on score)
      const highlight = results[0].urlHighlight ?? results[0].titleHighlight;
      expect(highlight).toBeDefined();
      expect(highlight?.positions).toEqual(
        expect.arrayContaining([expect.any(Number)])
      );
    });

    it('should match multiple tabs and sort by score', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('com');

      expect(results.length).toBeGreaterThan(0);
      // Verify descending score order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should handle exact URL matches with high score', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('https://github.com/user/my-repo');

      expect(results).toHaveLength(1);
      expect(results[0].score).toBeGreaterThan(1000);
    });

    it('should handle URL prefix matches', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('https://github');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(1);
      expect(results[0].score).toBeGreaterThan(500);
    });

    it('should handle substring matches in URLs', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('stackoverflow');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(2);
      expect(results[0].matchedField).toBe('url');
    });
  });

  describe('Tier 1.2: Search active tabs by title (if no URL matches)', () => {
    it('should fall back to title search when no URL matches', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('Repository');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(1);
      expect(results[0].matchedField).toBe('title');
      expect(results[0].searchTier).toBe('tabs-title');
    });

    it('should highlight matched characters in title', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('Repository');

      expect(results[0].titleHighlight).toBeDefined();
      expect(results[0].titleHighlight?.positions).toEqual(
        expect.arrayContaining([expect.any(Number)])
      );
      expect(results[0].titleHighlight?.text).toBe('GitHub - My Repository');
    });

    it('should match fuzzy title searches', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('srch');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(3);
      expect(results[0].matchedField).toBe('title');
    });

    it('should match items appearing in both URL and title', () => {
      // 'google' appears in both URL and title of tab 3
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('google');

      expect(results[0].item.id).toBe(3);
    });
  });

  describe('Empty query handling', () => {
    it('should return all tabs when query is empty', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('');

      expect(results).toHaveLength(mockTabs.length);
    });

    it('should return all tabs when query is only whitespace', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('   ');

      expect(results).toHaveLength(mockTabs.length);
    });
  });

  describe('No matches scenario', () => {
    it('should return empty array when no matches found in any tier', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('nonexistentxyzabc123');

      expect(results).toHaveLength(0);
    });
  });

  describe('Character highlighting', () => {
    it('should provide correct positions for consecutive matches', () => {
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: 'Test Page',
          url: 'https://github.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('github');

      expect(results[0].urlHighlight?.positions).toBeDefined();
      const positions = results[0].urlHighlight!.positions;

      // Verify positions are in ascending order
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      }
    });

    it('should provide positions for scattered matches', () => {
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: 'GitHub Repository',
          url: 'https://example.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('ghry'); // g-h-r-y scattered in "GitHub Repository"

      expect(results[0].titleHighlight?.positions.length).toBe(4);
    });
  });

  describe('Edge cases', () => {
    it('should handle tabs with empty titles', () => {
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: '',
          url: 'https://example.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('example');

      expect(results).toHaveLength(1);
      expect(results[0].matchedField).toBe('url');
    });

    it('should handle tabs with empty URLs', () => {
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: 'Test Page',
          url: '',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].matchedField).toBe('title');
    });

    it('should handle case-insensitive searches', () => {
      const searcher = createTabSearcher(mockTabs);
      const results1 = searcher.search('GITHUB');
      const results2 = searcher.search('github');
      const results3 = searcher.search('GiThUb');

      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results3).toHaveLength(1);
      expect(results1[0].item.id).toBe(results2[0].item.id);
      expect(results2[0].item.id).toBe(results3[0].item.id);
    });

    it('should handle special characters in search query', () => {
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: 'Test-Page',
          url: 'https://example.com/path-to-page',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('path-to');

      expect(results).toHaveLength(1);
    });

    it('should handle very long search queries', () => {
      const searcher = createTabSearcher(mockTabs);
      const longQuery = 'a'.repeat(1000);
      const results = searcher.search(longQuery);

      expect(results).toHaveLength(0);
    });

    it('should handle empty tabs array', () => {
      const searcher = createTabSearcher([]);
      const results = searcher.search('test');

      expect(results).toHaveLength(0);
    });
  });

  describe('Scoring behavior', () => {
    it('should score exact matches higher than partial matches', () => {
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: 'test',
          url: 'https://test.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
        {
          id: 2,
          title: 'testing something',
          url: 'https://example.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('test');

      expect(results[0].item.id).toBe(1);
      expect(results[0].score).toBeGreaterThan(results[1]?.score || 0);
    });

    it('should score consecutive character matches higher', () => {
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: 'abc',
          url: 'https://abc.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
        {
          id: 2,
          title: 'a-b-c',
          url: 'https://example.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('abc');

      expect(results[0].item.id).toBe(1);
    });
  });
});

describe('navigation relevance', () => {
  const tab = (id: number, title: string, url: string, lastAccessed = 0): TabInfo => ({
    id, title, url, lastAccessed, windowId: 1, active: false,
  });

  it('matches words across site and title in either order with accurate highlights', () => {
    const item = tab(1, 'Billing settings', 'https://github.com/organizations/acme');
    const searcher = createTabSearcher([item]);
    for (const query of ['github billing', 'billing github', '  GitHub   BILLING  ']) {
      const [result] = searcher.search(query);
      expect(result.item.id).toBe(1);
      expect(result.titleHighlight?.positions.map(i => item.title[i]).join('')).toBe('Billing');
      expect(result.urlHighlight?.positions.map(i => item.url[i]).join('')).toBe('github');
    }
    expect(searcher.search('github billing missing')).toEqual([]);
  });

  it('finds title words regardless of query order and merges overlapping highlights', () => {
    const item = tab(1, 'Quarterly budget', 'https://example.com');
    const [result] = createTabSearcher([item]).search('budget quarterly budget');
    expect(result.titleHighlight?.positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]);
  });

  it('puts matching open tabs before exact history matches', () => {
    const open = tab(1, 'Pull requests · GitHub', 'https://github.com/pulls');
    const history = { ...tab(2, 'GitHub', 'https://github.com/old'), isHistoryTab: true };
    expect(createTabSearcher([open], [history]).search('github').map(r => r.item.id)).toEqual([1, 2]);
  });

  it('uses recency for equal matches, while keeping stronger matches first', () => {
    const items = [tab(1, 'Budget overview', '', 1), tab(2, 'Budget overview', '', 10), tab(3, 'budget', '', 0)];
    expect(createTabSearcher(items).search('budget').map(r => r.item.id)).toEqual([3, 2, 1]);
  });

  it('prefers a site name over an incidental query-string match', () => {
    const items = [tab(1, 'Other page', 'https://example.com/?q=github'), tab(2, 'Pull requests', 'https://github.com/pulls')];
    expect(createTabSearcher(items).search('github').map(r => r.item.id)).toEqual([2, 1]);
  });

  it('finds short contiguous matches after an earlier scattered character', () => {
    const [result] = createTabSearcher([tab(1, 'A long way to ab', '')]).search('ab');
    expect(result.titleHighlight?.positions).toEqual([14, 15]);
  });
});
