// Thư Viện & Tìm Kiếm (Library View) - Chuẩn Sonic Archive 100%
import { api } from './api.js';
import { player } from './player.js';
import { showToast } from './uiUtils.js';

export function renderLibrary(container, data) {
  const { audios, categories, tags, activeCategory, currentSearch, activeStatus = 'all' } = data;

  container.innerHTML = `
    <div class="flex flex-col w-full px-margin-sm pb-28 gap-space-md pt-space-xs">
      <!-- Search Bar -->
      <div class="relative w-full">
        <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px] pointer-events-none">search</span>
        <input 
          id="lib-search-input" 
          type="text" 
          placeholder="Tìm theo tên truyện, tác giả, video ID, thẻ tag..." 
          value="${currentSearch || ''}" 
          class="w-full bg-surface-container-lowest text-on-surface pl-11 pr-10 py-3 rounded-xl shadow-xs border border-surface-container text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
        ${currentSearch ? `
          <button id="lib-clear-search-btn" class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-full">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        ` : ''}
      </div>

      <!-- Categories Filter Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button 
          data-cat-id="all" 
          class="cat-filter-btn px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${!activeCategory ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface border border-surface-container hover:bg-surface-container-low'}">
          Tất cả
        </button>
        ${categories.map(c => `
          <button 
            data-cat-id="${c.id}" 
            class="cat-filter-btn px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${activeCategory == c.id ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface border border-surface-container hover:bg-surface-container-low'}">
            ${c.name}
          </button>
        `).join('')}
      </div>

      <!-- Secondary Filter & Sort Toolbar -->
      <div class="flex items-center justify-between gap-2 text-xs">
        <!-- Status chips -->
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button data-status="all" class="status-chip px-2.5 py-1 rounded-lg ${activeStatus === 'all' ? 'bg-surface-container font-bold text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}">Tất cả (${audios.length})</button>
          <button data-status="listening" class="status-chip px-2.5 py-1 rounded-lg ${activeStatus === 'listening' ? 'bg-surface-container font-bold text-secondary' : 'text-on-surface-variant hover:bg-surface-container-low'}">Đang nghe</button>
          <button data-status="completed" class="status-chip px-2.5 py-1 rounded-lg ${activeStatus === 'completed' ? 'bg-surface-container font-bold text-tertiary-container' : 'text-on-surface-variant hover:bg-surface-container-low'}">Hoàn thành</button>
          <button data-status="favorite" class="status-chip px-2.5 py-1 rounded-lg ${activeStatus === 'favorite' ? 'bg-surface-container font-bold text-error' : 'text-on-surface-variant hover:bg-surface-container-low'}">Yêu thích</button>
        </div>

        <!-- Sort Select -->
        <div class="relative shrink-0">
          <select id="lib-sort-select" class="appearance-none bg-surface-container-lowest pl-2.5 pr-6 py-1 rounded-lg border border-surface-container text-xs text-on-surface font-medium outline-none">
            <option value="newest">Mới nhất</option>
            <option value="duration">Thời lượng dài</option>
            <option value="progress">Tiến độ cao</option>
          </select>
          <span class="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">expand_more</span>
        </div>
      </div>

      <!-- Tag Clouds (Quick tags) -->
      ${tags && tags.length > 0 ? `
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        ${tags.slice(0, 8).map(t => `
          <button onclick="window.dispatchEvent(new CustomEvent('lib-search', { detail: '${t.name}' }))" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant hover:text-primary text-[11px] font-medium transition-colors">
            #${t.name}
          </button>
        `).join('')}
      </div>
      ` : ''}

      <!-- Audio Cards Grid / List -->
      <div class="flex flex-col gap-space-sm" id="lib-audio-list">
        ${audios.length === 0 ? `
          <div class="bg-surface-container-lowest rounded-xl p-space-xl text-center flex flex-col items-center gap-2 border border-surface-container my-4">
            <span class="material-symbols-outlined text-[48px] text-outline">search_off</span>
            <h3 class="font-title-md font-bold text-on-surface">Không tìm thấy Audio phù hợp</h3>
            <p class="font-body-sm text-on-surface-variant">Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.</p>
            <button onclick="window.dispatchEvent(new CustomEvent('lib-filter-category', { detail: null })); window.dispatchEvent(new CustomEvent('lib-search', { detail: '' }));" class="mt-2 px-4 py-2 rounded-xl bg-surface-container text-primary font-label-md font-semibold">
              Xóa tất cả bộ lọc
            </button>
          </div>
        ` : audios.map(a => {
          const isCurrentlyPlaying = player.isPlaying && player.currentAudio?.id === a.id;
          return `
            <div class="bg-surface-container-lowest rounded-xl p-space-sm shadow-xs border border-surface-container/60 hover:shadow-md transition-all flex flex-col gap-space-xs relative group">
              <div class="flex items-start gap-space-sm">
                <!-- Thumbnail -->
                <div class="relative w-20 h-24 rounded-lg overflow-hidden shrink-0 bg-surface-container shadow-xs cursor-pointer" onclick="location.hash='#/player/${a.id}'">
                  <img src="${a.thumbnailUrl}" class="w-full h-full object-cover">
                  ${isCurrentlyPlaying ? `
                    <div class="absolute inset-0 bg-primary/40 backdrop-blur-xs flex items-center justify-center">
                      <span class="material-symbols-outlined text-white text-[24px] animate-pulse">equalizer</span>
                    </div>
                  ` : ''}
                  <span class="absolute bottom-1 left-1 px-1 rounded bg-black/60 font-code-sm text-[9px] text-white">
                    ${a.totalEpisodes} Tập
                  </span>
                </div>

                <!-- Info -->
                <div class="flex flex-col justify-between min-w-0 flex-1 h-24 py-0.5">
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center justify-between gap-1">
                      <span class="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-[10px] text-primary font-semibold truncate max-w-[140px]">${a.categoryName}</span>
                      <button data-fav-id="${a.id}" class="lib-fav-toggle w-7 h-7 flex items-center justify-center rounded-full text-error hover:bg-error-container/20 transition-colors" title="Yêu thích">
                        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' ${a.isFavorite ? '1' : '0'};">favorite</span>
                      </button>
                    </div>
                    <h3 class="font-title-md font-bold text-on-surface truncate cursor-pointer hover:text-primary transition-colors mt-0.5" onclick="location.hash='#/player/${a.id}'">${a.title}</h3>
                    <p class="font-body-sm text-xs text-on-surface-variant truncate">Tác giả: ${a.author || 'Đang cập nhật'} • ${a.channel || ''}</p>
                  </div>

                  <div class="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-surface-container/40">
                    <span class="font-code-sm text-[11px]">${a.formattedDuration || '24h 00m'}</span>
                    <span class="font-semibold ${a.progressPercent >= 100 ? 'text-tertiary-container' : a.progressPercent > 0 ? 'text-primary' : 'text-outline'}">
                      ${a.progressPercent >= 100 ? 'Đã xong' : a.progressPercent > 0 ? `Tiến độ ${a.progressPercent}%` : 'Chưa nghe'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Progress bar & Action Bar -->
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-surface-container/30">
                <div class="w-full bg-surface-container h-1 rounded-full overflow-hidden flex-1">
                  <div class="bg-primary-container h-full rounded-full" style="width: ${a.progressPercent}%"></div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="location.hash='#/player/${a.id}'" class="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:text-primary text-xs font-semibold flex items-center gap-1 transition-colors">
                    <span class="material-symbols-outlined text-[15px]">list</span> Tập
                  </button>
                  <button data-play-id="${a.id}" class="lib-play-card-btn px-3 py-1 rounded-lg bg-primary-container text-on-primary text-xs font-bold shadow-xs hover:bg-primary flex items-center gap-1 transition-all active:scale-95">
                    <span class="material-symbols-outlined text-[16px]">${isCurrentlyPlaying ? 'pause' : 'play_arrow'}</span>
                    <span>${isCurrentlyPlaying ? 'Dừng' : 'Nghe'}</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Search input debounce 300ms
  let searchTimeout = null;
  const searchInput = document.getElementById('lib-search-input');
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('lib-search', { detail: e.target.value.trim() }));
    }, 300);
  });

  document.getElementById('lib-clear-search-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('lib-search', { detail: '' }));
  });

  // Filter Categories buttons
  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-cat-id');
      const detail = catId === 'all' ? null : parseInt(catId);
      window.dispatchEvent(new CustomEvent('lib-filter-category', { detail }));
    });
  });

  // Filter Status chips
  document.querySelectorAll('.status-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const st = btn.getAttribute('data-status');
      window.dispatchEvent(new CustomEvent('lib-filter-status', { detail: st }));
    });
  });

  // Favorite toggle buttons
  document.querySelectorAll('.lib-fav-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const aId = btn.getAttribute('data-fav-id');
      const isFav = await api.toggleFavorite(aId);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.style.fontVariationSettings = `'FILL' ${isFav ? 1 : 0}`;
      }
      showToast(isFav ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ yêu thích', 'info');
    });
  });

  // Direct Play buttons
  document.querySelectorAll('.lib-play-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const aId = btn.getAttribute('data-play-id');
      const targetAudio = audios.find(a => a.id == aId);
      if (targetAudio) {
        if (player.currentAudio?.id == aId) {
          player.togglePlay();
        } else {
          player.play(targetAudio);
        }
      }
    });
  });
}
