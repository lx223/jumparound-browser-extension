export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  windowId: number;
  active: boolean;
  lastAccessed: number;
  isHistoryTab?: boolean;
  isClosedTab?: boolean;
  /** chrome.sessions ID used to restore a recently closed tab. */
  sessionId?: string;
}

export interface MatchHighlight {
  text: string;
  positions: number[];
}

export interface SearchResult {
  item: TabInfo;
  score: number;
  titleHighlight?: MatchHighlight;
  urlHighlight?: MatchHighlight;
  matchedField: 'url' | 'title';
  searchTier: 'tabs-url' | 'tabs-title' | 'closed-url' | 'closed-title' | 'history-url' | 'history-title';
}

export interface Message {
  type: 'GET_TABS' | 'SWITCH_TAB' | 'SEARCH_HISTORY' | 'RESTORE_TAB';
  tabId?: number;
  query?: string;
  tabs?: TabInfo[];
  historyTabs?: TabInfo[];
  closedTabs?: TabInfo[];
  sessionId?: string;
}
