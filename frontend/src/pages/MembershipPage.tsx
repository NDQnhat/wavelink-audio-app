import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMembershipPackages, useMyMembership, useCreateMembershipOrder, useSimulatePayment } from '@/hooks/useMembership';
import { MembershipOrder } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { formatVND } from '@/lib/utils';
import { LoadingState } from '@/components/common/LoadingState';

export const MembershipPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: packages = [], isLoading: pkgLoading } = useMembershipPackages();
  const { data: myMembership } = useMyMembership();

  const createOrderMutation = useCreateMembershipOrder();
  const simulatePaymentMutation = useSimulatePayment();

  const isVip = myMembership?.isVip || user?.role === 'VIP' || user?.role === 'ADMIN';

  const [selectedPkgId, setSelectedPkgId] = useState<string>('VIP_3M');
  const [activeOrder, setActiveOrder] = useState<MembershipOrder | null>(null);
  const [countdownSec, setCountdownSec] = useState<number>(15 * 60);

  useEffect(() => {
    if (packages.length > 0 && !packages.find((p) => p.id === selectedPkgId)) {
      setSelectedPkgId(packages[0].id);
    }
  }, [packages, selectedPkgId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeOrder) {
      setCountdownSec(15 * 60);
      interval = setInterval(() => {
        setCountdownSec((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeOrder]);

  const getExpiryText = () => {
    if (!myMembership?.vipExpiresAt) return 'Chưa kích hoạt VIP';
    const d = new Date(myMembership.vipExpiresAt);
    return `Hạn dùng đến: ${d.toLocaleDateString('vi-VN')} (${myMembership.daysRemaining || 0} ngày còn lại)`;
  };

  const handleCreateOrder = async () => {
    try {
      toast.info('Đang tạo đơn hàng và mã VietQR thanh toán...');
      const order = await createOrderMutation.mutateAsync(selectedPkgId);
      setActiveOrder(order);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi tạo đơn hàng');
    }
  };

  const handleSimulatePayment = async (status: 'SUCCESS' | 'FAILED') => {
    if (!activeOrder) return;
    try {
      toast.info('Đang mô phỏng giao dịch qua Webhook...');
      await simulatePaymentMutation.mutateAsync({
        orderCode: activeOrder.orderCode,
        status,
      });
      setActiveOrder(null);
      if (status === 'SUCCESS') {
        toast.success('🎉 Thanh toán thành công! Bạn đã được kích hoạt VIP!');
      } else {
        toast.error('Đơn hàng đã được đánh dấu thất bại');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi mô phỏng thanh toán');
    }
  };

  const formatTimer = (sec: number) => {
    if (sec <= 0) return 'HẾT HẠN';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}`;
  };

  if (pkgLoading) {
    return <LoadingState message="Đang tải danh sách gói VIP..." />;
  }

  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* VIP Hero Card */}
      <div
        className={`card-comic p-5 ${
          isVip ? 'bg-[#2A9D8F]' : 'bg-[#8338EC]'
        } text-white flex flex-col gap-2 border-3 border-black shadow-comic-lg`}
      >
        <div className="flex items-center justify-between">
          <span className="badge-comic badge-comic-yellow text-[10px] font-black">
            <i className="ri-vip-crown-fill text-black" /> {isVip ? 'VIP ACTIVE' : 'VIP PASS'}
          </span>
          <span className="text-xs font-bold text-white/90 font-mono">
            {isVip ? 'ĐẶC QUYỀN CAO CẤP' : 'DÀNH CHO FAN CHÂN CHÍNH'}
          </span>
        </div>
        <h1 className="font-extrabold text-2xl uppercase tracking-tight text-black mt-1">
          {isVip ? 'Hội Viên VIP Đang Hoạt Động' : 'Gói Hội Viên VIP'}
        </h1>
        <p className="text-xs font-semibold text-black/90">
          {isVip
            ? getExpiryText()
            : 'Mở khóa toàn bộ kho truyện giới hạn, không giới hạn lượt import YouTube và tốc độ đồng bộ tiến trình ưu tiên cao nhất!'}
        </p>
      </div>

      {/* Package Selection Cards */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3">
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
          <span className="font-extrabold text-xs uppercase text-black">Chọn Gói Hội Viên Phù Hợp</span>
          <span className="badge-comic badge-comic-yellow text-[9px] font-black">ƯU ĐÃI NĂM 2026</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {packages.map((pkg) => {
            const isSelected = pkg.id === selectedPkgId;
            const isHot = pkg.id === 'VIP_3M';
            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkgId(pkg.id)}
                className={`card-comic-sm p-3.5 flex items-center justify-between gap-3 border-2 border-black cursor-pointer transition-all ${
                  isSelected ? 'bg-[#FEF9C3] shadow-comic' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg border-2 border-black flex items-center justify-center shrink-0 shadow-comic-sm ${
                      isSelected ? 'bg-[#FFE600] text-black font-black' : 'bg-gray-100 text-black font-bold'
                    }`}
                  >
                    <i className="ri-vip-diamond-fill text-xl" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-black">{pkg.name}</span>
                      {isHot && (
                        <span className="badge-comic badge-comic-red text-[8px] py-0 px-1 font-black">
                          KHUYÊN DÙNG
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500 truncate">{pkg.description}</span>
                    <span className="text-[10px] font-bold text-gray-700 font-mono mt-0.5">
                      Thời hạn: {pkg.durationDays} ngày
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="font-extrabold text-sm text-[#E63946]">{formatVND(pkg.priceVND)}</span>
                  <span
                    className={`badge-comic ${
                      isSelected ? 'badge-comic-teal' : 'badge-comic-white'
                    } text-[9px] py-0 px-1 mt-1 font-bold`}
                  >
                    {isSelected ? 'ĐÃ CHỌN' : 'CHỌN GÓI'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleCreateOrder}
          disabled={createOrderMutation.isPending}
          className="btn-comic btn-comic-yellow text-sm py-3 px-4 font-black shadow-comic-md mt-2"
        >
          {createOrderMutation.isPending ? (
            <span className="flex items-center gap-2">
              <i className="ri-loader-4-line animate-spin text-lg" /> Đang tạo đơn...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <i className="ri-qr-code-line text-lg" /> TẠO MÃ QR THANH TOÁN (VIETQR)
            </span>
          )}
        </button>
      </div>

      {/* Benefits 4-Pillars Card */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3">
        <span className="font-extrabold text-xs uppercase text-black border-b-2 border-black pb-1.5">
          Quyền Lợi Độc Quyền Hội Viên VIP
        </span>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#FFE600] flex items-center justify-center text-black shrink-0 shadow-comic-sm font-black">
              <i className="ri-infinity-line text-lg" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-black">Không Giới Hạn Nhập YouTube</span>
              <span className="text-[11px] font-semibold text-gray-600">
                Thành viên thường bị giới hạn 5 video/ngày. VIP được cày truyện tẹt ga.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#3A86FF] flex items-center justify-center text-white shrink-0 shadow-comic-sm font-black">
              <i className="ri-vip-diamond-fill text-lg" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-black">Truy Cập Toàn Bộ Truyện VIP Only</span>
              <span className="text-[11px] font-semibold text-gray-600">
                Nghe trọn vẹn các bộ truyện đỉnh cao được tác giả gắn nhãn độc quyền VIP.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#2A9D8F] flex items-center justify-center text-white shrink-0 shadow-comic-sm font-black">
              <i className="ri-flashlight-fill text-lg" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-black">Đồng Bộ Tiến Trình Siêu Tốc</span>
              <span className="text-[11px] font-semibold text-gray-600">
                Bảo toàn từng giây nghe trên đám mây, resume chuẩn xác trên mọi thiết bị.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VietQR Payment Modal */}
      <Modal
        isOpen={Boolean(activeOrder)}
        onClose={() => setActiveOrder(null)}
        title="MÃ THANH TOÁN VIETQR VIP"
        showFooter={false}
      >
        {activeOrder && (
          <div className="flex flex-col items-center text-center gap-2">
            <div className="relative p-1.5 bg-white rounded-lg border-2 border-black shadow-comic-sm w-36 h-36 flex items-center justify-center overflow-hidden shrink-0">
              <img src={activeOrder.qrCodeUrl} alt="VietQR" className="w-full h-full object-contain" />
            </div>

            <div className="badge-comic badge-comic-red text-[10px] font-mono font-black py-0.5 px-2">
              <i className="ri-timer-line" /> Hết hạn: <span>{formatTimer(countdownSec)}</span>
            </div>

            <div className="card-comic-sm p-2 bg-gray-50 border border-black w-full text-left flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between items-center py-0.5 border-b border-gray-200">
                <span className="text-gray-600 font-semibold">Ngân hàng:</span>
                <strong className="text-black font-bold">{activeOrder.bankName}</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-gray-200">
                <span className="text-gray-600 font-semibold">Số tài khoản:</span>
                <strong className="text-black font-mono font-bold">{activeOrder.accountNumber}</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-gray-200">
                <span className="text-gray-600 font-semibold">Chủ TK:</span>
                <strong className="text-black font-bold">{activeOrder.accountName}</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-gray-200">
                <span className="text-gray-600 font-semibold">Số tiền:</span>
                <strong className="text-[#E63946] font-extrabold text-xs sm:text-sm">{formatVND(activeOrder.amount)}</strong>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-600 font-semibold">Nội dung CK:</span>
                <strong className="text-black font-mono font-bold text-[11px] bg-yellow-100 px-1 py-0.5 rounded border border-black/30">
                  {activeOrder.transferContent}
                </strong>
              </div>
            </div>

            <div className="card-comic-sm p-1.5 bg-[#FEF9C3] text-[10px] font-semibold text-gray-700 border border-black text-left w-full leading-tight">
              ⚡ Quét tự động qua SePay/VietQR. Tài khoản sẽ nâng cấp tức thì khi chuyển khoản thành công!
            </div>

            {/* Simulated Payment Triggers for Dev / Testing */}
            <div className="flex items-center gap-1.5 w-full pt-0.5">
              <button
                onClick={() => handleSimulatePayment('SUCCESS')}
                className="btn-comic btn-comic-teal text-[11px] py-1.5 font-black flex-1"
              >
                <i className="ri-check-line" /> Giả Lập Thành Công
              </button>
              <button
                onClick={() => handleSimulatePayment('FAILED')}
                className="btn-comic btn-comic-red text-[11px] py-1.5 font-black flex-1"
              >
                <i className="ri-close-line" /> Giả Lập Thất Bại
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

