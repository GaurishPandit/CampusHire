import api from './client';

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get('/auth/me'),

  activate: (data: { token: string; password: string; confirmPassword?: string }) =>
    api.post('/auth/activate', data),

  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data: { token: string; password: string; confirmPassword?: string }) =>
    api.post('/auth/reset-password', data),
};

export const studentApi = {
  getMyProfile: () => api.get('/students/me/profile'),
  updateMyProfile: (data: Record<string, unknown>) => api.patch('/students/me/profile', data),

  // Admin
  listStudents: (params?: Record<string, unknown>) => api.get('/students', { params }),
  getStudent: (id: string) => api.get(`/students/${id}`),
  updateStudent: (id: string, data: Record<string, any>) => api.patch(`/students/${id}`, data),
  resendInvite: (id: string) => api.post(`/students/${id}/resend-invite`),

  // CSV Import
  uploadCsvPreview: (formData: FormData) =>
    api.post('/students/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  commitCsvImport: (data: { batchId?: string; cacheKey?: string; records?: any[]; includeUpdates?: boolean }) =>
    api.post('/students/import/confirm', data),
  previewImport: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/students/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  confirmImport: (data: { batchId?: string; records?: any[]; cacheKey?: string }) =>
    api.post('/students/import/confirm', data),
};

export const opportunityApi = {
  list: (params?: Record<string, unknown>) => api.get('/opportunities', { params }),
  get: (id: string) => api.get(`/opportunities/${id}`),
  getById: (id: string) => api.get(`/opportunities/${id}`),
  checkEligibility: (id: string) => api.get(`/opportunities/${id}/eligibility`),

  // Admin
  create: (data: Record<string, unknown>) => api.post('/opportunities', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/opportunities/${id}`, data),
  changeStatus: (id: string, status: string) =>
    api.patch(`/opportunities/${id}`, { status }),
  delete: (id: string) => api.delete(`/opportunities/${id}`),

  // Rounds
  listRounds: (opportunityId: string) => api.get(`/opportunities/${opportunityId}/rounds`),
  getRounds: (opportunityId: string) => api.get(`/opportunities/${opportunityId}/rounds`),
  createRound: (opportunityId: string, data: Record<string, unknown>) =>
    api.post(`/opportunities/${opportunityId}/rounds`, data),
  addRound: (opportunityId: string, data: Record<string, unknown>) =>
    api.post(`/opportunities/${opportunityId}/rounds`, data),
  updateRound: (roundId: string, data: Record<string, unknown>) =>
    api.patch(`/rounds/${roundId}`, data),
  changeRoundStatus: (roundId: string, status: string) =>
    api.patch(`/rounds/${roundId}/status`, { status }),
  deleteRound: (roundId: string) =>
    api.delete(`/rounds/${roundId}`),
};

export const applicationApi = {
  submit: (opportunityId: string, data: { applicationType?: string; applicationMode?: string }) =>
    api.post(`/opportunities/${opportunityId}/apply`, data),
  applyInternal: (opportunityId: string) =>
    api.post(`/opportunities/${opportunityId}/apply`, { applicationMode: 'internal' }),
  applyExternal: (opportunityId: string, data?: { confirmed?: boolean }) =>
    api.post(`/opportunities/${opportunityId}/apply`, { applicationMode: 'external', ...data }),

  getMyApplications: (params?: Record<string, unknown>) =>
    api.get('/applications/me', { params }),
  withdraw: (applicationId: string, reason?: string) =>
    api.post(`/applications/${applicationId}/withdraw`, { reason }),

  // Admin
  listForOpportunity: (opportunityId: string, params?: Record<string, unknown>) =>
    api.get(`/opportunities/${opportunityId}/applications`, { params }),
  getOpportunityApplications: (opportunityId: string, params?: Record<string, unknown>) =>
    api.get(`/opportunities/${opportunityId}/applications`, { params }),
  updateStatus: (
    applicationId: string,
    data: { status?: string; personalStatus?: string; adminNotes?: string }
  ) =>
    api.patch(`/applications/${applicationId}/status`, {
      status: data.status || data.personalStatus,
      adminNotes: data.adminNotes,
    }),
};

export const resultApi = {
  list: (params?: Record<string, unknown>) => api.get('/results', { params }),
  getPublishedResults: (params?: Record<string, unknown>) =>
    api.get('/results', { params }),
  createResult: (opportunityId: string, data: Record<string, unknown>) =>
    api.post(`/opportunities/${opportunityId}/results`, data),
  publishResults: (opportunityId: string) =>
    api.post(`/opportunities/${opportunityId}/publish-results`),
  publish: (resultId: string) => api.post(`/results/${resultId}/publish`),
  unpublish: (resultId: string) => api.post(`/results/${resultId}/unpublish`),
};

export const dashboardApi = {
  getStudentDashboard: () => api.get('/dashboard/student'),
  getAdminDashboard: () => api.get('/dashboard/admin'),
  getAuditLogs: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
};

export const adminApi = {
  getStats: () => api.get('/dashboard/admin'),
  getAuditLogs: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
