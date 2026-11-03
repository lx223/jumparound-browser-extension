# JumpAround - Tab Switcher

A lightweight tab switcher for Chrome with keyboard shortcuts and fuzzy search. Quickly navigate between your open tabs using `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux), just like command palettes in modern code editors.

## Why I Built It

If you're like me, you have dozens (or hundreds) of tabs open at any given time. The pain points are real:

- **Mouse dependency**: Having to reach for your mouse, scan through tiny favicons, and click through tabs kills your flow
- **Tab overflow**: When you have more than ~20 tabs open, Chrome's tab bar becomes unusable - tabs shrink to unreadable widths
- **No search**: Chrome's built-in `Ctrl+Tab` just cycles through tabs in order - there's no way to search or jump directly to what you need
- **Context switching**: Breaking your keyboard-focused workflow to hunt for a tab is frustrating when you're in the zone

I wanted the same quick-jump experience I have in VS Code (`Cmd+K`) but for browser tabs. Type a few characters, fuzzy search finds it, hit Enter, and you're there. No mouse, no hunting, no friction.

## Installation

### From Chrome Web Store

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/kgjjlongdlmjcegnjicbpnkpnmoblkae).

### From GitHub Releases

1. Download the latest release from the [Releases page](https://github.com/laniakita/jumparound-browser-extension/releases)
2. Unzip the downloaded file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the unzipped folder

## License

MIT - See [LICENSE](./LICENSE) file for details

## Optional product analytics

Analytics is off by default and requires the user to opt in using the popup checkbox.
Production builds read `VITE_POSTHOG_PROJECT_TOKEN` (the public project ingestion
token, never a personal API key) and `VITE_POSTHOG_HOST` (defaults to
`https://eu.i.posthog.com`). Set these in `.env.local` or the build environment,
then run `npm run build`. Development watch builds and builds without a token
never send events. If changing region/host, also update `host_permissions` in
`public/manifest.json` and the privacy policy. No SDK or remote code is loaded.

Events:
- `extension_opened`: `source` (`shortcut` or `action`) and `open_id`.
- `result_selected`: `position` (1-based absolute result rank), `input_method`
  (`keyboard` or `pointer`), `has_query`, `result_count`, `result_type` (`tab` or
  `history`), and `open_id`.
- Both include timestamp, random installation ID, and extension version. No
  query text, URLs, titles, or history entries are transmitted. Person profile
  processing is disabled. The queue retains at most 100 events, retries with
  stable event UUIDs, and is cleared along with the ID when consent is withdrawn.

In PostHog, chart total `extension_opened` events broken down by `source`.
For result preference, compare `result_selected` with `position = 1` against
`position > 1`; filter `has_query = true` for actual searches. Break down by
`input_method` to compare clicks with Enter selections. These describe opted-in
users only. `open_id` can link opens to selections without using PostHog sessions.

The shortcut now uses the named `open-switcher` command so its source can be
measured, and requires Chrome 127+ for `action.openPopup()`. Existing users may
need to reassign their shortcut at `chrome://extensions/shortcuts` after updating.
The action source includes browser action activations via accessibility or the
extensions menu, not only mouse clicks. Shortcut markers expire after two seconds;
unusually delayed popup startup can be classified as an action open. Safari
compatibility needs manual verification before shipping a Safari release.

Before publishing, update Chrome Web Store privacy disclosures. Smoke-test a
configured production build: opt out (no requests), opt in and reopen using both
methods, select first/later results with click and Enter, disconnect/reconnect the
network, then opt out and verify local queue/identifier removal. Verify events in
PostHog's live event view and check that no browsing data appears in payloads.

### GitHub release configuration

In repository Settings → Secrets and variables → Actions, add a repository secret
named `VITE_POSTHOG_PROJECT_TOKEN` containing the public PostHog project ingestion
token. The Publish Release workflow passes it to Vite at build time. It becomes
part of the distributed extension; never use a PostHog personal or secret API key.
The host defaults to EU Cloud and must match the PostHog project region. An absent
token leaves analytics disabled. PR builds intentionally do not receive the token.
