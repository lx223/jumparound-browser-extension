import Fuse from 'fuse.js';
import type { TabInfo } from '../types';

export function createTabSearcher(tabs: TabInfo[]) {
  return new Fuse(tabs, {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'url', weight: 0.3 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
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
