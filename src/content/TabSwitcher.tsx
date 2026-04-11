import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { TabInfo, Message, SearchResult } from '../types';
import { createTabSearcher, createSearchUrl } from '../utils/tabSearch';
import HighlightedText from '../components/HighlightedText';

const TabSwitcher: React.FC = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const searchPlaceholder = chrome.i18n?.getMessage('searchPlaceholder') || 'Search tabs...';
  const noResults = chrome.i18n?.getMessage('noResults') || 'No tabs found';
  const noResultsPressEnterToSearch = chrome.i18n?.getMessage('noResultsPressEnterToSearch') || 'No matching tabs. Press Enter to search on Google in a new tab';
  const currentTabLabel = chrome.i18n?.getMessage('currentTab') || 'Current';

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_TABS' } as Message, (response) => {
      if (response?.tabs) {
        setTabs(response.tabs);
      }
    });

    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const searcher = createTabSearcher(tabs);
    const results = searcher.search(searchQuery);
    setSearchResults(results);
    setSelectedIndex(0);
  }, [searchQuery, tabs]);

  useEffect(() => {
    if (listRef.current && searchResults.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
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

  const openNewTab = useCallback(
    (query: string) => {
      const url = createSearchUrl(query);
      chrome.tabs.create({ url });
      closePopup();
    },
    [closePopup]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults.length > 0) {
          switchToTab(searchResults[selectedIndex].item.id);
        } else if (searchQuery.trim()) {
          openNewTab(searchQuery);
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
    [searchResults, selectedIndex, searchQuery, openNewTab, switchToTab, closePopup]
  );

  return (
    <Box
      sx={{
        width: '800px',
        height: '600px',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        background: 'rgba(30, 30, 35, 1)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'transparent',
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            inputRef={searchInputRef}
            autoFocus
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.5)' }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'background-color, box-shadow',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 0 0 2px rgba(99, 179, 237, 0.4)',
                  '& fieldset': {
                    borderColor: 'rgba(99, 179, 237, 0.6)',
                  },
                },
              },
              '& .MuiOutlinedInput-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.4)',
                opacity: 1,
              },
            }}
          />
        </Box>

        <List
          ref={listRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            py: 1,
            px: 1,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.25)',
              },
            },
          }}
        >
          {searchResults.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                {searchQuery.trim() ? noResultsPressEnterToSearch : noResults}
              </Typography>
            </Box>
          ) : (
            searchResults.map((result, index) => {
              const tab = result.item;
              return (
                <ListItem key={tab.id} disablePadding sx={{ px: 2, py: 0.5 }}>
                  <ListItemButton
                    selected={index === selectedIndex}
                    onClick={() => switchToTab(tab.id)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderRadius: '10px',
                      transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
                      willChange: 'transform, background-color',
                      transform: 'translateX(0) translateZ(0)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        transform: 'translateX(4px) translateZ(0)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(99, 179, 237, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(99, 179, 237, 0.25)',
                        },
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar
                        src={tab.favIconUrl?.startsWith('http') ? tab.favIconUrl : undefined}
                        variant="rounded"
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '6px',
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.9)',
                        }}
                      >
                        {tab.title[0]?.toUpperCase() || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Typography
                            variant="body1"
                            sx={{
                              flexGrow: 1,
                              wordBreak: 'break-word',
                              lineHeight: 1.4,
                              fontWeight: 500,
                            }}
                          >
                            <HighlightedText
                              highlight={result.titleHighlight}
                              defaultText={tab.title || tab.url}
                            />
                          </Typography>
                          {tab.active && (
                            <Chip
                              label={currentTabLabel}
                              size="small"
                              sx={{
                                height: '20px',
                                fontSize: '0.7rem',
                                flexShrink: 0,
                                backgroundColor: 'rgba(99, 179, 237, 0.3)',
                                color: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid rgba(99, 179, 237, 0.5)',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{
                            wordBreak: 'break-all',
                            lineHeight: 1.3,
                            mt: 0.5,
                            fontSize: '0.8rem',
                          }}
                        >
                          <HighlightedText
                            highlight={result.urlHighlight}
                            defaultText={tab.url}
                            color="rgba(255, 255, 255, 0.5)"
                          />
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default TabSwitcher;
