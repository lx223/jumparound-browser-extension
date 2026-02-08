import type { TabInfo } from '../types';

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

export async function switchToTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);

  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

export function getI18nMessage(key: string): string {
  return chrome.i18n.getMessage(key);
}
