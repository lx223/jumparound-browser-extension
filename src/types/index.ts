export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  windowId: number;
  active: boolean;
  lastAccessed: number;
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
  searchTier: 'tabs-url' | 'tabs-title';
}

export interface Message {
  type: 'TOGGLE_SWITCHER' | 'GET_TABS' | 'SWITCH_TAB' | 'CLOSE_SWITCHER';
  tabId?: number;
  tabs?: TabInfo[];
}
