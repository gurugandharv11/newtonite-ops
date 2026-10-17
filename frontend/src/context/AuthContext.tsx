import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSummary, TeamRole } from '../types';
import { authApi } from '../api/endpoints';

interface AuthContextType {
  user: UserSummary | null;
  teamRoles: Record<string, TeamRole>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [teamRoles, setTeamRoles] = useState<Record<string, TeamRole>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('newtonite_token');
      if (token) {
        try {
          const res = await authApi.getCurrentUser();
          setUser(res.user);
          setTeamRoles(res.teamRoles || {});
        } catch {
          localStorage.removeItem('newtonite_token');
          setUser(null);
          setTeamRoles({});
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    if (res.token) {
      localStorage.setItem('newtonite_token', res.token);
    }
    setUser(res.user);
    setTeamRoles(res.teamRoles || {});
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('newtonite_token');
      setUser(null);
      setTeamRoles({});
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        teamRoles,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
