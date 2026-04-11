export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  windowId: number;
  active: boolean;
  lastAccessed: number;
  isHistoryTab?: boolean;
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
  searchTier: 'tabs-url' | 'tabs-title' | 'history-url' | 'history-title';
}

export interface Message {
  type: 'GET_TABS' | 'SWITCH_TAB';
  tabId?: number;
  tabs?: TabInfo[];
  historyTabs?: TabInfo[];
}
