import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllTabs, getRecentlyClosedTabs } from './tabManager';

describe('getAllTabs', () => {
  const currentWindowId = 1;

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(),
      },
      windows: {
        getCurrent: vi.fn().mockResolvedValue({ id: currentWindowId }),
      },
    });
  });

  describe('sorting by lastAccessed', () => {
    it('sorts tabs by lastAccessed descending when API returns lastAccessed', async () => {
      const t = Date.now();
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, title: 'A', url: 'https://a.com', windowId: 1, active: false, lastAccessed: t - 3000 },
        { id: 2, title: 'B', url: 'https://b.com', windowId: 1, active: false, lastAccessed: t - 1000 },
        { id: 3, title: 'C', url: 'https://c.com', windowId: 1, active: true, lastAccessed: t - 2000 },
      ]);

      const result = await getAllTabs();

      expect(result.map((tab) => ({ id: tab.id, lastAccessed: tab.lastAccessed }))).toEqual([
        { id: 2, lastAccessed: t - 1000 },
        { id: 3, lastAccessed: t - 2000 },
        { id: 1, lastAccessed: t - 3000 },
      ]);
    });

    it('uses chrome lastAccessed when present on each tab', async () => {
      const t = 9000;
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, title: 'X', url: 'https://x.com', windowId: 1, active: false, lastAccessed: t },
      ]);

      const result = await getAllTabs();

      expect(result).toHaveLength(1);
      expect(result[0].lastAccessed).toBe(t);
    });

    it('falls back to computed lastAccessed when API omits lastAccessed', async () => {
      const before = Date.now();
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, title: 'First', url: 'https://first.com', windowId: 1, active: false },
        { id: 2, title: 'Active', url: 'https://active.com', windowId: 1, active: true },
        { id: 3, title: 'Third', url: 'https://third.com', windowId: 1, active: false },
      ]);

      const result = await getAllTabs();
      const after = Date.now();

      // Active tab gets now; others get now - (index+1)*1000
      expect(result[0].lastAccessed).toBeGreaterThanOrEqual(before);
      expect(result[0].lastAccessed).toBeLessThanOrEqual(after);
      expect(result[0].id).toBe(2); // active tab first
      expect(result[1].lastAccessed).toBeLessThan(result[0].lastAccessed);
      expect(result[2].lastAccessed).toBeLessThan(result[1].lastAccessed);
    });

    it('sorts correctly with mixed lastAccessed (some from API, some fallback)', async () => {
      const t = Date.now();
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, title: 'A', url: 'https://a.com', windowId: 1, active: false, lastAccessed: t - 5000 },
        { id: 2, title: 'B', url: 'https://b.com', windowId: 1, active: false },
        { id: 3, title: 'C', url: 'https://c.com', windowId: 1, active: true, lastAccessed: t - 1000 },
      ]);

      const result = await getAllTabs();

      // Tab 3 has lastAccessed t-1000 (from API), should be first
      expect(result[0].id).toBe(3);
      expect(result[0].lastAccessed).toBe(t - 1000);
      // Tab 2 has fallback (now - 2000), tab 1 has t-5000
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(1);
      expect(result[2].lastAccessed).toBe(t - 5000);
    });
  });
});

it('requests tabs and the current window concurrently', async () => {
  let resolveTabs!: (tabs: chrome.tabs.Tab[]) => void;
  vi.stubGlobal('chrome', {
    tabs: { query: vi.fn(() => new Promise<chrome.tabs.Tab[]>(resolve => { resolveTabs = resolve; })) },
    windows: { getCurrent: vi.fn().mockResolvedValue({ id: 1 }) },
  });
  const pending = getAllTabs();
  expect(chrome.windows.getCurrent).toHaveBeenCalledOnce();
  resolveTabs([]);
  await expect(pending).resolves.toEqual([]);
  vi.unstubAllGlobals();
});

it('searches all of history for typed text, but only recent history otherwise', async () => {
  const search = vi.fn().mockResolvedValue([]);
  vi.stubGlobal('chrome', { history: { search } });
  const { searchHistory } = await import('./tabManager');
  await searchHistory('invoice');
  expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'invoice', startTime: 0 }));
  await searchHistory();
  expect(search.mock.lastCall![0].startTime).toBeGreaterThan(0);
  vi.unstubAllGlobals();
});

it('caps history per domain only when asked to', async () => {
  const { filterHistoryItems } = await import('./tabManager');
  const items = Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, url: `https://a.com/${i}`, title: `${i}` }));
  expect(filterHistoryItems(items, [])).toHaveLength(3);
  expect(filterHistoryItems(items, [], Infinity)).toHaveLength(5);
});

it('lists recently closed tabs that are not open again, newest first', async () => {
  const closedTab = (sessionId: string | undefined, url: string) => ({ sessionId, url, title: url.toUpperCase(), favIconUrl: undefined });
  vi.stubGlobal('chrome', { sessions: { getRecentlyClosed: vi.fn().mockResolvedValue([
    { lastModified: 1_700_000_000, tab: closedTab('a', 'https://a.example/') },
    { lastModified: 1_699_999_990, window: { tabs: [] } },
    { lastModified: 1_699_999_980, tab: closedTab('b', 'https://open.example/') },
    { lastModified: 1_699_999_970, tab: closedTab('c', 'https://a.example/') },
    { lastModified: 1_699_999_960, tab: closedTab(undefined, 'https://no-session.example/') },
    { lastModified: 1_699_999_950_123, tab: closedTab('d', 'https://ms.example/') },
  ]) } });
  const open = [{ id: 1, title: 'Open', url: 'https://open.example/', windowId: 1, active: true, lastAccessed: 1 }];
  expect(await getRecentlyClosedTabs(open)).toEqual([
    { id: -1, title: 'HTTPS://A.EXAMPLE/', url: 'https://a.example/', favIconUrl: undefined, windowId: -1, active: false,
      lastAccessed: 1_700_000_000_000, isClosedTab: true, sessionId: 'a' },
    { id: -2, title: 'HTTPS://MS.EXAMPLE/', url: 'https://ms.example/', favIconUrl: undefined, windowId: -1, active: false,
      lastAccessed: 1_699_999_950_123, isClosedTab: true, sessionId: 'd' },
  ]);
  vi.unstubAllGlobals();
});
