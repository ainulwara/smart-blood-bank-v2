import { createContext, useCallback, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

function getUserFromResponse(data) {
  return data?.user || data?.data?.user || null;
}

function getTokenFromResponse(data) {
  return (
    data?.access_token ||
    data?.token ||
    data?.jwt ||
    data?.data?.access_token ||
    data?.data?.token ||
    null
  );
}

export function getDashboardPath(role) {
  const normalizedRole = String(role || "").toLowerCase();

  if (["admin", "administrator"].includes(normalizedRole)) {
    return "/admin/dashboard";
  }

  if (["staff", "hospital_staff", "hospital-staff"].includes(normalizedRole)) {
    return "/staff/dashboard";
  }

  return "/patient/dashboard";
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("sbb_token"));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("sbb_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    const responseData = response.data;
    const receivedToken = getTokenFromResponse(responseData);

    if (!receivedToken) {
      throw new Error("The server did not return an authentication token.");
    }

    localStorage.setItem("sbb_token", receivedToken);
    setToken(receivedToken);

    let authenticatedUser = getUserFromResponse(responseData);

    if (!authenticatedUser) {
      try {
        const profileResponse = await api.get("/auth/me");
        authenticatedUser =
          profileResponse.data?.user ||
          profileResponse.data?.data?.user ||
          profileResponse.data;
      } catch {
        localStorage.removeItem("sbb_token");
        setToken(null);
        throw new Error(
          "Login succeeded, but the user profile could not be loaded. Please check the backend response."
        );
      }
    }

    localStorage.setItem("sbb_user", JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);

    return authenticatedUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sbb_token");
    localStorage.removeItem("sbb_user");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get("/auth/me");
    const refreshedUser =
      response.data?.user ||
      response.data?.data?.user ||
      response.data;

    localStorage.setItem("sbb_user", JSON.stringify(refreshedUser));
    setUser(refreshedUser);

    return refreshedUser;
  }, []);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
