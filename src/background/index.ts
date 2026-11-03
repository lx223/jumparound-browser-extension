import { analyticsTask, capture, flush, selectionMetadata, setConsent } from './analytics';
import type { Message } from '../types';
import { getAllTabs, searchHistory, filterHistoryItems, switchToTab } from '../utils/tabManager';

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'GET_TABS') {
    Promise.all([getAllTabs(), searchHistory()]).then(([tabs, historyItems]) => {
      const historyTabs = filterHistoryItems(historyItems, tabs);
      sendResponse({ tabs, historyTabs });
    });
    return true;
  }

  if (message.type === 'SWITCH_TAB' && message.tabId) {
    switchToTab(message.tabId).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  return false;
});

type OpeningState = { shortcutOpen?: { id: string; time: number } };

// A session-storage marker survives service worker restarts, but expires quickly.
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'open-switcher') return;
  void (async () => {
    const marker = { id: crypto.randomUUID(), time: Date.now() };
    await chrome.storage.session.set({ shortcutOpen: marker });
    try { await chrome.action.openPopup(); }
    catch {
      const state = await chrome.storage.session.get<OpeningState>('shortcutOpen');
      if (state.shortcutOpen?.id === marker.id) await chrome.storage.session.remove('shortcutOpen');
    }
  })().catch(() => {});
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'analytics-retry') void analyticsTask(flush);
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('src/content/index.html'))) return false;
  if (!['ANALYTICS_OPEN', 'ANALYTICS_SELECTION', 'ANALYTICS_CONSENT'].includes(message.type)) return false;
  const openedAt = Date.now();
  const openingState = message.type === 'ANALYTICS_OPEN' ? chrome.storage.session.get<OpeningState>('shortcutOpen') : undefined;
  void analyticsTask(async () => {
    if (message.type === 'ANALYTICS_CONSENT') {
      if (typeof message.enabled !== 'boolean') return;
      await setConsent(message.enabled);
    } else if (message.type === 'ANALYTICS_OPEN') {
      const state = await openingState!;
      const source = state.shortcutOpen && openedAt - state.shortcutOpen.time < 2000 ? 'shortcut' : 'action';
      const current = await chrome.storage.session.get<OpeningState>('shortcutOpen');
      if (current.shortcutOpen?.id === state.shortcutOpen?.id) await chrome.storage.session.remove('shortcutOpen');
      if (typeof message.openId === 'string' && message.openId.length <= 50)
        await capture('extension_opened', { source, open_id: message.openId });
    } else {
      const metadata = selectionMetadata(message.metadata);
      if (metadata && typeof message.openId === 'string' && message.openId.length <= 50)
        await capture('result_selected', { ...metadata, open_id: message.openId });
    }
  }).then(() => {
    respond({ success: true });
    void analyticsTask(flush);
  }).catch(() => respond({ success: false }));
  return true;
});
