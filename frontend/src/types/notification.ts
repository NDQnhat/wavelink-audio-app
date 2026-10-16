export interface NotificationItem {
  id: number | string;
  type: 'MEMBERSHIP' | 'NEW_EPISODE' | 'VIP_EXPIRED' | 'SYSTEM' | string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  notifyNewEpisodes: boolean;
  notifyMembership: boolean;
  notifySystem: boolean;
  externalAudio?: boolean; // Nhận thông báo audio mới ngoài app
  blockAll?: boolean;      // Chặn thông báo (Tắt toàn bộ thông báo)
  systemAlerts?: boolean;
  novelUpdates?: boolean;
  promotionAlerts?: boolean;
}
