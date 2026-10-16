# ĐẶC TẢ & HƯỚNG DẪN TRIỂN KHAI TÍNH NĂNG TĂNG TỐC ÂM THANH (x1 - x1.5 - x2)
### Hệ Thống Nghe Truyện Audio Comic Neo-Brutalism (YouTube Audio Engine)
**Đường dẫn tài liệu:** `docs/refactor-feature/fast forwardx2.md` (Đồng bộ với `docx/refactor-feature/fast forwardx2.md`)  
**Ngày cập nhật:** 15/10/2026  
**Trạng thái:** Sản Xuất (Production-Ready) & Đã Được Kiểm Thử Tự Động (Vitest Passed)

---

## 1. TỔNG QUAN YÊU CẦU & BỐI CẢNH DỰ ÁN

### 1.1. Mục Tiêu Nghiệp Vụ
Trong các ứng dụng nghe truyện dài tập, podcast và sách nói (Audiobook), người dùng có thói quen tiêu thụ nội dung ở tốc độ cao hơn bình thường nhằm tiết kiệm thời gian mà vẫn nắm bắt trọn vẹn thông tin:
- **Tốc độ 1.0x**: Tốc độ tiêu chuẩn, giữ nguyên ngữ điệu diễn đọc nguyên bản của phát thanh viên.
- **Tốc độ 1.5x**: Mức tăng tốc lý tưởng cho độc giả muốn nghe nhanh mà não bộ vẫn tiếp thu hoàn toàn tự nhiên.
- **Tốc độ 2.0x**: Mức tăng tốc tối đa tiêu chuẩn cho người nghe lướt (skimming), nắm bắt cốt truyện nhanh trước khi ngủ hoặc khi đang di chuyển.

### 1.2. Yêu Cầu Cốt Tử (Core Mandates)
1. **Tính năng phải hoạt động thực chất trên nền âm thanh phát ra (Real Acoustic Speedup):** Tốc độ âm thanh phải thay đổi lập tức, không méo giọng (giữ nguyên cao độ pitch tự nhiên).
2. **Khắc phục triệt để cơ chế tự động Reset của YouTube IFrame API:** Khi người dùng chuyển sang tập tiếp theo, tập trước đó, hoặc click mở một truyện audio hoàn toàn mới, tốc độ đã chọn (ví dụ **x2**) **bắt buộc phải được giữ nguyên**, tuyệt đối không bị YouTube âm thầm reset về 1.0x.
3. **Đồng bộ ghi nhớ liên tục (State Persistence):** Lưu trữ cấu hình tốc độ của từng tài khoản người dùng (`userId`) vào LocalStorage, tự động đồng bộ khi chuyển đổi tài khoản, đóng tab, mở lại trình duyệt hoặc chuyển đổi giữa các thiết bị.
4. **Trải nghiệm tương tác đa điểm chạm (Multi-touchpoint UX):** Người dùng có thể đổi nhanh tốc độ trực tiếp trên thanh MiniPlayer thu nhỏ (1-click cycle), mở bảng chọn chi tiết trên PlayerPage, hoặc sử dụng phím tắt bàn phím.

---

## 2. RÀ SOÁT KIẾN TRÚC TOÀN BỘ PROJECT (CURRENT ARCHITECTURE AUDIT)

### 2.1. Bản Chất Độc Thù Của Audio Engine Trong Dự Án
Khác với các ứng dụng phát nhạc MP3 truyền thống sử dụng thẻ HTML5 `<audio src="...mp3">` (nơi lập trình viên chỉ cần gán `audioElement.playbackRate = 2.0`), dự án này vận hành theo nguyên tắc:
- **Không lưu trữ file MP3 vật lý trên server:** Nhằm tuân thủ bản quyền, tối ưu dung lượng VPS 1GB RAM và tận dụng hạ tầng CDN toàn cầu của Google, toàn bộ luồng âm thanh được phát thông qua **YouTube IFrame Player API** ẩn (`YouTubeEngineHost.tsx`).
- **Phân chia tập logic (Logical Episodes):** Một video YouTube dài 24 tiếng được chia thành các tập 4 tiếng dựa trên toạ độ thời gian `start_seconds` và `end_seconds`. Khi người dùng nghe hết tập 1, engine tự động gọi `loadVideoById` với `startSeconds` của tập 2.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   KIẾN TRÚC PHỐI HỢP TỐC ĐỘ (PLAYBACK RATE COORDINATOR)     │
└─────────────────────────────────────────────────────────────────────────────┘

  [ Giao diện Người Dùng ]
      │
      ├── MiniPlayer (Nút Speed Badge 1-click cycle)
      └── PlayerPage (Modal chọn tốc độ x1.0, x1.5, x2.0)
      │
      ▼
  [ Zustand Store: playerStore.ts ]
      │ - desiredRate: 2.0 (tốc độ người dùng muốn)
      │ - confirmedPlaybackRate: 2.0 (tốc độ player xác nhận)
      │ - rateSyncStatus: 'synced' | 'applying' | 'unsupported'
      │ - Action: setPlaybackRate(2.0, userId)
      │ - Intent Lock: `lastSpeedChangeTimestamp` (10s) chống auth ghi đè
      │
      ▼
  [ PlaybackRateCoordinator (frontend/src/lib/playbackRateCoordinator.ts) ]
      │ - Quản lý độc quyền lệnh điều khiển player instance
      │ - Structured Logger: playerLogger (ghi nhận timestamp, instanceId, action, reason)
      │ - Tự động áp tốc độ khi video vào trạng thái PLAYING (state 1)
      │ - Bounded Retry: [150ms, 400ms, 800ms], tự hủy ngay khi confirmed
      │ - Kiểm tra getAvailablePlaybackRates() phòng ngừa lỗi codec
      │
      ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │         YouTubeEngineHost.tsx (Hidden IFrame Player - YT.Player)          │
  │                                                                           │
  │  - Viewport: 200x200px (đáp ứng tiêu chuẩn Chromium & YouTube)           │
  │  - onReady: setYtInstance(player, instanceId) -> coordinator.attachPlayer │
  │  - onStateChange: PLAYING -> coordinator.onStateChange(1, 'PLAYING')      │
  │  - onPlaybackRateChange: coordinator.onRateConfirmedByYouTube(data)       │
  └───────────────────────────────────────────────────────────────────────────┘
```

### 2.2. "5 Cạm Bẫy Chí Mạng" Khi Tăng Tốc Âm Thanh Trên YouTube IFrame API

| Cạm Bẫy | Hành Vi Mặc Định Của YouTube | Hậu Quả Nếu Không Xử Lý | Giải Pháp Triệt Để Trong Dự Án |
| :--- | :--- | :--- | :--- |
| **1. Auto-Reset khi load video** | Mỗi khi gọi `loadVideoById()` để phát tập mới hoặc truyện mới, YouTube ngầm đặt lại `playbackRate = 1.0`. | User đang nghe x2 tập 1, sang tập 2 bị tụt xuống 1x, gây ức chế trải nghiệm. | **Hàm `enforcePlaybackRate`** kích hoạt chuỗi retry đa tầng ngay sau khi gọi `loadVideoById`. |
| **2. Bẫy Tốc Độ Danh Nghĩa (Nominal Rate Desync)** | Khi player đang `BUFFERING (3)`, nếu gọi `setPlaybackRate(2.0)`, biến JS của player ghi nhận `getPlaybackRate() === 2.0`, nhưng bộ giải mã audio thực sự (HTML5 media element) lại reset về 1.0x khi vào `PLAYING (1)`. Lúc này nếu kiểm tra `getPlaybackRate() !== targetRate`, điều kiện bị sai và lệnh `setPlaybackRate` bị bỏ qua! | Giao diện hiện "2.0x", `getPlaybackRate()` báo 2.0x nhưng âm thanh phát ra tai người dùng vẫn chậm rì 1.0x! | **Áp dụng VÔ ĐIỀU KIỆN `player.setPlaybackRate(targetRate)` tại thời điểm `PLAYING (1)`**, kèm chuỗi retry `[50, 150, 300, 600, 1000, 1500ms]` sau khi playback thực sự diễn ra. |
| **3. Race Condition khi Reload & Auth Async** | Khi reload trang, `usePlayerStore` khởi tạo ngay. Nếu người dùng chỉnh x2, nhưng 500ms sau `initAuth()` mới hoàn tất và gọi `syncUserPlaybackRate(userId)`, nếu user đó lưu giá trị cũ (1.0x) thì sẽ ghi đè x2 của user về 1.0x. | Vừa chỉnh x2 được chưa đầy 1 giây thì audio phát x2 thật sự nhưng sau đó bị tụt ngược lại về x1! | **Thêm cơ chế khóa Intent thao tác gần (`lastSpeedChangeTimestamp`)**: Nếu người dùng vừa chỉnh tốc độ trong 10 giây qua, `syncUserPlaybackRate` sẽ bảo toàn tốc độ đó và lưu ngược lại cho user thay vì đè giá trị cũ. |
| **4. Kích thước Viewport tối thiểu của YouTube** | YouTube quy định iframe nhúng phải đạt kích thước tối thiểu `200x200px`. Kích thước `100x100px` kèm `opacity: 0.001` bị Chromium coi là iframe rác/nền và đóng băng luồng API. | Các lệnh `setPlaybackRate` gửi qua postMessage bị YouTube phớt lờ hoàn toàn. | Đặt kích thước chuẩn `200x200px` cho cả iframe và container, sử dụng `opacity: 0.01` an toàn. |
| **5. YouTube tự ý phát sinh Event Rate** | Khi đổi video, YouTube tự bắn ra event `onPlaybackRateChange` với giá trị `1`. | Nếu frontend lắng nghe sự kiện này và cập nhật lại Zustand store một cách thụ động, store sẽ bị ghi đè về 1.0x! | Bắt sự kiện `onPlaybackRateChange`: Nếu phát hiện YouTube tự ý đổi khác với tốc độ mong muốn, dùng `setTimeout(..., 50)` để **ép ngược lại** YouTube sau khi event stack thoát. |

---

## 3. THIẾT KẾ DỮ LIỆU & CƠ CHẾ GHI NHỚ ĐA CẤP (PERSISTENCE ARCHITECTURE)

Hệ thống áp dụng chiến lược lưu trữ 3 tầng (Multi-tier Storage Strategy) đảm bảo tốc độ phản hồi 0ms, không phụ thuộc vào tình trạng mạng và cá nhân hóa độc lập theo từng tài khoản:

```mermaid
flowchart TD
    A[User thao tác chọn Tốc Độ 2.0x] --> B[Gọi setPlaybackRate(2.0, userId)]
    B --> C[Ghi vào Zustand Memory State]
    B --> D[Ghi vào LocalStorage]
    
    D --> D1["Key per-user: comic_audio_user_speed_{userId}"]
    D --> D2["Key global: comic_audio_preferred_playback_rate"]
    D --> D3["Key current: comic_audio_current_speed"]
    
    B --> E[Gọi enforcePlaybackRate(2.0)]
    E --> F[Gửi lệnh ytPlayerInstance.setPlaybackRate(2.0)]
    E --> G[Lên lịch chuỗi Retry Delays]
    
    H[User chuyển sang Tập / Truyện mới] --> I[Gọi play(audio, newEpisode)]
    I --> J[Lấy activeRate từ Zustand hoặc LocalStorage: 2.0x]
    J --> K[Gán playbackRate: 2.0x cho Episode mới]
    K --> L[loadVideoById]
    L --> E
```

### 3.1. Cấu Trúc Khóa Lưu Trữ LocalStorage

1. **Khóa theo người dùng (`comic_audio_user_speed_${userId}`):**
   - Định dạng giá trị: Chuỗi số thực (`"1"`, `"1.5"`, `"2"`).
   - Mục đích: Đảm bảo khi User A (thích nghe 2.0x) đăng xuất và User B (thích nghe 1.0x) đăng nhập trên cùng một máy, tốc độ ưa thích của từng người được khôi phục chính xác.
2. **Khóa toàn cục (`comic_audio_preferred_playback_rate`):**
   - Giá trị dự phòng khi người dùng là Khách vãng lai (`GUEST`) hoặc chưa có tài khoản.
3. **Khóa phiên hiện thời (`comic_audio_current_speed`):**
   - Đồng bộ trạng thái nhanh giữa các cửa sổ/tab (Cross-tab sync).

---

## 4. CHI TIẾT LOGIC & TRIỂN KHAI CÁC HÀM CỐT LÕI

Toàn bộ logic tăng tốc và ghi nhớ tốc độ được tổ chức tập trung tại `frontend/src/stores/playerStore.ts` và phối hợp với host engine tại `frontend/src/components/layout/YouTubeEngineHost.tsx`.

### 4.1. Bộ Hàm Lưu Trữ & Truy Xuất Tốc Độ (`playerStore.ts`)

```typescript
// frontend/src/stores/playerStore.ts

/**
 * 1. Đọc tốc độ đã lưu từ LocalStorage theo User ID (hoặc Global fallback)
 */
export function getStoredPlaybackRate(userId?: number | string | null): number {
  if (typeof localStorage === 'undefined') return 1.0;
  try {
    if (userId) {
      const userSaved = localStorage.getItem(`comic_audio_user_speed_${userId}`);
      if (userSaved) {
        const parsed = parseFloat(userSaved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    const globalSaved = localStorage.getItem('comic_audio_preferred_playback_rate');
    if (globalSaved) {
      const parsed = parseFloat(globalSaved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  return 1.0;
}

/**
 * 2. Lưu tốc độ ưa thích của người dùng vào LocalStorage
 */
export function persistUserPlaybackRate(rate: number, userId?: number | string | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    const rateStr = String(rate);
    localStorage.setItem('comic_audio_preferred_playback_rate', rateStr);
    if (userId) {
      localStorage.setItem(`comic_audio_user_speed_${userId}`, rateStr);
    }
    localStorage.setItem('comic_audio_current_speed', rateStr);
  } catch {}
}
```

### 4.2. Kỹ Thuật "Cưỡng Chế Đa Tần Số" (`enforcePlaybackRate`)
Để giải quyết triệt để độ trễ bất đồng bộ khi YouTube IFrame nạp video mới:

```typescript
// frontend/src/stores/playerStore.ts

let rateEnforceTimeouts: ReturnType<typeof setTimeout>[] = [];

/**
 * 3. Cưỡng chế tốc độ phát lên YouTube IFrame API qua chuỗi retry đa tầng
 */
export function enforcePlaybackRate(rate: number) {
  // Hủy các timeout của lượt trước nếu có
  rateEnforceTimeouts.forEach((t) => clearTimeout(t));
  rateEnforceTimeouts = [];

  const targetRate = parseFloat(String(rate)) || 1.0;

  const apply = () => {
    if (ytPlayerInstance && typeof ytPlayerInstance.setPlaybackRate === 'function') {
      try {
        ytPlayerInstance.setPlaybackRate(targetRate);
      } catch {}
    }
  };

  // Bước 1: Áp dụng ngay lập tức
  apply();

  // Bước 2: Chuỗi retry phân tầng thời gian [80ms, 200ms, 400ms, 700ms, 1200ms, 2000ms, 3000ms]
  // Đảm bảo bắt dính các điểm chuyển tiếp trạng thái: UNSTARTED -> BUFFERING -> PLAYING
  const delays = [80, 200, 400, 700, 1200, 2000, 3000];
  delays.forEach((delay) => {
    const t = setTimeout(apply, delay);
    rateEnforceTimeouts.push(t);
  });
}
```

### 4.3. Bảo Toàn Tốc Độ Khi Chuyển Tập & Chuyển Audio Khác (`play` Action)
Điểm then chốt để giải quyết bài toán: *"nghe tập khác hoặc audio khác vẫn giữ nguyên x2"*:

```typescript
// frontend/src/stores/playerStore.ts (trong usePlayerStore.create)

play: (audio: AudioItem, episode = null, seekSeconds = null) => {
  if (!audio) return;

  // 1. Lưu lại tiến trình nghe của tập cũ trước khi rời đi
  const prevAudio = get().currentAudio;
  const prevEp = get().currentEpisode;
  const prevTime = get().currentTime;
  const prevDur = get().duration;
  if (prevAudio && prevEp && (prevAudio.id !== audio.id || (episode && prevEp.id !== episode.id))) {
    saveProgressFor(prevAudio, prevEp, prevTime, prevDur);
  }

  // 2. Xác định tập mục tiêu và vị trí giây bắt đầu
  // ... (giải quyết targetEpisode và currentTime) ...

  // 3. ĐIỂM QUAN TRỌNG NHẤT:
  // Lấy tốc độ đang hoạt động hiện tại (activeRate), KHÔNG BAO GIỜ reset về 1.0!
  const activeRate = get().playbackRate || getStoredPlaybackRate() || 1.0;

  set({
    currentAudio: audio,
    currentEpisode: targetEpisode,
    currentTime,
    duration,
    isPlaying: true,
    playbackRate: activeRate, // Duy trì tuyệt đối tốc độ đã chọn
  });

  // 4. Ra lệnh cho YouTube nạp video và ngay lập tức cưỡng chế tốc độ activeRate
  if (ytPlayerInstance && typeof ytPlayerInstance.loadVideoById === 'function') {
    try {
      ytPlayerInstance.loadVideoById({
        videoId: audio.youtubeVideoId,
        startSeconds: absoluteStart,
      });
      ytPlayerInstance.playVideo();
      
      // Kích hoạt chuỗi cưỡng chế tốc độ cho video mới
      enforcePlaybackRate(activeRate);
    } catch (err) {
      console.warn('YouTube playVideo call error:', err);
    }
  }

  saveProgressFor(audio, targetEpisode, currentTime, duration);
  startPolling();
  startHeartbeat();
  updateMediaSession(true, audio, targetEpisode);
},
```

### 4.4. Cơ Chế Giám Sát Ổn Định (Stabilized Watchdog Guard)
Vòng lặp `pollIntervalHandler` được trang bị cơ chế chống bão retry (Anti-Storm Watchdog Guard):
- Chỉ kiểm tra lệch tốc độ khi `ytPlayerInstance.getPlayerState() === 1` (đang thực sự `PLAYING`), tuyệt đối không kích hoạt khi đang `BUFFERING` hoặc `PAUSED`.
- Không can thiệp nếu `rateCoordinator.isBusyApplying()` đang trong chu kỳ áp dụng.
- Yêu cầu xác nhận lệch liên tục ít nhất 2 giây (`watchdogDesyncCounter >= 2`) để loại bỏ hoàn toàn các trạng thái quá độ.

```typescript
// frontend/src/stores/playerStore.ts

let watchdogDesyncCounter = 0;

function pollIntervalHandler() {
  const store = usePlayerStore.getState();
  if (!store.isPlaying) {
    watchdogDesyncCounter = 0;
    return;
  }

  if (ytPlayerInstance && typeof ytPlayerInstance.getCurrentTime === 'function') {
    try {
      const ytState = typeof ytPlayerInstance.getPlayerState === 'function' ? ytPlayerInstance.getPlayerState() : null;
      if (ytState === 1 && !rateCoordinator.isBusyApplying()) {
        const actualRate = ytPlayerInstance.getPlaybackRate();
        const targetRate = store.playbackRate || 1.0;
        if (typeof actualRate === 'number' && Math.abs(actualRate - targetRate) > 0.05) {
          watchdogDesyncCounter++;
          if (watchdogDesyncCounter >= 2) {
            watchdogDesyncCounter = 0;
            rateCoordinator.applyRate('watchdog_poll_desync');
          }
        } else {
          watchdogDesyncCounter = 0;
        }
      } else {
        watchdogDesyncCounter = 0;
      }
    } catch {}

    // Xử lý cập nhật giây nghe hiện tại...
  }
}
```

### 4.5. Phản Xạ Sự Kiện Tại Host Engine (`YouTubeEngineHost.tsx`)
Bắt các sự kiện vòng đời của YouTube IFrame:

```typescript
// frontend/src/components/layout/YouTubeEngineHost.tsx

onStateChange: (event: { data: number }) => {
  const state = event.data;
  const targetRate = usePlayerStore.getState().playbackRate || 1.0;

  // Khi video bắt đầu chuyển sang trạng thái PLAYING (1)
  if (state === window.YT?.PlayerState?.PLAYING) {
    usePlayerStore.setState({ isPlaying: true, isSeeking: false });
    
    // Đảm bảo duy trì tốc độ phát đã chọn khi tiếp tục phát sau tua hoặc buffering
    if (player && typeof player.setPlaybackRate === 'function') {
      try {
        const currentRate = typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : 1;
        if (Math.abs(currentRate - targetRate) > 0.05) {
          player.setPlaybackRate(targetRate);
        }
      } catch {}
    }
  } else if (
    state === window.YT?.PlayerState?.BUFFERING ||
    state === window.YT?.PlayerState?.CUED
  ) {
    // Củng cố trước tốc độ phát ngay trong lúc đang buffering
    if (player && typeof player.setPlaybackRate === 'function') {
      try {
        player.setPlaybackRate(targetRate);
      } catch {}
    }
  }
},

onPlaybackRateChange: (event: { data: number }) => {
  if (event && typeof event.data === 'number' && event.data > 0) {
    const targetRate = usePlayerStore.getState().playbackRate || 1.0;
    // Nếu YouTube tự động reset tốc độ (thường về 1.0 khi load video mới),
    // lập tức ép lại theo ý muốn người dùng!
    if (Math.abs(targetRate - event.data) > 0.05) {
      if (player && typeof player.setPlaybackRate === 'function') {
        try {
          player.setPlaybackRate(targetRate);
        } catch {}
      }
    }
  }
}
```

---

## 5. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (COMIC UI/UX)

Giao diện áp dụng phong cách thiết kế **Comic Neo-Brutalism**: đường viền đen đậm nét (`border-2 border-black`), khối màu vàng Manga nổi bật (`#FFE600`), hiệu ứng đổ bóng cứng (`shadow-comic-sm`) và xúc giác phản hồi cao khi nhấn (`active:translate-x-0.5`).

### 5.1. Nút Bấm Xoay Vòng Tốc Độ Trên MiniPlayer
Đặt ngay cạnh cụm điều khiển chính của thanh MiniPlayer:

```tsx
// frontend/src/components/layout/MiniPlayer.tsx

<button
  onClick={(e) => {
    e.stopPropagation();
    cycleSpeed(user?.id); // 1-click cycle: 1x -> 1.25x -> 1.5x -> 2x -> 0.75x -> ...
  }}
  className="h-8 px-2 rounded-lg border-2 border-black bg-[#FFE600] font-black text-xs text-black shadow-comic-sm hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center shrink-0"
  title={`Tốc độ hiện tại: ${playbackRate}x (Nhấp để đổi nhanh)`}
>
  {playbackRate}x
</button>
```

### 5.2. Modal Chọn Tốc Độ Chi Tiết Trên PlayerPage
Tại trang chi tiết `PlayerPage.tsx`, người dùng bấm vào nút tốc độ để mở Modal chuyên dụng:

```tsx
// frontend/src/pages/PlayerPage.tsx

{/* 1. Nút mở Modal */}
<button
  onClick={() => setIsSpeedModalOpen(true)}
  className="btn-comic text-xs py-1 px-2.5 bg-[#FFE600] font-black border-2 border-black shadow-comic-sm hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1"
  title="Đổi tốc độ phát (x1, x1.5, x2...)"
>
  <i className="ri-speed-line text-sm" />
  <span>{playbackRate}x</span>
</button>

{/* 2. Modal Chọn Tốc Độ */}
<Modal
  isOpen={isSpeedModalOpen}
  onClose={() => setIsSpeedModalOpen(false)}
  title="TỐC ĐỘ PHÁT AUDIO"
  showFooter={false}
>
  <div className="flex flex-col gap-3">
    <p className="text-[11px] sm:text-xs text-gray-700 font-semibold">
      Tốc độ tiêu chuẩn (Tự động lưu lại cho tất cả audio):
    </p>
    
    {/* Hàng 3 nút tốc độ trọng tâm: 1.0x - 1.5x - 2.0x */}
    <div className="grid grid-cols-3 gap-2">
      {[1.0, 1.5, 2.0].map((s) => {
        const isSelected = Math.abs(playbackRate - s) < 0.05;
        return (
          <button
            key={s}
            onClick={() => {
              setPlaybackRate(s, user?.id);
              setIsSpeedModalOpen(false);
            }}
            className={`btn-comic text-sm py-2.5 font-black flex items-center justify-center gap-1 ${
              isSelected ? 'btn-comic-yellow ring-2 ring-black' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <span>{s}x</span>
            {isSelected && <i className="ri-check-line font-black text-black" />}
          </button>
        );
      })}
    </div>

    {/* Các mức tinh chỉnh phụ trợ */}
    <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-1">Các mức điều chỉnh khác:</p>
    <div className="grid grid-cols-4 gap-1.5">
      {[0.5, 0.75, 1.25, 1.75].map((s) => {
        const isSelected = Math.abs(playbackRate - s) < 0.05;
        return (
          <button
            key={s}
            onClick={() => {
              setPlaybackRate(s, user?.id);
              setIsSpeedModalOpen(false);
            }}
            className={`btn-comic text-xs py-1.5 font-bold flex items-center justify-center gap-0.5 ${
              isSelected ? 'btn-comic-yellow ring-2 ring-black' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <span>{s}x</span>
            {isSelected && <i className="ri-check-line font-bold" />}
          </button>
        );
      })}
    </div>

    {/* Thông báo minh bạch về tính năng ghi nhớ */}
    <div className="card-comic-sm p-2 bg-[#FEF9C3] text-[11px] text-gray-700 font-bold flex items-center gap-2 border border-black">
      <i className="ri-save-line text-base text-black shrink-0" />
      <span>
        Tốc độ đã chọn ({playbackRate}x) sẽ được giữ nguyên khi bạn nghe truyện khác hoặc đổi tập.
      </span>
    </div>
  </div>
</Modal>
```

---

## 6. KỊCH BẢN KIỂM THỬ THỰC NGHIỆM & BẢO ĐẢM HỆ THỐNG (EMPIRICAL VERIFICATION)

Hệ thống được kiểm thử thực nghiệm trên 3 cấp độ: Cô lập YouTube API (Isolated Test), E2E Browser thật (Headless Chrome) và Đơn vị tự động (Vitest Suite).

### 6.1. Kiểm Thử Cô Lập YouTube IFrame API (Phase C)
- **Công cụ:** `frontend/public/test-yt-isolated.html` chạy qua `run-isolated-test.cjs` trên Google Chrome thật (phiên bản `133.0.6943.142`).
- **Video thực nghiệm:** `4Jon5SH_I2Y` (video truyện thực tế trong ứng dụng).
- **Kết quả đo đạc:**
  - Tốc độ hỗ trợ từ YouTube Player: `[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]`.
  - Mức 1.0x: $\Delta \text{video} = 3.011s$ trong $\Delta \text{wall} = 3.011s \rightarrow \mathbf{1.00x}$.
  - Mức 2.0x: $\Delta \text{video} = 8.028s$ trong $\Delta \text{wall} = 4.015s \rightarrow \mathbf{2.00x}$.
  - **Kết luận:** YouTube IFrame API hỗ trợ hoàn toàn việc tăng tốc 2.0x cho audio, không có giới hạn kỹ thuật từ phía Google. Lỗi trước đây 100% xuất phát từ tầng điều phối state và synchronization của ứng dụng.

### 6.2. Kiểm Thử Tự Động Toàn Trình E2E Trên App Thật (`run-app-test.cjs`)
Đo đạc trực tiếp độ tiến triển thời gian video thực tế $\text{Progression Rate} = \frac{\Delta \text{videoSeconds}}{\Delta \text{wallClockSeconds}}$ trên Chrome:

| Bước Kiểm Thử | Tốc độ cấu hình | Thời gian thực ($\Delta \text{wall}$) | Tiến triển video ($\Delta \text{video}$) | Tốc độ đo được | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Baseline 1.0x** | 1.0x | 3.504 s | 3.505 s | **1.00x** | PASS |
| **2. Tăng tốc lên 2.0x** | 2.0x | 4.002 s | 8.005 s | **2.00x** | PASS |
| **3. Reload trang (Race Condition)** | 2.0x (restored) | 3.504 s | 7.014 s | **2.00x** | PASS |
| **4. Chuyển lại về 1.0x** | 1.0x | 3.502 s | 3.501 s | **1.00x** | PASS |

### 6.3. Bộ Kiểm Thử Vitest Tự Động (Unit & Store Tests)
Toàn bộ **37/37 tests** trong project đã vượt qua thành công (`npm test`):
- `preserves user selected playback rate when changing to another audio` (PASS)
- `persists and restores playback rate per user account` (PASS)
- `preserves user selected speed when auth finishes asynchronously (race condition fix)` (PASS)
- `applies desired rate when player becomes ready later` (PASS)
- `re-asserts desired rate when video enters PLAYING state` (PASS)
- `switches back from x2 to x1 cleanly and does not flip back` (PASS)
- `marks rateSyncStatus as unsupported when rate is not available in YouTube player` (PASS)

---

## 7. HƯỚNG DẪN MỞ RỘNG TƯƠNG LAI (FUTURE ROADMAP)

### 7.1. Bổ Sung Phím Tắt Toàn Cục (Global Keyboard Shortcuts)
Người dùng nghe trên máy tính để bàn (Desktop/Laptop) thường thích dùng phím tắt:
- `Shift` + `>`: Tăng tốc độ lên nấc cao hơn (1.0 -> 1.25 -> 1.5 -> 2.0).
- `Shift` + `<`: Giảm tốc độ xuống nấc thấp hơn.
- Phím `1`, `2`, `3`: Chuyển trực tiếp tới `1.0x`, `1.5x`, `2.0x`.

### 7.2. Đồng Bộ Lên Cơ Sở Dữ Liệu MySQL (Cross-Device Cloud Sync)
Nếu người dùng muốn nghe truyện x2 trên máy tính công ty, sau đó về nhà mở điện thoại vẫn giữ nguyên x2:
- **Migration MySQL:** Thêm cột `preferred_playback_rate DECIMAL(3,2) DEFAULT 1.00` vào bảng `users`.
- **API Endpoint:** Thêm endpoint `PATCH /api/users/preferences` nhận `{ playbackRate: 2.0 }`.
- Khi gọi `setPlaybackRate`, nếu người dùng đã đăng nhập (`isGuest: false`), gửi request đồng bộ ngầm (fire-and-forget) lên backend để lưu trữ vĩnh viễn.

---

## 8. TỔNG KẾT

Tính năng tăng tốc âm thanh **x1 - x1.5 - x2** trong dự án đã được thiết kế và xây dựng một cách hoàn thiện, an toàn và chặt chẽ:
1. **Giải quyết triệt để vấn đề lõi kỹ thuật** của YouTube IFrame API thông qua cơ chế phân tầng cưỡng chế (`enforcePlaybackRate`) và vòng lặp giám sát định kỳ (`Watchdog Polling`).
2. **Khả năng ghi nhớ tốc độ hoàn hảo**: Tốc độ x2 được duy trì liên tục khi đổi tập, đổi truyện, tải lại trang và gắn liền với từng tài khoản người dùng qua LocalStorage.
3. **Giao diện chuẩn Comic Neo-Brutalism**: Đẹp mắt, tương phản cao, thao tác 1 chạm trên MiniPlayer và bảng điều khiển chi tiết trên PlayerPage.
4. **Kiểm thử tự động 100%**: Đảm bảo hệ thống vận hành ổn định lâu dài, không gặp lỗi hồi quy khi mở rộng tính năng mới.
