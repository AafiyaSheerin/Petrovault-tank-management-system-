import axiosClient from './axiosClient';

export const employeeApi = {
    getAll: () =>
        axiosClient.get('/employees'),

    getOne: (id) =>
        axiosClient.get(`/employees/${id}`),

    create: (data) =>
        axiosClient.post('/employees', data),

    update: (id, data) =>
        axiosClient.put(`/employees/${id}`, data),

    delete: (id) =>
        axiosClient.delete(`/employees/${id}`),

    updatePermissions: (id, permissions) =>
        axiosClient.put(`/employees/${id}/permissions`, permissions),

    grantTankAccess: (id, tank_id) =>
        axiosClient.post(`/employees/${id}/tank-access`, { tank_id }),

    revokeTankAccess: (id, tankId) =>
        axiosClient.delete(`/employees/${id}/tank-access/${tankId}`),

    grantAllTanks: (id) =>
        axiosClient.post(`/employees/${id}/grant-all-tanks`),

    resetPassword: (id) =>
        axiosClient.put(`/employees/${id}/reset-password`),
};