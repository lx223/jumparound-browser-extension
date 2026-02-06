import type { Message } from '../types';

let isInjected = false;
let shadowRoot: ShadowRoot | null = null;

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'TOGGLE_SWITCHER') {
    if (isInjected) {
      removeSwitcher();
    } else {
      injectSwitcher();
    }
  } else if (message.type === 'CLOSE_SWITCHER') {
    removeSwitcher();
  }
});

function injectSwitcher() {
  if (isInjected) return;

  const container = document.createElement('div');
  container.id = 'jumparound-root';
  container.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647;';

  shadowRoot = container.attachShadow({ mode: 'open' });

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'border: none; width: 100%; height: 100%; background: transparent;';
  iframe.src = chrome.runtime.getURL('src/popup/index.html');

  shadowRoot.appendChild(iframe);
  document.body.appendChild(container);

  isInjected = true;
}

function removeSwitcher() {
  const container = document.getElementById('jumparound-root');
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
