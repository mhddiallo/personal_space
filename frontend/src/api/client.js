// En local : le proxy Vite redirige /api vers http://127.0.0.1:8000 (voir vite.config.js).
// En prod (build Render) : VITE_API_BASE pointe vers l'URL complète du backend déployé.
const BASE = import.meta.env.VITE_API_BASE || '/api'
const TOKEN_KEY = 'espace_auth_token'

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function request(path, options = {}) {
  const token = authToken.get()
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${BASE}${path}`, { headers, ...options })
  if (res.status === 401) {
    authToken.clear()
    window.dispatchEvent(new Event('espace-unauthorized'))
    throw new Error('Session expirée')
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Erreur ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
}
