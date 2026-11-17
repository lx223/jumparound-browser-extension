import React, { useEffect, useState } from 'react';

const message = (key: string, fallback: string) => chrome.i18n?.getMessage(key) || fallback;

const Options: React.FC = () => {
  const [consent, setConsent] = useState<boolean | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void chrome.storage.local.get('analyticsConsent').then(state => setConsent(state.analyticsConsent === true));
    // Stay in sync if the preference changes in another extension page.
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && 'analyticsConsent' in changes) setConsent(changes.analyticsConsent.newValue === true);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const update = (enabled: boolean) => {
    setFailed(false);
    // The background worker owns consent so disabling also clears the identifier and queue.
    chrome.runtime.sendMessage({ type: 'ANALYTICS_CONSENT', enabled }, response => {
      if (!chrome.runtime.lastError && response?.success) setConsent(enabled);
      else setFailed(true);
    });
  };

  return (
    <main className="min-h-screen bg-surface text-text-primary">
      <div className="mx-auto max-w-xl px-6 py-8">
        <h1 className="text-lg font-semibold">{message('optionsTitle', 'JumpAround settings')}</h1>
        <section className="mt-6 rounded-lg border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-semibold">{message('analyticsHeading', 'Usage analytics')}</h2>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={consent === true}
              disabled={consent === undefined}
              onChange={e => update(e.target.checked)}
            />
            {message('analyticsConsent', 'Share optional usage analytics (includes random identifiers; no search text or browsing URLs)')}
          </label>
          <p className="mt-3 text-xs text-text-secondary">
            {message('analyticsDetails', 'Off by default. Turning it off deletes the local identifier and pending events. Events already sent are not deleted.')}
          </p>
          {failed && (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {message('analyticsSaveFailed', 'Could not save this setting. Please try again.')}
            </p>
          )}
        </section>
      </div>
    </main>
  );
};

export default Options;
