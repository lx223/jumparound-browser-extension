# Chrome Web Store Submission

## Description (16,000 char limit)

---

JumpAround brings VS Code's Cmd+K Quick Open to your browser tabs.

Stop hunting through dozens of tabs. Press Cmd+K (or Ctrl+K on Windows/Linux), type a few characters, and jump to any tab instantly. No more squinting at tiny favicons or clicking through endless tabs.

20, 30, 50+ tabs open across multiple windows? You know the tab you need is open somewhere, but finding it breaks your flow. JumpAround solves this with keyboard-driven fuzzy search that developers love.

KEY FEATURES

• Fuzzy Search - Type "gh iss" to find "GitHub Issues", "dmd" for "DocsMainDashboard" (camelCase matching)
• Most Recently Used First - Your frequent tabs appear at the top automatically
• 100% Keyboard-Driven - Navigate with arrows, switch with Enter, close with Escape
• All Windows - Search every open window in one unified list
• Lightning Fast - One shortcut, type a few letters, Enter. Done.

HOW IT WORKS

Multiple projects open? Cmd+K → type "local" → Enter (jump to localhost). Cmd+K → "stack" → Enter (Stack Overflow). Cmd+K → "github" → Enter (your PR).

30 research tabs? Cmd+K → type "auth" → see all matching tabs ranked by relevance → arrow keys to pick → Enter.

All without touching your mouse or hunting through tabs.

PRIVACY

Runs entirely locally in your browser. No data collection, no tracking, no cloud services.

Perfect for developers, researchers, and anyone with 10+ tabs. Works instantly, no setup required.

---

## Single Purpose

---

JumpAround is a keyboard-driven tab switcher that enables users to quickly find and switch between open browser tabs using fuzzy search. The extension's sole purpose is to provide fast tab navigation through a searchable overlay activated by a keyboard shortcut (Cmd+K/Ctrl+K).

---

## Permission Justifications

---

tabs
Required to read information about all open tabs (titles, URLs, favicons) in order to display them in the searchable tab list and enable switching between them.

activeTab
Required to identify which tab is currently active so it can be visually indicated in the tab list and to enable switching focus to the selected tab.

Content Scripts (all_urls)
Required to inject the tab switcher UI overlay onto any webpage where the user activates the keyboard shortcut, allowing the extension to function on all sites the user visits.
