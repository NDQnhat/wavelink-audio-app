import { describe, it, expect, beforeEach } from 'vitest';
import { membershipService } from '@/services/membershipService';
import { audioService } from '@/services/audioService';
import { useAuthStore } from '@/stores/authStore';
import { User, AudioItem } from '@/types';

describe('VIP Membership & YouTube Import Quota & Episode Lock', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isLive: false,
    });
  });

  describe('VIP Registration & Correct Pricing', () => {
    it('returns packages with exact prices (49.000đ, 129.000đ, 399.000đ)', async () => {
      const packages = await membershipService.getPackages(false);
      expect(packages).toHaveLength(3);

      const p1m = packages.find((p) => p.id === 'VIP_1M');
      expect(p1m).toBeDefined();
      expect(p1m?.priceVND).toBe(49000);
      expect(p1m?.durationDays).toBe(30);

      const p3m = packages.find((p) => p.id === 'VIP_3M');
      expect(p3m).toBeDefined();
      expect(p3m?.priceVND).toBe(129000);
      expect(p3m?.durationDays).toBe(90);

      const p1y = packages.find((p) => p.id === 'VIP_1Y');
      expect(p1y).toBeDefined();
      expect(p1y?.priceVND).toBe(399000);
      expect(p1y?.durationDays).toBe(365);
    });

    it('creates VietQR order with exact amount for 1-month package (49.000đ)', async () => {
      useAuthStore.setState({
        user: { id: 100, username: 'testuser', role: 'USER', isGuest: false },
      });

      const order = await membershipService.createOrder('VIP_1M', false);
      expect(order.amount).toBe(49000);
      expect(order.priceVND).toBe(49000);
      expect(order.durationDays).toBe(30);
      expect(order.bankName).toContain('MB Bank');
      expect(order.accountNumber).toBe('0987654321');
      expect(order.accountName).toBe('COMIC AUDIO HUB');
      expect(order.qrCodeUrl).toContain('amount=49000');
    });

    it('creates VietQR order with exact amount for 1-year package (399.000đ)', async () => {
      useAuthStore.setState({
        user: { id: 100, username: 'testuser', role: 'USER', isGuest: false },
      });

      const order = await membershipService.createOrder('VIP_1Y', false);
      expect(order.amount).toBe(399000);
      expect(order.priceVND).toBe(399000);
      expect(order.durationDays).toBe(365);
      expect(order.qrCodeUrl).toContain('amount=399000');
    });

    it('successfully activates VIP after simulating successful payment', async () => {
      const freeUser: User = { id: 200, username: 'vip_candidate', role: 'USER', membership: 'FREE', isGuest: false };
      useAuthStore.setState({ user: freeUser });

      await membershipService.createOrder('VIP_3M', false);
      const res = (await membershipService.simulatePayment('order-test', 'SUCCESS', false)) as { success: boolean };
      expect(res.success).toBe(true);

      const updatedUser = useAuthStore.getState().user;
      expect(updatedUser?.role).toBe('VIP');
      expect(updatedUser?.membership).toBe('VIP');
      expect(updatedUser?.vipExpiresAt).toBeDefined();

      const myMem = await membershipService.getMyMembership(false);
      expect(myMem.isVip).toBe(true);
      expect(myMem.role).toBe('VIP');
    });
  });

  describe('YouTube Import Quota (5 times / day)', () => {
    it('returns accurate 5 imports/day limit for free user', async () => {
      const freeUser: User = { id: 300, username: 'free_guy', role: 'USER', membership: 'FREE', isGuest: false };
      useAuthStore.setState({ user: freeUser });

      const quota = await audioService.getImportQuota(false, freeUser);
      expect(quota.isGuest).toBe(false);
      expect(quota.isVipOrAdmin).toBe(false);
      expect(quota.todayImportCount).toBe(0);
      expect(quota.maxImportsPerDay).toBe(5);
      expect(quota.remaining).toBe(5);
      expect(quota.canImport).toBe(true);
    });

    it('blocks guest from importing', async () => {
      const guestUser: User = { id: 0, username: 'guest', role: 'GUEST', isGuest: true };
      useAuthStore.setState({ user: guestUser });

      const quota = await audioService.getImportQuota(false, guestUser);
      expect(quota.canImport).toBe(false);
      expect(quota.isGuest).toBe(true);
    });

    it('gives VIP user unlimited imports', async () => {
      const vipUser: User = { id: 400, username: 'vip_king', role: 'VIP', membership: 'VIP', isGuest: false };
      useAuthStore.setState({ user: vipUser });

      const quota = await audioService.getImportQuota(false, vipUser);
      expect(quota.canImport).toBe(true);
      expect(quota.isVipOrAdmin).toBe(true);
      expect(quota.remaining).toBe(999999);
    });

    it('counts daily imports correctly and blocks when exceeding 5 imports/day', async () => {
      const freeUser: User = { id: 500, username: 'cày_chay', role: 'USER', membership: 'FREE', isGuest: false };
      useAuthStore.setState({ user: freeUser });

      const todayStr = new Date().toISOString().split('T')[0];
      const quotaKey = `yt_import_quota_${freeUser.id}`;

      // Simulate 4 imports already done today
      localStorage.setItem(quotaKey, JSON.stringify({ date: todayStr, count: 4 }));

      let quota = await audioService.getImportQuota(false, freeUser);
      expect(quota.todayImportCount).toBe(4);
      expect(quota.remaining).toBe(1);
      expect(quota.canImport).toBe(true);

      // 5th import succeeds
      await audioService.importYouTube(
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          categoryId: 1,
          tags: ['Test'],
        },
        false,
        freeUser.id
      );

      // Now quota is exhausted (5/5)
      quota = await audioService.getImportQuota(false, freeUser);
      expect(quota.todayImportCount).toBe(5);
      expect(quota.remaining).toBe(0);
      expect(quota.canImport).toBe(false);

      // 6th import must fail
      await expect(
        audioService.importYouTube(
          {
            url: 'https://www.youtube.com/watch?v=another1234',
            categoryId: 1,
            tags: ['Test'],
          },
          false,
          freeUser.id
        )
      ).rejects.toThrow('Bạn đã dùng hết lượt nhập link miễn phí hôm nay');
    }, 15000);
  });

  describe('Exclusive VIP Audio & Episode Locking', () => {
    it('tags episodes as VIP when uploaded with isVipOnly', async () => {
      const user: User = { id: 600, username: 'creator', role: 'USER', isGuest: false };
      useAuthStore.setState({ user });

      const result = await audioService.importYouTube(
        {
          url: 'https://www.youtube.com/watch?v=vipvideo123',
          categoryId: 1,
          tags: ['VIPOnly'],
          durationSeconds: 36000,
          blockSizeSeconds: 14400,
          isVipOnly: true,
        },
        false,
        user.id
      );

      expect(result.audio.isVIPOnly).toBe(true);
      expect(result.audio.isVipOnly).toBe(true);
      expect(result.audio.episodes).toBeDefined();
      expect(result.audio.episodes!.length).toBeGreaterThan(1);
      expect(result.audio.episodes![0].isVip).toBe(true);
      expect(result.audio.episodes![1].isVip).toBe(true);
    });

    it('allows free user to preview Episode 1, but locks Episode 2+ of VIP audio', async () => {
      const freeUser: User = { id: 700, username: 'free_listener', role: 'USER', membership: 'FREE', isGuest: false };
      useAuthStore.setState({ user: freeUser });

      const vipAudioItem: AudioItem = {
        id: 9999,
        youtubeVideoId: 'viptest8888',
        youtubeUrl: 'https://www.youtube.com/watch?v=viptest8888',
        title: 'Truyện Tiên Hiệp VIP',
        author: 'VIP Author',
        categoryId: 1,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        totalDurationSeconds: 28800,
        totalEpisodes: 2,
        isVIPOnly: true,
        isVipOnly: true,
        episodes: [
          {
            id: 101,
            audioId: 9999,
            episodeNumber: 1,
            title: 'Tập 1',
            startSeconds: 0,
            endSeconds: 14400,
            duration: 14400,
            isVip: true,
          },
          {
            id: 102,
            audioId: 9999,
            episodeNumber: 2,
            title: 'Tập 2',
            startSeconds: 14400,
            endSeconds: 28800,
            duration: 14400,
            isVip: true,
          },
        ],
      };

      const localDbManager = (await import('@/services/localDb')).localDb;
      const db = localDbManager.get();
      db.audios = [vipAudioItem];
      localDbManager.save();

      const loadedAudio = await audioService.getAudioById(9999, false);
      expect(loadedAudio).toBeDefined();
      expect(loadedAudio?.episodes).toHaveLength(2);

      // Episode 1: Free preview allowed (isLocked: false)
      expect(loadedAudio?.episodes![0].episodeNumber).toBe(1);
      expect(loadedAudio?.episodes![0].isLocked).toBe(false);

      // Episode 2: Locked for regular user (isLocked: true)
      expect(loadedAudio?.episodes![1].episodeNumber).toBe(2);
      expect(loadedAudio?.episodes![1].isLocked).toBe(true);
    });

    it('unlocks all episodes for VIP user on VIP audio', async () => {
      const vipUser: User = { id: 800, username: 'vip_listener', role: 'VIP', membership: 'VIP', isGuest: false };
      useAuthStore.setState({ user: vipUser });

      const vipAudioItem: AudioItem = {
        id: 8888,
        youtubeVideoId: 'viptest9999',
        youtubeUrl: 'https://www.youtube.com/watch?v=viptest9999',
        title: 'Truyện Độc Quyền VIP',
        author: 'VIP Master',
        categoryId: 1,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        totalDurationSeconds: 28800,
        totalEpisodes: 2,
        isVIPOnly: true,
        isVipOnly: true,
        episodes: [
          {
            id: 201,
            audioId: 8888,
            episodeNumber: 1,
            title: 'Tập 1',
            startSeconds: 0,
            endSeconds: 14400,
            duration: 14400,
            isVip: true,
          },
          {
            id: 202,
            audioId: 8888,
            episodeNumber: 2,
            title: 'Tập 2',
            startSeconds: 14400,
            endSeconds: 28800,
            duration: 14400,
            isVip: true,
          },
        ],
      };

      const localDbManager = (await import('@/services/localDb')).localDb;
      const db = localDbManager.get();
      db.audios = [vipAudioItem];
      localDbManager.save();

      const loadedAudio = await audioService.getAudioById(8888, false);
      expect(loadedAudio).toBeDefined();
      // VIP gets all episodes unlocked
      expect(loadedAudio?.episodes![0].isLocked).toBe(false);
      expect(loadedAudio?.episodes![1].isLocked).toBe(false);
    });

    it('allows regular user and guest to listen to episode 1 free on VIP audio', async () => {
      const guestUser: User = { id: 0, username: 'Khách Nghe Thử', role: 'GUEST', isGuest: true };
      useAuthStore.setState({ user: guestUser });

      const singleEpVipAudio: AudioItem = {
        id: 7777,
        youtubeVideoId: 'viptest7777',
        youtubeUrl: 'https://www.youtube.com/watch?v=viptest7777',
        title: 'Truyện Ngắn VIP (1 Tập)',
        author: 'VIP Master',
        categoryId: 1,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        totalDurationSeconds: 14400,
        totalEpisodes: 1,
        isVIPOnly: true,
        isVipOnly: true,
        episodes: [
          {
            id: 701,
            audioId: 7777,
            episodeNumber: 1,
            title: 'Tập 1 Trọn Bộ',
            startSeconds: 0,
            endSeconds: 14400,
            duration: 14400,
            isVip: true,
          },
        ],
      };

      const localDbManager = (await import('@/services/localDb')).localDb;
      const db = localDbManager.get();
      db.audios = [singleEpVipAudio];
      localDbManager.save();

      const loadedAudio = await audioService.getAudioById(7777, false);
      expect(loadedAudio).toBeDefined();
      expect(loadedAudio?.episodes).toHaveLength(1);
      // Episode 1 is ALWAYS free for guest and regular user!
      expect(loadedAudio?.episodes![0].isLocked).toBe(false);
    });
  });

  describe('Admin VIP Management & Package Tier Locking & Accumulation', () => {
    it('allows admin to update and fetch custom payment info', async () => {
      const customPay = {
        bankName: 'Techcombank',
        accountNumber: '8888999900',
        accountName: 'CONG TY WAVELINK',
        notePrefix: 'WAVE',
      };

      await membershipService.updatePaymentInfo(customPay, false);
      const info = await membershipService.getPaymentInfo(false);

      expect(info.bankName).toBe('Techcombank');
      expect(info.accountNumber).toBe('8888999900');
      expect(info.accountName).toBe('CONG TY WAVELINK');
      expect(info.notePrefix).toBe('WAVE');

      // Created order will use the custom payment info
      const order = await membershipService.createOrder('VIP_1M', false);
      expect(order.bankName).toBe('Techcombank');
      expect(order.accountNumber).toBe('8888999900');
      expect(order.accountName).toBe('CONG TY WAVELINK');
      expect(order.orderCode).toContain('WAVE-');
    });

    it('locks 1-month package after registration and allows upgrade with accumulated time', async () => {
      const user: User = { id: 1000, username: 'subscriber', role: 'USER', membership: 'FREE', isGuest: false };
      useAuthStore.setState({ user });

      // 1. Initial: all packages are available
      let pkgs = await membershipService.getPackages(false);
      expect(pkgs[0].isLocked).toBe(false);
      expect(pkgs[1].isLocked).toBe(false);

      // 2. User buys 1-Month VIP package
      await membershipService.createOrder('VIP_1M', false);
      await membershipService.simulatePayment('order-1m', 'SUCCESS', false);

      const updatedUser = useAuthStore.getState().user;
      expect(updatedUser?.role).toBe('VIP');
      const firstExpiry = new Date(updatedUser?.vipExpiresAt || '').getTime();
      expect(firstExpiry).toBeGreaterThan(Date.now());

      // 3. Check packages: 1-Month is locked, 3-Month and 1-Year can upgrade
      pkgs = await membershipService.getPackages(false);
      const pkg1m = pkgs.find((p) => p.id === 'VIP_1M');
      expect(pkg1m?.isLocked).toBe(true);
      expect(pkg1m?.isCurrent).toBe(true);

      const pkg3m = pkgs.find((p) => p.id === 'VIP_3M');
      expect(pkg3m?.isLocked).toBe(false);
      expect(pkg3m?.canUpgrade).toBe(true);

      // 4. Trying to buy 1-Month again throws an error
      await expect(membershipService.createOrder('VIP_1M', false)).rejects.toThrow(
        'Bạn đã đăng ký gói này và gói hiện đang bị khóa'
      );

      // 5. User upgrades to 3-Month package -> Duration accumulates!
      await membershipService.createOrder('VIP_3M', false);
      await membershipService.simulatePayment('order-3m', 'SUCCESS', false);

      const upgradedUser = useAuthStore.getState().user;
      const secondExpiry = new Date(upgradedUser?.vipExpiresAt || '').getTime();

      // Second expiry should be approximately firstExpiry + 90 days (7,776,000,000 ms)
      const diffMs = secondExpiry - firstExpiry;
      const daysAdded = Math.round(diffMs / (24 * 3600 * 1000));
      expect(daysAdded).toBe(90);

      // 6. Both 1-Month and 3-Month are now locked
      pkgs = await membershipService.getPackages(false);
      expect(pkgs.find((p) => p.id === 'VIP_1M')?.isLocked).toBe(true);
      expect(pkgs.find((p) => p.id === 'VIP_3M')?.isLocked).toBe(true);
      expect(pkgs.find((p) => p.id === 'VIP_1Y')?.isLocked).toBe(false);
      expect(pkgs.find((p) => p.id === 'VIP_1Y')?.canUpgrade).toBe(true);
    });
  });
});