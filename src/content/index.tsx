import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import TabSwitcher from './TabSwitcher';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    background: {
      default: 'transparent',
      paper: 'rgba(30, 30, 30, 0.95)',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TabSwitcher />
    </ThemeProvider>
  </React.StrictMode>
);
