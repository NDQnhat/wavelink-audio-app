import { localDb } from './localDb';
import { authService } from './authService';
import { audioService } from './audioService';
import { episodeService } from './episodeService';
import { categoryService } from './categoryService';
import { tagService } from './tagService';
import { statsService } from './statsService';
import { progressService } from './progressService';
import { historyService } from './historyService';
import { notificationService } from './notificationService';
import { membershipService } from './membershipService';
import { userService } from './userService';

export const api = {
  localDb,
  auth: authService,
  audio: audioService,
  episode: episodeService,
  category: categoryService,
  tag: tagService,
  stats: statsService,
  progress: progressService,
  history: historyService,
  notification: notificationService,
  membership: membershipService,
  user: userService,

  async init(): Promise<boolean> {
    await localDb.init();
    progressService.initOfflineSyncListener();
    const isLive = await authService.pingHealth();
    return isLive;
  },
};
