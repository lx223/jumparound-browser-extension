// Only this allowlisted metadata may leave the extension. Never pass tab objects.
export interface SelectionMetadata {
  position: number;
  input_method: 'keyboard' | 'pointer';
  has_query: boolean;
  result_count: number;
  result_type: 'tab' | 'closed' | 'history';
}
const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
const enabled = import.meta.env.PROD && Boolean(token);
interface QueuedEvent {
  uuid: string;
  event: string;
  distinct_id: string;
  timestamp: string;
  properties: Record<string, unknown>;
}
let serial: Promise<unknown> = Promise.resolve();
export function analyticsTask<T>(task: () => Promise<T>): Promise<T> {
  const next = serial.then(task);
  serial = next.catch(() => {});
  return next;
}
export async function setConsent(consent: boolean) {
  await chrome.storage.local.set({ analyticsConsent: consent });
  if (!consent) {
    await chrome.storage.local.remove(['analyticsQueue', 'analyticsId', 'analyticsShortcut']);
    await chrome.alarms.clear('analytics-retry');
  }
}
export async function capture(event: string, properties: Record<string, unknown>) {
  const state = await chrome.storage.local.get<{ analyticsConsent?: boolean; analyticsId?: string; analyticsQueue?: QueuedEvent[] }>(['analyticsConsent', 'analyticsId', 'analyticsQueue']);
  if (!enabled || state.analyticsConsent !== true) return;
  const id = state.analyticsId || crypto.randomUUID();
  const queue: QueuedEvent[] = state.analyticsQueue || [];
  queue.push({ uuid: crypto.randomUUID(), event, distinct_id: id, timestamp: new Date().toISOString(),
    properties: { ...properties, project: 'jumparound', $process_person_profile: false, extension_version: chrome.runtime.getManifest().version } });
  await chrome.storage.local.set({ analyticsId: id, analyticsQueue: queue.slice(-100) });
  await chrome.alarms.create('analytics-retry', { delayInMinutes: 1 });
}
export async function flush() {
  const state = await chrome.storage.local.get<{ analyticsConsent?: boolean; analyticsQueue?: QueuedEvent[] }>(['analyticsConsent', 'analyticsQueue']);
  if (!enabled || state.analyticsConsent !== true || !state.analyticsQueue?.length) return;
  try {
    const response = await fetch(`${host}/batch/`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: token, batch: state.analyticsQueue }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Analytics delivery failed');
    await chrome.storage.local.remove('analyticsQueue');
    await chrome.alarms.clear('analytics-retry');
  } catch {
    await chrome.alarms.create('analytics-retry', { delayInMinutes: 5 });
  }
}
export function selectionMetadata(value: unknown): SelectionMetadata | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as SelectionMetadata;
  if (!Number.isInteger(v.position) || !Number.isInteger(v.result_count) || v.position < 1 || v.position > v.result_count ||
      !['keyboard', 'pointer'].includes(v.input_method) || typeof v.has_query !== 'boolean' || !['tab', 'closed', 'history'].includes(v.result_type)) return;
  return { position: v.position, result_count: v.result_count, input_method: v.input_method, has_query: v.has_query, result_type: v.result_type };
}

// Whether the user kept the suggested Ctrl+K / Cmd+K binding. Never send the keys themselves.
export type ShortcutState = 'default' | 'custom' | 'unassigned' | 'unknown';
export function classifyShortcut(shortcut: string | undefined): ShortcutState {
  if (shortcut === undefined) return 'unknown';
  if (!shortcut) return 'unassigned';
  // Chrome reports "Ctrl+K" on Windows, Linux and ChromeOS, and "⌘K" on macOS.
  const keys = shortcut.replace(/[\s+]/g, '').replace(/^Command/, '⌘');
  return keys === 'CtrlK' || keys === '⌘K' ? 'default' : 'custom';
}
export async function getShortcutState(): Promise<ShortcutState> {
  try {
    const commands = await chrome.commands.getAll();
    return classifyShortcut(commands.find(command => command.name === '_execute_action')?.shortcut ?? '');
  } catch {
    return 'unknown';
  }
}
/** Emit shortcut_changed when an opted-in user's shortcut differs from the last one seen. */
export async function recordShortcut(current: ShortcutState) {
  const state = await chrome.storage.local.get<{ analyticsConsent?: boolean; analyticsShortcut?: ShortcutState }>(['analyticsConsent', 'analyticsShortcut']);
  if (!enabled || state.analyticsConsent !== true || current === 'unknown') return;
  if (state.analyticsShortcut && state.analyticsShortcut !== current)
    await capture('shortcut_changed', { from: state.analyticsShortcut, to: current });
  await chrome.storage.local.set({ analyticsShortcut: current });
}
