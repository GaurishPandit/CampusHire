import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { authApi, studentApi } from '@/api';

export interface User {
  id: string;
  _id?: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: 'student' | 'placement_admin' | 'sys_admin';
  college: string | null;
  isActive: boolean;
  activatedAt?: string;
}

export interface StudentProfileData {
  _id?: string;
  user?: string;
  name?: string;
  rollNumber?: string;
  branch?: string;
  graduationYear?: number;
  cgpa?: number;
  activeBacklogs?: number;
  isAcademicVerified?: boolean;
  academicVerifiedAt?: string;
  phoneNumber?: string;
  resumeUrl?: string;
  skills?: string[];
  interests?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  completenessScore?: number;
}

interface AuthState {
  user: User | null;
  profile: StudentProfileData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: { user: User; profile?: StudentProfileData | null } }
  | { type: 'SET_PROFILE'; payload: StudentProfileData }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile || null,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'CLEAR_USER':
      return { ...state, user: null, profile: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      const userData = res.data?.data?.user;
      const profileData = res.data?.data?.profile;
      if (userData) {
        dispatch({
          type: 'SET_USER',
          payload: { user: userData, profile: profileData },
        });
      } else {
        localStorage.removeItem('campushire_token');
        dispatch({ type: 'CLEAR_USER' });
      }
    } catch {
      localStorage.removeItem('campushire_token');
      dispatch({ type: 'CLEAR_USER' });
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await studentApi.getMyProfile();
      if (res.data?.data) {
        const p = res.data.data.profile || res.data.data;
        dispatch({ type: 'SET_PROFILE', payload: p });
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const userData = res.data?.data?.user;
    const profileData = res.data?.data?.profile;
    const token = res.data?.data?.accessToken;
    if (token) {
      localStorage.setItem('campushire_token', token);
    }
    dispatch({
      type: 'SET_USER',
      payload: { user: userData, profile: profileData },
    });
    return userData;
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('campushire_token');
    dispatch({ type: 'CLEAR_USER' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
