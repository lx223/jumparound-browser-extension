// Development-only fixture: never included in the extension build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import TabSwitcher from '../src/content/TabSwitcher';
import { ThemeProvider } from '../src/content/ThemeContext';
import '../src/content/index.css';

const count = Number(new URLSearchParams(location.search).get('tabs') || 1000);
const tabs = Array.from({ length: count }, (_, i) => ({
  id: i + 1,
  title: `Example project ${i} — documentation and pull requests`,
  url: `https://example.com/project-${i}/${'documentation/'.repeat(12)}`,
  windowId: 1, active: false, lastAccessed: count - i,
}));
Object.defineProperty(window, 'chrome', { configurable: true, value: {
  runtime: { sendMessage: (_message: unknown, callback: (value: unknown) => void) => {
    setTimeout(() => callback({ tabs, historyTabs: [] }), 0);
  } },
  i18n: { getMessage: () => '' },
  tabs: { create: () => {} },
} });
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const settle = async () => { await frame(); await frame(); };
const longTasks: number[] = [];
const observer = new PerformanceObserver(list => {
  longTasks.push(...list.getEntries().map(entry => entry.duration));
});
observer.observe({ type: 'longtask', buffered: true });
const start = performance.now();
createRoot(document.getElementById('root')!).render(<ThemeProvider><TabSwitcher /></ThemeProvider>);
await settle();
while (!document.querySelector('ul button')) await settle();
const openMs = performance.now() - start;

// Run from DevTools with await window.runPopupBenchmark(). Results are also logged.
async function runPopupBenchmark() {
  const input = document.querySelector('input')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  const samples: number[] = [];
  const queries = ['', 'e', 'ex', 'exa', 'exam', 'example', 'project', 'documentation', 'zzzzzz'];
  for (let repeat = 0; repeat < 5; repeat++) {
    for (const query of queries) {
      const before = performance.now();
      setter.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();
      samples.push(performance.now() - before);
    }
  }
  // Leave a broadly matching query in place for DOM and visual inspection.
  setter.call(input, 'example');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();
  const sorted = [...samples].sort((a, b) => a - b);
  const result = {
    tabs: count, openMs, inputToFrameMedianMs: sorted[Math.floor(sorted.length / 2)],
    inputToFrameP95Ms: sorted[Math.floor(sorted.length * 0.95)],
    maxMs: sorted[sorted.length - 1], renderedRows: document.querySelectorAll('ul button').length,
    domElements: document.querySelectorAll('*').length,
    longTasks: [...longTasks],
  };
  console.table(result);
  return result;
}
Object.assign(window, { runPopupBenchmark });
