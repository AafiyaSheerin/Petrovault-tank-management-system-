import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { alertApi } from '../api/alert.api';
import { useAuthContext } from './AuthContext';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
    const { user } = useAuthContext();
    const [unreadCount, setUnreadCount] = useState(0);
    const [alerts, setAlerts] = useState([]);
    const [toast, setToast] = useState(null);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const res = await alertApi.getUnreadCount();
            setUnreadCount(res.data.data.count);
        } catch (error) {
            // ignore
        }
    }, [user]);

    const fetchAlerts = useCallback(async (params = {}) => {
        if (!user) return;
        try {
            const res = await alertApi.getAll(params);
            setAlerts(res.data.data.alerts);
        } catch (error) {
            // ignore
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await alertApi.markAsRead(id);
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
            fetchUnreadCount();
        } catch (error) {
            // ignore
        }
    };

    const markAllRead = async () => {
        try {
            await alertApi.markAllRead();
            setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            // ignore
        }
    };

    // Show a temporary toast notification (success/error/warning/info)
    // useCallback gives a stable reference so pages using it in useEffect deps don't re-render repeatedly
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
    }, []);

    const clearToast = useCallback(() => setToast(null), []);

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
            return () => clearInterval(interval);
        }
    }, [user, fetchUnreadCount]);

    const value = {
        unreadCount,
        alerts,
        fetchAlerts,
        fetchUnreadCount,
        markAsRead,
        markAllRead,
        toast,
        showToast,
        clearToast,
    };

    return (
        <AlertContext.Provider value={value}>
            {children}
        </AlertContext.Provider>
    );
};

export const useAlertContext = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlertContext must be used within AlertProvider');
    }
    return context;
};