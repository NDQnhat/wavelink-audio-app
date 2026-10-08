// Phân hệ Quản Lý & Hồ Sơ (Management Views) - Đầy đủ 100% CRUD, Modals & Logic
import { api } from './api.js';
import { player } from './player.js';
import { showToast, showModal } from './uiUtils.js';

export function renderAdminTabs(activeTab) {
  return `
    <div class="w-full bg-surface-container-lowest shadow-sm mb-space-md border-b border-surface-container">
      <div class="flex items-center gap-1 px-margin-sm py-2 overflow-x-auto no-scrollbar max-w-lg mx-auto">
        <button onclick="location.hash='#/admin'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'overview' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}">
          Tổng quan
        </button>
        <button onclick="location.hash='#/admin/audios'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${activeTab === 'audios' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}">
          <span class="material-symbols-outlined text-[16px]">library_music</span>
          Danh sách Audio
        </button>
        <button onclick="location.hash='#/admin/episodes'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'episodes' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}">
          Quản lý Tập
        </button>
        <button onclick="location.hash='#/admin/categories'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'categories' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}">
          Thể loại & Thẻ
        </button>
        <button onclick="location.hash='#/settings'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'settings' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}">
          Cài đặt hệ thống
        </button>
        <button onclick="location.hash='#/admin/accounts'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${activeTab === 'accounts' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}">
          <span class="material-symbols-outlined text-[16px]">group</span>
          Tài khoản
        </button>
      </div>
    </div>
  `;
}

// 1. Quản lý Danh Sách Audio (Admin Audio List)
export function renderAdminAudios(container, audios) {
  let displayAudios = [...audios];

  function renderList() {
    const listEl = document.getElementById('admin-audios-list');
    if (!listEl) return;

    if (displayAudios.length === 0) {
      listEl.innerHTML = `<div class="p-8 text-center text-sm text-on-surface-variant">Không tìm thấy audio nào.</div>`;
      return;
    }

    listEl.innerHTML = displayAudios.map(a => `
      <div class="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container/60 p-space-sm flex flex-col gap-space-xs hover:shadow-md transition-all">
        <div class="flex items-start gap-space-sm">
          <img src="${a.thumbnailUrl}" class="w-16 h-20 rounded-lg object-cover shrink-0 bg-surface-container shadow-xs">
          <div class="flex flex-col min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <span class="font-label-sm text-primary font-bold uppercase text-[10px]">${a.categoryName}</span>
              <span class="px-2 py-0.5 rounded-full ${a.status === 'ACTIVE' || !a.status ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'} font-label-sm font-semibold text-[10px]">
                ${a.status === 'ACTIVE' || !a.status ? 'Đang phát' : 'Đã ẩn'}
              </span>
            </div>
            <h3 class="font-title-md font-bold text-on-surface truncate text-sm mt-0.5">${a.title}</h3>
            <p class="font-body-sm text-xs text-on-surface-variant truncate">Tác giả: ${a.author || 'Chưa rõ'} • ${a.channel || ''}</p>
            <div class="flex items-center gap-1.5 mt-1 text-[11px] text-on-surface-variant">
              <span class="bg-surface-container px-2 py-0.5 rounded font-mono font-semibold">${a.totalEpisodes} Tập</span>
              <span class="bg-surface-container px-2 py-0.5 rounded">${a.formattedDuration || '24h 00m'}</span>
              <span class="font-mono text-outline text-[10px]">ID: ${a.youtubeVideoId}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-surface-container mt-1">
          <span class="text-xs text-on-surface-variant">Tiến độ: <strong class="text-primary">${a.progressPercent || 0}%</strong></span>
          <div class="flex items-center gap-1.5">
            <button onclick="location.hash='#/player/${a.id}'" class="px-2 py-1 rounded-lg bg-surface-container text-primary font-bold text-xs hover:bg-primary-container hover:text-on-primary transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">play_circle</span> Nghe
            </button>
            <button onclick="location.hash='#/admin/episodes?audioId=${a.id}'" class="px-2 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">splitscreen</span> Tập
            </button>
            <button data-edit-id="${a.id}" class="edit-audio-btn px-2 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">edit</span> Sửa
            </button>
            <button data-delete-id="${a.id}" class="delete-audio-btn p-1 rounded-lg text-error hover:bg-error-container/20 transition-colors" title="Xóa">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Attach Edit & Delete buttons
    document.querySelectorAll('.edit-audio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-id');
        const target = audios.find(a => a.id == id);
        if (target) openEditAudioModal(target);
      });
    });

    document.querySelectorAll('.delete-audio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        const target = audios.find(a => a.id == id);
        if (target) openDeleteAudioModal(target);
      });
    });
  }

  container.innerHTML = `
    <div class="flex flex-col w-full pb-28">
      ${renderAdminTabs('audios')}

      <div class="px-margin-sm flex flex-col gap-space-md">
        <!-- Search & Quick Action -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input id="admin-audio-search" class="w-full bg-surface-container-lowest text-on-surface pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border border-surface-container outline-none focus:border-primary shadow-xs" placeholder="Tìm theo tên truyện, tác giả, video ID..." type="text">
          </div>
          <button onclick="location.hash='#/upload'" class="px-3.5 py-2.5 rounded-xl bg-primary-container text-on-primary font-bold text-xs shadow-sm flex items-center gap-1 shrink-0 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[18px]">add_link</span>
            <span>+ Nhập URL</span>
          </button>
        </div>

        <div class="flex flex-col gap-space-sm" id="admin-audios-list"></div>
      </div>
    </div>
  `;

  renderList();

  // Search filter
  document.getElementById('admin-audio-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      displayAudios = [...audios];
    } else {
      displayAudios = audios.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.author?.toLowerCase().includes(q) ||
        a.youtubeVideoId?.toLowerCase().includes(q)
      );
    }
    renderList();
  });

  // Modal Sửa Audio
  async function openEditAudioModal(a) {
    const categories = await api.getCategories();
    showModal({
      title: 'Chỉnh Sửa Thông Tin Audio',
      content: `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Tiêu đề tác phẩm</label>
            <input id="modal-edit-title" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none focus:border-primary" value="${a.title}">
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Tác giả / Người diễn đọc</label>
            <input id="modal-edit-author" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none focus:border-primary" value="${a.author || ''}">
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Thể loại</label>
            <select id="modal-edit-category" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none">
              ${categories.map(c => `<option value="${c.id}" ${c.id == a.categoryId ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Trạng thái phát</label>
            <select id="modal-edit-status" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none">
              <option value="ACTIVE" ${a.status === 'ACTIVE' || !a.status ? 'selected' : ''}>Đang phát (ACTIVE)</option>
              <option value="HIDDEN" ${a.status === 'HIDDEN' ? 'selected' : ''}>Ẩn khỏi thư viện (HIDDEN)</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Thẻ gắn (cách nhau bởi dấu phẩy)</label>
            <input id="modal-edit-tags" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none" value="${(a.tags || []).join(', ')}">
          </div>
        </div>
      `,
      confirmText: 'Lưu thay đổi',
      onConfirm: async () => {
        const title = document.getElementById('modal-edit-title').value.trim();
        const author = document.getElementById('modal-edit-author').value.trim();
        const categoryId = parseInt(document.getElementById('modal-edit-category').value);
        const status = document.getElementById('modal-edit-status').value;
        const tags = document.getElementById('modal-edit-tags').value.split(',').map(s => s.trim()).filter(Boolean);

        if (!title) {
          showToast('Tiêu đề không được để trống', 'error');
          return false;
        }

        const cat = categories.find(c => c.id == categoryId);
        await api.updateAudio(a.id, {
          title,
          author,
          categoryId,
          categoryName: cat?.name || a.categoryName,
          status,
          tags
        });

        Object.assign(a, { title, author, categoryId, categoryName: cat?.name || a.categoryName, status, tags });
        renderList();
        showToast('Đã cập nhật audio thành công!', 'success');
        return true;
      }
    });
  }

  // Modal Xóa Audio
  function openDeleteAudioModal(a) {
    showModal({
      title: 'Xác Nhận Xóa Audio',
      content: `
        <p class="text-sm text-on-surface leading-relaxed">
          Bạn có chắc chắn muốn xóa tác phẩm <strong>${a.title}</strong> khỏi thư viện không?
        </p>
        <p class="text-xs text-error font-semibold mt-1">
          Hành động này sẽ xóa toàn bộ danh sách tập và tiến trình nghe liên quan!
        </p>
      `,
      confirmText: 'Xác nhận xóa',
      isDanger: true,
      onConfirm: async () => {
        await api.deleteAudio(a.id);
        const idx = audios.findIndex(item => item.id == a.id);
        if (idx !== -1) audios.splice(idx, 1);
        displayAudios = displayAudios.filter(item => item.id != a.id);
        renderList();
        showToast('Đã xóa tác phẩm thành công!', 'success');
        return true;
      }
    });
  }
}

// 2. Quản lý Tập (Admin Episode Manager)
export function renderAdminEpisodes(container, audios, currentAudioId) {
  let selectedAudio = audios.find(a => a.id == currentAudioId) || audios[0];
  let episodes = selectedAudio?.episodes || [];

  function renderEpisodesList() {
    const listEl = document.getElementById('admin-episodes-table');
    if (!listEl) return;

    if (!selectedAudio || episodes.length === 0) {
      listEl.innerHTML = `<div class="p-8 text-center text-sm text-on-surface-variant">Chưa có tập nào cho tác phẩm này. Bấm 'Tạo lại tập' để sinh tự động.</div>`;
      return;
    }

    listEl.innerHTML = episodes.map(ep => `
      <div class="bg-surface-container-lowest rounded-xl p-3 border border-surface-container/60 shadow-xs flex items-center justify-between gap-2 hover:shadow-sm transition-all">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center font-mono font-bold text-xs text-primary shrink-0">
            ${ep.episodeNumber}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md font-bold text-on-surface truncate text-xs">${ep.title}</span>
            <span class="font-code-sm text-[11px] text-on-surface-variant">
              ${api.formatTime(ep.startSeconds)} → ${api.formatTime(ep.endSeconds)} (${api.formatDuration(ep.duration || ep.endSeconds - ep.startSeconds)})
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button data-edit-ep-id="${ep.id}" class="edit-ep-btn p-1.5 rounded-lg bg-surface-container text-on-surface hover:text-primary transition-colors" title="Sửa mốc giờ">
            <span class="material-symbols-outlined text-[16px]">edit</span>
          </button>
          <button data-delete-ep-id="${ep.id}" class="delete-ep-btn p-1.5 rounded-lg text-error hover:bg-error-container/20 transition-colors" title="Xóa tập">
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
    `).join('');

    // Attach Edit & Delete buttons
    document.querySelectorAll('.edit-ep-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const epId = btn.getAttribute('data-edit-ep-id');
        const ep = episodes.find(e => e.id == epId);
        if (ep) openEditEpisodeModal(ep);
      });
    });

    document.querySelectorAll('.delete-ep-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const epId = btn.getAttribute('data-delete-ep-id');
        const ep = episodes.find(e => e.id == epId);
        if (ep) openDeleteEpisodeModal(ep);
      });
    });
  }

  container.innerHTML = `
    <div class="flex flex-col w-full pb-28">
      ${renderAdminTabs('episodes')}

      <div class="px-margin-sm flex flex-col gap-space-md">
        <!-- Audio Selector -->
        <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container/60 flex flex-col gap-1.5">
          <label class="font-label-sm font-bold text-on-surface-variant text-xs">Chọn tác phẩm để quản lý phân tập</label>
          <div class="relative">
            <select id="admin-episode-select-audio" class="w-full appearance-none bg-surface-container-low text-on-surface font-title-md font-bold py-2.5 pl-3 pr-8 rounded-xl outline-none text-sm border border-transparent focus:border-primary">
              ${audios.map(a => `
                <option value="${a.id}" ${selectedAudio?.id == a.id ? 'selected' : ''}>${a.title} (${a.totalEpisodes} tập)</option>
              `).join('')}
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
          </div>
        </div>

        <!-- Series Summary & Actions Toolbar -->
        ${selectedAudio ? `
        <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container/60 flex items-center justify-between gap-2">
          <div class="flex flex-col">
            <span class="font-label-sm text-xs text-on-surface-variant">Tổng thời lượng: <strong class="text-on-surface">${selectedAudio.formattedDuration || '24h 00m'}</strong></span>
            <span class="font-label-sm text-xs text-on-surface-variant">Số tập hiện có: <strong class="text-primary">${episodes.length} tập</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <button id="add-manual-ep-btn" class="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-bold text-xs hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">add</span> Thêm tập
            </button>
            <button id="regenerate-episodes-btn" class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-bold text-xs shadow-xs hover:bg-primary active:scale-95 transition-all flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">autorenew</span> Chia lại tập
            </button>
          </div>
        </div>
        ` : ''}

        <!-- Episodes List -->
        <div class="flex flex-col gap-2" id="admin-episodes-table"></div>
      </div>
    </div>
  `;

  renderEpisodesList();

  // Handle Audio select change
  document.getElementById('admin-episode-select-audio')?.addEventListener('change', async (e) => {
    const aId = e.target.value;
    selectedAudio = audios.find(a => a.id == aId);
    if (selectedAudio) {
      episodes = await api.getEpisodes(selectedAudio.id);
      selectedAudio.episodes = episodes;
      renderEpisodesList();
    }
  });

  // Modal Sửa Tập
  function openEditEpisodeModal(ep) {
    showModal({
      title: `Chỉnh Sửa ${ep.title}`,
      content: `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Tiêu đề tập</label>
            <input id="edit-ep-title" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none" value="${ep.title}">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs font-bold text-on-surface block mb-1">Giây bắt đầu (start_sec)</label>
              <input id="edit-ep-start" type="number" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none font-mono" value="${ep.startSeconds}">
            </div>
            <div>
              <label class="text-xs font-bold text-on-surface block mb-1">Giây kết thúc (end_sec)</label>
              <input id="edit-ep-end" type="number" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none font-mono" value="${ep.endSeconds}">
            </div>
          </div>
          <p class="text-[11px] text-on-surface-variant">Định dạng thời gian: ${api.formatTime(ep.startSeconds)} đến ${api.formatTime(ep.endSeconds)}</p>
        </div>
      `,
      confirmText: 'Lưu mốc giờ',
      onConfirm: async () => {
        const title = document.getElementById('edit-ep-title').value.trim();
        const startSec = parseInt(document.getElementById('edit-ep-start').value);
        const endSec = parseInt(document.getElementById('edit-ep-end').value);

        if (!title) {
          showToast('Tiêu đề tập không được để trống', 'error');
          return false;
        }
        if (endSec <= startSec) {
          showToast('Giây kết thúc phải lớn hơn giây bắt đầu', 'error');
          return false;
        }

        await api.updateEpisode(ep.id, { title, startSeconds: startSec, endSeconds: endSec });
        Object.assign(ep, { title, startSeconds: startSec, endSeconds: endSec, duration: endSec - startSec });
        renderEpisodesList();
        showToast('Đã cập nhật tập thành công!', 'success');
        return true;
      }
    });
  }

  // Modal Xóa Tập
  function openDeleteEpisodeModal(ep) {
    showModal({
      title: 'Xóa Tập Audio',
      content: `<p class="text-sm text-on-surface">Bạn có chắc chắn muốn xóa <strong>${ep.title}</strong>?</p>`,
      confirmText: 'Xóa tập',
      isDanger: true,
      onConfirm: async () => {
        await api.deleteEpisode(ep.id);
        episodes = episodes.filter(e => e.id != ep.id);
        if (selectedAudio) selectedAudio.episodes = episodes;
        renderEpisodesList();
        showToast('Đã xóa tập!', 'success');
        return true;
      }
    });
  }

  // Modal Thêm Tập Thủ Công
  document.getElementById('add-manual-ep-btn')?.addEventListener('click', () => {
    if (!selectedAudio) return;
    const nextEpNum = (episodes.length || 0) + 1;
    const lastEp = episodes[episodes.length - 1];
    const defaultStart = lastEp ? lastEp.endSeconds : 0;
    const defaultEnd = defaultStart + 14400;

    showModal({
      title: 'Thêm Tập Mới Thủ Công',
      content: `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Số thứ tự tập</label>
            <input id="create-ep-num" type="number" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none" value="${nextEpNum}">
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Tiêu đề tập</label>
            <input id="create-ep-title" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none" value="Tập ${nextEpNum}">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs font-bold text-on-surface block mb-1">Giây bắt đầu</label>
              <input id="create-ep-start" type="number" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none font-mono" value="${defaultStart}">
            </div>
            <div>
              <label class="text-xs font-bold text-on-surface block mb-1">Giây kết thúc</label>
              <input id="create-ep-end" type="number" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none font-mono" value="${defaultEnd}">
            </div>
          </div>
        </div>
      `,
      confirmText: 'Tạo tập',
      onConfirm: async () => {
        const epNum = parseInt(document.getElementById('create-ep-num').value);
        const title = document.getElementById('create-ep-title').value.trim();
        const startSec = parseInt(document.getElementById('create-ep-start').value);
        const endSec = parseInt(document.getElementById('create-ep-end').value);

        if (!title || endSec <= startSec) {
          showToast('Thông tin tập không hợp lệ', 'error');
          return false;
        }

        const newEp = await api.createEpisode({
          audioId: selectedAudio.id,
          episodeNumber: epNum,
          title,
          startSeconds: startSec,
          endSeconds: endSec
        });

        if (newEp) episodes.push(newEp);
        renderEpisodesList();
        showToast('Đã thêm tập mới thành công!', 'success');
        return true;
      }
    });
  });

  // Modal Tạo Lại Tập Tự Động (Regenerate)
  document.getElementById('regenerate-episodes-btn')?.addEventListener('click', () => {
    if (!selectedAudio) return;
    showModal({
      title: 'Tự Động Chia Lại Tập',
      content: `
        <div class="flex flex-col gap-3">
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Hệ thống sẽ tính toán lại toàn bộ mốc thời gian bắt đầu và kết thúc dựa trên khối thời gian bạn chọn:
          </p>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Quy chuẩn kích thước tập</label>
            <select id="modal-regen-block" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none">
              <option value="14400" selected>4 Giờ / Tập (Khuyến nghị)</option>
              <option value="7200">2 Giờ / Tập</option>
              <option value="3600">1 Giờ / Tập</option>
            </select>
          </div>
          <p class="text-xs text-error font-medium">Lưu ý: Mọi tên tập tùy biến trước đó sẽ được đặt lại theo mốc giờ chuẩn.</p>
        </div>
      `,
      confirmText: 'Xác nhận tạo lại',
      onConfirm: async () => {
        const blockSize = parseInt(document.getElementById('modal-regen-block').value) || 14400;
        const newEps = await api.generateEpisodes(selectedAudio.id, blockSize);
        episodes = newEps;
        selectedAudio.episodes = newEps;
        selectedAudio.totalEpisodes = newEps.length;
        renderEpisodesList();
        showToast(`Đã chia lại thành ${newEps.length} tập!`, 'success');
        return true;
      }
    });
  });
}

// 3. Quản lý Thể Loại & Thẻ Gắn (Admin Categories & Tags)
export function renderAdminCategories(container, categories, tags) {
  let catList = [...categories];
  let tagList = [...tags];

  function renderCategoryRows() {
    const box = document.getElementById('admin-categories-box');
    if (!box) return;
    box.innerHTML = catList.map(c => `
      <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 border border-surface-container/40">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold shrink-0">
            <span class="material-symbols-outlined text-[20px]">category</span>
          </div>
          <div class="flex flex-col min-w-0">
            <h4 class="font-label-md font-bold text-on-surface text-sm truncate">${c.name}</h4>
            <span class="font-code-sm text-[11px] text-outline truncate">${c.slug} • ${c.description || 'Không có mô tả'}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="px-2 py-0.5 rounded-full bg-surface-container font-label-sm font-bold text-primary text-xs">${c.count || 0} bài</span>
          <button data-edit-cat-id="${c.id}" class="edit-cat-btn p-1.5 rounded-lg text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-[18px]">edit</span></button>
          <button data-delete-cat-id="${c.id}" class="delete-cat-btn p-1.5 rounded-lg text-error hover:bg-error-container/20 transition-colors"><span class="material-symbols-outlined text-[18px]">delete</span></button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.edit-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-cat-id');
        const c = catList.find(item => item.id == id);
        if (c) openEditCategoryModal(c);
      });
    });

    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-cat-id');
        const c = catList.find(item => item.id == id);
        if (c) openDeleteCategoryModal(c);
      });
    });
  }

  function renderTagChips() {
    const box = document.getElementById('admin-tags-box');
    if (!box) return;
    box.innerHTML = tagList.map(t => `
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-sm text-xs font-semibold">
        #${t.name} <span class="text-primary font-bold">(${t.count || 0})</span>
        <button data-delete-tag-id="${t.id}" class="delete-tag-btn hover:text-error ml-0.5">
          <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
      </span>
    `).join('');

    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-tag-id');
        await api.deleteTag(id);
        tagList = tagList.filter(t => t.id != id);
        renderTagChips();
        showToast('Đã xóa thẻ tag', 'info');
      });
    });
  }

  container.innerHTML = `
    <div class="flex flex-col w-full pb-28">
      ${renderAdminTabs('categories')}

      <div class="px-margin-sm flex flex-col gap-space-md">
        <!-- Categories Management Section -->
        <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-xs border border-surface-container/60 flex flex-col gap-space-sm">
          <div class="flex items-center justify-between pb-2 border-b border-surface-container">
            <div>
              <h3 class="font-title-md font-bold text-on-surface">Danh Mục Thể Loại</h3>
              <span class="font-label-sm text-outline text-xs">${categories.length} thể loại chuẩn</span>
            </div>
            <button id="add-category-btn" class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-bold text-xs shadow-xs hover:bg-primary active:scale-95 transition-all flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">add</span> + Thêm mới
            </button>
          </div>

          <div class="flex flex-col gap-2" id="admin-categories-box"></div>
        </div>

        <!-- Tags Management Section -->
        <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-xs border border-surface-container/60 flex flex-col gap-space-sm">
          <div class="flex items-center justify-between pb-2 border-b border-surface-container">
            <div>
              <h3 class="font-title-md font-bold text-on-surface">Thẻ Tìm Kiếm (Tags)</h3>
              <span class="font-label-sm text-outline text-xs">${tags.length} thẻ phổ biến</span>
            </div>
            <button id="add-tag-modal-btn" class="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-bold text-xs hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">add</span> Thêm thẻ
            </button>
          </div>

          <div class="flex flex-wrap gap-2" id="admin-tags-box"></div>
        </div>
      </div>
    </div>
  `;

  renderCategoryRows();
  renderTagChips();

  // Add Category Modal
  document.getElementById('add-category-btn')?.addEventListener('click', () => {
    showModal({
      title: 'Thêm Thể Loại Mới',
      content: `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Tên thể loại *</label>
            <input id="new-cat-name" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none" placeholder="Ví dụ: Khoa học viễn tưởng">
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Slug đường dẫn</label>
            <input id="new-cat-slug" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none font-mono" placeholder="khoa-hoc-vien-tuong">
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Mô tả ngắn</label>
            <textarea id="new-cat-desc" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none h-20"></textarea>
          </div>
        </div>
      `,
      confirmText: 'Tạo thể loại',
      onConfirm: async () => {
        const name = document.getElementById('new-cat-name').value.trim();
        const slug = document.getElementById('new-cat-slug').value.trim();
        const description = document.getElementById('new-cat-desc').value.trim();
        if (!name) {
          showToast('Tên thể loại không được để trống', 'error');
          return false;
        }
        const created = await api.createCategory({ name, slug, description });
        catList.push(created);
        renderCategoryRows();
        showToast('Đã thêm thể loại mới!', 'success');
        return true;
      }
    });
  });

  // Edit Category Modal
  function openEditCategoryModal(c) {
    showModal({
      title: `Sửa Thể Loại: ${c.name}`,
      content: `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Tên thể loại</label>
            <input id="edit-cat-name" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none" value="${c.name}">
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Slug</label>
            <input id="edit-cat-slug" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none font-mono" value="${c.slug}">
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface block mb-1">Mô tả</label>
            <textarea id="edit-cat-desc" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none h-20">${c.description || ''}</textarea>
          </div>
        </div>
      `,
      confirmText: 'Lưu thay đổi',
      onConfirm: async () => {
        const name = document.getElementById('edit-cat-name').value.trim();
        const slug = document.getElementById('edit-cat-slug').value.trim();
        const description = document.getElementById('edit-cat-desc').value.trim();
        await api.updateCategory(c.id, { name, slug, description });
        Object.assign(c, { name, slug, description });
        renderCategoryRows();
        showToast('Đã cập nhật thể loại!', 'success');
        return true;
      }
    });
  }

  // Delete Category Modal
  function openDeleteCategoryModal(c) {
    showModal({
      title: 'Xóa Thể Loại',
      content: `<p class="text-sm text-on-surface">Bạn có chắc chắn muốn xóa thể loại <strong>${c.name}</strong> không?</p>`,
      confirmText: 'Xóa thể loại',
      isDanger: true,
      onConfirm: async () => {
        await api.deleteCategory(c.id);
        catList = catList.filter(item => item.id != c.id);
        renderCategoryRows();
        showToast('Đã xóa thể loại!', 'success');
        return true;
      }
    });
  }

  // Add Tag Modal
  document.getElementById('add-tag-modal-btn')?.addEventListener('click', () => {
    showModal({
      title: 'Thêm Thẻ Tag Mới',
      content: `
        <div>
          <label class="text-xs font-bold text-on-surface block mb-1">Tên thẻ tag *</label>
          <input id="new-tag-name-input" class="w-full p-2.5 bg-surface-container-low rounded-lg text-sm border border-surface-container outline-none" placeholder="Ví dụ: TuChân">
        </div>
      `,
      confirmText: 'Thêm thẻ',
      onConfirm: async () => {
        const name = document.getElementById('new-tag-name-input').value.trim().replace(/^#/, '');
        if (!name) return false;
        const newT = await api.createTag({ name });
        tagList.push(newT);
        renderTagChips();
        showToast('Đã thêm thẻ mới!', 'success');
        return true;
      }
    });
  });
}

// 4. Cài Đặt Hệ Thống (System Settings)
export function renderSettings(container) {
  const currentTicker = localStorage.getItem('setting_ticker_interval') || '60';
  const currentBlock = localStorage.getItem('setting_block_size') || '14400';
  const currentTheme = localStorage.getItem('setting_theme') || 'light';

  container.innerHTML = `
    <div class="flex flex-col w-full pb-28">
      ${renderAdminTabs('settings')}

      <div class="px-margin-sm flex flex-col gap-space-md">
        <!-- Settings Header Card -->
        <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-xs border border-surface-container/60 flex items-center gap-space-md">
          <div class="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-md shrink-0">
            <span class="material-symbols-outlined text-[26px]">tune</span>
          </div>
          <div>
            <h2 class="font-title-lg font-bold text-on-surface">Cài Đặt Hệ Thống</h2>
            <p class="font-body-sm text-xs text-on-surface-variant">Cấu hình tham số Player, chu kỳ đồng bộ & khống chế tài nguyên</p>
          </div>
        </div>

        <!-- Parameters Group Card -->
        <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-xs border border-surface-container/60 flex flex-col gap-3">
          <h3 class="font-title-md font-bold text-on-surface">Quy chuẩn phát & chia tập</h3>
          
          <div class="flex items-center justify-between py-2 border-b border-surface-container">
            <div>
              <span class="font-label-lg font-bold text-on-surface block text-sm">Thời lượng tập mặc định</span>
              <span class="font-body-sm text-on-surface-variant text-xs">Khối thời gian tự động phân tách video dài</span>
            </div>
            <select id="setting-block-size" class="bg-surface-container p-2 rounded-lg font-code-sm font-bold text-primary text-xs outline-none">
              <option value="14400" ${currentBlock === '14400' ? 'selected' : ''}>14400s (4 Giờ)</option>
              <option value="7200" ${currentBlock === '7200' ? 'selected' : ''}>7200s (2 Giờ)</option>
              <option value="3600" ${currentBlock === '3600' ? 'selected' : ''}>3600s (1 Giờ)</option>
            </select>
          </div>

          <div class="flex items-center justify-between py-2 border-b border-surface-container">
            <div>
              <span class="font-label-lg font-bold text-on-surface block text-sm">Chu kỳ lưu tiến trình (Heartbeat)</span>
              <span class="font-body-sm text-on-surface-variant text-xs">Tần suất gửi PUT /progress lên backend</span>
            </div>
            <select id="setting-ticker-interval" class="bg-surface-container p-2 rounded-lg font-code-sm font-bold text-primary text-xs outline-none">
              <option value="30" ${currentTicker === '30' ? 'selected' : ''}>Mỗi 30 giây</option>
              <option value="60" ${currentTicker === '60' ? 'selected' : ''}>Mỗi 60 giây (Chuẩn)</option>
              <option value="120" ${currentTicker === '120' ? 'selected' : ''}>Mỗi 120 giây</option>
            </select>
          </div>

          <div class="flex items-center justify-between py-2 border-b border-surface-container">
            <div>
              <span class="font-label-lg font-bold text-on-surface block text-sm">Chế độ giao diện (Theme)</span>
              <span class="font-body-sm text-on-surface-variant text-xs">Màu nền phong cách Sonic Archive</span>
            </div>
            <select id="setting-theme-select" class="bg-surface-container p-2 rounded-lg font-bold text-xs outline-none">
              <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Sáng (Light Mode)</option>
              <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Tối (Dark Mode)</option>
            </select>
          </div>

          <div class="flex items-center justify-between py-2">
            <div>
              <span class="font-label-lg font-bold text-on-surface block text-sm">Bộ nhớ đệm MySQL Buffer Pool</span>
              <span class="font-body-sm text-on-surface-variant text-xs">Khống chế tối ưu cho Linux VPS 1GB RAM</span>
            </div>
            <span class="font-code-sm font-bold text-tertiary-container bg-surface-container px-2.5 py-1 rounded text-xs">256 MB RAM</span>
          </div>
        </div>

        <!-- Storage & Cache Management Card -->
        <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-xs border border-surface-container/60 flex flex-col gap-3">
          <h3 class="font-title-md font-bold text-on-surface">Bộ nhớ đệm cục bộ (Cache)</h3>
          <div class="flex items-center gap-2">
            <button id="clear-cache-btn" class="flex-1 py-2.5 rounded-xl border border-error/30 text-error hover:bg-error/10 font-bold text-xs transition-colors">
              Xóa Cache Ngoại Tuyến
            </button>
            <button id="reset-seed-btn" class="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface hover:text-primary font-bold text-xs transition-colors">
              Nạp Lại Dữ Liệu Mẫu
            </button>
          </div>
        </div>

        <button id="save-settings-btn" class="w-full py-3 rounded-xl bg-primary-container text-on-primary font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[20px]">save</span> Lưu Cấu Hình Hệ Thống
        </button>
      </div>
    </div>
  `;

  document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    const ticker = document.getElementById('setting-ticker-interval').value;
    const block = document.getElementById('setting-block-size').value;
    const theme = document.getElementById('setting-theme-select').value;

    localStorage.setItem('setting_ticker_interval', ticker);
    localStorage.setItem('setting_block_size', block);
    localStorage.setItem('setting_theme', theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    showToast('Đã lưu cấu hình hệ thống thành công!', 'success');
  });

  document.getElementById('clear-cache-btn')?.addEventListener('click', () => {
    localStorage.removeItem('offline_progress_queue');
    showToast('Đã dọn sạch hàng đợi ngoại tuyến!', 'info');
  });

  document.getElementById('reset-seed-btn')?.addEventListener('click', () => {
    localStorage.removeItem('audio_library_db');
    showToast('Đang tải lại dữ liệu mẫu...', 'info');
    setTimeout(() => location.reload(), 800);
  });
}

// 5. Hồ Sơ Cá Nhân (Full User Profile)
export function renderFullProfile(container, stats) {
  const user = api.user;
  
  if (!user || user.isGuest) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[70vh] px-margin-sm gap-space-sm w-full max-w-sm mx-auto text-center">
        <div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shadow-sm mb-2">
          <span class="material-symbols-outlined text-[40px]">lock_person</span>
        </div>
        <h2 class="font-headline-md font-bold text-on-surface">Chưa đăng nhập</h2>
        <p class="font-body-sm text-on-surface-variant mb-4">Vui lòng đăng nhập để xem hồ sơ cá nhân và quản lý tiến độ nghe của bạn.</p>
        <button onclick="location.hash='#/login'" class="w-full py-3.5 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary-container hover:text-on-primary-container active:scale-95 transition-all">
          Đi đến Đăng nhập
        </button>
      </div>
    `;
    return;
  }

  const allAudios = api.db?.audios || [];
  const favoriteAudios = allAudios.filter(a => a.isFavorite);
  const historyItems = api.db?.recentHistory || [];

  const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay';
  const roleName = user.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên';
  const membershipName = user.membership === 'VIP' ? 'VIP Member' : 'Tài khoản thường';

  container.innerHTML = `
    <div class="flex flex-col w-full pb-28 px-margin-sm gap-space-md pt-space-xs">
      <!-- Profile Hero Card -->
      <section class="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container/60 p-space-lg flex flex-col gap-space-md relative overflow-hidden">
        <div class="flex items-start gap-space-md">
          <div class="w-16 h-16 rounded-full overflow-hidden bg-primary-container flex items-center justify-center text-on-primary text-2xl font-bold shrink-0 shadow-md">
            <span class="material-symbols-outlined text-[32px]">${user.isGuest ? 'person_outline' : 'person'}</span>
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <div class="flex items-center gap-1">
              <h1 class="font-title-lg font-bold text-on-surface truncate">${user.username}</h1>
              ${user.membership === 'VIP' ? '<span class="material-symbols-outlined text-primary text-[18px]">verified</span>' : ''}
            </div>
            <span class="font-label-md text-primary font-medium text-xs">@${user.username}</span>
            <span class="font-body-sm text-on-surface-variant text-[11px] mt-0.5">Thành viên từ ${joinedDate} • ${roleName} • ${membershipName}</span>
          </div>
        </div>
        
        <div class="flex items-center justify-between mt-2">
          ${user.membership === 'FREE' && !user.isGuest ? `
            <div class="flex items-center gap-2">
              <span class="text-xs text-on-surface-variant font-medium">Bạn đang dùng bản miễn phí.</span>
              <button onclick="location.hash='#/membership'" class="px-3 py-1.5 bg-tertiary-container text-on-tertiary-container rounded-lg font-bold text-xs shadow-sm hover:scale-105 transition-transform flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">stars</span> Nâng cấp VIP
              </button>
            </div>
          ` : user.membership === 'VIP' ? `
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-primary-fixed text-on-primary-fixed-variant rounded-lg font-bold text-xs shadow-sm">
              <span class="material-symbols-outlined text-[16px]">workspace_premium</span> Gói VIP đang kích hoạt
            </div>
          ` : '<div></div>'}
        </div>
        
        <div class="flex items-center gap-2 mt-2 pt-2 border-t border-surface-container/50">
          ${user.isGuest ? `
            <button onclick="location.hash='#/login'" class="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-xs shadow-sm">
              Đăng nhập / Đăng ký
            </button>
          ` : `
            <button id="edit-profile-btn" class="flex-1 px-4 py-2 border border-primary/50 text-primary hover:bg-primary/10 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[14px]">edit</span> Đổi Tên
            </button>
            <button id="edit-password-btn" class="flex-1 px-4 py-2 border border-primary/50 text-primary hover:bg-primary/10 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[14px]">lock</span> Đổi Pass
            </button>
            <button id="logout-btn" class="flex-1 px-4 py-2 border border-error/50 text-error hover:bg-error/10 rounded-lg font-bold text-xs transition-colors">
              Đăng xuất
            </button>
          `}
        </div>
      </section>

      <!-- 4-Grid Activity Bento -->
      <section class="grid grid-cols-2 gap-space-sm">
        <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container/60 flex flex-col gap-1">
          <span class="w-7 h-7 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
            <span class="material-symbols-outlined text-[16px]">queue_music</span>
          </span>
          <span class="font-headline-lg font-bold text-on-surface mt-1">${stats.totalAudios || 0}</span>
          <span class="font-body-sm text-on-surface-variant text-xs">Audio trong thư viện</span>
        </div>

        <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container/60 flex flex-col gap-1">
          <span class="w-7 h-7 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
            <span class="material-symbols-outlined text-[16px]">task_alt</span>
          </span>
          <span class="font-headline-lg font-bold text-on-surface mt-1">${stats.completedCount || 0}</span>
          <span class="font-body-sm text-on-surface-variant text-xs">Đã hoàn thành</span>
        </div>

        <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container/60 flex flex-col gap-1">
          <span class="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[16px]">headset</span>
          </span>
          <span class="font-headline-lg font-bold text-on-surface mt-1">${stats.totalEpisodes || 48}</span>
          <span class="font-body-sm text-on-surface-variant text-xs">Tập đã phân đoạn</span>
        </div>

        <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container/60 flex flex-col gap-1">
          <span class="w-7 h-7 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
            <span class="material-symbols-outlined text-[16px]">timelapse</span>
          </span>
          <span class="font-headline-lg font-bold text-on-surface mt-1">${stats.totalHoursListened || 0}h</span>
          <span class="font-body-sm text-on-surface-variant text-xs">Thời gian đã nghe</span>
        </div>
      </section>

      <!-- Favorites Section -->
      <section class="bg-surface-container-lowest rounded-xl p-space-base shadow-xs border border-surface-container/60 flex flex-col gap-space-sm">
        <div class="flex items-center justify-between pb-2 border-b border-surface-container">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-error text-[20px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
            <h3 class="font-title-md font-bold text-on-surface">Danh Sách Yêu Thích (${favoriteAudios.length})</h3>
          </div>
          <button onclick="location.hash='#/library'" class="text-xs font-semibold text-primary hover:underline">Xem thêm</button>
        </div>

        <div class="flex flex-col gap-2">
          ${favoriteAudios.length === 0 ? `
            <span class="text-xs text-on-surface-variant py-2">Chưa có tác phẩm yêu thích nào. Hãy nhấn biểu tượng trái tim khi đang nghe!</span>
          ` : favoriteAudios.map(a => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
              <div class="flex items-center gap-2.5 min-w-0 cursor-pointer" onclick="location.hash='#/player/${a.id}'">
                <img src="${a.thumbnailUrl}" class="w-10 h-10 rounded-md object-cover">
                <div class="flex flex-col min-w-0">
                  <span class="font-label-md font-bold text-on-surface text-xs truncate">${a.title}</span>
                  <span class="text-[10px] text-on-surface-variant">${a.categoryName} • ${a.totalEpisodes} tập</span>
                </div>
              </div>
              <button onclick="location.hash='#/player/${a.id}'" class="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[16px]">play_arrow</span>
              </button>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- History Section -->
      <section class="bg-surface-container-lowest rounded-xl p-space-base shadow-xs border border-surface-container/60 flex flex-col gap-space-sm">
        <div class="flex items-center justify-between pb-2 border-b border-surface-container">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-[20px]">history</span>
            <h3 class="font-title-md font-bold text-on-surface">Nhật Ký Phiên Nghe Gần Đây</h3>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          ${historyItems.length === 0 ? `
            <span class="text-xs text-on-surface-variant py-2">Chưa có nhật ký nghe nào.</span>
          ` : historyItems.slice(0, 5).map(h => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
              <div class="flex flex-col min-w-0">
                <span class="font-label-md font-bold text-on-surface text-xs truncate">${h.title || 'Tập Audio'}</span>
                <span class="text-[10px] text-on-surface-variant">${h.episodeTitle || 'Tập 1'} • Đã nghe ${Math.round((h.durationListened || 60) / 60)} phút</span>
              </div>
              <span class="text-[10px] font-mono text-outline shrink-0">Đã lưu</span>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await api.logout();
    showToast('Đã đăng xuất', 'info');
    location.hash = '#/login';
  });

  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    showModal('Chỉnh sửa hồ sơ', `
      <div class="flex flex-col gap-3">
        <label class="text-sm font-bold">Tên hiển thị</label>
        <input type="text" id="edit-profile-username" value="${user.username}" class="p-2 bg-surface-container rounded-lg outline-none" />
        <label class="text-sm font-bold">Email</label>
        <input type="email" id="edit-profile-email" value="${user.email || ''}" class="p-2 bg-surface-container rounded-lg outline-none" placeholder="Không bắt buộc" />
      </div>
    `, async () => {
      const u = document.getElementById('edit-profile-username').value;
      const e = document.getElementById('edit-profile-email').value;
      try {
        await api.updateProfile(u, e);
        showToast('Cập nhật hồ sơ thành công', 'success');
        renderFullProfile(container, stats);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  document.getElementById('edit-password-btn')?.addEventListener('click', () => {
    showModal('Đổi mật khẩu', `
      <div class="flex flex-col gap-3">
        <label class="text-sm font-bold">Mật khẩu cũ</label>
        <input type="password" id="edit-pass-old" class="p-2 bg-surface-container rounded-lg outline-none" />
        <label class="text-sm font-bold">Mật khẩu mới</label>
        <input type="password" id="edit-pass-new" class="p-2 bg-surface-container rounded-lg outline-none" />
      </div>
    `, async () => {
      const o = document.getElementById('edit-pass-old').value;
      const n = document.getElementById('edit-pass-new').value;
      if (!o || !n) {
        showToast('Vui lòng nhập đủ thông tin', 'error');
        return;
      }
      try {
        await api.updatePassword(o, n);
        showToast('Đổi mật khẩu thành công', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// 6. Quản Lý Tài Khoản (Admin Accounts)
export async function renderAdminAccounts(container) {
  const users = await api.getUsers();

  container.innerHTML = `
    <div class="flex flex-col w-full pb-28">
      ${renderAdminTabs('accounts')}

      <div class="px-margin-sm flex flex-col gap-space-md">
        <div class="flex items-center justify-between pb-2 border-b border-surface-container">
          <div>
            <h3 class="font-title-md font-bold text-on-surface">Quản Lý Tài Khoản</h3>
            <span class="font-label-sm text-outline text-xs">Tổng số: ${users.length} tài khoản</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          ${users.map(u => `
            <div class="bg-surface-container-lowest rounded-xl p-space-sm shadow-xs border border-surface-container/60 flex flex-col gap-space-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm">
                    ${u.username[0].toUpperCase()}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-label-md font-bold text-on-surface">${u.username}</span>
                    <span class="text-[10px] text-on-surface-variant">${u.role} • ${u.membership}</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button data-id="${u.id}" class="btn-edit-user px-2 py-1 bg-surface-container text-primary rounded font-bold text-[10px]">Sửa</button>
                  <button data-id="${u.id}" class="btn-del-user px-2 py-1 bg-error/10 text-error rounded font-bold text-[10px]">Xóa</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach events
  document.querySelectorAll('.btn-del-user').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Xóa tài khoản này vĩnh viễn?')) {
        try {
          await api.deleteUser(id);
          showToast('Xóa tài khoản thành công', 'success');
          renderAdminAccounts(container); // reload
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  document.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const user = users.find(u => u.id == id);
      showModal('Chỉnh sửa quyền', `
        <div class="flex flex-col gap-3">
          <label class="text-sm font-bold">Quyền hạn (Role)</label>
          <select id="edit-role" class="p-2 bg-surface-container rounded-lg">
            <option value="USER" ${user.role === 'USER' ? 'selected' : ''}>Người dùng (USER)</option>
            <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Quản trị (ADMIN)</option>
          </select>
          <label class="text-sm font-bold mt-2">Hội viên (Membership)</label>
          <select id="edit-membership" class="p-2 bg-surface-container rounded-lg">
            <option value="FREE" ${user.membership === 'FREE' ? 'selected' : ''}>Miễn phí (FREE)</option>
            <option value="VIP" ${user.membership === 'VIP' ? 'selected' : ''}>Hội viên (VIP)</option>
          </select>
        </div>
      `, async () => {
        const r = document.getElementById('edit-role').value;
        const m = document.getElementById('edit-membership').value;
        try {
          await api.updateUserRole(id, r, m);
          showToast('Cập nhật quyền thành công', 'success');
          renderAdminAccounts(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });
}

// 7. Trang Nâng Cấp VIP (Membership View)
export function renderMembership(container) {
  const user = api.user;
  if (!user || user.isGuest) {
    location.hash = '#/login';
    return;
  }

  container.innerHTML = `
    <div class="flex flex-col w-full pb-28 px-margin-sm pt-space-base">
      <div class="flex items-center gap-2 mb-space-md">
        <button onclick="history.back()" class="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h2 class="font-headline-md font-bold text-on-surface">Gói Hội Viên VIP</h2>
      </div>

      <div class="bg-surface-container-lowest rounded-xl shadow-xs border border-primary/20 p-space-lg flex flex-col gap-space-md relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
        
        <div class="flex items-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-[28px]">stars</span>
          </div>
          <div>
            <h3 class="font-title-lg font-bold text-on-surface">Quyền Lợi VIP</h3>
            <p class="font-body-sm text-xs text-on-surface-variant">Truy cập toàn bộ kho tàng audio không giới hạn</p>
          </div>
        </div>

        <ul class="flex flex-col gap-3 mt-2">
          <li class="flex items-center gap-2 text-sm text-on-surface font-medium">
            <span class="material-symbols-outlined text-primary text-[20px]">check_circle</span>
            Mở khóa 100% tất cả các tập truyện.
          </li>
          <li class="flex items-center gap-2 text-sm text-on-surface font-medium">
            <span class="material-symbols-outlined text-primary text-[20px]">check_circle</span>
            Không giới hạn số lần nghe.
          </li>
          <li class="flex items-center gap-2 text-sm text-on-surface font-medium">
            <span class="material-symbols-outlined text-primary text-[20px]">check_circle</span>
            Đồng bộ tiến độ đa nền tảng.
          </li>
        </ul>

        <div class="mt-4 p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col items-center text-center gap-2">
          ${user.membership === 'VIP' ? `
            <span class="material-symbols-outlined text-[40px] text-primary mb-1">workspace_premium</span>
            <span class="font-title-md font-bold text-on-surface">Bạn đã là thành viên VIP!</span>
            <span class="text-xs text-on-surface-variant">Cảm ơn bạn đã đồng hành cùng ứng dụng.</span>
          ` : `
            <span class="font-title-md font-bold text-on-surface">Nâng cấp ngay hôm nay</span>
            <span class="text-xs text-on-surface-variant mb-2">Liên hệ Admin để được cấp quyền VIP. Tính năng thanh toán tự động đang được phát triển.</span>
            <button id="request-vip-btn" class="w-full py-3.5 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary-container hover:text-on-primary-container active:scale-95 transition-all">
              Gửi yêu cầu nâng cấp
            </button>
          `}
        </div>
      </div>
    </div>
  `;

  document.getElementById('request-vip-btn')?.addEventListener('click', () => {
    showToast('Đã gửi yêu cầu đến quản trị viên!', 'success');
  });
}
