import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Options from './Options';

let container: HTMLDivElement;
let root: Root;
let stored: Record<string, unknown>;
let reply: unknown;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  stored = {};
  reply = { success: true };
  vi.stubGlobal('chrome', {
    runtime: { sendMessage: vi.fn((_message, callback) => callback(reply)), lastError: undefined },
    i18n: { getMessage: () => '' },
    storage: {
      local: { get: vi.fn(async () => stored) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
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
async function render() {
  await act(async () => root.render(<Options />));
  return container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
}

it('is off by default and sends consent changes to the background worker', async () => {
  const box = await render();
  expect(box.checked).toBe(false);
  act(() => box.click());
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'ANALYTICS_CONSENT', enabled: true }, expect.any(Function));
  expect(box.checked).toBe(true);
});

it('opts out of previously granted analytics', async () => {
  stored = { analyticsConsent: true };
  const box = await render();
  expect(box.checked).toBe(true);
  act(() => box.click());
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'ANALYTICS_CONSENT', enabled: false }, expect.any(Function));
  expect(box.checked).toBe(false);
});

it('keeps the saved value and shows an error when saving fails', async () => {
  reply = { success: false };
  const box = await render();
  act(() => box.click());
  expect(box.checked).toBe(false);
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
});
