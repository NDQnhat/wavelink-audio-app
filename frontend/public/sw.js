// WaveLink Service Worker - Xử lý thông báo ngoài ứng dụng khi ứng dụng đóng hoặc chạy nền
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý sự kiện click vào thông báo từ Action Center của OS / Trình duyệt
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/#/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu đã có cửa sổ WaveLink đang mở, focus và điều hướng
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Nếu chưa có cửa sổ nào đang mở, mở tab mới
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Lắng nghe lệnh hiển thị thông báo ngoài màn hình từ Web App
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/wavelink-icon.png',
        badge: '/wavelink-icon.png',
        tag: 'wavelink-notification',
        renotify: false,
        ...options,
      })
    );
  }
});

// Hỗ trợ Web Push API nếu server gửi tín hiệu push
self.addEventListener('push', (event) => {
  let payload = {
    title: 'WaveLink - Thông Báo Mới 🎧',
    body: 'Có nội dung và tập truyện mới trên WaveLink!',
    url: '/#/notifications',
    tag: 'wavelink-push-notification',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/wavelink-icon.png',
      badge: '/wavelink-icon.png',
      tag: payload.tag,
      data: { url: payload.url },
      renotify: false,
    })
  );
});
