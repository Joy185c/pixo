// In dev: requests go to /api and Vite proxies them to localhost:4000
// In production: VITE_API_BASE_URL points to backend
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchWithAuth(path, options = {}) {
  const token = localStorage.getItem('pixo_token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });
  
  if (res.status === 401 && window.location.pathname !== '/login') {
    localStorage.removeItem('pixo_token');
    localStorage.removeItem('pixo_user');
    window.location.href = '/login';
  }
  
  // We can choose to throw or just return the JSON. 
  // Let's parse JSON and throw if not ok to match standard promise usage.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

export const api = {
  get: (path) => fetchWithAuth(path),
  post: (path, body) =>
    fetchWithAuth(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  patch: (path, body) =>
    fetchWithAuth(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
};
