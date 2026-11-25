import axiosClient from './axiosClient';

export const tankApi = {
    getAll: () =>
        axiosClient.get('/tanks'),

    getOne: (id) =>
        axiosClient.get(`/tanks/${id}`),

    create: (data) =>
        axiosClient.post('/tanks', data),

    update: (id, data) =>
        axiosClient.put(`/tanks/${id}`, data),

    delete: (id) =>
        axiosClient.delete(`/tanks/${id}`),

    copy: (id) =>
        axiosClient.post(`/tanks/${id}/copy`),

    // Accept dip_cm (new total dip reading in cm) OR volume (litres)
    addStock: (id, { dip_cm, volume, notes }) =>
        axiosClient.post(`/tanks/${id}/add-stock`, { dip_cm, volume, notes }),

    removeStock: (id, { dip_cm, volume, notes }) =>
        axiosClient.post(`/tanks/${id}/remove-stock`, { dip_cm, volume, notes }),

    // Convert a dip reading to litres without changing stock
    cmToLitres: (id, dip_cm) =>
        axiosClient.post(`/tanks/${id}/cm-to-litres`, { dip_cm }),
};