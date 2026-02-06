import type { TabInfo } from '../types';

const HISTORY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getAllTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});
  const currentWindow = await chrome.windows.getCurrent();

  // Get current tabs
  const currentTabs: TabInfo[] = tabs.map((tab, index) => ({
    id: tab.id!,
    title: tab.title || '',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl,
    windowId: tab.windowId,
    active: tab.active && tab.windowId === currentWindow.id,
    lastAccessed: tab.active ? Date.now() : Date.now() - (index + 1) * 1000,
    isHistoryTab: false,
  }));

  // Get history tabs from last 24 hours
  const now = Date.now();
  const oneDayAgo = now - HISTORY_THRESHOLD_MS;

  let historyTabs: TabInfo[] = [];
  try {
    const historyItems = await chrome.history.search({
      text: '',
      startTime: oneDayAgo,
      maxResults: 50,
    });

    // Filter out URLs that are already open in current tabs
    const currentUrls = new Set(currentTabs.map(tab => tab.url));

    historyTabs = historyItems
      .filter(item => item.url && !currentUrls.has(item.url))
      .map((item, index) => ({
        id: -(index + 1), // Negative IDs for history tabs
        title: item.title || '',
        url: item.url || '',
        favIconUrl: `chrome://favicon/${item.url}`,
        windowId: -1,
        active: false,
        lastAccessed: item.lastVisitTime || oneDayAgo,
        isHistoryTab: true,
      }));
  } catch (error) {
    console.warn('Failed to fetch history:', error);
  }

  // Combine and sort
  const allTabs = [...currentTabs, ...historyTabs];

  return allTabs.sort((a, b) => {
    // Active tabs from current window first
    if (a.windowId === currentWindow.id && b.windowId !== currentWindow.id) return -1;
    if (b.windowId === currentWindow.id && a.windowId !== currentWindow.id) return 1;

    // Then by last accessed
    return b.lastAccessed - a.lastAccessed;
  });
}

export async function switchToTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);

  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

export function getI18nMessage(key: string): string {
  return chrome.i18n.getMessage(key);
}
