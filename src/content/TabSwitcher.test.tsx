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
    commands: { getAll: vi.fn(callback => callback([{ name: '_execute_action', shortcut: 'Ctrl+Shift+K' }])) },
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
it('shows the assigned shortcut and opens shortcut configuration', () => {
  act(() => root.render(<TabSwitcher />));
  expect(container.querySelector('kbd')?.textContent).toBe('Ctrl + Shift + K');
  const configure = container.querySelector<HTMLButtonElement>('button[title="Configure keyboard shortcuts"]')!;
  expect(configure.textContent).toContain('Configure shortcut');
  act(() => configure.click());
  expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome://extensions/shortcuts' });
});
it('shows when the opening shortcut is not assigned', () => {
  vi.mocked(chrome.commands.getAll).mockImplementation(callback => callback([{ name: '_execute_action', shortcut: '' }]));
  act(() => root.render(<TabSwitcher />));
  expect(container.querySelector('kbd')?.textContent).toBe('Not assigned');
});
it('separates Mac modifier symbols with plus signs', () => {
  vi.mocked(chrome.commands.getAll).mockImplementation(callback => callback([{ name: '_execute_action', shortcut: '⌘⇧K' }]));
  act(() => root.render(<TabSwitcher />));
  expect(container.querySelector('kbd')?.textContent).toBe('⌘ + ⇧ + K');
});
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
it('starts on the previous tab when the current tab is listed first, and on the best match when searching', () => {
  const withActive = tabs.map((tab, i) => ({ ...tab, active: i === 0 }));
  vi.mocked(chrome.runtime.sendMessage).mockImplementation(((_message: unknown, callback: (r: unknown) => void) =>
    callback({ tabs: withActive, historyTabs: [] })) as never);
  act(() => root.render(<TabSwitcher />));
  const input = container.querySelector('input')!;
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SWITCH_TAB', tabId: 2 }, expect.any(Function));
  vi.mocked(chrome.runtime.sendMessage).mockClear();
  type('Example tab 0');
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SWITCH_TAB', tabId: 1 }, expect.any(Function));
});
it('moves from the default row with the arrow keys', () => {
  const withActive = tabs.map((tab, i) => ({ ...tab, active: i === 0 }));
  vi.mocked(chrome.runtime.sendMessage).mockImplementation(((_message: unknown, callback: (r: unknown) => void) =>
    callback({ tabs: withActive, historyTabs: [] })) as never);
  act(() => root.render(<TabSwitcher />));
  const input = container.querySelector('input')!;
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); });
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
it('searches with the default search engine, but opens typed URLs directly', () => {
  const query = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', { ...chrome, search: { query } });
  act(() => root.render(<TabSwitcher />));
  const input = container.querySelector('input')!;
  type('zzzzzz');
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(query).toHaveBeenCalledWith({ text: 'zzzzzz', disposition: 'NEW_TAB' });
  expect(chrome.tabs.create).not.toHaveBeenCalled();
  type('zzzz.example');
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://zzzz.example' });
});
it('tracks absolute rank for a clicked result after scrolling, without browsing data', () => {
  act(() => root.render(<TabSwitcher />));
  const list = container.querySelector('ul')!;
  act(() => {
    list.scrollTop = 30 * 56;
    list.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  const row = list.querySelector('li[aria-posinset]')!;
  const rank = Number(row.getAttribute('aria-posinset'));
  act(() => (row.querySelector('button') as HTMLButtonElement).click());
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
    type: 'ANALYTICS_SELECTION', openId: expect.any(String),
    metadata: { position: rank, input_method: 'pointer', has_query: false, result_count: 1000, result_type: 'tab' },
  }, expect.any(Function));
});
it('tracks Enter selections and emits only one opening under Strict Mode', async () => {
  const { StrictMode } = await import('react');
  act(() => root.render(<StrictMode><TabSwitcher /></StrictMode>));
  const input = container.querySelector('input')!;
  act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  const calls = vi.mocked(chrome.runtime.sendMessage).mock.calls;
  expect(calls.filter(call => (call[0] as unknown as { type: string }).type === 'ANALYTICS_OPEN')).toHaveLength(1);
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
    type: 'ANALYTICS_SELECTION', openId: expect.any(String),
    metadata: { position: 1, input_method: 'keyboard', has_query: false, result_count: 1000, result_type: 'tab' },
  }, expect.any(Function));
});
it('finds older history that matches the typed query', () => {
  vi.useFakeTimers();
  try {
    const old = { id: -1, title: 'Quarterly planning doc', url: 'https://docs.example.org/plan', windowId: -1,
      active: false, lastAccessed: 1, isHistoryTab: true };
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(((message: { type: string }, callback: (r: unknown) => void) =>
      callback(message.type === 'SEARCH_HISTORY' ? { historyTabs: [old] } : { tabs, historyTabs: [] })) as never);
    act(() => root.render(<TabSwitcher />));
    type('quarterly');
    expect(container.querySelector('ul')!.textContent).not.toContain('Quarterly planning doc');
    act(() => { vi.advanceTimersByTime(200); });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SEARCH_HISTORY', query: 'quarterly' }, expect.any(Function));
    expect(container.querySelector('ul')!.textContent).toContain('Quarterly planning doc');
    type('');
    expect(container.querySelector('ul')!.textContent).not.toContain('Quarterly planning doc');
  } finally {
    vi.useRealTimers();
  }
});
it('lists only duplicate tabs for @dup, without web or history searches', () => {
  vi.useFakeTimers();
  try {
    const dupTabs = [
      { id: 1, title: 'Docs', url: 'https://docs.example.com/', windowId: 1, active: true, lastAccessed: 5 },
      { id: 2, title: 'Mail', url: 'https://mail.example.com/', windowId: 1, active: false, lastAccessed: 4 },
      { id: 3, title: 'Docs again', url: 'https://docs.example.com/', windowId: 2, active: false, lastAccessed: 3 },
    ];
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(((_message: unknown, callback: (r: unknown) => void) =>
      callback({ tabs: dupTabs, historyTabs: [] })) as never);
    act(() => root.render(<TabSwitcher />));
    type('@dup');
    const list = container.querySelector('ul')!;
    expect([...list.querySelectorAll('li[aria-posinset]')].map(row => row.textContent)).toEqual([
      expect.stringContaining('Docs'), expect.stringContaining('Docs again')]);
    type('@dup mail');
    expect(list.textContent).toContain('No duplicate tabs.');
    act(() => { container.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SEARCH_HISTORY' }), expect.any(Function));
  } finally {
    vi.useRealTimers();
  }
});
