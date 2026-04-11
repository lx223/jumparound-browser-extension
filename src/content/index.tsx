import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './ThemeContext';
import TabSwitcher from './TabSwitcher';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TabSwitcher />
    </ThemeProvider>
  </React.StrictMode>
);
