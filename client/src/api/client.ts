import axios from 'axios';

// Always resolve to a URL that ends with /api/v1.
// Guards against VITE_API_URL being set to just the bare host (e.g. https://campushire-ssix.onrender.com)
// without the required path prefix.
const RENDER_BACKEND = 'https://campushire-ssix.onrender.com';
const API_V1_SUFFIX = '/api/v1';

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;

  // If an explicit env var was provided, normalise it
  if (raw) {
    const trimmed = raw.replace(/\/+$/, ''); // strip trailing slashes
    // Already has /api/v1 (or /api/v1/)
    if (trimmed.endsWith(API_V1_SUFFIX)) return trimmed;
    // Has /api but not /v1
    if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
    // Bare host – append the full prefix
    return `${trimmed}${API_V1_SUFFIX}`;
  }

  // No env var: use the hardcoded Render URL in production, local proxy in dev
  return import.meta.env.PROD ? `${RENDER_BACKEND}${API_V1_SUFFIX}` : API_V1_SUFFIX;
}

const API_BASE_URL = resolveBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('campushire_token') : null;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do NOT intercept or refresh for auth endpoints
    const isAuthEndpoint =
      !originalRequest ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/me') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/activate') ||
      originalRequest.url?.includes('/auth/forgot-password') ||
      originalRequest.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed — only redirect if not already on an auth page
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/activate'
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
