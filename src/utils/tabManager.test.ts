import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllTabs } from './tabManager';

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
      history: {
        search: vi.fn().mockResolvedValue([]),
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
