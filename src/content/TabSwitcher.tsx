import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Search, Sun, Moon, Monitor, Settings, History } from 'lucide-react';
import type { TabInfo, Message } from '../types';
import { createTabSearcher, createSearchUrl } from '../utils/tabSearch';
import HighlightedText from '../components/HighlightedText';
import { useTheme, type ThemeMode } from './ThemeContext';

const themeOptions: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'light', icon: <Sun size={14} />, label: 'Light' },
  { mode: 'dark', icon: <Moon size={14} />, label: 'Dark' },
  { mode: 'auto', icon: <Monitor size={14} />, label: 'Auto' },
];

// Keep the row box fixed so scrolling does not require measuring DOM nodes.
const ROW_HEIGHT = 56;
const OVERSCAN = 4;
const VIEWPORT_HEIGHT = 536;

const TabSwitcher: React.FC = () => {
  const [tabs, setTabs] = useState<{ open: TabInfo[]; history: TabInfo[] }>({ open: [], history: [] });
  const [scrollTop, setScrollTop] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { mode, setMode } = useTheme();

  const searchPlaceholder = chrome.i18n?.getMessage('searchPlaceholder') || 'Search tabs...';
  const noResults = chrome.i18n?.getMessage('noResults') || 'No tabs found';
  const noMatchingTabs = chrome.i18n?.getMessage('noMatchingTabs') || 'No matching tabs.';
  const pressEnterToSearch = chrome.i18n?.getMessage('pressEnterToSearch') || 'Press Enter to search on Google in a new tab';
  const historyTabLabel = chrome.i18n?.getMessage('historyTab') || 'History';

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_TABS' } as Message, (response) => {
      setTabs({
        open: response?.tabs ?? [],
        history: response?.historyTabs ?? [],
      });
    });

    searchInputRef.current?.focus();
  }, []);

  const searcher = useMemo(() => createTabSearcher(tabs.open, tabs.history), [tabs]);
  const searchResults = useMemo(() => searcher.search(searchQuery), [searcher, searchQuery]);
  const startIndex = Math.min(
    Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN),
    Math.max(0, searchResults.length - 1),
  );
  const endIndex = Math.min(searchResults.length,
    startIndex + Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !searchResults.length) return;
    const top = selectedIndex * ROW_HEIGHT;
    const height = list.clientHeight || VIEWPORT_HEIGHT;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + ROW_HEIGHT > list.scrollTop + height) {
      list.scrollTop = top + ROW_HEIGHT - height;
    }
    setScrollTop(list.scrollTop);
  }, [selectedIndex, searchResults]);

  const closePopup = useCallback(() => {
    window.close();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopup();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closePopup]);

  const switchToTab = useCallback(
    (tabId: number) => {
      chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tabId } as Message, () => {
        closePopup();
      });
    },
    [closePopup]
  );

  const openUrl = useCallback(
    (url: string) => {
      chrome.tabs.create({ url });
      closePopup();
    },
    [closePopup]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected) {
          if (selected.item.isHistoryTab) {
            openUrl(selected.item.url);
          } else {
            switchToTab(selected.item.id);
          }
        } else if (searchQuery.trim()) {
          openUrl(createSearchUrl(searchQuery));
        }
      } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(searchResults.length, 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(searchResults.length, 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePopup();
      }
    },
    [searchResults, selectedIndex, searchQuery, openUrl, switchToTab, closePopup]
  );

  return (
    <div className="w-[800px] h-[600px] flex flex-col bg-surface text-text-primary">
      {/* Header with search + theme toggle */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
              setScrollTop(0);
              if (listRef.current) listRef.current.scrollTop = 0;
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-raised border border-border
              text-text-primary placeholder:text-text-muted outline-none
              transition-all duration-150
              hover:bg-surface-hover hover:border-border/80
              focus:bg-surface-raised focus:ring-2 focus:ring-accent-border focus:border-border-focus"
          />
        </div>

        {/* Theme toggle */}
        <div className="flex rounded-lg border border-border bg-surface-raised p-0.5 shrink-0">
          {themeOptions.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setMode(opt.mode)}
              title={opt.label}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all duration-150 cursor-pointer
                ${mode === opt.mode
                  ? 'bg-accent-soft text-accent shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        {/* Shortcut settings */}
        <button
          onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
          title="Configure keyboard shortcuts"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface-raised
            text-text-secondary hover:text-text-primary hover:bg-surface-hover
            transition-all duration-150 cursor-pointer shrink-0"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Tab list */}
      <ul
        ref={listRef}
        style={{ overflowAnchor: 'none' }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="flex-1 min-h-0 overflow-auto py-1 px-1 custom-scrollbar list-none m-0"
      >
        {searchResults.length === 0 ? (
          <li className="p-8 text-center">
            {searchQuery.trim() ? (
              <>
                <p className="text-text-secondary font-medium">{noMatchingTabs}</p>
                <p className="text-text-primary font-semibold mt-1">{pressEnterToSearch}</p>
              </>
            ) : (
              <p className="text-text-secondary font-medium">{noResults}</p>
            )}
          </li>
        ) : (
          <>
          <li aria-hidden="true" style={{ height: startIndex * ROW_HEIGHT }} />
          {searchResults.slice(startIndex, endIndex).map((result, offset) => {
            const index = startIndex + offset;
            const tab = result.item;
            const isSelected = index === selectedIndex;
            return (
              <li key={`${tab.isHistoryTab ? 'h' : 't'}-${tab.id}`} aria-posinset={index + 1} aria-setsize={searchResults.length}
                style={{ height: ROW_HEIGHT }} className="px-2 py-0.5">
                <button
                  type="button"
                  onClick={() => tab.isHistoryTab ? openUrl(tab.url) : switchToTab(tab.id)}
                  className={`w-full h-full flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg text-left
                    transition-all duration-100 cursor-pointer border-0
                    ${isSelected
                      ? 'bg-accent-soft hover:bg-accent-soft/80'
                      : 'bg-transparent hover:bg-surface-hover hover:translate-x-1'
                    }`}
                >
                  {/* Favicon */}
                  <div className="w-5 h-5 rounded bg-surface-raised dark:bg-white/90 flex items-center justify-center shrink-0 overflow-hidden">
                    {tab.favIconUrl?.startsWith('http') ? (
                      <img
                        src={tab.favIconUrl}
                        alt=""
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`text-xs font-medium text-text-secondary ${tab.favIconUrl?.startsWith('http') ? 'hidden' : ''}`}>
                      {tab.title[0]?.toUpperCase() || '?'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm font-medium">
                        <HighlightedText
                          highlight={result.titleHighlight}
                          defaultText={tab.title || tab.url}
                        />
                      </span>
                      {tab.isHistoryTab && (
                        <span className="shrink-0 flex items-center gap-0.5 text-[0.65rem] font-semibold px-1.5 py-px rounded
                          bg-purple-100 text-purple-700 border border-purple-200 leading-none
                          dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50">
                          <History size={10} />
                          {historyTabLabel}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-text-secondary mt-0.5">
                      <HighlightedText
                        highlight={result.urlHighlight}
                        defaultText={tab.url}
                        secondary
                      />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          <li aria-hidden="true" style={{ height: (searchResults.length - endIndex) * ROW_HEIGHT }} />
          </>
        )}
      </ul>
    </div>
  );
};

export default TabSwitcher;
