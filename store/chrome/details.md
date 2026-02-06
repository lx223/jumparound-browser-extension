# Chrome Web Store Submission

## Description (16,000 char limit)

Stop hunting through dozens of tabs. JumpAround gives you instant access to any open tab with a single keyboard shortcut.

We've all been there: 20, 30, maybe 50+ tabs open across multiple windows. You know the tab you need is open somewhere, but finding it means squinting at tiny favicons and clicking through endless tabs. It's frustrating, time-consuming, and breaks your flow.

JumpAround brings VS Code's beloved Quick Open feature to your browser. Press Cmd+K (or Ctrl+K on Windows/Linux) and instantly see all your tabs in a searchable list. Type a few characters and jump to exactly what you need.

### How It Works

**Smart Search** - Fuzzy matching that understands how you think:
- Type "gh iss" to find "GitHub Issues"
- Type "dmd" to find "DocsMainDashboard" (camelCase matching)
- Most recently used tabs appear first
- Works across all browser windows

**Keyboard-Driven** - Keep your hands on the keyboard. Navigate with arrow keys, select with Enter, close with Escape.

**Lightning Fast** - One shortcut, type a few letters, hit Enter. Done.

### Example Scenarios

**Multitasking Developer**
You have documentation, Stack Overflow, GitHub, and localhost:3000 open. Instead of clicking through tabs:
- Cmd+K → type "local" → Enter (jump to localhost)
- Cmd+K → type "stack" → Enter (back to Stack Overflow)
- Cmd+K → type "github" → Enter (check your PR)

**Research Mode**
30 tabs open with articles and references. You remember reading something about "authentication":
- Cmd+K → type "auth" → see all matching tabs instantly ranked by relevance → arrow keys to navigate → Enter

**Meeting Juggler**
Multiple Google Meet tabs, calendar, email, and docs open:
- Cmd+K → "meet" (active meeting)
- Cmd+K → "calendar" (check schedule)
- Cmd+K → "design doc" (share document)

All without touching your mouse or scanning through tabs.

---

**Privacy**: Runs entirely locally in your browser. No data collection, no tracking, no cloud services.

Perfect for developers, researchers, and anyone who regularly has 10+ tabs open. Say goodbye to tab overload.

## Single Purpose

JumpAround is a keyboard-driven tab switcher that enables users to quickly find and switch between open browser tabs using fuzzy search. The extension's sole purpose is to provide fast tab navigation through a searchable overlay activated by a keyboard shortcut (Cmd+K/Ctrl+K).

## Permission Justifications

**tabs**
Required to read information about all open tabs (titles, URLs, favicons) in order to display them in the searchable tab list and enable switching between them.

**activeTab**
Required to identify which tab is currently active so it can be visually indicated in the tab list and to enable switching focus to the selected tab.

**Content Scripts (all_urls)**
Required to inject the tab switcher UI overlay onto any webpage where the user activates the keyboard shortcut, allowing the extension to function on all sites the user visits.
