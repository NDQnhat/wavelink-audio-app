// UI Utilities: Toast notifications & Interactive Modals

export function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 inset-x-0 z-[100] flex flex-col items-center pointer-events-none px-4 gap-2';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium backdrop-blur-md transition-all duration-300 transform -translate-y-4 opacity-0 max-w-md w-full ${
    type === 'success' 
      ? 'bg-surface-container-lowest text-tertiary border-tertiary/20 shadow-emerald-500/10' 
      : type === 'error'
      ? 'bg-surface-container-lowest text-error border-error/20 shadow-red-500/10'
      : 'bg-surface-container-lowest text-primary border-primary/20 shadow-purple-500/10'
  }`;

  const iconName = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] shrink-0">${iconName}</span>
    <span class="flex-1 text-on-surface text-xs md:text-sm font-medium leading-tight">${message}</span>
    <button class="text-on-surface-variant hover:text-on-surface p-0.5 rounded-full" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined text-[16px]">close</span>
    </button>
  `;

  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('-translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.add('-translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function showModal({ title, content, onConfirm, confirmText = 'Xác nhận', cancelText = 'Hủy', isDanger = false }) {
  closeModal();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'app-modal-overlay';
  modalOverlay.className = 'fixed inset-0 z-[90] bg-inverse-surface/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-200';

  modalOverlay.innerHTML = `
    <div class="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-space-base flex flex-col gap-space-md border border-surface-container-high/60 transform transition-transform duration-200 scale-95" id="app-modal-box">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <h3 class="font-headline-sm font-bold text-on-surface">${title}</h3>
        <button id="modal-close-btn" class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div class="text-body-md text-on-surface-variant flex flex-col gap-3" id="modal-body-content">
        ${content}
      </div>
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
        <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low font-label-md transition-colors">
          ${cancelText}
        </button>
        <button id="modal-confirm-btn" class="px-5 py-2 rounded-xl font-label-md font-bold transition-all shadow-sm ${
          isDanger 
            ? 'bg-error text-on-error hover:bg-red-700 active:scale-95' 
            : 'bg-primary-container text-on-primary hover:bg-primary active:scale-95'
        }">
          ${confirmText}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  requestAnimationFrame(() => {
    const box = document.getElementById('app-modal-box');
    if (box) box.classList.remove('scale-95');
  });

  const close = () => closeModal();
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
  
  document.getElementById('modal-confirm-btn')?.addEventListener('click', async () => {
    if (onConfirm) {
      const res = await onConfirm();
      if (res !== false) close();
    } else {
      close();
    }
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) close();
  });
}

export function closeModal() {
  const existing = document.getElementById('app-modal-overlay');
  if (existing) existing.remove();
}
