import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './ThemeContext';
import TabSwitcher from './TabSwitcher';
import './index.css';

// Use the browser UI language for pronunciation and assistive technology.
document.documentElement.lang = chrome.i18n.getUILanguage().replace(/_/g, '-');
document.title = chrome.i18n.getMessage('extensionName') || 'JumpAround';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TabSwitcher />
    </ThemeProvider>
  </React.StrictMode>
);
