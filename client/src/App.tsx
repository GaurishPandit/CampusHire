import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ActivateAccountPage from './pages/auth/ActivateAccountPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import OpportunitiesPage from './pages/student/OpportunitiesPage';
import OpportunityDetailPage from './pages/student/OpportunityDetailPage';
import ApplicationsPage from './pages/student/ApplicationsPage';
import ProfilePage from './pages/student/ProfilePage';
import ResultsPage from './pages/student/ResultsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentImportPage from './pages/admin/StudentImportPage';
import ManageOpportunitiesPage from './pages/admin/ManageOpportunitiesPage';
import OpportunityFormPage from './pages/admin/OpportunityFormPage';
import OpportunityManageRoundsPage from './pages/admin/OpportunityManageRoundsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={user.role === 'student' ? '/' : '/admin'} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/activate" element={<ActivateAccountPage />} />

      {/* Student App Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout>
              <StudentDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout>
              <StudentDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/opportunities"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout>
              <OpportunitiesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/opportunities/:id"
        element={
          <ProtectedRoute allowedRoles={['student', 'placement_admin', 'sys_admin']}>
            <AppLayout>
              <OpportunityDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout>
              <ApplicationsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute allowedRoles={['student', 'placement_admin', 'sys_admin']}>
            <AppLayout>
              <ResultsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin App Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <StudentImportPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/import-students"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <StudentImportPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/opportunities"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <ManageOpportunitiesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/opportunities/new"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <OpportunityFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/opportunities/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <OpportunityFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/opportunities/:id/rounds"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <OpportunityManageRoundsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/results"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <ResultsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <AuditLogsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute allowedRoles={['placement_admin', 'sys_admin']}>
            <AppLayout>
              <AuditLogsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route
        path="*"
        element={
          user?.role === 'placement_admin' || user?.role === 'sys_admin' ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}
