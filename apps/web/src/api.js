import axios from 'axios';

const SESSION_KEY = 'erp-session';

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  timeout: 10000,
  headers: {'Content-Type': 'application/json'},
});

api.interceptors.request.use((config) => {
  const token = getStoredSession()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function apiRequest(path, options = {}) {
  try {
    const requestData = options.body ?? options.data;
    const headers = {...(options.headers ?? {})};
    if (requestData instanceof FormData) delete headers['Content-Type'];

    const response = await api.request({
      url: path,
      method: options.method ?? 'GET',
      data: requestData,
      params: options.params,
      signal: options.signal,
      headers,
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message ?? error.message ?? 'No fue posible conectar con el servidor';
    const normalized = new Error(message);
    normalized.status = error.response?.status;
    throw normalized;
  }
}

export default api;
