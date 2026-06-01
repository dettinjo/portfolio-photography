// src/context/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";

// Payload is embedded — REST API is always at the same origin
const CMS_URL = "";

interface AuthUser {
  id: number | string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  jwt: string | null;
  loading: boolean;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("jwt");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    // Validate token against Payload's /api/users/me endpoint
    fetch(`${CMS_URL}/api/users/me`, {
      headers: { Authorization: `JWT ${storedToken}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser({ id: data.id, email: data.email, name: data.name });
          setJwt(storedToken);
        } else {
          localStorage.removeItem("jwt");
        }
      })
      .catch(() => localStorage.removeItem("jwt"))
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, userData: AuthUser) => {
    localStorage.setItem("jwt", token);
    setJwt(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setJwt(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, jwt, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
