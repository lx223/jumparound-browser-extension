import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '../content/ThemeContext';
import Options from './Options';
import '../content/index.css';

document.documentElement.lang = chrome.i18n.getUILanguage().replace(/_/g, '-');
document.title = chrome.i18n.getMessage('optionsTitle') || 'JumpAround settings';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Options />
    </ThemeProvider>
  </React.StrictMode>
);
