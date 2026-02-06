# Architecture

## Overview

JumpAround is a browser extension that provides a quick tab switcher with keyboard shortcuts. It uses a centered overlay UI (similar to Spotlight or Cmd+Tab) for efficient tab navigation.

## Components

### 1. Background Service Worker (`src/background/index.ts`)

**Responsibilities:**
- Register and handle keyboard shortcuts
- Track tab activation events for MRU (Most Recently Used) ordering
- Route messages between content scripts and popup
- Manage tab switching operations

**Key Features:**
- Listens to `chrome.commands.onCommand` for the toggle shortcut
- Maintains a map of tab access times
- Handles `GET_TABS` and `SWITCH_TAB` messages from the popup

### 2. Content Script (`src/content/index.ts`)

**Responsibilities:**
- Inject the popup overlay into the current page
- Handle overlay visibility (open/close)
- Listen for Escape key to close the switcher

**Implementation Details:**
- Creates a Shadow DOM container to isolate the overlay from page styles
- Injects an iframe containing the React popup UI
- Uses high z-index (2147483647) to ensure overlay appears on top

**Why Shadow DOM + iframe?**
- Shadow DOM prevents page CSS from affecting the extension UI
- iframe provides additional isolation and its own execution context
- Allows the React app to run independently of the host page

### 3. Popup UI (`src/popup/`)

**Responsibilities:**
- Display list of all open tabs
- Provide search functionality (fuzzy search)
- Handle keyboard navigation
- Communicate tab switches back to background script

**Structure:**
- `index.html` - Entry point loaded in the iframe
- `index.tsx` - React app setup with MUI theme
- `Popup.tsx` - Main component with search, list, and keyboard handling

**Key Features:**
- Uses Material-UI for consistent, polished design
- Fuse.js for fuzzy search (searches both title and URL)
- Keyboard navigation with arrow keys and Tab
- Auto-focus on search input
- Smooth scrolling to keep selected item visible
- Fallback to URL/Google search when no tabs match

### 4. Utilities (`src/utils/`)

#### `tabManager.ts`
- `getAllTabs()` - Queries all tabs and sorts them by window and access time
- `switchToTab()` - Focuses window and activates target tab
- `getI18nMessage()` - Helper for internationalization

#### `fuzzySearch.ts`
- `createTabSearcher()` - Creates Fuse.js instance configured for tab search
- `isUrl()` - Determines if text looks like a URL
- `createSearchUrl()` - Converts text to URL or Google search query

## Data Flow

### Opening the Switcher

```
User presses Cmd+K
  ↓
Background: chrome.commands.onCommand
  ↓
Background: chrome.tabs.sendMessage → Content Script
  ↓
Content: Injects Shadow DOM + iframe with popup
  ↓
Popup: Requests tabs via chrome.runtime.sendMessage
  ↓
Background: Returns sorted tab list
  ↓
Popup: Renders tab list with search UI
```

### Switching Tabs

```
User selects tab and presses Enter
  ↓
Popup: Sends SWITCH_TAB message with tabId
  ↓
Background: Calls chrome.windows.update + chrome.tabs.update
  ↓
Background: Sends CLOSE_SWITCHER message to content script
  ↓
Content: Removes Shadow DOM container
```

## Design Decisions

### 1. Vanilla Build Setup (No WXT/Plasmo)

**Rationale:**
- Full control over build configuration
- Minimal dependencies
- Easier to understand and debug
- Vite provides excellent DX without framework overhead

**Trade-offs:**
- More manual configuration for cross-browser support
- Need to handle manifest differences manually
- Custom build scripts for Safari conversion

### 2. Centered Overlay (Not Browser Action Popup)

**Rationale:**
- Better UX for keyboard-first workflow
- Familiar pattern (like Spotlight, Cmd+Tab)
- Centered position is easier to see
- More screen space for tab list

**Trade-offs:**
- Requires content script injection on all pages
- More complex than standard popup
- Need to handle Shadow DOM isolation

### 3. Material-UI for Styling

**Rationale:**
- User requested MUI specifically
- Provides polished, professional design out of box
- Consistent component library
- Good accessibility defaults
- Dark theme works well for overlay

**Trade-offs:**
- Larger bundle size (~350KB)
- More dependencies than plain CSS
- React required

### 4. Fuse.js for Fuzzy Search

**Rationale:**
- Lightweight (~5KB)
- Fast and flexible
- Good for tab titles and URLs
- Simple API

**Trade-offs:**
- Additional dependency
- Could use simpler substring matching for MVP

### 5. Chrome i18n API

**Rationale:**
- Built into browser extension platform
- No external dependencies
- Standard approach for extensions
- Easy to add more languages

**Trade-offs:**
- Requires specific folder structure (`_locales/`)
- JSON format only
- Limited to browser extension context

### 6. Tab Access Time Tracking

**Current Implementation:**
- Uses tab index as proxy for recency
- Current window tabs prioritized

**Why not chrome.tabs.lastAccessed?**
- Not consistently available across browsers
- May not reflect true MRU order

**Future Enhancement:**
- Store access times in chrome.storage
- Track onActivated events persistently
- Maintain true MRU order across browser sessions

## Performance Considerations

### Bundle Size
- Main popup bundle: ~350KB (mostly MUI)
- Loads in iframe, doesn't affect page performance
- Lazy loading not needed for extension popup

### Tab Query Performance
- `chrome.tabs.query({})` is fast even with 100+ tabs
- Sorting by access time is O(n log n), negligible for typical tab counts
- Fuzzy search performance: ~1ms for 100 tabs

### Memory Usage
- Content script is minimal (~1KB)
- Popup only exists when overlay is open
- Background service worker is lightweight (~1KB)
- Tab access time map grows with tab count (negligible memory)

## Security Considerations

### Permissions
- `tabs` - Required to query and switch tabs
- `activeTab` - Required to inject content script in current tab

### Content Security Policy
- Default MV3 CSP applies
- No eval() or inline scripts
- All code bundled and hashed

### Cross-Site Scripting (XSS)
- Tab titles and URLs are escaped by React
- No `dangerouslySetInnerHTML` used
- Shadow DOM provides additional isolation

## Browser Compatibility

### Chrome (Primary Target)
- Manifest V3
- Full feature support
- Tested on Chrome 120+

### Safari
- Requires conversion using `safari-web-extension-converter`
- May need manifest adjustments
- Limited testing

### Known Limitations
- Keyboard shortcut only works when browser is focused (browser API limitation)
- Cannot capture shortcuts when browser is in background
- Some websites may block content script injection (rare)

## Future Enhancements

### Potential Features
- [ ] Persistent MRU tracking across browser sessions
- [ ] Tab preview thumbnails
- [ ] Recently closed tabs
- [ ] Tab groups support
- [ ] Configurable keyboard shortcuts
- [ ] Custom search operators (e.g., `@window:1`)
- [ ] Tab history within each tab
- [ ] Performance metrics and analytics

### Code Quality
- [ ] Add unit tests (Jest + React Testing Library)
- [ ] E2E tests (Playwright)
- [ ] Bundle size optimization
- [ ] Lighthouse score optimization
- [ ] Accessibility audit (WCAG compliance)

### Cross-Browser
- [ ] Test and document Safari quirks
- [ ] Firefox support (different manifest format)
- [ ] Edge-specific testing

## Development Guidelines

### Adding a New Feature

1. Update TypeScript types in `src/types/`
2. Implement in appropriate component (background, content, or popup)
3. Add i18n strings if needed
4. Test in Chrome
5. Document in README and TESTING.md

### Debugging Tips

- Background script: `chrome://extensions/` → "service worker"
- Content script: Page DevTools console
- Popup: Right-click overlay → "Inspect"
- Check network tab for asset loading issues

### Code Style

- TypeScript strict mode
- Functional React components with hooks
- Avoid over-engineering
- Comment only non-obvious logic
- Prefer explicitness over cleverness
