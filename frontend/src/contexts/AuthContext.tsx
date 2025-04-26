/**
 * Authentication context provider
 * 
 * Manages user authentication state throughout the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService, { User, LoginCredentials, RegisterData } from '../services/api';

// Context type definition
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Default context values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearError: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider for the application
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check token and load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const userData = await apiService.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Authentication failed - clearing session');
        apiService.clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Authenticate user with credentials
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiService.login(credentials);
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      console.error(`Login error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new user account
  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiService.register(userData);
      
      // Auto-login after registration
      await login({
        username: userData.username,
        password: userData.password,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
      console.error(`Registration error: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  // End user session
  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  // Reset error state
  const clearError = () => {
    setError(null);
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook for consuming auth context
 */
export const useAuth = () => useContext(AuthContext);