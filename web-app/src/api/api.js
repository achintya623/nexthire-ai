import axios from "axios";

// Creates a single API base URL for all frontend HTTP requests.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Attaches the auth token to every outgoing request when available.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Forces a fresh login when the backend returns unauthorized.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.reload();
    }

    return Promise.reject(error);
  },
);

export default api;
