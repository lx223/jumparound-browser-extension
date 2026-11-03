import { beforeEach, afterEach, expect, it, vi } from 'vitest';
let analytics: typeof import('./analytics');
let state: Record<string, any>;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', 'test-token');
  state = {};
  vi.stubEnv('PROD', true);
  vi.stubGlobal('chrome', {
    storage: { local: {
      get: vi.fn(async () => ({ ...state })),
      set: vi.fn(async (value) => { Object.assign(state, value); }),
      remove: vi.fn(async (keys) => { for (const key of typeof keys === 'string' ? [keys] : keys) delete state[key]; }),
    } },
    alarms: { create: vi.fn(), clear: vi.fn() },
    runtime: { getManifest: () => ({ version: '0.1.2' }) },
  });
  vi.stubGlobal('fetch', vi.fn());
  analytics = await import('./analytics');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('never queues or sends events without consent', async () => {
  await analytics.capture('extension_opened', { source: 'shortcut' });
  await analytics.flush();
  expect(state.analyticsQueue).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
});
it('withdrawal removes pending events and identity and cancels retry', async () => {
  state = { analyticsConsent: true, analyticsId: 'old', analyticsQueue: [{ event: 'old' }] };
  await analytics.setConsent(false);
  expect(state).toEqual({ analyticsConsent: false });
  expect(chrome.alarms.clear).toHaveBeenCalledWith('analytics-retry');
  await analytics.flush();
  expect(fetch).not.toHaveBeenCalled();
});
it('strips browsing data from selection metadata and validates ranks', () => {
  const metadata = { position: 31, result_count: 1000, input_method: 'keyboard', has_query: true, result_type: 'tab' };
  expect(analytics.selectionMetadata({ ...metadata, url: 'private', query: 'private', title: 'private' })).toEqual(metadata);
  expect(analytics.selectionMetadata({ ...metadata, position: 0 })).toBeUndefined();
  expect(analytics.selectionMetadata({ ...metadata, position: 1001 })).toBeUndefined();
  expect(analytics.selectionMetadata({ ...metadata, input_method: 'unexpected' })).toBeUndefined();
});

it('bounds the offline queue and preserves UUIDs for retry', async () => {
  state.analyticsConsent = true;
  for (let i = 0; i < 105; i++) await analytics.capture('extension_opened', { source: 'action' });
  expect(state.analyticsQueue).toHaveLength(100);
  const uuid = state.analyticsQueue[0].uuid;
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
  await analytics.flush();
  expect(state.analyticsQueue[0].uuid).toBe(uuid);
  expect(chrome.alarms.create).toHaveBeenLastCalledWith('analytics-retry', { delayInMinutes: 5 });
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
  await analytics.flush();
  expect(state.analyticsQueue).toBeUndefined();
  const payload = JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string);
  expect(payload.api_key).toBe('test-token');
  expect(payload.batch[0].properties.$process_person_profile).toBe(false);
});
