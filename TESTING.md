# Testing Guide

This guide will help you test the JumpAround extension locally.

## Prerequisites

1. Build the extension:
   ```bash
   npm install
   npm run build
   ```

2. Verify the `dist/` folder contains:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `src/popup/index.html`
   - `assets/` directory with bundled React app
   - `_locales/` for i18n
   - `icons/` with PNG files

## Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **Load unpacked**

4. Select the `dist/` folder from this project

5. The extension should now appear in your extensions list

6. **Important**: Note the keyboard shortcut listed. If `Cmd+K`/`Ctrl+K` conflicts with another extension, you may need to customize it:
   - Click on "Keyboard shortcuts" at the bottom of the extensions page
   - Find "JumpAround - Tab Switcher"
   - Modify the shortcut if needed

## Testing the Extension

### Basic Functionality

1. **Open the Switcher**:
   - Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux)
   - A centered overlay should appear with a search bar and list of tabs

2. **Search Tabs**:
   - Start typing in the search box
   - Tabs should filter based on title and URL
   - Try partial matches (fuzzy search should work)

3. **Keyboard Navigation**:
   - Press `↓` or `Tab` to move down the list
   - Press `↑` or `Shift+Tab` to move up
   - Selected item should be visually highlighted
   - Press `Enter` to switch to the selected tab
   - The switcher should close and focus should move to the selected tab

4. **Close Without Switching**:
   - Open the switcher
   - Press `Escape`
   - The switcher should close without changing tabs

5. **Click to Switch**:
   - Open the switcher
   - Click on any tab in the list
   - Should switch to that tab and close the overlay

6. **No Results Behavior**:
   - Open the switcher
   - Type a search query that matches no tabs (e.g., "xyznonexistent")
   - Press `Enter`
   - Should open a new tab with either:
     - The URL if your query looks like a URL (e.g., "google.com")
     - A Google search if it's plain text (e.g., "hello world")

### Multi-Window Testing

1. Open multiple browser windows with several tabs each
2. Open the switcher in one window
3. Verify:
   - Tabs from all windows are listed
   - Current window's tabs appear first
   - You can switch to tabs in other windows
   - When switching, the target window is focused

### Edge Cases

1. **Many Tabs**:
   - Open 20+ tabs
   - Open the switcher
   - Verify scrolling works
   - Search should still be fast

2. **Special Characters**:
   - Open tabs with special characters in titles
   - Search for them
   - Verify they appear correctly

3. **Tabs Without Titles**:
   - Open a blank tab or loading page
   - Verify it appears in the list (URL shown as fallback)

4. **Favicons**:
   - Verify favicons are displayed for tabs
   - Tabs without favicons should show fallback (first letter of title)

### i18n Testing

1. **Change Browser Language to Chinese**:
   - Go to `chrome://settings/languages`
   - Add Chinese (Simplified) and move it to the top
   - Restart Chrome
   - Open the extension
   - Verify UI text appears in Chinese

2. **Change Back to English**:
   - Move English to the top in language settings
   - Restart Chrome
   - Verify UI text is in English

## Debugging

### Extension Not Loading

- Check the browser console for errors
- Verify `manifest.json` is valid JSON
- Check that all required permissions are granted

### Switcher Not Appearing

1. Open Chrome DevTools console (F12)
2. Check for errors when pressing the keyboard shortcut
3. Verify the content script is injected:
   ```javascript
   // Run in console
   document.getElementById('jumparound-root')
   ```

### Background Script Issues

1. Go to `chrome://extensions/`
2. Find JumpAround extension
3. Click "service worker" link
4. Check console for errors

### Popup/Overlay Issues

1. Open the switcher
2. Right-click inside the overlay
3. Select "Inspect" or "Inspect Element"
4. Check iframe console for React errors

### Keyboard Shortcut Not Working

1. Go to `chrome://extensions/shortcuts`
2. Verify the shortcut is registered for JumpAround
3. Check for conflicts with other extensions
4. Try customizing to a different shortcut

## Common Issues

### Issue: "Cannot read properties of undefined"
- Usually means a tab was closed while the popup was open
- Should be handled gracefully, refresh the tab list

### Issue: Popup shows but is blank
- Check browser console for React errors
- Verify `src/popup/index.html` and assets are in `dist/`
- Check `web_accessible_resources` in manifest

### Issue: Search not working
- Open DevTools for the popup iframe
- Check if Fuse.js is loaded correctly
- Verify tabs data is being received from background script

### Issue: Cannot switch to tabs in other windows
- Check that `windows` permission is granted (should be automatic with `tabs`)
- Verify background script can access `chrome.windows.update`

## Development Workflow

1. Make changes to source files
2. Run `npm run build`
3. Go to `chrome://extensions/`
4. Click the refresh icon on the JumpAround extension
5. Test your changes

For faster iteration:
```bash
npm run dev
```
This watches for changes and rebuilds automatically. You still need to refresh the extension in Chrome after each build.

## Performance Testing

1. Open 100+ tabs (use a script if needed)
2. Open the switcher
3. Verify:
   - Popup opens quickly (< 500ms)
   - Search is responsive
   - Scrolling is smooth
   - No lag when typing

## Safari Testing

Safari testing requires additional setup:

1. Build for Safari:
   ```bash
   npm run build:safari
   ```

2. This creates an Xcode project
3. Open the project in Xcode
4. Sign the extension
5. Build and run
6. Enable the extension in Safari settings

Note: Safari may have different behavior or limitations compared to Chrome.
