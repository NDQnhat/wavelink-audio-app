import { AudioItem } from './audio';

export interface CommunityMessage {
  id: number | string;
  userId: number;
  username: string;
  avatarUrl?: string;
  isVip: boolean;
  role: string;
  message: string;
  sharedAudioId?: number;
  sharedAudio?: AudioItem;
  createdAt: string;
}

export interface TopListener {
  rank: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  totalSeconds: number;
  totalHours: number;
  isVip: boolean;
  role: string;
  membership: string;
  lastAudioTitle?: string;
}

export interface VipRankingMember {
  rank: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  role: string;
  membership: string;
  vipExpiresAt?: string;
  vipBadge: string;
  totalHours: number;
  joinedAt: string;
}

export interface WSCommunityMessage {
  type: 'new_message' | 'delete_message' | 'clear_messages' | 'online_count' | 'ping' | 'pong';
  data?: CommunityMessage | { id: number | string };
  count?: number;
  message?: string;
}

export interface CommunityAdminStats {
  totalMessages: number;
  onlineCount: number;
  vipChatters: number;
  guestChatters: number;
}
