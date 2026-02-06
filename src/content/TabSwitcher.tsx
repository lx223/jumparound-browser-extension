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
import type { TabInfo, Message } from '../types';
import { createTabSearcher, createSearchUrl } from '../utils/tabSearch';

const TabSwitcher: React.FC = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [filteredTabs, setFilteredTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const searchPlaceholder = chrome.i18n?.getMessage('searchPlaceholder') || 'Search tabs...';
  const noResults = chrome.i18n?.getMessage('noResults') || 'No tabs found';
  const currentTabLabel = chrome.i18n?.getMessage('currentTab') || 'Current';

  const currentTabId = React.useMemo(() => {
    const tabId = new URLSearchParams(window.location.search).get('tabId');
    return tabId ? Number(tabId) : null;
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_TABS' } as Message, (response) => {
      if (response?.tabs) {
        setTabs(response.tabs);
        setFilteredTabs(response.tabs);
      }
    });

    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTabs(tabs);
      setSelectedIndex(0);
      return;
    }

    const searcher = createTabSearcher(tabs);
    const results = searcher.search(searchQuery);
    setFilteredTabs(results.map(r => r.item));
    setSelectedIndex(0);
  }, [searchQuery, tabs]);

  useEffect(() => {
    if (listRef.current && filteredTabs.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, filteredTabs]);

  const closeSwitcher = useCallback(() => {
    if (currentTabId != null) {
      chrome.tabs.sendMessage(currentTabId, { type: 'CLOSE_SWITCHER' } as Message);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_SWITCHER' } as Message);
      });
    }
  }, [currentTabId]);

  // Global Escape in iframe: focus is inside the iframe when switcher is open,
  // so the content script’s window listener never sees keydown. Handle Escape here.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSwitcher();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeSwitcher]);

  const switchToTab = useCallback(
    (tabId: number) => {
      closeSwitcher();

      chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tabId } as Message, () => {
      });
    },
    [closeSwitcher]
  );

  const openNewTab = useCallback(
    (query: string) => {
      const url = createSearchUrl(query);
      chrome.tabs.create({ url });
      closeSwitcher();
    },
    [closeSwitcher]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredTabs.length > 0) {
          closeSwitcher();
          chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tabId: filteredTabs[selectedIndex].id } as Message);
        } else if (searchQuery.trim()) {
          openNewTab(searchQuery);
        }
      } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(filteredTabs.length, 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredTabs.length) % Math.max(filteredTabs.length, 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSwitcher();
      }
    },
    [filteredTabs, selectedIndex, searchQuery, openNewTab, closeSwitcher]
  );

  const handleBackdropClick = () => {
    closeSwitcher();
  };

  const handlePaperClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Box
      onClick={handleBackdropClick}
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        background: 'rgba(0, 0, 0, 0.75)',
        animation: 'fadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity',
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <Paper
        elevation={0}
        onClick={handlePaperClick}
        sx={{
          width: '900px',
          maxWidth: '90vw',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'rgba(30, 30, 35, 0.95)',
          backdropFilter: 'blur(16px) saturate(180%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          animation: 'slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          '@keyframes slideUp': {
            from: {
              opacity: 0,
              transform: 'translateY(12px) translateZ(0)',
            },
            to: {
              opacity: 1,
              transform: 'translateY(0) translateZ(0)',
            },
          },
        }}
      >
        <Box sx={{ p: 3, pb: 2 }}>
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
            maxHeight: 'calc(70vh - 120px)',
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
          {filteredTabs.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                {noResults}
              </Typography>
            </Box>
          ) : (
            filteredTabs.map((tab, index) => (
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
                      src={tab.favIconUrl}
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
                            color: 'rgba(255, 255, 255, 0.95)',
                            fontWeight: 500,
                          }}
                        >
                          {tab.title || tab.url}
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
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '0.8rem',
                        }}
                      >
                        {tab.url}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default TabSwitcher;
