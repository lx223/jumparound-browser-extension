import type { Message } from '../types';
import { getAllTabs, switchToTab } from '../utils/tabManager';

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'GET_TABS') {
    getAllTabs().then(tabs => {
      sendResponse({ tabs });
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
