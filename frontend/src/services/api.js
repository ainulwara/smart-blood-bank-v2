import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sbb_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// If the session expired (JWT lasts ~8h), clear it and send the user to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginCall = error.config?.url === "/auth/login";

    if (status === 401 && !isLoginCall && localStorage.getItem("sbb_token")) {
      localStorage.removeItem("sbb_token");
      localStorage.removeItem("sbb_user");
      window.location.assign("/login");
    }

    return Promise.reject(error);
  }
);

export default api;