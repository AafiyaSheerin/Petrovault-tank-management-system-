import axiosClient from './axiosClient';

export const alertApi = {
    getAll: (params) =>
        axiosClient.get('/alerts', { params }),

    getUnreadCount: () =>
        axiosClient.get('/alerts/unread-count'),

    markAsRead: (id) =>
        axiosClient.put(`/alerts/${id}/read`),

    markAllRead: () =>
        axiosClient.put('/alerts/mark-all-read'),

    getRecipients: () =>
        axiosClient.get('/alerts/recipients'),

    addRecipient: (data) =>
        axiosClient.post('/alerts/recipients', data),

    updateRecipient: (id, data) =>
        axiosClient.put(`/alerts/recipients/${id}`, data),

    deleteRecipient: (id) =>
        axiosClient.delete(`/alerts/recipients/${id}`),

    // Global email alert toggle
    getAlertToggle: () =>
        axiosClient.get('/alerts/settings/toggle'),

    setAlertToggle: (enabled) =>
        axiosClient.put('/alerts/settings/toggle', { enabled }),
};