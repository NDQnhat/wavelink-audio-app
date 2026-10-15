import React from 'react';
import { create } from 'zustand';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let lastToastMessage = '';
let lastToastTime = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const now = Date.now();
    // Chặn spam thông báo trùng lặp trong vòng 1.5 giây
    if (message === lastToastMessage && now - lastToastTime < 1500) {
      return;
    }
    lastToastMessage = message;
    lastToastTime = now;

    if (dismissTimer) {
      clearTimeout(dismissTimer);
    }

    const id = Math.random().toString(36).substring(2, 9);
    // Giới hạn tối đa 1 thông báo hiển thị tại một thời điểm để không che khuất màn hình và cản trở thao tác
    set({ toasts: [{ id, message, type }] });

    // Tự động tắt nhanh sau 2s (error 2.5s) để người dùng thao tác liên tục
    const duration = type === 'error' ? 2500 : 2000;
    dismissTimer = setTimeout(() => {
      set({ toasts: [] });
    }, duration);
  },
  removeToast: (id) => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  clearAll: () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ toasts: [] });
  },
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
  dismiss: () => useToastStore.getState().clearAll(),
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (typeof document === 'undefined' || toasts.length === 0) return null;

  const node = (
    <div
      className="fixed top-16 inset-x-0 z-[99999] flex flex-col items-center pointer-events-none px-3 gap-1.5 max-w-[440px] mx-auto transition-all"
      aria-live="polite"
    >
      {toasts.map((t) => {
        let badgeColor = 'bg-[#2A9D8F] text-white';
        let badgeIcon = 'ri-check-line';
        let bgStyle = 'bg-white text-black border-black';

        if (t.type === 'error') {
          badgeColor = 'bg-[#E63946] text-white';
          badgeIcon = 'ri-error-warning-line';
          bgStyle = 'bg-[#FFF1F2] text-black border-black';
        } else if (t.type === 'info') {
          badgeColor = 'bg-[#3A86FF] text-white';
          badgeIcon = 'ri-information-line';
          bgStyle = 'bg-[#EFF6FF] text-black border-black';
        }

        return (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            title="Chạm để ẩn nhanh"
            className={`pointer-events-auto cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0_#000] text-xs font-bold transition-all duration-150 transform hover:scale-[1.02] active:scale-95 max-w-[92vw] sm:max-w-[380px] ${bgStyle}`}
          >
            <span
              className={`w-5 h-5 rounded-full ${badgeColor} border border-black flex items-center justify-center shrink-0 font-black`}
            >
              <i className={`${badgeIcon} text-xs`} />
            </span>
            <span className="truncate max-w-[240px] sm:max-w-[280px] leading-tight select-none font-bold">
              {t.message}
            </span>
            <button
              type="button"
              className="text-gray-500 hover:text-black ml-0.5 p-0.5 shrink-0 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(t.id);
              }}
              aria-label="Đóng"
            >
              <i className="ri-close-line text-sm font-bold" />
            </button>
          </div>
        );
      })}
    </div>
  );

  return createPortal(node, document.body);
};
