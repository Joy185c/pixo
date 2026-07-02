// In dev: requests go to /api and Vite proxies them to localhost:4000
// In production (Vercel): VITE_API_BASE_URL points to https://pixo-backend.onrender.com/api
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = {
  get: (path) =>
    fetch(BASE + path).then(r => r.json()),

  post: (path, body) =>
    fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()),

  patch: (path, body) =>
    fetch(BASE + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.json()),
};
