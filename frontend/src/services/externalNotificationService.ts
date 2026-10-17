import { notificationService } from './notificationService';
import { audioService } from './audioService';
import { playNotificationSound } from '@/lib/soundEffects';

class ExternalNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isWatcherStarted = false;
  private watcherIntervalId: number | null = null;

  /**
   * Kiểm tra trình duyệt có hỗ trợ Web Notification và Service Worker không
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Lấy trạng thái quyền thông báo hiện tại ('default' | 'granted' | 'denied')
   */
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Yêu cầu người dùng cấp quyền thông báo hệ điều hành / trình duyệt
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('requestPermission error:', err);
      return false;
    }
  }

  /**
   * Đăng ký Service Worker sw.js
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;
      return reg;
    } catch (err) {
      console.warn('Đăng ký Service Worker thất bại:', err);
      return null;
    }
  }

  /**
   * Hiển thị thông báo ngoài màn hình hệ thống (Windows/Mac/OS)
   * Có cơ chế tự động kiểm tra cài đặt "Chặn thông báo", "Audio ngoài app" và lọc chống spam
   */
  async showSystemNotification(
    title: string,
    options: {
      body?: string;
      url?: string;
      tag?: string;
      type?: 'audio' | 'system' | 'vip';
    } = {}
  ): Promise<boolean> {
    if (!this.isSupported()) return false;

    // 1. Kiểm tra cấu hình thông báo của người dùng
    const prefs = notificationService.getLocalPreferences();

    // Nếu người dùng bật "Chặn thông báo" (Block all notifications / DND) -> Chặn ngay lập tức
    if (prefs.blockAll) {
      return false;
    }

    // Nếu là thông báo audio mới nhưng người dùng tắt "Nhận thông báo audio mới ngoài app" -> Bỏ qua
    if (options.type === 'audio' && prefs.externalAudio === false) {
      return false;
    }

    // 2. Kiểm tra quyền trình duyệt
    if (this.getPermission() !== 'granted') {
      return false;
    }

    // 3. Cơ chế Chống Spam (Anti-Spam & Rate-Limiting):
    // - Không spam liên tục trong 15 giây
    // - Không gửi trùng cùng một nội dung / thẻ trong 3 phút
    const now = Date.now();
    const spamTag = options.tag || title;
    const itemKey = `wavelink_notif_tag_${spamTag}`;

    try {
      const lastOverallStr = localStorage.getItem('wavelink_last_sys_notif_time');
      const lastTagStr = localStorage.getItem(itemKey);

      const lastOverall = Number(lastOverallStr || 0);
      const lastTag = Number(lastTagStr || 0);

      // Giới hạn tần suất tối thiểu 15 giây giữa 2 thông báo bất kỳ
      if (now - lastOverall < 15000) {
        return false;
      }

      // Giới hạn chống lặp lại cùng một thông báo trong 3 phút (180s)
      if (now - lastTag < 180000) {
        return false;
      }

      localStorage.setItem('wavelink_last_sys_notif_time', String(now));
      localStorage.setItem(itemKey, String(now));
    } catch {}

    const payload = {
      body: options.body || '',
      icon: '/wavelink-icon.png',
      badge: '/wavelink-icon.png',
      tag: options.tag || 'wavelink-global-notice',
      data: { url: options.url || '/#/notifications' },
      renotify: false,
    };

    // Phát âm thanh thông báo trên máy (Notification Sound Chime)
    playNotificationSound();

    // Ưu tiên hiển thị qua Service Worker (hiển thị tốt ngay cả khi tab thu nhỏ hoặc cửa sổ ẩn)
    try {
      if ('serviceWorker' in navigator) {
        const reg = this.swRegistration || (await navigator.serviceWorker.ready);
        if (reg && reg.showNotification) {
          await reg.showNotification(title, payload);
          return true;
        }
      }
      new Notification(title, payload);
      return true;
    } catch (e) {
      console.warn('Lỗi hiển thị Notification:', e);
      return false;
    }
  }

  /**
   * Khởi động dịch vụ nền theo dõi Audio mới ngoài app khi ứng dụng ẩn / chạy nền
   */
  initBackgroundWatcher() {
    if (typeof window === 'undefined' || this.isWatcherStarted) return;
    this.isWatcherStarted = true;

    // Đăng ký Service Worker ngay khi khởi động
    this.registerServiceWorker();

    // Kiểm tra định kỳ mỗi 60 giây khi người dùng cho phép nhận thông báo audio ngoài app
    const checkNewAudio = async () => {
      try {
        const prefs = notificationService.getLocalPreferences();
        if (prefs.blockAll || prefs.externalAudio === false) {
          return;
        }

        if (this.getPermission() !== 'granted') {
          return;
        }

        // Lấy danh sách audio mới nhất
        const audios = await audioService.getAudios({ page: 1, limit: 1, sort: 'latest' });
        const latestAudio = audios?.[0];
        if (!latestAudio) return;

        const lastNotifiedAudioId = localStorage.getItem('wavelink_last_audio_notified_id');
        const currentAudioId = String(latestAudio.id);

        if (lastNotifiedAudioId && lastNotifiedAudioId !== currentAudioId) {
          // Có audio mới được thêm vào thư viện -> Gửi thông báo gọn gàng
          await this.showSystemNotification(`WaveLink • Audio Mới 🎧`, {
            body: `"${latestAudio.title}" vừa được thêm vào thư viện. Bấm để nghe ngay!`,
            url: `/#/player?audioId=${latestAudio.id}`,
            tag: `wavelink-new-audio-${latestAudio.id}`,
            type: 'audio',
          });
        }

        // Cập nhật ID audio mới nhất đã xem xét
        localStorage.setItem('wavelink_last_audio_notified_id', currentAudioId);
      } catch (err) {
        // Silent fail in background
      }
    };

    // Kiểm tra sau 10s khởi động và lặp lại định kỳ
    setTimeout(checkNewAudio, 10000);
    this.watcherIntervalId = window.setInterval(checkNewAudio, 60000);
  }

  destroy() {
    if (this.watcherIntervalId) {
      clearInterval(this.watcherIntervalId);
      this.watcherIntervalId = null;
    }
    this.isWatcherStarted = false;
  }
}

export const externalNotificationService = new ExternalNotificationService();
