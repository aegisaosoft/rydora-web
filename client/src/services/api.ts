/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import axios from 'axios';

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_BASE?: string;
    };
  }
}

// Car creation interface based on API specification
export interface CreateCarRequest {
  role?: number;
  id?: string;
  title: string;
  description?: string;
  published?: boolean;
  pricePerWeek?: number;
  minimumReservationDays?: number;
  carBrand?: string;
  color?: string;
  interiorColor?: string;
  carModel?: string;
  year?: number;
  carTypeId?: string;
  liabilityInsuranceId?: string;
  newLiabilityInsurance?: string;
  fullCoverageId?: string;
  newFullCoverage?: string;
  cityId?: string;
  city?: string;
  stateId?: string;
  addressLine1?: string;
  addressLine2?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  carPlateNumber?: string;
  carPlateNumberState?: string;
  termsConditions?: boolean;
  priceFullTimePerWeek?: number;
  priceDayPerShiftWeek?: number;
  priceNightPerShiftWeek?: number;
  priceSecurityDeposit?: number;
  allowNegotiatingPrice?: boolean;
  rentalType?: number;
  tlc?: boolean;
  isMonthlyCar?: boolean;
  isPedicabCar?: boolean;
  seaterId?: string;
  engineId?: string;
  vin?: string;
  killSwitchId?: string;
  verraTollTagAttached?: boolean;
  isExternal?: boolean;
  rentersTag?: boolean;
  requestShipTag?: boolean;
}

// Dynamic API base URL - prefer runtime config, then build-time env, then same-origin '/api'
const runtimeApiBase = typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__?.API_BASE : undefined;
let API_BASE_URL = (runtimeApiBase && runtimeApiBase.trim() !== '')
  ? runtimeApiBase
  : (process.env.REACT_APP_API_URL || '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to set/remove Authorization header globally
export const setAuthToken = (token?: string | null) => {
  if (token && token.trim() !== '') {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Function to update API base URL
export const updateApiBaseUrl = (newBaseUrl: string) => {
  console.log('Updating API base URL to:', newBaseUrl);
  API_BASE_URL = newBaseUrl;
  api.defaults.baseURL = newBaseUrl;
  console.log('API base URL updated:', api.defaults.baseURL);
};

// Request interceptor to add Bearer token and API environment header
api.interceptors.request.use((config) => {
  // Add Bearer token for authentication
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add API environment header (for switching between Rydora APIs)
  const apiEnvironment = localStorage.getItem('rydora-environment') || 'development';
  config.headers['x-environment'] = apiEnvironment;
  
  return config;
});

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 429 (Too Many Requests) errors with better messaging
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 30000; // Default 30 seconds
      
      console.warn('Rate limited by server. Please wait before making more requests.');
      console.warn(`Suggested wait time: ${retryAfter || 30} seconds`);
      
      // Add retry-after info to error for better user feedback
      error.retryAfter = waitTime;
      error.retryAfterSeconds = retryAfter || 30;
      
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (!error.response) {
      console.warn('Network error - server may be unreachable');
    }
    
    // Silence auth/me 401 noise; keep other errors
    if (error.config?.url?.includes('/auth/me') && error.response?.status === 401) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Retry utility with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Don't retry 429 errors (rate limiting)
      if (error.response?.status === 429) {
        throw error;
      }
      
      // Don't retry 401/403 errors (authentication/authorization)
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    // Use retry mechanism for login
    const response = await retryWithBackoff(() => api.post('/auth/login', credentials));
    return response.data;
  },
  
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      // Clear token from localStorage
      localStorage.removeItem('token');
      return response.data;
    } catch (error) {
      // Even if logout fails on server, we can still clear local data
      // Clear token from localStorage even if server logout fails
      localStorage.removeItem('token');
      return { success: true };
    }
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  clearSession: async () => {
    try {
      const response = await api.post('/auth/clear-session');
      // Clear token from localStorage
      localStorage.removeItem('token');
      return response.data;
    } catch (error) {
      // Clear token from localStorage even if server call fails
      localStorage.removeItem('token');
      return { success: false };
    }
  }
};

export const rydoraApi = {
  signin: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/rydora/signin', credentials);
    return response.data;
  },
  
  getViolations: async (params?: { licensePlate?: string; state?: string }) => {
    const response = await api.get('/rydora/violations', { params });
    return response.data;
  },
  
  getEzPass: async (dateFrom?: string, dateTo?: string, page?: number) => {
    // Use retry mechanism for EzPass data fetching
    const response = await retryWithBackoff(() => api.get('/rydora/ezpass', {
      params: { dateFrom, dateTo, page }
    }));
    return response.data;
  },
  
  exportEzPassExcel: async (dateFrom: string, dateTo: string) => {
    // Use retry mechanism for EzPass Excel export
    const response = await retryWithBackoff(() => api.post('/rydora/ezpass/export/excel', { dateFrom, dateTo }, {
      responseType: 'blob'
    }));
    return response.data;
  },
  
  exportEzPassPdf: async (dateFrom: string, dateTo: string) => {
    // Use retry mechanism for EzPass PDF export
    const response = await retryWithBackoff(() => api.post('/rydora/ezpass/export/pdf', { dateFrom, dateTo }, {
      responseType: 'blob'
    }));
    return response.data;
  },
  
  getParkingViolations: async (dateFrom?: string, dateTo?: string, page?: number, ownerId?: string) => {
    const params: any = { dateFrom, dateTo, page };
    
    // Only add ownerId if it's provided (not empty/null)
    if (ownerId && ownerId.trim() !== '') {
      params.ownerId = ownerId;
    }
    
    const response = await api.get('/rydora/parking-violations', {
      params
    });
    return response.data;
  },
  
  exportParkingViolationsExcel: async (dateFrom: string, dateTo: string) => {
    const response = await api.post('/rydora/parking-violations/export/excel', { dateFrom, dateTo }, {
      responseType: 'blob'
    });
    return response.data;
  },
  
  exportParkingViolationsPdf: async (dateFrom: string, dateTo: string) => {
    const response = await api.post('/rydora/parking-violations/export/pdf', { dateFrom, dateTo }, {
      responseType: 'blob'
    });
    return response.data;
  },
  
  getNYCViolations: async () => {
    const response = await api.get('/rydora/nyc-violations');
    return response.data;
  },
  
  getPayments: async (type?: 'completed' | 'failed') => {
    const endpoint = type ? `/rydora/payments/${type}` : '/rydora/payments/completed';
    const response = await api.get(endpoint);
    return response.data;
  },
  
  createViolation: async (violationData: any) => {
    console.log('=== API SERVICE CREATE VIOLATION CALLED ===');
    console.log('URL:', '/rydora/violations');
    console.log('Body:', violationData);
    const response = await api.post('/rydora/violations', violationData);
    console.log('=== API SERVICE CREATE VIOLATION RESPONSE ===', response.status, response.data);
    return response.data;
  },

  deleteViolation: async (id: string) => {
    const response = await api.delete(`/rydora/violation/delete/${id}`);
    return response.data;
  },

  getViolationById: async (id: string) => {
    const response = await api.get(`/rydora/violation/get/${id}`);
    return response.data;
  },

  updateViolation: async (id: string, violationData: any) => {
    console.log('=== API SERVICE UPDATE VIOLATION CALLED ===');
    console.log('ID:', id);
    console.log('Data:', violationData);
    console.log('URL:', `/rydora/violation/update/${id}`);
    
    const response = await api.put(`/rydora/violation/update/${id}`, violationData);
    console.log('=== API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
    return response.data;
  },
  
  getTolls: async (dateFrom?: string, dateTo?: string, page?: number, ownerId?: string) => {
    const params: any = { dateFrom, dateTo, page };
    
    // Only add ownerId if it's provided (not empty/null)
    if (ownerId && ownerId.trim() !== '') {
      params.ownerId = ownerId;
    }
    
    const response = await api.get('/rydora/tolls', {
      params
    });
    return response.data;
  },
  
  getPendingPayments: async (dateFrom?: string, dateTo?: string, page?: number, ownerId?: string) => {
    const params: any = { dateFrom, dateTo, page };
    
    // Only add ownerId if it's provided (not empty/null)
    if (ownerId && ownerId.trim() !== '') {
      params.ownerId = ownerId;
    }
    
    const response = await api.get('/rydora/pending-payments', {
      params
    });
    return response.data;
  },
  
  getActiveCompanies: async () => {
    const response = await api.get('/rydora/Companies/active');
    return response.data;
  },

  createCar: async (carData: CreateCarRequest) => {
    const response = await api.post('/rydora/cars', carData);
    return response.data;
  },

  getCars: async (role: number = 0) => {
    const response = await api.post('/rydora/cars/carlist', { role });
    return response.data;
  },

  // NYC Violations via Socrata API (direct call)
  getNYCViolationsForPlates: async (licensePlates: string[], options?: {
    violationYear?: string;
    dateFrom?: string;
    dateTo?: string;
    violationCodes?: string[];
    limit?: number;
    offset?: number;
  }) => {
    // This will use the direct Socrata API client
    const { NYCParkingViolationsAPI } = await import('./nycViolationsApi');
    const client = new NYCParkingViolationsAPI();
    return client.getViolationsForPlates(licensePlates, options);
  },

  getNYCViolationsSummary: async (licensePlates: string[]) => {
    const { NYCParkingViolationsAPI } = await import('./nycViolationsApi');
    const client = new NYCParkingViolationsAPI();
    return client.getViolationsSummary(licensePlates);
  },

  getExternalTollDailyInvoice: async (dateFrom?: string, dateTo?: string, ownerId?: string) => {
    const params: any = {};
    if (dateFrom) {
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      params.dateTo = dateTo;
    }
    if (ownerId && ownerId.trim() !== '') {
      params.ownerId = ownerId;
    }
    
    const response = await api.get('/rydora/external-daily-invoice', { params });
    return response.data;
  },

  createExternalTollDailyInvoice: async (tollData: any) => {
    const response = await api.post('/rydora/external-daily-invoice/create', tollData);
    return response.data;
  },

  updateExternalTollDailyInvoice: async (id: string, tollData: any) => {
    const response = await api.put(`/rydora/external-daily-invoice/update/${id}`, tollData);
    return response.data;
  },

  getExternalTollDailyInvoiceById: async (id: string) => {
    const response = await api.get(`/rydora/external-daily-invoice/get/${id}`);
    return response.data;
  },

  getInvoice: async (dateFrom?: string, dateTo?: string, companyId?: string) => {
    const params: any = { dateFrom, dateTo };
    if (companyId && companyId.trim() !== '') {
      params.companyId = companyId;
    }
    const response = await api.get('/rydora/invoice', {
      params
    });
    return response.data;
  },

  getInvoiceDetails: async (dateFrom?: string, companyId?: string) => {
    const params: any = { dateFrom };
    if (companyId && companyId.trim() !== '') {
      params.companyId = companyId;
    }
    const response = await api.get('/rydora/invoice-details', {
      params
    });
    return response.data;
  },

  getInvoiceByCompany: async (companyId: string, date?: string) => {
    const params: any = {};
    if (date) {
      params.date = date;
    }
    
    try {
      const response = await api.get(`/rydora/invoice-by-company/${companyId}`, {
        params
      });
      console.log('Invoice API Success Response:', response);
      return response.data;
    } catch (error: any) {
      console.log('Invoice API Error Response:', error);
      console.log('Error status:', error.response?.status);
      console.log('Error data:', error.response?.data);
      throw error;
    }
  },

  submitInvoice: async (invoiceId: string) => {
    const response = await api.post(`/rydora/invoice-submit/${invoiceId}`);
    return response.data;
  },

  failInvoice: async (invoiceId: string) => {
    const response = await api.post(`/rydora/invoice-fail/${invoiceId}`);
    return response.data;
  },

  getInvoiceDetailsById: async (invoiceId: string) => {
    const response = await api.get(`/rydora/invoice-details-by-id/${invoiceId}`);
    return response.data;
  },

  deleteExternalTollDailyInvoice: async (id: string) => {
    const response = await api.delete(`/rydora/external-daily-invoice/delete/${id}`);
    return response.data;
  },

  updateExternalTollDailyInvoicePaymentStatus: async (ids: string[], paymentStatus: number, companyId?: string) => {
    console.log('=== UPDATE TOLL PAYMENT STATUS API CALL ===');
    console.log('Request data:', { ids, paymentStatus, companyId });
    console.log('Auth token:', localStorage.getItem('token'));
    
    const params: any = {};
    if (companyId && companyId.trim() !== '') {
      params.companyId = companyId;
    }
    
    console.log('Query params:', params);
    
    const response = await api.put('/rydora/external-daily-invoice/update-payment-status', {
      ids,
      paymentStatus,
      companyId
    }, { 
      params,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    return response.data;
  },

  updateViolationPaymentStatus: async (ids: number[], paymentStatus: number, companyId: string) => {
    console.log('=== UPDATE VIOLATION PAYMENT STATUS API CALL ===');
    console.log('Request data:', { ids, paymentStatus, companyId });
    console.log('Auth token:', localStorage.getItem('token'));
    
    if (!companyId || companyId.trim() === '') {
      throw new Error('companyId is required');
    }
    
    // Pass companyId as query param (mirrors tolls implementation)
    const params: any = { companyId };
    
    const response = await api.put('/rydora/ExternalViolation/update-payment-status', {
      ids,
      paymentStatus,
      companyId
    }, {
      params,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    return response.data;
  },

  updateInvoiceStatus: async (invoiceId: string, status: number) => {
    console.log('=== UPDATE INVOICE STATUS API CALL ===');
    console.log('Invoice ID:', invoiceId);
    console.log('New Status:', status);
    console.log('Auth token:', localStorage.getItem('token'));
    
    const response = await api.put('/rydora/external-daily-invoice/update-status', {
      invoiceId,
      status
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    return response.data;
  },

  // Get all external daily invoices (Admin only)
  getAllExternalDailyInvoices: async (dateFrom?: string, dateTo?: string, companyId?: string) => {
    console.log('=== GET ALL EXTERNAL DAILY INVOICES API CALL ===');
    console.log('Auth token:', localStorage.getItem('token'));
    console.log('Parameters:', { dateFrom, dateTo, companyId });
    
    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (companyId && companyId.trim() !== '') params.companyId = companyId;
    
    const response = await api.get('/rydora/external-daily-invoice/get-all', {
      params,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    return response.data;
  },

  // Get external daily invoice details by ID (Admin only)
  getExternalDailyInvoiceDetails: async (invoiceId: string) => {
    console.log('=== GET EXTERNAL DAILY INVOICE DETAILS API CALL ===');
    console.log('Auth token:', localStorage.getItem('token'));
    console.log('Invoice ID:', invoiceId);
    
    const response = await api.get(`/rydora/external-daily-invoice/get-details/${invoiceId}`, {
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    return response.data;
  },

  // Send invoice PDF via email (Admin only)
  sendInvoiceEmail: async (invoiceId: string, pdfBlob: Blob) => {
    console.log('=== SEND INVOICE EMAIL API CALL ===');
    console.log('Invoice ID:', invoiceId);
    
    // Convert blob to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1]; // Remove data:application/pdf;base64, prefix
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });

    const response = await api.post(`/rydora/external-daily-invoice/send-email/${invoiceId}`, {
      pdfBase64: base64
    }, {
      timeout: 60000 // 60 second timeout for email sending
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    return response.data;
  }
};

export const generalApi = {
  getHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
  
  getConfig: async () => {
    const response = await api.get('/config');
    return response.data;
  }
};

export default api;

