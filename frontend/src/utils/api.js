import axios from 'axios';
import { toast } from '../hooks/useToast';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
      return Promise.reject(error);
    }
    // 500 hatalarını otomatik toast ile göster
    if (error.response?.status >= 500) {
      toast.error('Sunucu hatası. Lütfen tekrar deneyin.');
    }
    return Promise.reject(error);
  }
);

// Hata mesajını çıkar — message veya error alanına bak
export function getErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Bir hata oluştu.'
  );
}

export default api;
