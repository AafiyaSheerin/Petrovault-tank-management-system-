import axiosClient from './axiosClient';

export const productApi = {
    getAll: () =>
        axiosClient.get('/products'),

    getOne: (id) =>
        axiosClient.get(`/products/${id}`),

    create: (data) =>
        axiosClient.post('/products', data),

    update: (id, data) =>
        axiosClient.put(`/products/${id}`, data),

    delete: (id) =>
        axiosClient.delete(`/products/${id}`),

    // Product alert thresholds
    getAlertThresholds: () =>
        axiosClient.get('/products/alert-thresholds'),

    setAlertThreshold: (productId, data) =>
        axiosClient.put(`/products/${productId}/alert-threshold`, data),

    removeAlertThreshold: (productId) =>
        axiosClient.delete(`/products/${productId}/alert-threshold`),
};