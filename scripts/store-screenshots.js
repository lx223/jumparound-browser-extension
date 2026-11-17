#!/usr/bin/env node

/**
 * Regenerate the Chrome Web Store screenshots (1280x800) from the built extension.
 *
 * Renders the real popup and settings pages from dist/ in headless Chrome, with the
 * chrome.* APIs replaced by a mock that returns sample tabs. Run `npm run build` first.
 */

import { createServer } from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { extname, join, normalize } from 'path';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const out = join(root, 'store/chrome');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(join(dist, 'manifest.json'))) throw new Error('dist/ is missing. Run `npm run build` first.');
if (!existsSync(chromePath)) throw new Error(`Chrome not found at ${chromePath}. Set CHROME_PATH.`);

const shots = [
  { file: 'promo.png', page: 'src/content/index.html', theme: 'dark', caption: 'Jump to any tab with one shortcut' },
  { file: 'screenshot-search.png', page: 'src/content/index.html', theme: 'light', query: 'road', caption: 'Search open tabs, closed tabs and history' },
  { file: 'screenshot-settings.png', page: 'src/options/index.html', theme: 'light', caption: 'Usage analytics is off unless you turn it on' },
];

const minutes = n => Date.now() - n * 60_000;
const sample = {
  tabs: [
    ['Inbox (3) – Mail', 'https://mail.example.com/inbox'],
    ['Q1 roadmap – Docs', 'https://docs.example.com/document/q1-roadmap'],
    ['Pull request #91 · jumparound-browser-extension', 'https://github.com/lx223/jumparound-browser-extension/pull/91'],
    ['chrome.tabs | API | Chrome for Developers', 'https://developer.chrome.com/docs/extensions/reference/api/tabs'],
    ['Hyperbolic functions – Wikipedia', 'https://en.wikipedia.org/wiki/Hyperbolic_functions'],
    ['Team calendar – Week 47', 'https://calendar.example.com/week/47'],
    ['Weekend road trip ideas – Maps', 'https://maps.example.com/lists/road-trip'],
  ].map(([title, url], i) => ({ id: i + 1, title, url, windowId: 1, active: i === 2, lastAccessed: minutes(i) })),
  closedTabs: [
    { id: -1, title: 'Roadmap review notes', url: 'https://notes.example.com/roadmap-review', windowId: 1, active: false, lastAccessed: minutes(30), isClosedTab: true, sessionId: '1' },
  ],
  historyTabs: [
    { id: -2, title: 'Road bike maintenance checklist', url: 'https://cycling.example.com/maintenance-checklist', windowId: 1, active: false, lastAccessed: minutes(600), isHistoryTab: true },
  ],
};

// Runs inside the extension page before its own scripts: a minimal stand-in for chrome.*.
const mock = `(() => {
  const params = new URLSearchParams(location.search);
  const sample = ${JSON.stringify(sample)};
  const messages = ${readFileSync(join(dist, '_locales/en/messages.json'), 'utf8')};
  localStorage.setItem('jumparound-theme', params.get('theme') || 'light');
  window.chrome = {
    runtime: {
      id: 'mock',
      sendMessage: (message, callback) => callback?.(message.type === 'SEARCH_HISTORY' ? { historyTabs: [] } : { success: true, ...sample }),
      openOptionsPage: async () => {},
    },
    i18n: { getMessage: key => messages[key]?.message || '', getUILanguage: () => 'en' },
    commands: { getAll: callback => callback([{ name: '_execute_action', shortcut: '⌘K' }]) },
    storage: {
      local: { get: async () => ({}) },
      onChanged: { addListener() {}, removeListener() {} },
    },
    tabs: { create() {} },
  };
  const query = params.get('query');
  if (query) window.addEventListener('load', () => {
    const type = () => {
      const input = document.querySelector('input');
      if (!input) return void setTimeout(type, 20);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    type();
  });
})();`;

// The 800x600 popup, centred on a 1280x800 backdrop with a caption.
const stage = `<!doctype html><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px;
    background: linear-gradient(135deg, #1e3a8a, #3b82f6); font: 600 34px/1.2 system-ui, sans-serif; color: #fff; }
  iframe { width: 800px; height: 600px; border: 0; border-radius: 12px; box-shadow: 0 24px 60px rgba(0, 0, 0, .45); background: #fff; }
</style><div id="caption"></div><iframe></iframe><script>
  const params = new URLSearchParams(location.search);
  document.getElementById('caption').textContent = params.get('caption');
  const page = params.get('page');
  params.delete('caption'); params.delete('page');
  document.querySelector('iframe').src = '/' + page + '?' + params;
</script>`;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const send = (body, type) => response.writeHead(200, { 'Content-Type': type }).end(body);
  if (path === '/stage.html') return send(stage, 'text/html');
  if (path === '/mock.js') return send(mock, 'text/javascript');
  const file = join(dist, normalize(path));
  if (!file.startsWith(dist) || !existsSync(file)) return response.writeHead(404).end();
  const body = readFileSync(file);
  if (extname(file) !== '.html') return send(body, types[extname(file)] || 'application/octet-stream');
  send(body.toString().replace('<head>', '<head><script src="/mock.js"></script>'), 'text/html');
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
// A throwaway profile keeps headless Chrome from attaching to a running browser.
const profile = mkdtempSync(join(tmpdir(), 'jumparound-shots-'));
try {
  for (const { file, ...params } of shots) {
    const target = join(out, file);
    const url = `http://127.0.0.1:${port}/stage.html?${new URLSearchParams(params)}`;
    // Async, so the server above can answer Chrome while it runs.
    await promisify(execFile)(chromePath, ['--headless=new', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,800',
      '--virtual-time-budget=5000', `--screenshot=${target}`, url], { timeout: 60_000 });
    // The store rejects PNGs with an alpha channel.
    const flat = await sharp(target).flatten({ background: '#ffffff' }).png().toBuffer();
    await sharp(flat).toFile(target);
    console.log(`✓ ${file}`);
  }
} finally {
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
