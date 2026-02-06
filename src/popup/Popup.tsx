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
import { createTabSearcher, createSearchUrl } from '../utils/fuzzySearch';

const Popup: React.FC = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [filteredTabs, setFilteredTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const searchPlaceholder = chrome.i18n?.getMessage('searchPlaceholder') || 'Search tabs...';
  const noResults = chrome.i18n?.getMessage('noResults') || 'No tabs found';
  const currentTabLabel = chrome.i18n?.getMessage('currentTab') || 'Current';

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
    chrome.runtime.sendMessage({ type: 'CLOSE_SWITCHER' } as Message);
  }, []);

  const switchToTab = useCallback(
    (tabId: number) => {
      chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tabId } as Message, () => {
        closeSwitcher();
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
          switchToTab(filteredTabs[selectedIndex].id);
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
    [filteredTabs, selectedIndex, searchQuery, switchToTab, openNewTab, closeSwitcher]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSwitcher();
    }
  };

  const truncateUrl = (url: string, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
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
        background: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '600px',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2 }}>
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
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>

        <List
          ref={listRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            maxHeight: '400px',
            py: 0,
          }}
        >
          {filteredTabs.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {noResults}
              </Typography>
            </Box>
          ) : (
            filteredTabs.map((tab, index) => (
              <ListItem key={tab.id} disablePadding>
                <ListItemButton
                  selected={index === selectedIndex}
                  onClick={() => switchToTab(tab.id)}
                  sx={{
                    py: 1.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.dark',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={tab.favIconUrl}
                      variant="rounded"
                      sx={{ width: 24, height: 24 }}
                    >
                      {tab.title[0]?.toUpperCase() || '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" noWrap sx={{ flexGrow: 1 }}>
                          {tab.title || tab.url}
                        </Typography>
                        {tab.active && (
                          <Chip label={currentTabLabel} size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {truncateUrl(tab.url)}
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

export default Popup;
