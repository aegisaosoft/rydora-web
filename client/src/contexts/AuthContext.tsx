/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov
 *
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, setAuthToken } from '../services/api';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  stateId?: number;
  isOwner: boolean;
  isAdmin: boolean;
  imageURL?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading to check session
  const queryClient = useQueryClient();

  // Check if user is authenticated via server session
  const { data: userData, isLoading: userLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: authApi.getCurrentUser,
    retry: false,
    enabled: !!localStorage.getItem('token'), // Only probe if we have a token
    refetchOnWindowFocus: false,
  });

  // Handle user data changes
  useEffect(() => {
    if (userData) {
      console.log('=== USER DATA REFRESHED ===');
      console.log('User data:', userData.user);
      console.log('isAdmin:', userData.user?.isAdmin);
      console.log('isOwner:', userData.user?.isOwner);
      setUser(userData.user);
      setIsLoading(false);
    } else if (error) {
      setUser(null);
      setIsLoading(false);
    }
  }, [userData, error]);

  // Login mutation with enhanced error handling
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      console.log('=== LOGIN SUCCESS ===');
      console.log('Login data:', data);
      console.log('User from login:', data.user);
      console.log('isAdmin from login:', data.user?.isAdmin);
      console.log('isOwner from login:', data.user?.isOwner);
      setUser(data.user);
      // Store token in localStorage for Bearer auth
      if (data.token) {
        localStorage.setItem('token', data.token);
        setAuthToken(data.token);
      }
      queryClient.setQueryData(['user'], data);
    },
    onError: (error: any) => {
      console.error('=== LOGIN ERROR ===');
      console.error('Error:', error);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        const retryAfter = error.retryAfterSeconds || 30;
        console.warn(`Rate limited. Please wait ${retryAfter} seconds before trying again.`);
      }
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setUser(null);
      // Clear token from localStorage
      localStorage.removeItem('token');
      setAuthToken(null);
      queryClient.clear();
    },
    onError: () => {
      // Even if server logout fails, clear local state
      setUser(null);
      // Clear token from localStorage
      localStorage.removeItem('token');
      setAuthToken(null);
      queryClient.clear();
    }
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const isAuthenticated = !!user;

  useEffect(() => {
    // Loading state matches the session check
    setIsLoading(userLoading);
    // Rehydrate token into axios on app start
    const token = localStorage.getItem('token');
    setAuthToken(token);
  }, [userLoading]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
