import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

const RoleGuard = ({ children, adminOnly = false, permission = null }) => {
    const { user, isAdmin, permissions } = useAuthContext();

    // Admin always has full access
    if (isAdmin) return children;

    // Page requires admin only
    if (adminOnly) {
        return <Navigate to="/" replace />;
    }

    // Page requires a specific permission
    if (permission && permissions && !permissions[permission]) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default RoleGuard;