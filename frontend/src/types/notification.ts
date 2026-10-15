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
}
