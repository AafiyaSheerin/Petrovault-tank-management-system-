import axiosClient from './axiosClient';

export const exportApi = {
    // All-tanks exports
    downloadTanksPDF: () =>
        axiosClient.get('/export/pdf/tanks', { responseType: 'blob' }),

    downloadHistoryPDF: (params) =>
        axiosClient.get('/export/pdf/history', { params, responseType: 'blob' }),

    exportTanksSheets: () =>
        axiosClient.post('/export/sheets/tanks', {}, { responseType: 'blob' }),

    exportHistorySheets: (params) =>
        axiosClient.post('/export/sheets/history', {}, { params, responseType: 'blob' }),

    // Per-tank exports
    downloadSingleTankPDF: (tankId) =>
        axiosClient.get(`/export/pdf/tank/${tankId}`, { responseType: 'blob' }),

    exportSingleTankSheets: (tankId) =>
        axiosClient.post(`/export/sheets/tank/${tankId}`, {}, { responseType: 'blob' }),
};