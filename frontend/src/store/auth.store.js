import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          set({ user: data.user, token: data.token, isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Giriş başarısız';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      register: async (formData) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', formData);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          set({ user: data.user, token: data.token, isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Kayıt başarısız';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, error: null });
      },

      updateUser: (updates) => set(state => ({
        user: { ...state.user, ...updates }
      })),
    }),
    {
      name: 'mutual-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
