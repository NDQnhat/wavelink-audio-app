import { axiosClient } from '@/lib/axiosClient';
import { MembershipPackage, MembershipOrder, MyMembership } from '@/types';

export const membershipService = {
  async getPackages(isLive = true): Promise<MembershipPackage[]> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: MembershipPackage[] }>('/membership/packages');
        if (res.data.success && Array.isArray(res.data.data)) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('getPackages live API failed:', err);
      }
    }

    return [
      {
        id: 'VIP_1M',
        name: 'Gói 1 Tháng',
        durationDays: 30,
        priceVND: 49000,
        description: 'Trải nghiệm toàn bộ kho truyện VIP & không giới hạn import',
      },
      {
        id: 'VIP_3M',
        name: 'Gói 3 Tháng',
        durationDays: 90,
        priceVND: 129000,
        description: 'Tiết kiệm 15% - Đồng bộ tốc độ cao',
      },
      {
        id: 'VIP_1Y',
        name: 'Gói 1 Năm',
        durationDays: 365,
        priceVND: 399000,
        description: 'Tiết kiệm 35% - Đặc quyền tối cao',
      },
    ];
  },

  async getMyMembership(isLive = true): Promise<MyMembership> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: MyMembership }>('/membership/me');
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('getMyMembership failed:', err);
      }
    }
    return { role: 'GUEST', isVip: false };
  },

  async createOrder(packageId: string, isLive = true): Promise<MembershipOrder> {
    if (isLive) {
      const res = await axiosClient.post<{ success: boolean; data: MembershipOrder; error?: { message?: string } }>(
        '/membership/orders',
        { packageId }
      );
      if (res.data.success && res.data.data) {
        return res.data.data;
      }
      throw new Error(res.data.error?.message || 'Không thể tạo đơn hàng');
    }
    throw new Error('Chỉ hỗ trợ khi có kết nối backend');
  },

  async getOrder(orderCode: string, isLive = true): Promise<MembershipOrder | null> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: MembershipOrder }>(
          `/membership/orders/${orderCode}`
        );
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
      } catch {
        return null;
      }
    }
    return null;
  },

  async simulatePayment(orderCode: string, status: 'SUCCESS' | 'FAILED' = 'SUCCESS', isLive = true): Promise<unknown> {
    if (isLive) {
      const res = await axiosClient.post<{ success: boolean; data: unknown; error?: { message?: string } }>(
        `/membership/orders/${orderCode}/simulate`,
        { status }
      );
      if (res.data.success) {
        return res.data.data;
      }
      throw new Error(res.data.error?.message || 'Lỗi mô phỏng thanh toán');
    }
    throw new Error('Chỉ hỗ trợ khi có kết nối backend');
  },

  async cancelVip(reason?: string, isLive = true): Promise<boolean> {
    if (isLive) {
      const res = await axiosClient.post<{ success: boolean; message?: string }>('/membership/cancel-vip', { reason });
      if (!res.data.success) throw new Error(res.data.message || 'Lỗi khi hủy gói VIP');
      return true;
    }
    return false;
  },

  async requestRefund(orderCode: string, reason: string, bankInfo?: string, isLive = true): Promise<boolean> {
    if (isLive) {
      const res = await axiosClient.post<{ success: boolean; message?: string }>('/membership/refund', {
        orderCode,
        reason,
        bankInfo,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Lỗi gửi yêu cầu hoàn tiền');
      return true;
    }
    return false;
  },

  async submitComplaint(subject: string, content: string, category = 'Chung', isLive = true): Promise<boolean> {
    if (isLive) {
      const res = await axiosClient.post<{ success: boolean; message?: string }>('/membership/complaint', {
        subject,
        content,
        category,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Lỗi gửi khiếu nại');
      return true;
    }
    return false;
  },
};
