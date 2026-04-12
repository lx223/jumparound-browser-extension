import type { TabInfo } from '../types';

const HISTORY_MAX_RESULTS = 100;
const HISTORY_DAYS = 3;
const HISTORY_MAX_PER_DOMAIN = 3;

export async function getAllTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});
  const currentWindow = await chrome.windows.getCurrent();

  const now = Date.now();
  const currentTabs: TabInfo[] = tabs.map((tab, index) => ({
    id: tab.id!,
    title: tab.title || '',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl,
    windowId: tab.windowId,
    active: tab.active && tab.windowId === currentWindow.id,
    lastAccessed:
      tab.lastAccessed ??
      (tab.active ? now : now - (index + 1) * 1000),
  }));

  return currentTabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
}

export function searchHistory(): Promise<chrome.history.HistoryItem[]> {
  return chrome.history.search({
    text: '',
    maxResults: HISTORY_MAX_RESULTS,
    startTime: Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function filterHistoryItems(
  historyItems: chrome.history.HistoryItem[],
  openTabs: TabInfo[],
): TabInfo[] {
  const openUrls = new Set(openTabs.map(tab => tab.url));

  const domainCount = new Map<string, number>();

  return historyItems
    .filter(item => {
      if (!item.url || openUrls.has(item.url)) return false;
      try {
        const domain = new URL(item.url).hostname;
        const count = domainCount.get(domain) ?? 0;
        if (count >= HISTORY_MAX_PER_DOMAIN) return false;
        domainCount.set(domain, count + 1);
        return true;
      } catch {
        return true;
      }
    })
    .map((item, index) => ({
      id: -(index + 1),
      title: item.title || '',
      url: item.url!,
      favIconUrl: undefined,
      windowId: -1,
      active: false,
      lastAccessed: item.lastVisitTime ?? 0,
      isHistoryTab: true,
    }));
}

export async function switchToTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);

  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

export function getI18nMessage(key: string): string {
  return chrome.i18n.getMessage(key);
}
