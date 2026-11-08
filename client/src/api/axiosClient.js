/**
 * Axios instance shared by every slice.
 *
 * baseURL is "/api" and Vite proxies it to the Express server in development,
 * so no absolute URL is ever written into the code and the same build works
 * when the API is deployed elsewhere.
 */
import axios from "axios";

const TOKEN_KEY = "alzikrayat.token";

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null; // private mode or blocked storage must not break the app
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000 // uploads need more than the default
});

/* Attach the token to every request that has one. */
api.interceptors.request.use(config => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* A dead or expired token is cleared immediately, so the app never keeps
   retrying with credentials the server has already rejected. */
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const serverError = error.response?.data?.error || "";

    if (status === 401 && !serverError.includes("Invalid email or password")) {
      tokenStore.clear();
    }
    return Promise.reject(error);
  }
);

/**
 * Turn any axios failure into the shape the slices store.
 * The server always answers with { error, details? }; a network failure has
 * no response at all, which is why the fallback exists.
 */
export function toError(error) {
  if (error.response?.data) {
    return {
      message: error.response.data.error || "Something went wrong.",
      details: error.response.data.details || null,
      status: error.response.status,
      ...error.response.data
    };
  }
  return {
    message: error.message === "Network Error"
      ? "Cannot reach the server. Is it running?"
      : error.message || "Something went wrong.",
    details: null,
    status: 0
  };
}

export default api;
