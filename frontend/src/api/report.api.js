import axiosClient from './axiosClient';

export const reportApi = {
  getFull: () =>
    axiosClient.get('/reports/full'),

  getHistory: (params) =>
    axiosClient.get('/reports/history', { params }),

  getDaily: (params) =>
    axiosClient.get('/reports/daily', { params }),

  getProductSummary: () =>
    axiosClient.get('/reports/product'),
};