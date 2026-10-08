// Tải Lên & Nhập Nguồn YouTube (Upload View) - Chuẩn Sonic Archive 100%
import { api } from './api.js';
import { showToast } from './uiUtils.js';

export function renderUpload(container, categories) {
  let selectedTags = ["Audiobook", "TuTiên", "TrọnBộ"];
  // State
  let currentStep = 1;

  container.innerHTML = `
    <div class="flex flex-col w-full px-margin-sm pb-28">
      <div class="flex flex-col gap-1 pt-space-base pb-space-md">
        <h2 class="font-headline-lg font-bold text-on-surface tracking-tight">Thêm Audio Mới</h2>
        <p class="font-body-sm text-xs text-on-surface-variant">Quy trình 3 bước trích xuất và phân tập tự động.</p>
      </div>

      <!-- Stepper Header -->
      <div class="flex items-center justify-between mb-4 px-2">
        <div class="flex flex-col items-center step-1-nav">
          <div class="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs mb-1">1</div>
          <span class="text-[10px] font-semibold text-primary">Nguồn Media</span>
        </div>
        <div class="flex-1 h-[2px] bg-surface-container mx-2 mt-[-15px]"></div>
        <div class="flex flex-col items-center step-2-nav">
          <div class="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-bold text-xs mb-1">2</div>
          <span class="text-[10px] font-semibold text-on-surface-variant">Phân Tập</span>
        </div>
        <div class="flex-1 h-[2px] bg-surface-container mx-2 mt-[-15px]"></div>
        <div class="flex flex-col items-center step-3-nav">
          <div class="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-bold text-xs mb-1">3</div>
          <span class="text-[10px] font-semibold text-on-surface-variant">Xử Lý</span>
        </div>
      </div>

      <form id="upload-form" class="flex flex-col gap-space-md relative min-h-[300px]">
        
        <!-- STEP 1: INPUT SOURCE & VALIDATE & ANALYZE -->
        <div id="step-1" class="flex flex-col gap-space-md transition-all duration-300">
          <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-sm flex flex-col gap-space-sm border border-surface-container/60">
            <label class="font-label-md font-bold text-on-surface flex items-center justify-between" for="yt-url-input">
              <span>YouTube Video URL <span class="text-error">*</span></span>
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">link</span>
              <input id="yt-url-input" type="text" placeholder="https://www.youtube.com/watch?v=..." class="w-full bg-surface-container-low pl-11 pr-20 py-3 rounded-xl font-body-sm text-on-surface focus:outline-none focus:border-primary border border-transparent transition-all text-sm" required>
              <button id="paste-btn" type="button" class="absolute right-2 px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1 text-xs">
                Dán
              </button>
            </div>
            
            <!-- Validate / Analyze status -->
            <div id="analyze-status" class="hidden items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low text-xs mt-1">
              <span class="material-symbols-outlined text-[16px] animate-spin">sync</span>
              <span>Đang phân tích media...</span>
            </div>

            <!-- Show Media Info -->
            <div id="live-preview-box" class="hidden mt-2 p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-3">
              <img id="preview-thumb" class="w-16 h-20 rounded-lg object-cover bg-surface-container shadow-xs shrink-0">
              <div class="flex flex-col min-w-0 flex-1">
                <span id="preview-title" class="font-title-md font-bold text-on-surface text-sm line-clamp-2"></span>
                <span id="preview-author" class="font-body-sm text-xs text-on-surface-variant truncate mt-1"></span>
              </div>
            </div>
          </div>
          
          <button type="button" id="btn-next-1" class="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold shadow-md opacity-50 pointer-events-none transition-all">
            Tiếp tục: Cấu hình phân tập
          </button>
        </div>

        <!-- STEP 2: CONFIGURE EPISODES -->
        <div id="step-2" class="hidden flex-col gap-space-md transition-all duration-300">
          <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-sm flex flex-col gap-space-sm border border-surface-container/60">
            <div class="flex flex-col gap-1.5">
              <label class="font-label-md font-bold text-on-surface">Thời lượng thực tế (Bắt buộc) <span class="text-error">*</span></label>
              <input id="yt-duration-input" type="text" placeholder="VD: 80880 hoặc 22:28:00" class="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm outline-none focus:border-primary border border-transparent" required>
              <span class="text-[10px] text-on-surface-variant">Dùng để phân chia tập chính xác.</span>
            </div>

            <div class="flex flex-col gap-1.5 mt-3">
              <label class="font-label-md font-bold text-on-surface">Khối phân tách (Block size)</label>
              <select id="block-size-select" class="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm outline-none">
                <option value="14400" selected>4 Giờ / Tập</option>
                <option value="7200">2 Giờ / Tập</option>
                <option value="3600">1 Giờ / Tập</option>
              </select>
            </div>
            
            <div class="flex flex-col gap-1.5 mt-3">
              <label class="font-label-md font-bold text-on-surface">Thể loại</label>
              <select id="category-select" class="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm outline-none">
                ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="flex gap-2">
            <button type="button" id="btn-back-2" class="w-1/3 py-3.5 rounded-xl bg-surface-container font-bold text-on-surface">Quay lại</button>
            <button type="button" id="btn-next-2" class="w-2/3 py-3.5 rounded-xl bg-primary text-on-primary font-bold shadow-md">Tiếp tục: Xử lý</button>
          </div>
        </div>

        <!-- STEP 3: PROCESS & RESULT -->
        <div id="step-3" class="hidden flex-col gap-space-md transition-all duration-300">
          <div class="bg-surface-container-lowest rounded-xl p-space-base shadow-sm flex flex-col items-center justify-center py-10 gap-3 border border-surface-container/60 text-center">
            <div id="process-icon" class="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
            </div>
            <h3 id="process-title" class="font-title-lg font-bold text-on-surface">Đang xử lý dữ liệu...</h3>
            <p id="process-desc" class="font-body-sm text-sm text-on-surface-variant px-4">Hệ thống đang lưu thông tin và phân tách các tập logic. Vui lòng không đóng trang.</p>
          </div>

          <button type="button" id="btn-finish" class="hidden w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold shadow-md">
            Mở trình phát ngay
          </button>
        </div>
      </form>
    </div>
  `;

  const urlInput = document.getElementById('yt-url-input');
  const analyzeStatus = document.getElementById('analyze-status');
  const previewBox = document.getElementById('live-preview-box');
  const btnNext1 = document.getElementById('btn-next-1');
  const btnNext2 = document.getElementById('btn-next-2');
  const btnBack2 = document.getElementById('btn-back-2');
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');

  function updateStepper(step) {
    document.querySelectorAll('[class*="step-"]').forEach(el => {
      if (el.className.includes(`step-${step}-nav`)) {
        el.querySelector('div').className = 'w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs mb-1';
        el.querySelector('span').className = 'text-[10px] font-semibold text-primary';
      } else {
        el.querySelector('div').className = 'w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-bold text-xs mb-1';
        el.querySelector('span').className = 'text-[10px] font-semibold text-on-surface-variant';
      }
    });
  }

  // STEP 1 LOGIC
  async function triggerAnalyze(url) {
    const vId = api.extractVideoId(url);
    if (!vId) {
      previewBox.classList.add('hidden');
      btnNext1.classList.add('opacity-50', 'pointer-events-none');
      return;
    }
    
    analyzeStatus.classList.remove('hidden');
    analyzeStatus.classList.add('flex');
    previewBox.classList.add('hidden');
    btnNext1.classList.add('opacity-50', 'pointer-events-none');

    previewData = await api.previewYouTube(url);
    
    analyzeStatus.classList.add('hidden');
    analyzeStatus.classList.remove('flex');

    if (previewData) {
      document.getElementById('preview-thumb').src = previewData.thumbnailUrl;
      document.getElementById('preview-title').textContent = previewData.title;
      document.getElementById('preview-author').textContent = previewData.author || "YouTube Channel";
      previewBox.classList.remove('hidden');
      btnNext1.classList.remove('opacity-50', 'pointer-events-none');
    }
  }

  urlInput?.addEventListener('input', (e) => {
    triggerAnalyze(e.target.value.trim());
  });

  document.getElementById('paste-btn')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlInput.value = text;
      triggerAnalyze(text.trim());
    } catch (e) {
      showToast("Hãy dán trực tiếp vào ô nhập", 'info');
    }
  });

  btnNext1.addEventListener('click', () => {
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    step2.classList.add('flex');
    updateStepper(2);
  });

  // STEP 2 LOGIC
  btnBack2.addEventListener('click', () => {
    step2.classList.add('hidden');
    step2.classList.remove('flex');
    step1.classList.remove('hidden');
    updateStepper(1);
  });

  function parseDuration(val) {
    if (!isNaN(val)) return parseInt(val);
    const parts = val.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  let finalAudioId = null;

  btnNext2.addEventListener('click', async () => {
    const durationStr = document.getElementById('yt-duration-input').value.trim();
    const durationSeconds = parseDuration(durationStr);
    if (!durationSeconds || durationSeconds <= 0) {
      showToast("Vui lòng nhập thời lượng hợp lệ!", 'error');
      return;
    }

    step2.classList.add('hidden');
    step2.classList.remove('flex');
    step3.classList.remove('hidden');
    step3.classList.add('flex');
    updateStepper(3);

    // Bắt đầu xử lý (PROCESS)
    const url = urlInput.value.trim();
    const catId = document.getElementById('category-select').value;
    const blockSize = parseInt(document.getElementById('block-size-select').value) || 14400;

    try {
      const res = await api.importYouTube(url, catId, ["Imported"], blockSize, durationSeconds);
      
      // SUCCESS STATE
      document.getElementById('process-icon').className = 'w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center mb-2';
      document.getElementById('process-icon').innerHTML = '<span class="material-symbols-outlined text-[32px]">check_circle</span>';
      document.getElementById('process-title').textContent = res.duplicate ? "Audio đã tồn tại!" : "Xử lý thành công!";
      document.getElementById('process-desc').textContent = "Hệ thống đã phân tách tập và lưu trữ hoàn tất.";
      
      finalAudioId = res.audio.id;
      const finishBtn = document.getElementById('btn-finish');
      finishBtn.classList.remove('hidden');
      finishBtn.addEventListener('click', () => {
        location.hash = `#/player/${finalAudioId}`;
      });

    } catch (err) {
      // ERROR STATE
      document.getElementById('process-icon').className = 'w-16 h-16 rounded-full bg-error/20 text-error flex items-center justify-center mb-2';
      document.getElementById('process-icon').innerHTML = '<span class="material-symbols-outlined text-[32px]">error</span>';
      document.getElementById('process-title').textContent = "Lỗi xử lý";
      document.getElementById('process-desc').textContent = err.message || "Đã có lỗi xảy ra trong quá trình nhập dữ liệu.";
      
      const retryBtn = document.getElementById('btn-finish');
      retryBtn.classList.remove('hidden');
      retryBtn.classList.replace('bg-primary', 'bg-surface-container');
      retryBtn.classList.replace('text-on-primary', 'text-on-surface');
      retryBtn.textContent = "Thử lại";
      retryBtn.addEventListener('click', () => {
        step3.classList.add('hidden');
        step3.classList.remove('flex');
        step2.classList.remove('hidden');
        step2.classList.add('flex');
        updateStepper(2);
      }, {once: true});
    }
  });
}
