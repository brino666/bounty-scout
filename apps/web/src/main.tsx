import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@bounty-scout/api-client-react';

import App from './App';

import './index.css';

// Frontend and API deploy as two separate Vercel projects — point every
// relative /api/... call at the API's own URL instead of this app's domain.
// Leave VITE_API_URL unset locally to talk to the Vite dev proxy instead.
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
}

createRoot(document.getElementById('root')!).render(<App />);
