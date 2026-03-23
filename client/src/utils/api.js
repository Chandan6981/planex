import axios from 'axios';

const api = axios.create({
  baseURL:          process.env.REACT_APP_API_URL || '/api',
  headers:          { 'Content-Type': 'application/json' },
  withCredentials:  true,   // send httpOnly cookie on every request
});

// ── Request interceptor — attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Refresh token queue — prevents multiple concurrent refresh calls ───────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

// ── Response interceptor — auto-refresh on TOKEN_EXPIRED ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original  = error.config;
    const status    = error.response?.status;
    const code      = error.response?.data?.code;

    // Only attempt refresh for expired tokens — not for wrong password, forbidden etc
    const isExpired = status === 401 && code === 'TOKEN_EXPIRED';

    // Never retry refresh or login endpoints — would cause infinite loop
    if (original.url?.includes('/auth/refresh') ||
        original.url?.includes('/auth/login')   ||
        original.url?.includes('/auth/register')) {
      return Promise.reject(error);
    }

    if (isExpired && !original._retry) {
      // If already refreshing — queue this request to retry after refresh completes
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(err => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        // Call refresh — cookie sent automatically (withCredentials: true)
        const res      = await axios.post(
          `${process.env.REACT_APP_API_URL || ''}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = res.data.token;

        // Store new access token
        localStorage.setItem('token', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        // Retry all queued requests with new token
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);

      } catch (refreshError) {
        // Refresh token also expired — force logout
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // Non-expiry 401 (invalid token, user deleted etc) — just logout
    if (status === 401 && !original._retry) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;