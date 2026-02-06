import type { Message } from '../types';
import { getAllTabs, switchToTab } from '../utils/tabManager';

const tabAccessTimes = new Map<number, number>();

chrome.tabs.onActivated.addListener(({ tabId }) => {
  tabAccessTimes.set(tabId, Date.now());
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabAccessTimes.delete(tabId);
});

export function getTabAccessTime(tabId: number): number {
  return tabAccessTimes.get(tabId) || 0;
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-switcher') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.id) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' } as Message);
    }
  }
});

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
