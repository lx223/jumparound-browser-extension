import { describe, it, expect, beforeEach } from 'vitest';
import { createTabSearcher, isHistoryTab } from './tabSearch';
import type { TabInfo } from '../types';

describe('tabSearch - 2-tier fuzzy search system', () => {
  let mockTabs: TabInfo[];
  let mockHistoryTabs: TabInfo[];
  const now = Date.now();

  beforeEach(() => {
    // Mock current tabs (active tabs)
    mockTabs = [
      {
        id: 1,
        title: 'GitHub - My Repository',
        url: 'https://github.com/user/my-repo',
        windowId: 1,
        active: false,
        lastAccessed: now - 1000,
        isHistoryTab: false,
      },
      {
        id: 2,
        title: 'Stack Overflow - Question',
        url: 'https://stackoverflow.com/questions/12345',
        windowId: 1,
        active: false,
        lastAccessed: now - 2000,
        isHistoryTab: false,
      },
      {
        id: 3,
        title: 'Google Search Results',
        url: 'https://www.google.com/search?q=test',
        windowId: 1,
        active: true,
        lastAccessed: now,
        isHistoryTab: false,
      },
    ];

    // Mock history tabs (from last 24 hours)
    mockHistoryTabs = [
      {
        id: 101,
        title: 'Reddit - Programming Discussion',
        url: 'https://reddit.com/r/programming',
        windowId: 1,
        active: false,
        lastAccessed: now - 20 * 60 * 60 * 1000, // 20 hours ago
        isHistoryTab: true,
      },
      {
        id: 102,
        title: 'NPM Package Documentation',
        url: 'https://npmjs.com/package/react',
        windowId: 1,
        active: false,
        lastAccessed: now - 23 * 60 * 60 * 1000, // 23 hours ago
        isHistoryTab: true,
      },
    ];
  });

  describe('Tier 1.1: Search active tabs by URL', () => {
    it('should match tabs by URL fuzzy search', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('github');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(1);
      expect(results[0].matchedField).toBe('url');
      expect(results[0].searchTier).toBe('tabs-url');
    });

    it('should highlight matched characters in URL', () => {
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('github');

      expect(results[0].urlHighlight).toBeDefined();
      expect(results[0].urlHighlight?.positions).toEqual(
        expect.arrayContaining([expect.any(Number)])
      );
      expect(results[0].urlHighlight?.text).toBe('https://github.com/user/my-repo');
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

    it('should prioritize URL matches over title matches', () => {
      // 'google' appears in both URL and title of tab 3
      const searcher = createTabSearcher(mockTabs);
      const results = searcher.search('google');

      // Should match by URL first
      expect(results[0].matchedField).toBe('url');
      expect(results[0].searchTier).toBe('tabs-url');
    });
  });

  describe('Tier 2.1: Search history tabs by URL (if no active tab matches)', () => {
    it('should fall back to history URL search when no active tabs match', () => {
      const allTabs = [...mockTabs, ...mockHistoryTabs];
      const searcher = createTabSearcher(allTabs);
      const results = searcher.search('reddit');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(101);
      expect(results[0].item.isHistoryTab).toBe(true);
      expect(results[0].matchedField).toBe('url');
      expect(results[0].searchTier).toBe('history-url');
    });

    it('should highlight matched characters in history tab URL', () => {
      const allTabs = [...mockTabs, ...mockHistoryTabs];
      const searcher = createTabSearcher(allTabs);
      const results = searcher.search('npmjs');

      expect(results[0].urlHighlight).toBeDefined();
      expect(results[0].urlHighlight?.text).toBe('https://npmjs.com/package/react');
    });

    it('should only search history when active tabs have no matches', () => {
      const allTabs = [...mockTabs, ...mockHistoryTabs];
      const searcher = createTabSearcher(allTabs);

      // 'github' matches active tab URL, should not search history
      const results1 = searcher.search('github');
      expect(results1.every(r => !r.item.isHistoryTab)).toBe(true);
      expect(results1[0].searchTier).toBe('tabs-url');

      // 'reddit' only matches history tab URL
      const results2 = searcher.search('reddit');
      expect(results2[0].item.isHistoryTab).toBe(true);
      expect(results2[0].searchTier).toBe('history-url');
    });
  });

  describe('Tier 2.2: Search history tabs by title (if still no matches)', () => {
    it('should fall back to history title search as last resort', () => {
      const allTabs = [...mockTabs, ...mockHistoryTabs];
      const searcher = createTabSearcher(allTabs);
      const results = searcher.search('Programming Discussion');

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe(101);
      expect(results[0].item.isHistoryTab).toBe(true);
      expect(results[0].matchedField).toBe('title');
      expect(results[0].searchTier).toBe('history-title');
    });

    it('should highlight matched characters in history tab title', () => {
      const allTabs = [...mockTabs, ...mockHistoryTabs];
      const searcher = createTabSearcher(allTabs);
      const results = searcher.search('Documentation');

      expect(results[0].titleHighlight).toBeDefined();
      expect(results[0].titleHighlight?.text).toBe('NPM Package Documentation');
    });

    it('should respect search tier priority', () => {
      // Create tabs with overlapping content across tiers
      const tabs: TabInfo[] = [
        {
          id: 1,
          title: 'Other Page',
          url: 'https://example.com/test',
          windowId: 1,
          active: false,
          lastAccessed: now,
          isHistoryTab: false,
        },
        {
          id: 2,
          title: 'Test Title',
          url: 'https://different.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
          isHistoryTab: false,
        },
        {
          id: 101,
          title: 'History Page',
          url: 'https://test.com/page',
          windowId: 1,
          active: false,
          lastAccessed: now - 20 * 60 * 60 * 1000,
          isHistoryTab: true,
        },
        {
          id: 102,
          title: 'Test History',
          url: 'https://history.com',
          windowId: 1,
          active: false,
          lastAccessed: now - 20 * 60 * 60 * 1000,
          isHistoryTab: true,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('test');

      // Should match active tab URL first (tab 1)
      expect(results[0].item.id).toBe(1);
      expect(results[0].searchTier).toBe('tabs-url');
    });
  });

  describe('Empty query handling', () => {
    it('should return all active tabs when query is empty', () => {
      const allTabs = [...mockTabs, ...mockHistoryTabs];
      const searcher = createTabSearcher(allTabs);
      const results = searcher.search('');

      expect(results).toHaveLength(mockTabs.length);
      expect(results.every(r => !r.item.isHistoryTab)).toBe(true);
    });

    it('should return all active tabs when query is only whitespace', () => {
      const allTabs = [...mockTabs, ...mockHistoryTabs];
      const searcher = createTabSearcher(allTabs);
      const results = searcher.search('   ');

      expect(results).toHaveLength(mockTabs.length);
      expect(results.every(r => !r.item.isHistoryTab)).toBe(true);
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
          isHistoryTab: false,
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
          isHistoryTab: false,
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
          isHistoryTab: false,
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
          isHistoryTab: false,
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
          isHistoryTab: false,
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

    it('should handle tabs array with only history tabs', () => {
      const searcher = createTabSearcher(mockHistoryTabs);
      const results = searcher.search('reddit');

      expect(results).toHaveLength(1);
      expect(results[0].searchTier).toBe('history-url');
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
          isHistoryTab: false,
        },
        {
          id: 2,
          title: 'testing something',
          url: 'https://example.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
          isHistoryTab: false,
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
          isHistoryTab: false,
        },
        {
          id: 2,
          title: 'a-b-c',
          url: 'https://example.com',
          windowId: 1,
          active: false,
          lastAccessed: now,
          isHistoryTab: false,
        },
      ];

      const searcher = createTabSearcher(tabs);
      const results = searcher.search('abc');

      expect(results[0].item.id).toBe(1);
    });
  });
});

describe('isHistoryTab utility', () => {
  it('should identify tabs older than 24 hours as history tabs', () => {
    const now = Date.now();
    const over24Hours = now - 25 * 60 * 60 * 1000;

    expect(isHistoryTab(over24Hours)).toBe(true);
  });

  it('should identify recent tabs as not history tabs', () => {
    const now = Date.now();
    const recent = now - 1 * 60 * 60 * 1000; // 1 hour ago

    expect(isHistoryTab(recent)).toBe(false);
  });

  it('should handle exactly 24 hours edge case', () => {
    const now = Date.now();
    const exactly24Hours = now - 24 * 60 * 60 * 1000;

    expect(isHistoryTab(exactly24Hours)).toBe(false);
  });

  it('should handle future timestamps', () => {
    const now = Date.now();
    const future = now + 1000;

    expect(isHistoryTab(future)).toBe(false);
  });
});
