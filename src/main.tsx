import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StoreProvider } from './store';
import { SocialProvider } from './social';
import { initTelegram, inTelegram, tg } from './lib/telegram';
import './styles.css';

initTelegram();
const applyTheme = () => {
  const scheme = inTelegram ? (tg?.colorScheme ?? 'dark') : 'dark';
  document.documentElement.dataset.theme = scheme;
};
applyTheme();
tg?.onEvent?.('themeChanged', applyTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <SocialProvider>
        <App />
      </SocialProvider>
    </StoreProvider>
  </React.StrictMode>,
);
