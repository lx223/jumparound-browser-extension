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

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'analytics-retry') void analyticsTask(flush);
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('src/content/index.html'))) return false;
  if (!['ANALYTICS_OPEN', 'ANALYTICS_SELECTION', 'ANALYTICS_CONSENT'].includes(message.type)) return false;
  void analyticsTask(async () => {
    if (message.type === 'ANALYTICS_CONSENT') {
      if (typeof message.enabled !== 'boolean') return;
      await setConsent(message.enabled);
    } else if (message.type === 'ANALYTICS_OPEN') {
      // Native action shortcuts and toolbar clicks both open the popup directly.
      if (typeof message.openId === 'string' && message.openId.length <= 50)
        await capture('extension_opened', { source: 'action', open_id: message.openId });
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
