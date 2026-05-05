// In Vite dev, default to '' so requests go to the same origin (/api...) and vite.config.js proxies to Express on :5000.
// Deployed: set VITE_API_URL to your backend URL, or rely on same-host /api routing.
const raw = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL.trim() : '';

export const API_BASE_URL =
  raw.replace(/\/+$/, '') ||
  (import.meta.env.DEV ? '' : 'http://localhost:5000');
