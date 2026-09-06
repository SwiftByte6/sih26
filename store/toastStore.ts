import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const lastToastMessages = new Map<string, number>();

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (message: string, type: ToastType = 'info') => {
    const now = Date.now();
    const lastTime = lastToastMessages.get(message) || 0;

    // Prevent duplicate toast for the exact same message within 8 seconds
    if (now - lastTime < 8000) {
      return;
    }
    lastToastMessages.set(message, now);

    const id = `toast-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, message, type, timestamp: now };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // Keep max 5 visible toasts
    }));

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export const showToast = (message: string, type: ToastType = 'info') => {
  useToastStore.getState().showToast(message, type);
};
