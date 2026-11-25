import axiosClient from './axiosClient';

export const authApi = {
    login: (username, password) =>
        axiosClient.post('/auth/login', { username, password }),

    logout: () =>
        axiosClient.post('/auth/logout'),

    getMe: () =>
        axiosClient.get('/auth/me'),

    changePassword: (current_password, new_password) =>
        axiosClient.put('/auth/change-password', { current_password, new_password }),

    forgotPassword: (email) =>
        axiosClient.post('/auth/forgot-password', { email }),

    resetPassword: (email, otp, new_password) =>
        axiosClient.post('/auth/reset-password', { email, otp, new_password }),
};