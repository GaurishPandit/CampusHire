import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  roles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles, roles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveRoles = allowedRoles || roles;
  if (effectiveRoles && user && !effectiveRoles.includes(user.role)) {
    if (user.role === 'student') return <Navigate to="/" replace />;
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
