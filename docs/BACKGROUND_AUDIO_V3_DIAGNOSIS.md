# 🔍 WaveLink Background Audio — Chẩn Đoán Lỗi & Kế Hoạch Khắc Phục v3

> **Branch:** `fix/background-audio-v3` (tách từ `main`)  
> **Ngày:** 2026-10-18  
> **Trạng thái:** ⚠️ Kế hoạch — Chờ phê duyệt trước khi chỉnh sửa code

---

## Phần 1: Mô Tả Triệu Chứng (Từ Test Thực Tế)

| # | Kịch bản | Triệu chứng | Mức độ |
|---|----------|-------------|--------|
| 1 | Tắt app (nhấn nút Home / Vuốt thoát) | Notification/lockscreen **hiển thị** tên bài, nhưng **không có âm thanh** | 🔴 Critical |
| 2 | Tắt màn hình | Audio **tắt hoàn toàn**, không thể chạy tiếp | 🔴 Critical |
| 3 | Chuyển tab / chuyển ứng dụng | Audio **tắt ngay lập tức**, không còn luồng nền | 🔴 Critical |
| 4 | Quay lại app sau bất kỳ 3 tình huống trên | Tốc độ playback **bị reset về x1** dù đã chọn x1.5 hoặc x2 | 🟡 High |

---

## Phần 2: Phân Tích Nguyên Nhân Gốc Rễ

### 2.1. Triệu Chứng #1 — "Notification hiển thị nhưng không có âm thanh"

**Lý do xảy ra:**
Đây là triệu chứng gây nhầm lẫn nhất. Nó xảy ra vì hai hệ thống hoạt động độc lập:

- **MediaSession API** (JavaScript) → điều khiển notification/lockscreen UI ✅ → Vẫn chạy vì được cập nhật TRƯỚC khi app vào nền.
- **YouTube IFrame audio stream** → phát âm thanh thật → ❌ **BỊ DỪNG** bởi chính sách của YouTube.

**Luồng xảy ra lỗi:**
```
[User thoát app]
       ↓
[Chrome Android kích hoạt Page Visibility API: document.hidden = true]
       ↓
[YouTube IFrame JS bên trong iframe nhận sự kiện visibility = hidden]
       ↓
[YouTube Player TỰ ĐỘNG gọi pauseVideo() bên trong iframe]
       ↓
[onStateChange → PAUSED được phát ra]
       ↓
[Code hiện tại: backgroundResumeAttempts++ → setTimeout playVideo() → FAIL]
       ↓
[Lý do FAIL: Sau khi tab ẩn, gọi playVideo() không có user gesture → Chrome chặn]
```

**Kết luận:** Code `onStateChange → PAUSED → playVideo()` (dù có backoff) **không bao giờ hoạt động** trên Android Chrome khi tab bị hidden. Chrome không cho phép gọi `playVideo()` thành công từ script khi tab không ở foreground mà không có user gesture. YouTube cũng có kiểm tra server-side phát hiện frame bị ẩn.

---

### 2.2. Triệu Chứng #2 & #3 — "Tắt màn hình / chuyển app → Audio tắt ngay"

**Vấn đề cốt lõi: Chính sách background playback của YouTube IFrame**

YouTube IFrame API có **2 lớp kiểm soát** mà code hiện tại chưa vượt qua được:

#### Lớp 1: Browser-level (Chrome Android)
- Khi tab bị ẩn → Chrome throttle JS timers → `setInterval` và `setTimeout` bị hạ xuống 1 lần/phút hoặc tắt hẳn.
- Web Worker trong `mediaSessionWorker.ts` giúp giải quyết việc timer bị throttle.
- **Nhưng:** Web Worker không có quyền gọi `playVideo()` trực tiếp → chỉ có thể gửi message về main thread, main thread bị throttle nặng.

#### Lớp 2: YouTube Player-level (Server-side enforcement)
- Đây là vấn đề **chưa được giải quyết** trong code hiện tại.
- YouTube IFrame player JS nội bộ lắng nghe:
  - `document.visibilityState === 'hidden'`
  - `IntersectionObserver` (kiểm tra iframe có nằm trong viewport không)
  - Heartbeat xác thực với YouTube servers
- Khi phát hiện tab ẩn → Player **tự gọi `pauseVideo()` từ bên trong iframe** → không thể ngăn từ bên ngoài.

#### Lớp 3: `silence.mp3` anchor + Web Audio API (đã implement nhưng chưa đủ)
- `createNativeAudioAnchor()` tạo `<audio>` phát silence.mp3 → đúng hướng.
- **Nhưng vấn đề**: `silence.mp3` giữ được **audio session** của browser, nhưng **không giữ được** YouTube iframe audio stream.
- Android nhận biết app đang có media session (vì native audio anchor) → notification hiển thị → nhưng stream YouTube đã bị dừng → không có âm thanh.

#### Tóm lại: Vấn đề căn bản là kiến trúc
- Dùng **YouTube IFrame API** để phát audio nền là **sai về mặt kiến trúc** vì YouTube chủ động chặn background playback ở cấp độ player/server.
- Các lớp keepalive hiện tại (AudioContext, silence.mp3, SW heartbeat) chỉ giữ được browser audio session, nhưng **không thể override** hành vi pause của YouTube IFrame player.

---

### 2.3. Triệu Chứng #4 — "Playback Rate bị reset về x1"

**Nguyên nhân:**

```
[App vào nền] → YouTube player bị pause
       ↓
[User quay lại app]
       ↓
[visibilitychange → visible → playVideo() được gọi]
       ↓
[YouTube: khi player recover từ paused/background state]
       ↓
[YouTube RESET playbackRate về 1.0 (hành vi mặc định của YT API)]
       ↓
[rateCoordinator.applyRate() được gọi nhưng race condition...]
       ↓
[Nếu applyRate() chạy TRƯỚC khi YouTube sẵn sàng (state != 1 PLAYING)]
       ↓
[setPlaybackRate() bị ignore → rate vẫn là 1.0]
```

**Vấn đề cụ thể trong code:**
- `rateCoordinator.enforceRateWithRetries()` được gọi trong `visibilitychange` nhưng race condition với YouTube player recovery.
- `onStateChange → PLAYING` chỉ check `if (targetRate !== 1.0 && actualRate !== targetRate)` → nếu `actualRate` chưa kịp update từ YouTube → miss lần enforce quan trọng.
- Sau khi tab vào nền và quay lại, nếu YouTube buffer lại (state BUFFERING → PLAYING) → LUÔN reset rate về 1.0 trước khi trigger `onPlaybackRateChange`.

---

## Phần 3: Hiểu Đúng Chính Sách YouTube IFrame API

### 3.1. Chính sách tường minh
- **YouTube Premium** = background playback trên mobile YouTube app (native) hoặc YouTube.com.
- **YouTube IFrame API** = được phép nhúng trên web, nhưng **KHÔNG được phép** background playback trừ khi stream đang hiển thị với người dùng.
- `youtube-nocookie.com` = chỉ thay đổi tracking cookie, **không thay đổi** quyền background playback.

### 3.2. Điều gì THỰC SỰ có thể làm được

| Cách tiếp cận | Khả thi? | Ghi chú |
|---------------|----------|---------|
| Giữ YouTube iframe hoạt động khi tab hidden | ❌ | YouTube chủ động chặn ở player level |
| Retry `playVideo()` từ background | ❌ | Chrome không cho phép autoplay từ script khi không có gesture |
| Tách audio URL từ YouTube video | ⚠️ | Vi phạm ToS YouTube, không bền vững |
| **Picture-in-Picture (PiP) API** | ✅ | Giữ media active ngay cả khi app minimize |
| **Container 1px trong viewport** | ✅ | YouTube không kích hoạt IntersectionObserver detection |
| Override `document.hidden` | ⚠️ | Không ổn định, có thể bị Chrome block |
| **HTML5 `<audio>` element (thay iframe)** | ✅✅ | Giải pháp căn bản nhất, background support đầy đủ |

---

## Phần 4: Phương Án Khắc Phục

### Phương án A: Picture-in-Picture (PiP) API

**Lý thuyết:** Khi YouTube iframe ở chế độ PiP, Chrome/Android KHÔNG dừng audio kể cả khi tab bị ẩn. Đây là API chuẩn W3C (Chrome 70+).

**Cơ chế:**
```
[User bắt đầu phát audio]
       ↓
[JS request PiP cho video element bên trong iframe]
       ↓
[Video element vào PiP mode → Chrome xem là Active Media]
       ↓
[User thoát app / tắt màn hình]
       ↓
[PiP window có thể thu nhỏ tối thiểu ở góc màn hình]
       ↓
[YouTube KHÔNG nhận diện là "background" → KHÔNG pause ✅]
```

**Hạn chế:**
- Yêu cầu user gesture để activate lần đầu.
- Trên Android, PiP window sẽ hiện thumbnail video nhỏ ở góc → user sẽ thấy.
- Cross-origin iframe khó access video element DOM trực tiếp.

**Cách triển khai trong YouTubeEngineHost:** Dùng `requestPictureInPicture()` trên video element, truy cập qua `iframe.contentDocument.querySelector('video')` (hoạt động với một số cấu hình).

---

### Phương án B: Container Visibility Optimization

**Hiện tại** (có thể là vấn đề):
```css
position: fixed;
top: -9999px;   /* NGOÀI viewport hoàn toàn */
left: -9999px;  /* YouTube IntersectionObserver phát hiện → pause */
```

**Đề xuất thay thế:**
```css
position: fixed;
bottom: 0;
right: 0;
width: 2px;     /* Trong viewport, YouTube KHÔNG phát hiện là "hidden" */
height: 2px;
opacity: 0.01;  /* Không visible với người dùng */
```

**Lý do:** Element ở `-9999px` có thể vẫn bị Chrome/YouTube detect là out-of-viewport, kích hoạt media pause. Thay bằng element nhỏ nhưng **trong viewport** để bypass IntersectionObserver check.

---

### Phương án C: Fix playbackRate Reset (Độc lập, làm trước)

Fix ngay lỗi này mà không cần giải quyết vấn đề background audio:

1. **Luôn enforce rate khi PLAYING**, không chỉ khi rate !== 1.0:
   ```typescript
   // Trong onStateChange → PLAYING
   // Thay vì: if (targetRate !== 1.0 && actualRate !== targetRate)
   // Dùng:    if (Math.abs(actualRate - targetRate) > 0.05)
   ```

2. **Enforce khi BUFFERING (state 3)** — YouTube reset rate khi buffer/recover:
   ```typescript
   } else if (state === YT.PlayerState.BUFFERING) {
     rateCoordinator.enforceRateWithRetries(targetRate, 'buffering_enforce');
   }
   ```

3. **Delay enforce khi visibility trở lại** — Đợi YouTube player settle xong:
   ```typescript
   // visibilitychange → visible:
   setTimeout(() => {
     rateCoordinator.enforceRateWithRetries(desiredRate, 'visibility_restored');
   }, 800); // Tăng từ 0ms lên 800ms
   ```

4. **Enforce trong onWorkerMediaTick** — Worker tick mỗi 15s cũng check và enforce rate.

---

### Phương án D: Kiến Trúc Audio-First (Giải pháp lâu dài)

Thay YouTube IFrame bằng `<audio>` element với audio stream được extract server-side:

```
[Backend] youtube-dl / yt-dlp extract audio stream URL từ YouTube video
       ↓
[Frontend] <audio src="audio_stream_url"> phát thẳng
       ↓
[Background audio support đầy đủ trên Android & iOS ✅]
```

**Ưu điểm:** Giải quyết hoàn toàn vấn đề background, playbackRate ổn định, MediaSession hỗ trợ tốt hơn.

**Nhược điểm:** Cần backend support, có thể vi phạm ToS YouTube nếu không dùng đúng cách, stream URL có thể expire.

---

## Phần 5: Thứ Tự Triển Khai Đề Xuất

```
Bước 1: Fix playbackRate reset          → 100% fix được, không rủi ro
         (Phương án C)

Bước 2: Optimize container visibility   → Cải thiện background audio
         (Phương án B)                     không đảm bảo 100%

Bước 3: Implement PiP API              → Cải thiện đáng kể khi
         (Phương án A)                     chuyển app/tắt màn hình

Bước 4 (Optional): Thảo luận kiến trúc → Giải pháp bền vững nhất
         (Phương án D)
```

---

## Phần 6: Câu Hỏi Cần Xác Nhận Từ User

Trước khi viết bất kỳ dòng code nào, tôi cần biết:

### ❓ Câu hỏi 1: Ưu tiên fix

Bạn muốn fix theo thứ tự nào?
- A. Fix **playbackRate reset** trước (chắc chắn fix được, không rủi ro)
- B. Fix **background audio** trước (phức tạp, không đảm bảo 100% với YouTube IFrame)
- C. Fix **cả hai song song** theo thứ tự bước 1 → bước 2 → bước 3

### ❓ Câu hỏi 2: Chấp nhận PiP mini window?

Giải pháp PiP sẽ hiện một cửa sổ video nhỏ ở góc màn hình Android khi đang phát (thumbnail YouTube). Bạn có chấp nhận UX này không?
- A. Chấp nhận — miễn audio chạy được trong nền
- B. Không chấp nhận — cần hoàn toàn ẩn
- C. Chấp nhận nhưng cần minimize nhỏ nhất có thể

### ❓ Câu hỏi 3: Platform test mục tiêu

App được test trên platform nào? (Background audio behavior khác nhau rất nhiều)
- A. Chrome Android — browser thuần (URL bar hiển thị)
- B. Chrome Android — PWA (đã Add to Home Screen, fullscreen)
- C. Samsung Internet Browser
- D. iOS Safari

### ❓ Câu hỏi 4: Sẵn sàng thay đổi kiến trúc?

Bạn có muốn xem xét Phương án D (dùng `<audio>` element thay YouTube IFrame) không?
- A. Muốn — sẵn sàng thay đổi backend
- B. Không — chỉ muốn cải thiện với YouTube IFrame API hiện tại
- C. Xem xét sau khi test các bước 1-3

---

## Phần 7: Rủi Ro & Giới Hạn

> **⚠️ QUAN TRỌNG:** YouTube chủ động chặn background playback ở cấp độ player JavaScript và server-side validation. Không có giải pháp web nào đảm bảo 100% background playback vĩnh viễn với YouTube IFrame API mà không vi phạm YouTube Terms of Service.

> **✅ Thực tế:** Kết hợp PiP API + visibility trick + playbackRate fix sẽ cải thiện đáng kể tình huống, đặc biệt khi "chuyển app". Tắt màn hình hoàn toàn là trường hợp khó nhất với IFrame API.

> **💡 Giải pháp lâu dài nhất:** Chuyển sang `<audio>` element với audio stream từ backend. Đây là cách Spotify, Podcast apps, và các app âm thanh thật sự hoạt động trên mobile web.

---

*Vui lòng trả lời các câu hỏi trong Phần 6 để tôi tiến hành đúng hướng.*
