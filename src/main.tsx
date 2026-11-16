import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <main className="min-h-svh p-8">
        <h1 className="ds-text-title-lg">Citizen-GUI</h1>
        <p className="mt-2 ds-text-body-md">Evidenzgebundene Bescheidprüfung</p>
      </main>
    </React.StrictMode>
  );
}
