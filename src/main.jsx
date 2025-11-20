import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import App from './App.jsx';

console.log('main.jsx executing');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
