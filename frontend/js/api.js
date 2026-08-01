/**
 * api.js — Centralised HTTP client
 */
const API_BASE = '/api';

const Api = {
  token: localStorage.getItem('hms_token') || null,

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('hms_token', t);
    else   localStorage.removeItem('hms_token');
  },

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({ success: false, message: res.statusText }));

    if (res.status === 401) {
      // Token expired — force logout
      this.setToken(null);
      Auth.showLogin();
    }
    return data;
  },

  get   (path)        { return this.request('GET',    path); },
  post  (path, body)  { return this.request('POST',   path, body); },
  put   (path, body)  { return this.request('PUT',    path, body); },
  delete(path)        { return this.request('DELETE', path); },

  // Convenience wrappers
  getQ(path, params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v !== null && v !== undefined))
    ).toString();
    return this.get(path + (qs ? `?${qs}` : ''));
  },
};
