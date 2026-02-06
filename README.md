# JumpAround - Tab Switcher

A lightweight, cross-browser tab switcher extension with keyboard shortcuts and fuzzy search.

## Features

- **Quick Switch**: Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) to open the tab switcher
- **Smart Search**: VS Code-inspired fuzzy matching with support for camelCase, acronyms, and consecutive character matching
- **Keyboard Navigation**: Use arrow keys, Tab, or Enter to navigate and switch
- **Multi-Window**: Works across all browser windows
- **Recent First**: Tabs are ordered by last access time
- **Internationalization**: Supports English and Chinese

## Installation

### Chrome

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate placeholder icons (or add your own to `public/icons/`):
   ```bash
   npm run generate-icons
   ```
   Note: The script generates SVG files. Convert them to PNG or replace with your own icon designs.

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Safari

1. Build for Safari:
   ```bash
   npm run build:safari
   ```

2. This will create a Safari app bundle. Open the generated Xcode project and follow Safari's extension signing process.

## Development

```bash
npm run dev
```

This will watch for file changes and rebuild automatically. Reload the extension in your browser after changes.

## Usage

1. Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) to open the switcher
2. Start typing to search tabs
3. Use `↑`/`↓` or `Tab`/`Shift+Tab` to navigate
4. Press `Enter` to switch to the selected tab
5. Press `Escape` to close without switching
6. If no tabs match your search, press `Enter` to open it as a URL or Google search

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open/Close Switcher | `Cmd+K` (Mac) / `Ctrl+K` (Win/Linux) |
| Navigate Down | `↓` or `Tab` |
| Navigate Up | `↑` or `Shift+Tab` |
| Switch Tab | `Enter` |
| Close Switcher | `Escape` |

## Tech Stack

- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI framework
- **Material-UI** - Component library
- **VS Code-Inspired Search** - Fuzzy matching with position-based scoring, consecutive match bonuses, and camelCase support

## Project Structure

```
├── public/
│   ├── _locales/           # i18n messages
│   └── manifest.json       # Extension manifest
├── src/
│   ├── background/         # Service worker
│   ├── content/            # Content script (overlay injection)
│   ├── popup/              # React popup UI
│   ├── utils/              # Utilities (tab management, search)
│   └── types/              # TypeScript types
└── dist/                   # Build output
```

## Documentation

- [TESTING.md](./TESTING.md) - Comprehensive testing guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and design decisions

## Known Limitations

- Keyboard shortcut only works when browser is focused (browser API limitation)
- Bundle size is ~350KB due to MUI (could be optimized with plain CSS in future)
- Tab access tracking is simplified (current window + tab index order)

## License

MIT - See [LICENSE](./LICENSE) file for details
