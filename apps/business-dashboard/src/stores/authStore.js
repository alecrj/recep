import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('business_user') || 'null'),
  token: localStorage.getItem('business_token'),
  isAuthenticated: !!localStorage.getItem('business_token'),

  login: (token, user) => {
    localStorage.setItem('business_token', token);
    localStorage.setItem('business_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('business_token');
    localStorage.removeItem('business_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUser: (user) => {
    localStorage.setItem('business_user', JSON.stringify(user));
    set({ user });
  },
}));
