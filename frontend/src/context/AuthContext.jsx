import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('petrovault_token');
            const savedUser = localStorage.getItem('petrovault_user');

            if (token && savedUser) {
                try {
                    const res = await authApi.getMe();
                    setUser(res.data.data);
                } catch (error) {
                    localStorage.removeItem('petrovault_token');
                    localStorage.removeItem('petrovault_user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (username, password) => {
        const res = await authApi.login(username, password);
        const { token, user: userData } = res.data.data;

        localStorage.setItem('petrovault_token', token);
        localStorage.setItem('petrovault_user', JSON.stringify(userData));
        setUser(userData);

        return userData;
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            // ignore errors on logout
        }
        localStorage.removeItem('petrovault_token');
        localStorage.removeItem('petrovault_user');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await authApi.getMe();
            setUser(res.data.data);
            localStorage.setItem('petrovault_user', JSON.stringify(res.data.data));
        } catch (error) {
            // ignore
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAdmin: user?.role === 'admin',
        isEditor: user?.role === 'editor' || user?.role === 'admin',
        permissions: user?.permissions || null,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within AuthProvider');
    }
    return context;
};