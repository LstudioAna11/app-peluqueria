import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Reuse the same worker as Web Push; no permission prompt and no second registration scope.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{});},{once:true});
}
