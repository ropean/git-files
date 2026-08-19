import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@shared/types/models";

// Raw shape returned by GET /auth/me (@ropean/sso-client's `/me` route),
// which forwards ID-token claims verbatim rather than our app's field names.
interface MeResponse {
  sub: string;
  username?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  picture?: string;
  role?: string;
  org_id?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  refetchAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refetchAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAuth = async () => {
    try {
      const res = await fetch("/auth/me");
      const data = (await res.json()) as MeResponse | null;
      setUser(
        data
          ? {
              sub: data.sub,
              username: data.username ?? data.preferred_username ?? null,
              displayName: data.name ?? null,
              email: data.email ?? null,
              picture: data.picture ?? null,
              org_id: data.org_id ?? null,
              role: data.role ?? null,
            }
          : null,
      );
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuth();
  }, []);

  return <AuthContext.Provider value={{ user, loading, refetchAuth: fetchAuth }}>{children}</AuthContext.Provider>;
}
