import { createContext, useContext, useState } from "react";
import { apiRequest } from "./queryClient";

export type Auth = {
  isAuthenticated: boolean;
  username: string;
  role: string;
  forcePasswordChange: boolean;
  analysis_model: string;
  code_gen_model: string;
};

type AuthContextType = {
  auth: Auth;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const defaultAuth: Auth = {
  isAuthenticated: false,
  username: "",
  role: "",
  forcePasswordChange: false,
  analysis_model: "gpt-4o",
  code_gen_model: "gpt-4o"
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthProvider() {
  const [auth, setAuth] = useState<Auth>(defaultAuth);

  const login = async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", {
      username,
      password,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }

    const data = await res.json();
    setAuth({
      isAuthenticated: true,
      username: data.username,
      role: data.role,
      forcePasswordChange: data.forcePasswordChange,
      analysis_model: data.analysis_model || "gpt-4o",
      code_gen_model: data.code_gen_model || "gpt-4o"
    });
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setAuth(defaultAuth);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await apiRequest("POST", "/api/auth/change-password", {
      currentPassword,
      newPassword,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }

    setAuth((prev) => ({
      ...prev,
      forcePasswordChange: false,
    }));
  };

  return { auth, login, logout, changePassword };
}