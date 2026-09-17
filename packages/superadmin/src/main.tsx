import React from 'react';
import { createRoot } from 'react-dom/client';
import { ScreenGuard } from 'ui';
import { App } from './App.tsx';
import { SuperadminAuth } from './SuperadminAuth.tsx';

const response = await fetch('/config.json', { cache: 'no-store' });
if (!response.ok) throw new Error('Could not load application runtime configuration');
window.config = await response.json();

const container = document.getElementById('root') as Element;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ScreenGuard>
      <SuperadminAuth>
        <App />
      </SuperadminAuth>
    </ScreenGuard>
  </React.StrictMode>,
);
