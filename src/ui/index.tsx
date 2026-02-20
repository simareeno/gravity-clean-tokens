import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@gravity-ui/uikit';
import App from './App';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

const initApp = () => {
  const container = document.getElementById('root');
  
  if (container) {
    const root = createRoot(container);

    root.render(
      <React.StrictMode>
        <ThemeProvider theme="light">
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );
  }
};

if (document.readyState === 'loading') {
  console.log('DOM is loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log('DOM already loaded, initializing immediately');
  initApp();
}
