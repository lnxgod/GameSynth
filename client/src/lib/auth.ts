import { createContext, useContext, useState } from "react";
import { apiRequest } from "./queryClient";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  role: string | null;
  forcePasswordChange: boolean;
  analysis_model: string | null;
  code_gen_model: string | null;
}

interface AuthContextType {
  auth: AuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const initialState: AuthState = {
  isAuthenticated: false,
  username: null,
  role: null,
  forcePasswordChange: false,
  analysis_model: null,
  code_gen_model: null,
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
  const [auth, setAuth] = useState<AuthState>(initialState);

  const login = async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();

    if (res.ok) {
      setAuth({
        isAuthenticated: true,
        username: data.username,
        role: data.role,
        forcePasswordChange: data.forcePasswordChange,
        analysis_model: data.analysis_model || null,
        code_gen_model: data.code_gen_model || null
      });
    } else {
      throw new Error(data.error);
    }
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setAuth(initialState);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await apiRequest("POST", "/api/auth/change-password", {
      currentPassword,
      newPassword,
    });

    if (res.ok) {
      setAuth(prev => ({ ...prev, forcePasswordChange: false }));
    } else {
      const data = await res.json();
      throw new Error(data.error);
    }
  };

  return {
    auth,
    login,
    logout,
    changePassword,
  };
}