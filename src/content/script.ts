/** Content script: runs per-tab and injects the switcher UI into the active page. */

import type { Message } from '../types';

let isInjected = false;
let shadowRoot: ShadowRoot | null = null;

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'TOGGLE_SWITCHER') {
    if (isInjected) {
      removeSwitcher();
    } else {
      injectSwitcher(message.tabId);
    }
  } else if (message.type === 'CLOSE_SWITCHER') {
    removeSwitcher();
  }
});

function injectSwitcher(tabId?: number) {
  if (isInjected) return;

  const container = document.createElement('div');
  container.id = 'jumparound-root';
  container.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647;';

  shadowRoot = container.attachShadow({ mode: 'open' });

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'border: none; width: 100%; height: 100%; background: transparent;';
  const baseUrl = chrome.runtime.getURL('src/content/index.html');
  iframe.src = tabId != null ? `${baseUrl}?tabId=${tabId}` : baseUrl;

  shadowRoot.appendChild(iframe);
  document.body.appendChild(container);

  isInjected = true;
}

function removeSwitcher() {
  const container = document.getElementById('jumparound-root');
  console.log('removeSwitcher', container);
  if (container) {
    container.remove();
    isInjected = false;
    shadowRoot = null;
  }
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isInjected) {
    removeSwitcher();
  }
});
