import { describe, expect, it } from 'vitest';
import type { TabInfo } from '../types';
import { findDuplicateTabs, parseDuplicateFilter } from './tabSearch';

const tab = (id: number, url: string): TabInfo => ({ id, url, title: `Tab ${id}`, windowId: 1, active: false, lastAccessed: 100 - id });

describe('parseDuplicateFilter', () => {
  it('recognises @dup on its own or followed by search text', () => {
    expect(parseDuplicateFilter('@dup')).toBe('');
    expect(parseDuplicateFilter('  @DUP  github')).toBe('github');
  });
  it('ignores other queries, including words that only start with @dup', () => {
    expect(parseDuplicateFilter('github')).toBeNull();
    expect(parseDuplicateFilter('@duplicate')).toBeNull();
    expect(parseDuplicateFilter('find @dup')).toBeNull();
  });
});

describe('findDuplicateTabs', () => {
  it('keeps copies together in most-recent-first order and ignores #fragments', () => {
    const tabs = [tab(1, 'https://a.com/'), tab(2, 'https://b.com/'), tab(3, 'https://c.com/'),
      tab(4, 'https://a.com/#top'), tab(5, 'https://b.com/'), tab(6, 'https://a.com/?page=2')];
    expect(findDuplicateTabs(tabs).map(t => t.id)).toEqual([1, 4, 2, 5]);
  });
  it('returns nothing when every tab is unique', () => {
    expect(findDuplicateTabs([tab(1, 'https://a.com/'), tab(2, 'https://b.com/')])).toEqual([]);
  });
});
