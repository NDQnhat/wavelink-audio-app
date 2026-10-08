// Trình Phát Chi Tiết (Detail Player View) - Chuẩn Sonic Archive 100%
import { api } from './api.js';
import { player } from './player.js';
import { showToast, showModal } from './uiUtils.js';

export function renderDetailPlayer(container, audio) {
  if (!audio) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-center gap-3">
        <span class="material-symbols-outlined text-[48px] text-outline">audio_file</span>
        <h3 class="font-title-lg font-bold text-on-surface">Không tìm thấy bản ghi audio</h3>
        <button onclick="location.hash='#/library'" class="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold">Về thư viện</button>
      </div>
    `;
    return;
  }

  // Nếu player đang phát đúng bài này thì đồng bộ trạng thái tập hiện tại
  const isTargetAudioPlaying = player.currentAudio?.id == audio.id;
  const currentEp = isTargetAudioPlaying && player.currentEpisode 
    ? player.currentEpisode 
    : (audio.episodes && audio.episodes.length > 0 ? audio.episodes[0] : { id: 1, episodeNumber: 1, title: 'Tập 1', startSeconds: 0, endSeconds: 14400, duration: 14400 });

  const episodeDuration = currentEp.duration || (currentEp.endSeconds - currentEp.startSeconds) || 14400;
  const currentPosition = isTargetAudioPlaying ? player.currentTime : (audio.lastPositionSeconds || 0);
  const currentPercent = Math.min(100, Math.round((currentPosition / episodeDuration) * 100));

  container.innerHTML = `
    <div class="flex flex-col w-full pb-32 space-y-space-base px-margin-sm">
      <!-- Top Action & Navigation Sub-bar -->
      <div class="flex items-center justify-between py-space-xs">
        <button onclick="history.back()" class="flex items-center gap-1 text-secondary font-label-lg active:scale-95 transition-transform" aria-label="Quay lại">
          <span class="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
          <span>Quay lại</span>
        </button>
        <div class="flex items-center gap-space-sm">
          <button id="player-share-btn" class="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors" title="Chia sẻ">
            <span class="material-symbols-outlined text-[20px]">share</span>
          </button>
          <button id="player-fav-btn" class="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-error transition-transform active:scale-125" title="Yêu thích">
            <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' ${audio.isFavorite ? '1' : '0'};">favorite</span>
          </button>
        </div>
      </div>

      <!-- Artwork & Presentation Card -->
      <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-sm flex flex-col gap-space-md border border-surface-container/60">
        <div class="relative w-full aspect-[16/10] rounded-xl overflow-hidden shadow-inner bg-surface-container">
          <img class="w-full h-full object-cover" src="${audio.thumbnailUrl}" alt="${audio.title}">
          <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-transparent to-transparent"></div>
          
          <!-- Live Status Badge -->
          <div class="absolute top-3 left-3 bg-primary-container text-on-primary font-label-sm px-space-sm py-1 rounded-full flex items-center gap-1.5 shadow-md">
            <span class="w-2 h-2 rounded-full bg-white ${isTargetAudioPlaying && player.isPlaying ? 'animate-ping' : ''}"></span>
            <span class="font-bold text-[11px]">${isTargetAudioPlaying && player.isPlaying ? 'ĐANG PHÁT' : 'SẴN SÀNG'}</span>
          </div>

          <!-- Quick Episode Tag Bottom Left -->
          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-on-primary">
            <span class="font-label-md bg-inverse-surface/70 backdrop-blur-md px-space-sm py-0.5 rounded text-xs font-semibold truncate max-w-[200px]">${currentEp.title}</span>
            <span class="font-code-sm text-[11px] text-surface-container-highest">YouTube Stream • Lossless HD</span>
          </div>
        </div>

        <!-- Title & Author Information -->
        <div class="flex flex-col gap-1">
          <h2 class="font-headline-lg font-bold text-on-surface leading-tight">${audio.title}</h2>
          <p class="font-body-md text-on-surface-variant flex items-center gap-1.5 text-xs">
            <span>Tác giả: <strong>${audio.author || 'Chưa rõ'}</strong></span>
            <span class="text-outline">•</span>
            <span>Kênh: <strong>${audio.channel || 'Official'}</strong></span>
          </p>
          <div class="flex flex-wrap items-center gap-space-xs mt-1">
            <span class="font-label-sm bg-primary-fixed text-on-primary-fixed-variant px-space-sm py-0.5 rounded-full font-semibold">${audio.categoryName || 'Chung'}</span>
            <span class="font-label-sm bg-surface-container text-on-surface-variant px-space-sm py-0.5 rounded-full font-medium">${audio.formattedDuration || '24h 00m'}</span>
            <span class="font-label-sm bg-secondary-fixed text-on-secondary-fixed-variant px-space-sm py-0.5 rounded-full font-medium">${audio.totalEpisodes || audio.episodes?.length || 1} tập</span>
          </div>
        </div>
      </div>

      <!-- Resume Quick Shortcut -->
      <div class="bg-surface-container-low rounded-xl p-space-sm shadow-sm flex items-center justify-between gap-space-sm border border-surface-container/60">
        <div class="flex items-center gap-space-sm min-w-0">
          <div class="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
            <span class="material-symbols-outlined text-[20px]">history</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-sm text-on-surface-variant text-[11px]">Lần nghe gần nhất</span>
            <span class="font-label-md text-on-surface truncate text-xs">Tiếp tục từ <strong>${audio.formattedPosition || '00:00:00'}</strong> của Tập ${audio.currentEpisodeNumber || 1}</span>
          </div>
        </div>
        <button id="player-resume-shortcut" class="bg-primary text-on-primary font-label-md text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition-transform shrink-0">
          <span class="material-symbols-outlined text-[16px]">play_arrow</span>
          <span>Phát ngay</span>
        </button>
      </div>

      <!-- Dedicated Player Console -->
      <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-sm flex flex-col gap-space-md border border-surface-container/60">
        <!-- State & Sync Indicator -->
        <div class="flex items-center justify-between text-body-sm">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="material-symbols-outlined text-primary text-[20px] shrink-0">equalizer</span>
            <span class="font-label-md font-bold text-on-surface truncate">${currentEp.title}</span>
          </div>
          <div class="flex items-center gap-1 text-on-tertiary-fixed-variant bg-tertiary-container/15 px-2 py-0.5 rounded font-code-sm text-[11px] shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
            <span>Đồng bộ 60s tự động</span>
          </div>
        </div>

        <!-- Waveform Simulation with reactive heights -->
        <div class="flex items-end justify-between h-9 px-1 gap-1 select-none" id="waveform-container">
          ${[4, 6, 8, 5, 9, 7, 4, 8, 6, 9, 5, 7, 3, 6, 8, 5, 7, 4, 6, 8, 5, 9].map((h, i) => `
            <div class="waveform-bar w-1.5 rounded-full transition-all duration-300 ${
              (i / 22) * 100 <= currentPercent ? 'bg-primary' : 'bg-surface-container-high'
            } ${isTargetAudioPlaying && player.isPlaying ? 'animate-pulse' : ''}" style="height: ${h * 3.5}px"></div>
          `).join('')}
        </div>

        <!-- Timeline Slider -->
        <div class="relative w-full flex items-center my-0.5">
          <input 
            type="range" 
            id="audio-slider" 
            min="0" 
            max="100" 
            value="${currentPercent}" 
            class="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary">
        </div>

        <!-- Time Indicators -->
        <div class="flex items-center justify-between font-code-sm text-xs text-on-surface-variant">
          <span id="current-time-label">${player.formatTime(currentPosition)}</span>
          <span id="detail-percent-label" class="text-outline">Đã nghe ${currentPercent}%</span>
          <span>${player.formatTime(episodeDuration)}</span>
        </div>

        <!-- Main Playback Controls Bar -->
        <div class="flex items-center justify-between pt-1">
          <!-- Speed Toggle -->
          <button id="btn-speed-toggle" class="h-9 px-3 rounded-full bg-surface-container text-on-surface font-code-sm text-xs font-bold hover:bg-surface-container-high active:scale-95 transition-all" title="Tốc độ phát">
            ${player.playbackRate}x
          </button>

          <!-- Rewind 15s -->
          <button id="btn-rewind-15" class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all active:scale-90" title="Tua lùi 15s">
            <span class="material-symbols-outlined text-[26px]">replay_10</span>
          </button>

          <!-- Master Play / Pause -->
          <button id="btn-master-play" class="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:bg-primary-container active:scale-90 transition-all" title="Phát / Tạm dừng">
            <span class="material-symbols-outlined text-[32px]">${isTargetAudioPlaying && player.isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>

          <!-- Forward 30s -->
          <button id="btn-forward-30" class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all active:scale-90" title="Tua tới 30s">
            <span class="material-symbols-outlined text-[26px]">forward_30</span>
          </button>

          <!-- Sleep Timer -->
          <button id="btn-sleep-timer" class="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center hover:text-on-surface hover:bg-surface-container-high transition-all active:scale-95 ${player.sleepTimerMinutes ? 'text-primary bg-primary-fixed' : ''}" title="Hẹn giờ ngủ">
            <span class="material-symbols-outlined text-[20px]">bedtime</span>
          </button>
        </div>
      </div>

      <!-- Episodes Management List -->
      <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-sm flex flex-col gap-space-md border border-surface-container/60">
        <div class="flex items-center justify-between pb-2 border-b border-surface-container">
          <div>
            <h3 class="font-headline-md font-bold text-on-surface">Danh sách tập</h3>
            <span class="font-body-sm text-xs text-on-surface-variant">${audio.episodes?.length || 0} tập logic • Khối 4 giờ</span>
          </div>
          <span class="px-2.5 py-1 rounded-lg bg-surface-container font-label-sm text-xs font-semibold text-secondary">
            Chuẩn ToS YouTube
          </span>
        </div>

        <!-- Episode Rows -->
        <div class="flex flex-col gap-1.5" id="detail-episodes-list">
          ${(audio.episodes || []).map(ep => {
            const isThisEpActive = isTargetAudioPlaying && player.currentEpisode?.id === ep.id;
            const isCompleted = ep.completed || ep.progressPercent >= 95;
            const isLocked = ep.isLocked;
            return `
              <div data-ep-id="${ep.id}" class="ep-row flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                isThisEpActive 
                  ? 'bg-primary-fixed/40 border border-primary/20 shadow-xs' 
                  : isLocked
                  ? 'bg-surface-container-lowest border border-surface-container/30 opacity-60'
                  : 'hover:bg-surface-container-low border border-transparent'
              }">
                <div class="flex items-center gap-space-sm min-w-0">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isThisEpActive 
                      ? 'bg-primary text-on-primary animate-pulse shadow-xs' 
                      : isLocked
                      ? 'bg-surface-container text-on-surface-variant'
                      : isCompleted 
                      ? 'bg-tertiary-container/15 text-tertiary-container' 
                      : 'bg-surface-container text-on-surface-variant'
                  }">
                    <span class="material-symbols-outlined text-[18px]">
                      ${isThisEpActive ? 'graphic_eq' : isLocked ? 'lock' : isCompleted ? 'check' : 'play_arrow'}
                    </span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-label-md font-bold truncate ${isThisEpActive ? 'text-primary' : 'text-on-surface'}">
                      ${ep.title}
                    </span>
                    <span class="font-code-sm text-[11px] text-on-surface-variant truncate">
                      ${isLocked ? 'Cần nâng cấp VIP' : (player.formatTime(ep.startSeconds) + ' - ' + player.formatTime(ep.endSeconds) + ' • ' + (ep.progressPercent || 0) + '%')}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <span class="font-label-sm text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    isThisEpActive 
                      ? 'bg-primary-container text-on-primary' 
                      : isLocked
                      ? 'bg-surface-container text-error'
                      : isCompleted 
                      ? 'bg-tertiary-container/15 text-tertiary-container' 
                      : 'bg-surface-container text-outline'
                  }">
                    ${isThisEpActive ? 'Đang phát' : isLocked ? 'VIP' : isCompleted ? 'Đã xong' : 'Chưa nghe'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // --- ATTACH EVENT LISTENERS ---

  // 1. Play / Pause Master
  document.getElementById('btn-master-play')?.addEventListener('click', () => {
    if (isTargetAudioPlaying) {
      player.togglePlay();
    } else {
      player.play(audio, currentEp);
    }
  });

  // 2. Resume shortcut
  document.getElementById('player-resume-shortcut')?.addEventListener('click', () => {
    const epNum = audio.currentEpisodeNumber || 1;
    const targetEp = audio.episodes?.find(e => e.episodeNumber === epNum) || audio.episodes?.[0];
    player.play(audio, targetEp, audio.lastPositionSeconds || 0);
  });

  // 3. Timeline Slider scrubbing
  const slider = document.getElementById('audio-slider');
  slider?.addEventListener('input', (e) => {
    const percent = parseFloat(e.target.value);
    const targetPos = Math.round((percent / 100) * episodeDuration);
    const label = document.getElementById('current-time-label');
    if (label) label.textContent = player.formatTime(targetPos);
  });

  slider?.addEventListener('change', (e) => {
    const percent = parseFloat(e.target.value);
    const targetPos = Math.round((percent / 100) * episodeDuration);
    if (isTargetAudioPlaying) {
      player.seekTo(targetPos);
    } else {
      player.play(audio, currentEp, targetPos);
    }
  });

  // 4. Rewind & Forward
  document.getElementById('btn-rewind-15')?.addEventListener('click', () => {
    if (isTargetAudioPlaying) player.skipSeconds(-15);
    else player.play(audio, currentEp, Math.max(0, currentPosition - 15));
  });

  document.getElementById('btn-forward-30')?.addEventListener('click', () => {
    if (isTargetAudioPlaying) player.skipSeconds(30);
    else player.play(audio, currentEp, currentPosition + 30);
  });

  // 5. Speed Toggle
  document.getElementById('btn-speed-toggle')?.addEventListener('click', () => {
    player.cycleSpeed();
    const btn = document.getElementById('btn-speed-toggle');
    if (btn) btn.textContent = `${player.playbackRate}x`;
  });

  // 6. Sleep Timer Dialog
  document.getElementById('btn-sleep-timer')?.addEventListener('click', () => {
    showModal({
      title: 'Hẹn Giờ Tắt Nhạc',
      content: `
        <div class="flex flex-col gap-2">
          <p class="text-xs text-on-surface-variant">Chọn thời gian để tự động tạm dừng trình phát:</p>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <button class="timer-opt-btn p-3 rounded-xl border border-surface-container font-semibold hover:border-primary hover:text-primary transition-all text-sm" data-mins="15">15 phút</button>
            <button class="timer-opt-btn p-3 rounded-xl border border-surface-container font-semibold hover:border-primary hover:text-primary transition-all text-sm" data-mins="30">30 phút</button>
            <button class="timer-opt-btn p-3 rounded-xl border border-surface-container font-semibold hover:border-primary hover:text-primary transition-all text-sm" data-mins="45">45 phút</button>
            <button class="timer-opt-btn p-3 rounded-xl border border-surface-container font-semibold hover:border-primary hover:text-primary transition-all text-sm" data-mins="60">60 phút</button>
          </div>
          ${player.sleepTimerMinutes ? `
            <button id="cancel-timer-btn" class="mt-2 py-2 rounded-xl bg-error/10 text-error font-semibold text-xs">Hủy hẹn giờ hiện tại (${player.sleepTimerMinutes}m)</button>
          ` : ''}
        </div>
      `,
      confirmText: 'Đóng',
      onConfirm: () => true
    });

    document.querySelectorAll('.timer-opt-btn').forEach(b => {
      b.addEventListener('click', () => {
        const mins = parseInt(b.getAttribute('data-mins'));
        player.setSleepTimer(mins);
        document.getElementById('modal-close-btn')?.click();
      });
    });

    document.getElementById('cancel-timer-btn')?.addEventListener('click', () => {
      player.setSleepTimer(0);
      document.getElementById('modal-close-btn')?.click();
    });
  });

  // 7. Favorite toggle
  document.getElementById('player-fav-btn')?.addEventListener('click', async () => {
    const isFav = await api.toggleFavorite(audio.id, audio.isFavorite);
    audio.isFavorite = isFav;
    const icon = document.querySelector('#player-fav-btn .material-symbols-outlined');
    if (icon) icon.style.fontVariationSettings = `'FILL' ${isFav ? '1' : '0'}`;
    showToast(isFav ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ yêu thích', 'info');
  });

  // 8. Share button
  document.getElementById('player-share-btn')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({
        title: audio.title,
        text: `Đang nghe truyện ${audio.title} trên YouTube Audio Library`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Đã sao chép liên kết vào bộ nhớ tạm', 'success');
    }
  });

  // 9. Episode Row click to play
  document.querySelectorAll('.ep-row').forEach(row => {
    row.addEventListener('click', () => {
      const epId = row.getAttribute('data-ep-id');
      const targetEp = audio.episodes?.find(e => e.id == epId);
      if (targetEp) {
        if (targetEp.isLocked) {
          showToast('Tập này yêu cầu tài khoản VIP. Vui lòng nâng cấp!', 'error');
          return;
        }
        player.play(audio, targetEp, 0);
        showToast(`Đang phát ${targetEp.title}`, 'info');
      }
    });
  });
}
