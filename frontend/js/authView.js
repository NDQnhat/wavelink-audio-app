import { api } from './api.js';
import { showToast } from './uiUtils.js';

export function renderAuth(container) {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-[70vh] px-margin-sm gap-space-lg w-full max-w-sm mx-auto pb-20">
      <div class="text-center flex flex-col items-center gap-2">
        <div class="w-16 h-16 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-lg">
          <span class="material-symbols-outlined text-[36px]">graphic_eq</span>
        </div>
        <h1 class="font-title-lg font-bold text-on-surface mt-2">Audio Library</h1>
        <p class="font-body-md text-on-surface-variant text-sm">Đăng nhập để đồng bộ tiến trình nghe của bạn</p>
      </div>

      <div class="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container/60 flex flex-col gap-space-md">
        <div id="auth-tabs" class="flex items-center border-b border-surface-container pb-2 gap-4">
          <button id="tab-login" class="flex-1 font-title-md font-bold text-primary border-b-2 border-primary pb-1 transition-colors">Đăng nhập</button>
          <button id="tab-register" class="flex-1 font-title-md font-bold text-on-surface-variant border-b-2 border-transparent pb-1 transition-colors">Đăng ký</button>
        </div>

        <!-- Login Form -->
        <form id="login-form" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="font-label-sm font-bold text-on-surface text-xs">Tên đăng nhập</label>
            <input type="text" id="login-username" class="w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-xl border border-surface-container focus:border-primary outline-none transition-colors" placeholder="Nhập tên đăng nhập" required>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-label-sm font-bold text-on-surface text-xs">Mật khẩu</label>
            <input type="password" id="login-password" class="w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-xl border border-surface-container focus:border-primary outline-none transition-colors" placeholder="Nhập mật khẩu" required>
          </div>
          <button type="submit" class="w-full mt-2 bg-primary text-on-primary font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-all">
            Đăng Nhập
          </button>
        </form>

        <!-- Register Form -->
        <form id="register-form" class="flex flex-col gap-4 hidden">
          <div class="flex flex-col gap-1.5">
            <label class="font-label-sm font-bold text-on-surface text-xs">Tên đăng nhập</label>
            <input type="text" id="register-username" class="w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-xl border border-surface-container focus:border-primary outline-none transition-colors" placeholder="Chọn tên đăng nhập" required>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-label-sm font-bold text-on-surface text-xs">Mật khẩu</label>
            <input type="password" id="register-password" class="w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-xl border border-surface-container focus:border-primary outline-none transition-colors" placeholder="Tạo mật khẩu" required>
          </div>
          <button type="submit" class="w-full mt-2 bg-primary text-on-primary font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-all">
            Đăng Ký
          </button>
        </form>

        <div class="relative flex items-center justify-center mt-2">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-surface-container"></div></div>
          <span class="relative bg-surface-container-lowest px-4 text-xs text-on-surface-variant">hoặc</span>
        </div>

        <button id="guest-login-btn" class="w-full bg-surface-container text-on-surface font-bold py-3 rounded-xl hover:bg-surface-container-high transition-colors">
          Tiếp tục dưới dạng Khách
        </button>
      </div>
    </div>
  `;

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.replace('text-on-surface-variant', 'text-primary');
    tabLogin.classList.replace('border-transparent', 'border-primary');
    tabRegister.classList.replace('text-primary', 'text-on-surface-variant');
    tabRegister.classList.replace('border-primary', 'border-transparent');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.replace('text-on-surface-variant', 'text-primary');
    tabRegister.classList.replace('border-transparent', 'border-primary');
    tabLogin.classList.replace('text-primary', 'text-on-surface-variant');
    tabLogin.classList.replace('border-primary', 'border-transparent');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    try {
      await api.login(u, p);
      showToast('Đăng nhập thành công', 'success');
      location.hash = '#/home';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('register-username').value;
    const p = document.getElementById('register-password').value;
    try {
      await api.register(u, p);
      showToast('Đăng ký thành công', 'success');
      location.hash = '#/home';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('guest-login-btn').addEventListener('click', async () => {
    if (api.isLive) {
      try {
        await api.guestLogin();
        showToast('Đăng nhập với tư cách khách', 'info');
        location.hash = '#/home';
      } catch (err) {
        showToast('Lỗi khi đăng nhập khách', 'error');
      }
    } else {
      location.hash = '#/home';
    }
  });
}
