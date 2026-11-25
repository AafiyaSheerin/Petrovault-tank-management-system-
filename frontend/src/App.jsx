import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';
import TankDetail from './pages/TankDetail';
import ProductsPage from './pages/ProductsPage';
import VolumeConverter from './pages/VolumeConverter';
import ReportsPage from './pages/ReportsPage';
import ActivityLog from './pages/ActivityLog';
import AdminPanel from './pages/AdminPanel';
import EmployeeManager from './pages/EmployeeManager';
import NotFound from './pages/NotFound';

import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleGuard from './components/auth/RoleGuard';
import Loader from './components/shared/Loader';
import AlertBanner from './components/shared/AlertBanner';

const AppRoutes = () => {
    const { user, loading } = useAuthContext();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader size="large" />
            </div>
        );
    }

    return (
        <>
            <AlertBanner />
            <Routes>
                <Route
                    path="/login"
                    element={user ? <Navigate to="/" replace /> : <LoginPage />}
                />

                <Route
                    path="/forgot-password"
                    element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
                />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/tanks/:id"
                    element={
                        <ProtectedRoute>
                            <TankDetail />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <ProductsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/converter"
                    element={
                        <ProtectedRoute>
                            <RoleGuard permission="can_convert_volume">
                                <VolumeConverter />
                            </RoleGuard>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute>
                            <RoleGuard permission="can_view_reports">
                                <ReportsPage />
                            </RoleGuard>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/activity-log"
                    element={
                        <ProtectedRoute>
                            <RoleGuard permission="can_view_logs">
                                <ActivityLog />
                            </RoleGuard>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <RoleGuard adminOnly>
                                <AdminPanel />
                            </RoleGuard>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/employees"
                    element={
                        <ProtectedRoute>
                            <RoleGuard adminOnly>
                                <EmployeeManager />
                            </RoleGuard>
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AlertProvider>
                <AppRoutes />
            </AlertProvider>
        </AuthProvider>
    );
};

export default App;