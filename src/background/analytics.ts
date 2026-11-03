// Only this allowlisted metadata may leave the extension. Never pass tab objects.
export interface SelectionMetadata {
  position: number;
  input_method: 'keyboard' | 'pointer';
  has_query: boolean;
  result_count: number;
  result_type: 'tab' | 'history';
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
    await chrome.storage.local.remove(['analyticsQueue', 'analyticsId']);
    await chrome.alarms.clear('analytics-retry');
  }
}
export async function capture(event: string, properties: Record<string, unknown>) {
  const state = await chrome.storage.local.get<{ analyticsConsent?: boolean; analyticsId?: string; analyticsQueue?: QueuedEvent[] }>(['analyticsConsent', 'analyticsId', 'analyticsQueue']);
  if (!enabled || state.analyticsConsent !== true) return;
  const id = state.analyticsId || crypto.randomUUID();
  const queue: QueuedEvent[] = state.analyticsQueue || [];
  queue.push({ uuid: crypto.randomUUID(), event, distinct_id: id, timestamp: new Date().toISOString(),
    properties: { ...properties, $process_person_profile: false, extension_version: chrome.runtime.getManifest().version } });
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
      !['keyboard', 'pointer'].includes(v.input_method) || typeof v.has_query !== 'boolean' || !['tab', 'history'].includes(v.result_type)) return;
  return { position: v.position, result_count: v.result_count, input_method: v.input_method, has_query: v.has_query, result_type: v.result_type };
}
