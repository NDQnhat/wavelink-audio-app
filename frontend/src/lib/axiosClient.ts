import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_BASE = typeof window !== 'undefined' && (window.location.port === '8080' || window.location.origin.includes('8080'))
  ? '/api/v1'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1');

export const axiosClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (authUserStr) {
      try {
        const u = JSON.parse(authUserStr);
        if (u && (u.isGuest || u.role === 'GUEST')) {
          localStorage.removeItem('auth_token');
          if (config.headers) {
            delete config.headers.Authorization;
          }
          return config;
        }
      } catch {}
    }

    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface ApiError {
  message: string;
  code?: string | number;
  status?: number;
  details?: unknown;
}

export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: { message?: string } }>;
    const serverMessage = axiosError.response?.data?.error?.message || axiosError.response?.data?.message;
    return {
      message: serverMessage || axiosError.message || 'Lỗi kết nối máy chủ',
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data,
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }
  return {
    message: 'Đã xảy ra lỗi không xác định',
  };
}

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeError(error);
    if (normalized.status === 401) {
      // Optional: Handle token expiration
    }
    return Promise.reject(normalized);
  }
);
