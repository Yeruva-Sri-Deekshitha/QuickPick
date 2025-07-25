import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService } from '@/services/authService';

interface User {
  id: string;
  email: string;
  profile: {
    name: string;
    phone: string;
    role: 'vendor' | 'buyer';
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth state check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await AuthService.login(email, password);
    if (response.success && response.user) {
      setUser(response.user);
    }
    return response;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}