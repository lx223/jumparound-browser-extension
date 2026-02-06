export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  windowId: number;
  active: boolean;
  lastAccessed: number;
}

export interface Message {
  type: 'TOGGLE_SWITCHER' | 'GET_TABS' | 'SWITCH_TAB' | 'CLOSE_SWITCHER';
  tabId?: number;
  tabs?: TabInfo[];
}
