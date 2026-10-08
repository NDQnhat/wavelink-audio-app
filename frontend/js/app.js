import { api } from './api.js';
import { player } from './player.js';
import { renderHome } from './homeView.js';
import { renderLibrary } from './libraryView.js';
import { renderDetailPlayer } from './playerView.js';
import { renderUpload } from './uploadView.js';
import { renderAdmin } from './adminView.js';
import { renderAuth } from './authView.js';
import { renderCommunity } from './communityView.js';
import { 
  renderAdminAudios, 
  renderAdminEpisodes, 
  renderAdminCategories, 
  renderSettings, 
  renderFullProfile,
  renderAdminAccounts,
  renderMembership
} from './managementViews.js';

let activeCategoryFilter = null;
let currentSearchQuery = '';
let activeStatusFilter = 'all';
let libraryScrollPos = 0;

window.addEventListener('scroll', () => {
  if (location.hash.startsWith('#/library')) {
    libraryScrollPos = window.scrollY;
  }
}, { passive: true });

async function router() {
  const hash = location.hash || '#/home';
  const main = document.getElementById('app-main');
  if (!main) return;

  // Nếu là login thì ẩn Bottom Nav, Header
  if (hash === '#/login') {
    document.querySelector('header')?.classList.add('hidden');
    document.querySelector('nav')?.classList.add('hidden');
    renderAuth(main);
    window.scrollTo({ top: 0 });
    return;
  } else {
    document.querySelector('header')?.classList.remove('hidden');
    document.querySelector('nav')?.classList.remove('hidden');
  }

  // Authentication Guard
  if (api.isLive && !api.user) {
    // Thử load Me
    await api.getMe();
    if (!api.user) {
      location.hash = '#/login';
      return;
    }
  }

  // Hiển thị/ẩn Admin Nav
  const navAdmin = document.getElementById('nav-admin');
  const navCommunity = document.getElementById('nav-community');
  if (api.user?.role === 'ADMIN') {
    if (navAdmin) navAdmin.classList.remove('hidden');
    if (navCommunity) navCommunity.classList.add('hidden');
  } else {
    if (navAdmin) navAdmin.classList.add('hidden');
    if (navCommunity) navCommunity.classList.remove('hidden');
  }

  // Phân quyền cho trang Quản lý
  if (hash.startsWith('#/admin')) {
    if (api.user?.role !== 'ADMIN') {
      main.innerHTML = `<div class="p-8 text-center text-sm font-bold text-error">Bạn không có quyền truy cập trang Quản Trị.</div>`;
      return;
    }
  }

  // Cập nhật trạng thái active cho Bottom Navigation Bar
  document.querySelectorAll('nav a, nav button').forEach(el => {
    const path = el.getAttribute('data-path');
    if (path) {
      const isMatch = (path === 'home' && (hash === '#/home' || hash === '')) ||
                      (path === 'library' && hash.startsWith('#/library')) ||
                      (path === 'upload' && hash === '#/upload') ||
                      (path === 'admin' && (hash.startsWith('#/admin') || hash === '#/settings')) ||
                      (path === 'profile' && hash === '#/profile');

      if (isMatch) {
        el.classList.add('text-primary', 'font-semibold');
        el.classList.remove('text-on-surface-variant');
      } else {
        el.classList.remove('text-primary', 'font-semibold');
        el.classList.add('text-on-surface-variant');
      }
    }
  });

  // 1. Trang Chủ
  if (hash === '#/home' || hash === '') {
    const stats = await api.getStats();
    const audios = await api.getAudios({ pageSize: 10 });
    const history = await api.getRecentHistory();
    const categories = await api.getCategories();
    
    // Tìm audio đang nghe gần nhất từ history để làm Hero
    let heroAudio = null;
    if (history && history.length > 0) {
      heroAudio = await api.getAudioById(history[0].audioId);
    }
    if (!heroAudio && audios.length > 0) {
      heroAudio = audios[0]; // fallback
    }

    renderHome(main, {
      stats,
      currentAudio: heroAudio,
      latestAudios: audios,
      history,
      categories
    });
  } 
  // 2. Thư Viện & Tìm Kiếm
  else if (hash.startsWith('#/library')) {
    const audios = await api.getAudios({
      categoryId: activeCategoryFilter,
      search: currentSearchQuery,
      status: activeStatusFilter === 'all' ? null : activeStatusFilter
    });
    const categories = await api.getCategories();
    const tags = await api.getTags();
    renderLibrary(main, {
      audios,
      categories,
      tags,
      activeCategory: activeCategoryFilter,
      currentSearch: currentSearchQuery,
      activeStatus: activeStatusFilter
    });
  } 
  // 3. Chi Tiết Player & Phân Tập
  else if (hash.startsWith('#/player/')) {
    const id = hash.replace('#/player/', '');
    const audio = await api.getAudioById(id);
    renderDetailPlayer(main, audio);
  } 
  // 4. Nhập Link YouTube Mới
  else if (hash === '#/upload') {
    const categories = await api.getCategories();
    renderUpload(main, categories);
  } 
  // 5. Quản Lý - Tổng Quan
  else if (hash === '#/admin') {
    const stats = await api.getStats();
    const categories = await api.getCategories();
    const tags = await api.getTags();
    renderAdmin(main, stats, categories, tags);
  } 
  // 6. Quản Lý - Danh Sách Audio
  else if (hash === '#/admin/audios') {
    const audios = await api.getAudios();
    renderAdminAudios(main, audios);
  } 
  // 7. Quản Lý - Phân Đoạn Tập
  else if (hash.startsWith('#/admin/episodes')) {
    const audios = await api.getAudios();
    const urlParams = new URLSearchParams(hash.split('?')[1]);
    const audioId = urlParams.get('audioId');
    renderAdminEpisodes(main, audios, audioId);
  } 
  // 8. Quản Lý - Thể Loại & Thẻ
  else if (hash === '#/admin/categories') {
    const categories = await api.getCategories();
    const tags = await api.getTags();
    renderAdminCategories(main, categories, tags);
  } 
  // 9. Cài Đặt Hệ Thống
  else if (hash === '#/settings') {
    renderSettings(main);
  } 
  // 10. Quản Lý Tài Khoản
  else if (hash === '#/admin/accounts') {
    renderAdminAccounts(main);
  }
  // 11. Hồ Sơ Cá Nhân
  else if (hash === '#/profile') {
    const stats = await api.getStats();
    renderFullProfile(main, stats);
  }
  // 12. Nâng Cấp VIP
  else if (hash === '#/membership') {
    renderMembership(main);
  }
  // 13. Cộng đồng
  else if (hash === '#/community') {
    renderCommunity(main);
  }
  // Cuộn trang
  if (hash.startsWith('#/library')) {
    setTimeout(() => window.scrollTo(0, libraryScrollPos), 50);
  } else {
    window.scrollTo({ top: 0 });
  }
}

// Khởi chạy ứng dụng
async function initApp() {
  const savedTheme = localStorage.getItem('setting_theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }

  await api.init();
  
  if (api.isLive) {
    await api.getMe();
  }

  player.init();

  window.addEventListener('hashchange', router);
  
  // Sự kiện lọc danh mục thư viện
  window.addEventListener('lib-filter-category', (e) => {
    activeCategoryFilter = e.detail;
    router();
  });

  // Sự kiện tìm kiếm thư viện
  window.addEventListener('lib-search', (e) => {
    currentSearchQuery = e.detail;
    router();
  });

  // Sự kiện lọc trạng thái (all, listening, completed, favorite)
  window.addEventListener('lib-filter-status', (e) => {
    activeStatusFilter = e.detail;
    router();
  });

  // Cập nhật Mini Player
  window.addEventListener('player-change', () => {
    player.renderMiniPlayer();
  });

  router();
}

document.addEventListener('DOMContentLoaded', initApp);
