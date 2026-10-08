// Trang Chủ (Home View) - Chuẩn Sonic Archive 100%
import { player } from './player.js';

export function renderHome(container, data) {
  const { currentAudio, latestAudios, history, categories } = data;

  // Audio đang nghe hoặc audio gần nhất
  const activeAudio = player.currentAudio || currentAudio;
  const activeEp = (player.currentAudio?.id === activeAudio?.id && player.currentEpisode) 
    ? player.currentEpisode 
    : (activeAudio?.episodes?.[0] || { episodeNumber: 1, title: 'Tập 1' });

  const progressPercent = (player.currentAudio?.id === activeAudio?.id)
    ? Math.min(100, Math.round((player.currentTime / player.duration) * 100))
    : (activeAudio?.progressPercent || 0);

  const formattedPos = (player.currentAudio?.id === activeAudio?.id)
    ? player.formatTime(player.currentTime)
    : (activeAudio?.formattedPosition || "00:00:00");

  container.innerHTML = `
    <div class="flex flex-col w-full px-margin-sm gap-space-lg pb-24">
      <!-- Top Greeting -->
      <div class="flex items-center justify-between pt-space-sm">
        <div class="flex flex-col min-w-0">
          <span class="font-label-md text-label-md text-on-surface-variant">Xin chào,</span>
          <span class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Hôm nay bạn muốn nghe gì?</span>
        </div>
      </div>

      <!-- 1. HERO / TIẾP TỤC NGHE -->
      ${activeAudio ? `
      <section class="flex flex-col gap-space-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-space-xs">
            <span class="material-symbols-outlined text-primary text-[20px]" style="font-variation-settings: 'FILL' 1;">play_circle</span>
            <h2 class="font-title-lg text-title-lg text-on-surface font-semibold">Tiếp tục nghe</h2>
          </div>
          <span class="font-label-sm text-label-sm text-primary font-medium tracking-wide">TẬP HIỆN TẠI</span>
        </div>

        <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-md relative overflow-hidden border border-surface-container/60 hover:shadow-md transition-all">
          <div class="flex gap-space-md">
            <!-- Thumbnail -->
            <div class="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-surface-container shadow-xs cursor-pointer" onclick="location.hash='#/player/${activeAudio.id}'">
              <img src="${activeAudio.thumbnailUrl}" class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              <span class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-xs font-label-sm text-[10px] leading-tight text-on-surface font-semibold">
                TẬP ${String(activeEp.episodeNumber || 1).padStart(2, '0')}
              </span>
            </div>

            <!-- Meta -->
            <div class="flex flex-col justify-between min-w-0 flex-1">
              <div class="flex flex-col">
                <div class="flex items-center gap-space-xs flex-wrap mb-1">
                  <span class="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-[11px] text-primary font-medium">${activeAudio.categoryName || 'Chung'}</span>
                </div>
                <h3 class="font-title-md text-title-md text-on-surface font-bold truncate cursor-pointer hover:text-primary transition-colors" onclick="location.hash='#/player/${activeAudio.id}'">${activeAudio.title}</h3>
                <span class="font-body-sm text-body-sm text-on-surface-variant truncate">Tác giả: ${activeAudio.author || 'Đang cập nhật'}</span>
              </div>
              <div class="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-space-xs">
                <span>${formattedPos}</span>
                <span class="text-on-surface font-medium">${activeAudio.formattedDuration || '04:00:00'}</span>
              </div>
            </div>
          </div>

          <!-- Linear Progress Bar -->
          <div class="flex flex-col gap-1.5">
            <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
              <div class="bg-primary-container h-full rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
            </div>
          </div>

          <!-- Actions Bottom Row -->
          <div class="flex items-center justify-between pt-space-xs border-t border-surface-container/60">
            <button onclick="location.hash='#/player/${activeAudio.id}'" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-md hover:bg-primary-container hover:text-on-primary transition-colors">
              <span class="material-symbols-outlined text-[18px]">queue_music</span>
              <span>Chi tiết & Danh sách tập</span>
            </button>
            <button id="home-play-btn" class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[22px]">${player.isPlaying && player.currentAudio?.id === activeAudio.id ? 'pause' : 'play_arrow'}</span>
            </button>
          </div>
        </div>
      </section>
      ` : `
      <section class="bg-surface-container-lowest rounded-xl p-space-lg text-center flex flex-col items-center gap-space-sm border border-surface-container">
        <span class="material-symbols-outlined text-[48px] text-primary">headphones</span>
        <h3 class="font-title-md font-bold text-on-surface">Thư viện chưa có tác phẩm</h3>
        <p class="font-body-sm text-on-surface-variant max-w-xs">Nhập liên kết YouTube để bắt đầu thưởng thức audio cá nhân hóa đầu tiên của bạn.</p>
        <button onclick="location.hash='#/upload'" class="mt-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-md font-bold shadow-sm flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[18px]">add</span> Nhập link YouTube
        </button>
      </section>
      `}

      <!-- 2. AUDIO MỚI CẬP NHẬT -->
      <section class="flex flex-col gap-space-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-title-lg text-title-lg text-on-surface font-semibold">Mới cập nhật</h2>
          <button onclick="location.hash='#/library'" class="text-xs font-semibold text-primary hover:underline">Xem tất cả</button>
        </div>
        <div class="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
          ${latestAudios?.map(audio => `
            <div class="w-36 flex flex-col gap-2 shrink-0 cursor-pointer" onclick="location.hash='#/player/${audio.id}'">
              <div class="w-full aspect-[3/4] rounded-xl bg-surface-container overflow-hidden shadow-sm relative">
                <img src="${audio.thumbnailUrl}" class="w-full h-full object-cover">
                <div class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white font-code-sm text-[10px]">
                  ${audio.totalEpisodes || 1} tập
                </div>
              </div>
              <div class="flex flex-col">
                <h3 class="font-label-md font-bold text-on-surface line-clamp-2 leading-tight">${audio.title}</h3>
                <span class="font-body-sm text-[11px] text-on-surface-variant truncate">${audio.author || 'Đang cập nhật'}</span>
              </div>
            </div>
          `).join('') || '<span class="text-xs text-outline">Chưa có audio nào</span>'}
        </div>
      </section>

      <!-- 3. Category Carousel -->
      <section class="flex flex-col gap-space-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-title-lg text-title-lg text-on-surface font-semibold">Khám phá theo Thể loại</h2>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          ${categories.map(c => `
            <button onclick="window.dispatchEvent(new CustomEvent('lib-filter-category', { detail: ${c.id} })); location.hash='#/library';" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm font-medium shadow-xs border border-surface-container hover:border-primary/40 hover:text-primary whitespace-nowrap transition-all active:scale-95">
              <span class="material-symbols-outlined text-[16px] text-primary">category</span>
              <span>${c.name}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <!-- 4. Lịch Sử Nghe Gần Đây (Recent History) -->
      ${history && history.length > 0 ? `
      <section class="flex flex-col gap-space-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-title-lg text-title-lg text-on-surface font-semibold">Lịch sử nghe gần đây</h2>
          <span class="font-label-sm text-outline">${history.length} bản ghi</span>
        </div>
        <div class="flex flex-col gap-space-xs">
          ${history.map(item => `
            <div class="bg-surface-container-lowest rounded-xl p-space-sm shadow-xs flex items-center justify-between gap-space-sm hover:shadow-sm transition-all border border-surface-container/40">
              <div class="flex items-center gap-space-sm min-w-0">
                <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span class="material-symbols-outlined text-[20px]">history</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-label-md text-on-surface font-bold truncate">${item.title || item.audioTitle}</span>
                  <span class="font-body-sm text-xs text-on-surface-variant truncate">${item.episodeTitle || 'Tập 1'} • Đã nghe ${Math.round((item.durationListened || 60) / 60)} phút</span>
                </div>
              </div>
              <button onclick="location.hash='#/player/${item.audioId}'" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-primary-container hover:text-on-primary transition-colors shrink-0">
                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
              </button>
            </div>
          `).join('')}
        </div>
      </section>
      ` : ''}
    </div>
  `;

  // Gắn sự kiện nút Play / Pause trên thẻ Hero
  document.getElementById('home-play-btn')?.addEventListener('click', () => {
    if (activeAudio) {
      if (player.currentAudio?.id === activeAudio.id) {
        player.togglePlay();
      } else {
        player.play(activeAudio, activeEp);
      }
    }
  });
}
