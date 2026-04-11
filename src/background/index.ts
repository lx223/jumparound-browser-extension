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
