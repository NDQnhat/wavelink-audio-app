import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void | Promise<void | boolean>;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  showFooter?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDanger = false,
  showFooter = true,
  className,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleConfirm = async () => {
    if (onConfirm) {
      const res = await onConfirm();
      if (res !== false) onClose();
    } else {
      onClose();
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      style={{ minHeight: '100dvh' }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'card-comic relative w-full max-w-[420px] max-h-[85vh] max-h-[85dvh] flex flex-col p-3.5 sm:p-4 gap-2.5 sm:gap-3 bg-white shadow-comic-lg my-auto transform transition-transform duration-200 scale-100',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-black shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFE600] border border-black inline-block shrink-0" />
            <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-tight text-black truncate">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded border-2 border-black bg-white flex items-center justify-center text-black hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5 shrink-0 ml-2"
            aria-label="Đóng"
          >
            <i className="ri-close-line text-lg font-bold" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="text-xs sm:text-sm font-semibold text-gray-800 flex flex-col gap-2.5 overflow-y-auto py-1 flex-1 min-h-0 pr-1">
          {children}
        </div>

        {/* Modal Footer */}
        {showFooter && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="text-xs py-1.5 px-3 min-h-[34px]"
            >
              {cancelText}
            </Button>
            <Button
              variant={isDanger ? 'red' : 'primary'}
              size="sm"
              onClick={handleConfirm}
              className="text-xs py-1.5 px-3.5 min-h-[34px]"
            >
              {confirmText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

