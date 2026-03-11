import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Remove splash screen com fade-out
const splash = document.getElementById('splash');
if (splash) {
  splash.classList.add('fade-out');
  setTimeout(() => splash.remove(), 400);
}
