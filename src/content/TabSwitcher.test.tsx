import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TabSwitcher from './TabSwitcher';

let container: HTMLDivElement;
let root: Root;
const tabs = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1, title: `Example tab ${i}`, url: `https://example.com/${i}/${'long-path/'.repeat(20)}`,
  windowId: 1, active: false, lastAccessed: 1000 - i,
}));
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('chrome', {
    runtime: { sendMessage: vi.fn((_message, callback) => callback({ tabs, historyTabs: [] })) },
    i18n: { getMessage: () => '' },
    tabs: { create: vi.fn() },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
function type(query: string) {
  const input = container.querySelector('input')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, query);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
it('bounds DOM work for 1,000 tabs, including highlighted long URLs', () => {
  act(() => root.render(<TabSwitcher />));
  const list = container.querySelector('ul')!;
  expect(list.querySelectorAll('button').length).toBeLessThanOrEqual(18);
  type('long-path');
  expect(list.querySelectorAll('button').length).toBe(18);
  expect(list.querySelectorAll('span').length).toBeLessThan(200);
  expect(list.textContent).toContain('Example tab 0');
});
it('scrolls through all results and resets the viewport when searching', () => {
  act(() => root.render(<TabSwitcher />));
  const list = container.querySelector('ul')!;
  act(() => {
    list.scrollTop = 990 * 56;
    list.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  expect(list.textContent).toContain('Example tab 999');
  type('Example tab 0');
  expect(list.scrollTop).toBe(0);
  expect(list.textContent).toContain('Example tab 0');
});
it('keeps keyboard selection visible and activates the correct result beyond the first viewport', () => {
  act(() => root.render(<TabSwitcher />));
  const input = container.querySelector('input')!;
  for (let i = 0; i < 30; i++) {
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
  }
  expect(container.querySelector('ul')!.scrollTop).toBeGreaterThan(0);
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SWITCH_TAB', tabId: 31 }, expect.any(Function));
});
it('wraps keyboard selection to the last result and back to the first', () => {
  act(() => root.render(<TabSwitcher />));
  const input = container.querySelector('input')!;
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); });
  expect(container.querySelector('ul')!.textContent).toContain('Example tab 999');
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
  expect(container.querySelector('ul')!.scrollTop).toBe(0);
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SWITCH_TAB', tabId: 1 }, expect.any(Function));
});
it('opens a web search when there are no matching results', () => {
  act(() => root.render(<TabSwitcher />));
  type('zzzzzz');
  expect(container.querySelectorAll('ul button')).toHaveLength(0);
  act(() => { container.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://www.google.com/search?q=zzzzzz' });
});
