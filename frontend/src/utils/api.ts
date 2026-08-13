import { normalizeUserAccess } from './permissions';

const envBaseUrl =
  (import.meta as any).env.VITE_API_BASE_URL ||
  (import.meta as any).env.VITE_API_URL ||
  '';

export const API_BASE_URL = (envBaseUrl || '').replace(/\/+$/, '');
const BASE_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  params?: Record<string, any>;
  requireAuth?: boolean;
}

export class ApiClient {
  // Frontend talks to backend at BASE_URL; auth token stored in sessionStorage for per-tab login

  private static normalizeStringArray(input?: any[]): string[] {
    if (!Array.isArray(input)) return [];
    return input
      .filter((item) => item !== undefined && item !== null)
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);
  }

  private static getToken(): string | null {
    // Prefer sessionStorage for tab-isolated sessions; fallback to localStorage for legacy tokens.
    const keys = ['hospital_access_token', 'token', 'hospital_token'];
    for (const key of keys) {
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) return sessionValue;
    }
    for (const key of keys) {
      const localValue = localStorage.getItem(key);
      if (localValue) return localValue;
    }
    return null;
  }

  private static async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', data, params, requireAuth = true } = options;

    let url = `${BASE_URL}${endpoint}`;
    if (params && Object.keys(params).length) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Always attach token header if we have one. If the endpoint requires
    // auth and no token is present, fail early with a clear error.
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (requireAuth) {
      // consistent error for missing token
      throw new Error('No token provided');
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const text = await response.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        result = { message: text };
      }

      if (!response.ok) {
        console.error(`API Response [${method} ${endpoint}]:`, response.status, result);
        let friendly = result.message || result.error || 'Request failed';
        if (response.status === 401 && !result.message) friendly = 'Not authenticated. Please log in.';
        else if (response.status === 403) friendly = "You don't have permission to perform this action.";
        else if (response.status >= 500) friendly = 'Server error. Please try again later.';

        const err: any = new Error(friendly);
        err.status = response.status;
        err.response = result;

        // If token is invalid/expired, perform a deterministic logout and notify the app
        if (response.status === 401) {
          try {
            // clear stored tokens immediately
            this.logout();
            // broadcast a global event so UI can stop polling and redirect to login
            if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:invalid', { detail: { endpoint, method } }));
            }
          } catch (e) {
            // swallow any errors during logout notification
            console.warn('Error during auth invalidation handling', e);
          }
        }

        throw err;
      }

      return result;
    } catch (error) {
      console.error(`API Error [${method} ${url}]:`, error);
      throw error;
    }
  }

  // Auth
  static async signup(email: string, password: string, name: string, role: string = 'staff') {
    const result = await this.request<any>('/auth/register', {
      method: 'POST',
      data: { email, password, name, role },
      requireAuth: false,
    });
    return { ...result, success: result.success !== false };
  }

  static async get<T>(endpoint: string, params?: Record<string, any>, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params, requireAuth });
  }

  static async post<T = any>(endpoint: string, data?: any, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', data, requireAuth });
  }

  static async put<T = any>(endpoint: string, data?: any, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', data, requireAuth });
  }

  static async delete<T = any>(endpoint: string, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requireAuth });
  }

  static async login(email: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    const result = await this.request<any>('/auth/login', {
      method: 'POST',
      data: { email: normalizedEmail, password },
      requireAuth: false,
    });
    
    if (result.token) {
      const normalized = normalizeUserAccess(result.user);
      sessionStorage.setItem('hospital_access_token', result.token);
      sessionStorage.setItem('hospital_user', JSON.stringify(normalized));
    }
    
    return { ...result, success: result.success !== false };
  }

  static async getSession() {
    const result = await this.request('/auth/session');
    if (result?.user) {
      const normalized = normalizeUserAccess(result.user);
      sessionStorage.setItem('hospital_user', JSON.stringify(normalized));
      if (result.token) {
        sessionStorage.setItem('hospital_access_token', result.token);
      }
    }
    return result;
  }

  static logout() {
    sessionStorage.removeItem('hospital_access_token');
    sessionStorage.removeItem('hospital_user');
    localStorage.removeItem('hospital_access_token');
    localStorage.removeItem('hospital_user');
  }

  static getCurrentUser() {
    const userStr = sessionStorage.getItem('hospital_user') || localStorage.getItem('hospital_user');
    if (!userStr) return null;
    try {
      const u = JSON.parse(userStr);
      if (!u) return null;
      return normalizeUserAccess(u);
    } catch (e) {
      return null;
    }
  }

  // Patients
  static async getPatients(params?: Record<string, any>) {
    return this.request<{ success: boolean; patients: any[]; pagination?: any }>('/patients', { params });
  }

  static async createPatient(data: any) {
    return this.request('/patients', { method: 'POST', data });
  }

  static async updatePatient(id: string, data: any) {
    return this.request(`/patients/${id}`, { method: 'PUT', data });
  }

  static async deletePatient(id: string) {
    return this.request(`/patients/${id}`, { method: 'DELETE' });
  }

  static async getPatientByUHID(uhid: string) {
    return this.request<{ success: boolean; patient: any }>(`/patients/uhid/${uhid}`);
  }

  static async evaluateClinicalAlerts(data: any) {
    return this.request<{ success: boolean; alerts: any[] }>('/alerts/evaluate', { method: 'POST', data });
  }

  static async checkPhone(phone: string) {
    return this.request<{ success: boolean; exists: boolean; patients?: any[] }>(`/patients/check-phone/${encodeURIComponent(phone)}`);
  }

  // Appointments
  static async getAppointments(params?: Record<string, any>) {
    return this.request<{ success: boolean; appointments: any[]; pagination?: any }>('/appointments', { params });
  }

  static async createAppointment(data: any) {
    return this.request('/appointments', { method: 'POST', data });
  }

  static async updateAppointment(id: string, data: any) {
    return this.request(`/appointments/${id}`, { method: 'PUT', data });
  }

  static async deleteAppointment(id: string) {
    return this.request(`/appointments/${id}`, { method: 'DELETE' });
  }

  // Doctors
  static async getDoctors() {
    return this.request<{ success: boolean; doctors: any[] }>('/doctors');
  }

  static async getDoctorSlots(doctorId: string, date: string) {
    return this.request<{ success: boolean; slots: any[] }>('/doctors/slots/available', {
      params: { doctorId, date }
    });
  }

  static async updateSlotCapacity(doctorId: string, slotCapacities: Record<string, number>) {
    return this.request(`/doctors/${doctorId}/slots/capacity`, {
      method: 'PUT',
      data: { slotCapacities }
    });
  }

  static async createDoctor(data: any) {
    return this.request('/doctors', { method: 'POST', data });
  }

  static async updateDoctor(id: string, data: any) {
    return this.request(`/doctors/${id}`, { method: 'PUT', data });
  }

  static async deleteDoctor(id: string) {
    return this.request(`/doctors/${id}`, { method: 'DELETE' });
  }

  // ICD (+ patient ICD mapping)
  static async getIcdCodes(params?: Record<string, any>) {
    return this.request<{ success: boolean; icdCodes: any[]; pagination?: any }>('/icd', { params });
  }

  static async createIcdCode(data: any) {
    return this.request('/icd', { method: 'POST', data });
  }

  static async updateIcdCode(id: string, data: any) {
    return this.request(`/icd/${id}`, { method: 'PUT', data });
  }

  static async deleteIcdCode(id: string) {
    return this.request(`/icd/${id}`, { method: 'DELETE' });
  }

  static async getPatientIcdHistory(patientId: string) {
    return this.request<{ success: boolean; patient: any; mappings: any[] }>(`/icd/patient/${patientId}`);
  }

  static async createPatientIcdMapping(patientId: string, data: any) {
    return this.request(`/icd/patient/${patientId}`, { method: 'POST', data });
  }

  static async updatePatientIcdMapping(patientId: string, mappingId: string, data: any) {
    return this.request(`/icd/patient/${patientId}/${mappingId}`, { method: 'PUT', data });
  }

  static async deletePatientIcdMapping(patientId: string, mappingId: string) {
    return this.request(`/icd/patient/${patientId}/${mappingId}`, { method: 'DELETE' });
  }

  static async getIcdReport(params?: Record<string, any>) {
    return this.request<{ success: boolean; report: any[] }>('/icd/reports', { params });
  }

  // EMR
  static async getEMRRecords(params?: Record<string, any>) {
    return this.request<{ success: boolean; records: any[]; pagination?: any }>('/emr', { params });
  }

  static async createEMRRecord(data: any) {
    return this.request('/emr', { method: 'POST', data });
  }

  static async deleteEMRRecord(id: string) {
    return this.request(`/emr/${id}`, { method: 'DELETE' });
  }

  // Pharmacy
  static async getPharmacyItems() {
    return this.request<{ success: boolean; items: any[] }>('/pharmacy');
  }

  static async createPharmacyItem(data: any) {
    return this.request('/pharmacy', { method: 'POST', data });
  }

  static async updatePharmacyItem(id: string, data: any) {
    return this.request(`/pharmacy/${id}`, { method: 'PUT', data });
  }

  static async getInventorySummary() {
    return this.request<{ success: boolean; summary: any; expiryAlerts: any[]; topMovers: any[]; salesTrend: any[] }>('/inventory/summary');
  }

  static async recordPharmacySale(data: any) {
    return this.request('/inventory/sales', { method: 'POST', data });
  }

  static async getPharmacySales(params?: Record<string, any>) {
    return this.request<{ success: boolean; sales: any[] }>('/inventory/sales', { params });
  }

  // Billing
  static async getBills() {
    return this.request<{ success: boolean; bills: any[] }>('/billing');
  }

  static async createBill(data: any) {
    return this.request('/billing', { method: 'POST', data });
  }

  static async updateBill(id: string, data: any) {
    return this.request(`/billing/${id}`, { method: 'PUT', data });
  }

  // Notifications (optional - backend may not implement this yet)
  static async getNotifications() {
    return this.request<{ success?: boolean; notifications?: any[] }>('/notifications');
  }

  // Audit Logs
  static async getAuditLogs(params?: Record<string, any>) {
    return this.request<{ success: boolean; data: any[]; pagination: any }>('/audit-logs', { params });
  }

  static async getAuditLogStats() {
    return this.request<{ success: boolean; data: any }>('/audit-logs/stats');
  }

  static async exportAuditLogs() {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${BASE_URL}/audit-logs/export/csv`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const result = await response.text();
      throw new Error(result || 'Failed to export audit logs');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Settings
  static async getSettings() {
    return this.request<{ success?: boolean; settings?: any }>('/settings');
  }

  static async updateSettings(data: any) {
    return this.request('/settings', { method: 'POST', data });
  }

  // User Management (Admin only)
  static async registerUser(email: string, password: string, name: string, role: string = 'staff', phone: string = '') {
    const result = await this.request<any>('/auth/register', {
      method: 'POST',
      data: { email, password, name, role, phone },
      requireAuth: true,
    });
    return { ...result, success: result.success !== false };
  }

  static async getUsers() {
    return this.request<{ success: boolean; users: any[] }>('/users', {}, true);
  }

  static async getUserPermissions(userId: string) {
    return this.request<{ success: boolean; user: any }>(`/users/${userId}/permissions`, {}, true);
  }

  static async updateUserPermissions(userId: string, permissions: string[]) {
    return this.request(`/users/${userId}/permissions`, {
      method: 'PUT',
      data: { permissions },
      requireAuth: true,
    });
  }

  static async updateUser(userId: string, data: any) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      data,
      requireAuth: true,
    });
  }

  static async deleteUser(userId: string) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  }

  // Master Data Management (MDM)
  static async getMDMOptions(type: string) {
    const response = await this.request<any>(`/masters/${type}`, { requireAuth: true });
    return response?.data || response || [];
  }

  static async getMDMByType(type: string, params?: Record<string, any>) {
    return this.request<any>(`/masters/${type}`, { params, requireAuth: true });
  }

  static async getMDMById(type: string, id: string) {
    return this.request<any>(`/masters/${type}/${id}`, { requireAuth: true });
  }

  static async searchMDM(type: string, search: string) {
    return this.request<any>(`/masters/${type}`, { params: { search }, requireAuth: true });
  }

  static async createMDM(type: string, data: any) {
    return this.request(`/masters/${type}`, { method: 'POST', data, requireAuth: true });
  }

  static async updateMDM(type: string, id: string, data: any) {
    return this.request(`/masters/${type}/${id}`, { method: 'PUT', data, requireAuth: true });
  }

  static async deleteMDM(type: string, id: string) {
    return this.request(`/masters/${type}/${id}`, { method: 'DELETE', requireAuth: true });
  }

  static async uploadMDMExcel(type: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/masters/upload/${type}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Upload failed');
    }
    return result;
  }

  static async exportMDM(type: string, format: 'template' | 'data' = 'data') {
    return new Promise<void>((resolve, reject) => {
      const token = this.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = format === 'template'
        ? `${BASE_URL}/masters/template/${type}`
        : `${BASE_URL}/masters/export/${type}`;

      fetch(url, {
        method: 'GET',
        headers,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Export failed');
          return res.blob();
        })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mdm_${type}_${format}_${new Date().toISOString().split('T')[0]}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);
          resolve();
        })
        .catch(reject);
    });
  }

  // Feature Access Management
  static async grantFeatureAccess(targetId: string, targetType: 'user' | 'role', features: string[], expiresAt?: string) {
    return this.request('/mdm/grant-feature-access', {
      method: 'POST',
      data: { targetId, targetType, features, expiresAt },
      requireAuth: true
    });
  }

  static async getUserFeatures(userId: string) {
    try {
      return await this.request(`/mdm/user-features/${userId}`, { requireAuth: true });
    } catch (error: any) {
      if (error?.status === 404 || String(error?.message).toLowerCase().includes('not found')) {
        return await this.request(`/masters/user-features/${userId}`, { requireAuth: true });
      }
      throw error;
    }
  }

  static async revokeFeatureAccess(accessId: string) {
    return this.request(`/mdm/revoke-feature-access/${accessId}`, {
      method: 'DELETE',
      requireAuth: true
    });
  }
}