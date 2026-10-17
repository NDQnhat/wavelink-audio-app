import React, { useState, useEffect } from 'react';
import { AdminTabs } from './AdminTabs';
import { useMembershipPackages, usePaymentInfo, useUpdatePaymentInfo, useUpdatePackages, useResetPackages } from '@/hooks/useMembership';
import { MembershipPackage, PaymentInfo } from '@/types';
import { toast } from '@/components/ui/Toast';
import { formatVND } from '@/lib/utils';
import { LoadingState } from '@/components/common/LoadingState';
import { AdminVipSkeleton } from '@/components/common/Skeletons';

export const AdminVipPage: React.FC = () => {
  const { data: serverPackages = [], isLoading: pkgsLoading } = useMembershipPackages();
  const { data: serverPaymentInfo, isLoading: payLoading } = usePaymentInfo();

  const updatePaymentInfoMutation = useUpdatePaymentInfo();
  const updatePackagesMutation = useUpdatePackages();
  const resetPackagesMutation = useResetPackages();

  // Payment form state
  const [bankName, setBankName] = useState('MB Bank (Quân Đội)');
  const [accountNumber, setAccountNumber] = useState('0987654321');
  const [accountName, setAccountName] = useState('COMIC AUDIO HUB');
  const [notePrefix, setNotePrefix] = useState('VIP');

  // Packages list state
  const [packages, setPackages] = useState<MembershipPackage[]>([]);

  useEffect(() => {
    if (serverPaymentInfo) {
      setBankName(serverPaymentInfo.bankName || 'MB Bank (Quân Đội)');
      setAccountNumber(serverPaymentInfo.accountNumber || '0987654321');
      setAccountName(serverPaymentInfo.accountName || 'COMIC AUDIO HUB');
      setNotePrefix(serverPaymentInfo.notePrefix || 'VIP');
    }
  }, [serverPaymentInfo]);

  useEffect(() => {
    if (serverPackages && serverPackages.length > 0) {
      setPackages(JSON.parse(JSON.stringify(serverPackages)));
    }
  }, [serverPackages]);

  const handleSavePaymentInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error('Vui lòng điền đầy đủ tên ngân hàng, STK và tên chủ tài khoản!');
      return;
    }

    try {
      toast.info('Đang lưu thông tin chuyển khoản...');
      await updatePaymentInfoMutation.mutateAsync({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim().toUpperCase(),
        notePrefix: notePrefix.trim().toUpperCase() || 'VIP',
      });
      toast.success('🎉 Đã cập nhật thông tin tài khoản ngân hàng & VietQR!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi lưu thông tin ngân hàng');
    }
  };

  const handlePackageChange = (index: number, field: keyof MembershipPackage, val: unknown) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: val };
    setPackages(updated);
  };

  const handlePerkChange = (pkgIndex: number, perkIndex: number, val: string) => {
    const updated = [...packages];
    const perks = [...(updated[pkgIndex].perks || [])];
    perks[perkIndex] = val;
    updated[pkgIndex] = { ...updated[pkgIndex], perks };
    setPackages(updated);
  };

  const handleAddPerk = (pkgIndex: number) => {
    const updated = [...packages];
    const perks = [...(updated[pkgIndex].perks || []), 'Đặc quyền mới'];
    updated[pkgIndex] = { ...updated[pkgIndex], perks };
    setPackages(updated);
  };

  const handleRemovePerk = (pkgIndex: number, perkIndex: number) => {
    const updated = [...packages];
    const perks = (updated[pkgIndex].perks || []).filter((_, idx) => idx !== perkIndex);
    updated[pkgIndex] = { ...updated[pkgIndex], perks };
    setPackages(updated);
  };

  const handleSavePackages = async () => {
    try {
      toast.info('Đang lưu bảng giá và gói VIP...');
      await updatePackagesMutation.mutateAsync(packages);
      toast.success('🎉 Đã lưu cấu hình gói VIP thành công!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi lưu gói VIP');
    }
  };

  const handleResetPackages = async () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục danh sách gói VIP về mặc định của hệ thống?')) return;
    try {
      toast.info('Đang khôi phục mặc định...');
      await resetPackagesMutation.mutateAsync();
      toast.success('Đã khôi phục gói VIP về mặc định!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khôi phục');
    }
  };

  if (pkgsLoading || payLoading) {
    return <AdminVipSkeleton />;
  }

  const demoQrUrl = `https://img.vietqr.io/image/970422-${accountNumber.trim()}-compact2.png?amount=49000&addInfo=${encodeURIComponent(
    `${notePrefix.trim()}-DEMO-12345`
  )}&accountName=${encodeURIComponent(accountName.trim())}`;

  return (
    <div className="flex flex-col w-full px-4 pb-36 gap-4 pt-2 fade-in-comic">
      <AdminTabs activeTab="vip" />

      {/* Header Banner */}
      <div className="card-comic p-4 bg-[#8338EC] text-white flex flex-col gap-1 border-2 border-black shadow-comic">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#FFE600] text-black flex items-center justify-center font-black shadow-comic-sm">
              <i className="ri-vip-crown-fill text-xl" />
            </div>
            <h2 className="font-extrabold text-base uppercase tracking-tight text-white">
              Quản Trị Gói VIP & Thanh Toán VietQR
            </h2>
          </div>
          <span className="badge-comic badge-comic-yellow text-[9px] font-black">ADMIN VIP PANEL</span>
        </div>
        <p className="text-xs font-semibold text-white/90 mt-0.5">
          Tùy chỉnh thông tin người nhận chuyển tiền (ngân hàng, STK, chủ TK) và điều chỉnh giá tiền, số ngày hiệu lực của các gói hội viên.
        </p>
      </div>

      {/* 1. Thông Tin Nhận Chuyển Khoản Ngân Hàng (VietQR) */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3.5 border-2 border-black">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <i className="ri-bank-card-fill text-xl text-[#3A86FF]" />
            <h3 className="font-extrabold text-sm uppercase text-black">
              Thông Tin Tài Khoản Nhận Chuyển Tiền (VietQR)
            </h3>
          </div>
          <span className="badge-comic badge-comic-teal text-[8px] font-bold">CÓ LƯU ENV & DATABASE</span>
        </div>

        <form onSubmit={handleSavePaymentInfo} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black" htmlFor="admin-bank-name">
                Tên Ngân Hàng:
              </label>
              <input
                id="admin-bank-name"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ví dụ: MB Bank (Quân Đội)"
                className="input-comic text-xs font-bold w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black" htmlFor="admin-acc-num">
                Số Tài Khoản (STK):
              </label>
              <input
                id="admin-acc-num"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Ví dụ: 0987654321"
                className="input-comic text-xs font-mono font-bold w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black" htmlFor="admin-acc-name">
                Tên Chủ Tài Khoản:
              </label>
              <input
                id="admin-acc-name"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ví dụ: COMIC AUDIO HUB"
                className="input-comic text-xs font-bold uppercase w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black" htmlFor="admin-note-prefix">
                Tiền Tố Nội Dung Chuyển Khoản:
              </label>
              <input
                id="admin-note-prefix"
                type="text"
                value={notePrefix}
                onChange={(e) => setNotePrefix(e.target.value)}
                placeholder="Mặc định: VIP"
                className="input-comic text-xs font-mono font-bold uppercase w-full"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="card-comic-sm p-3 bg-[#FEF9C3] flex items-center gap-3 border border-black">
            <div className="w-16 h-16 rounded border border-black bg-white p-1 shrink-0 overflow-hidden">
              <img src={demoQrUrl} alt="VietQR Demo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 text-[11px] font-semibold text-gray-800">
              <span className="font-extrabold text-black">Mẫu VietQR sẽ hiển thị cho độc giả:</span>
              <span className="truncate">Ngân hàng: <strong>{bankName}</strong></span>
              <span className="truncate font-mono">STK: <strong>{accountNumber}</strong> • Chủ TK: <strong>{accountName}</strong></span>
              <span className="truncate font-mono text-gray-600">Nội dung mẫu: {notePrefix}-USERID-XXXXXX</span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={updatePaymentInfoMutation.isPending}
              className="btn-comic btn-comic-teal text-xs py-2 px-4 font-black shadow-comic-sm"
            >
              {updatePaymentInfoMutation.isPending ? 'Đang lưu...' : 'Lưu Thông Tin Ngân Hàng'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Quản Lý Giá Theo Gói & Thông Tin Gói VIP */}
      <div className="card-comic p-4 bg-white flex flex-col gap-4 border-2 border-black">
        <div className="flex items-center justify-between border-b-2 border-black pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <i className="ri-price-tag-3-fill text-xl text-[#FFE600]" />
            <h3 className="font-extrabold text-sm uppercase text-black">
              Bảng Giá & Thông Tin Gói Hội Viên ({packages.length} gói)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetPackages}
              disabled={resetPackagesMutation.isPending}
              className="btn-comic text-[11px] py-1.5 px-3 bg-gray-100"
            >
              <i className="ri-restart-line" /> Khôi phục mặc định
            </button>
            <button
              type="button"
              onClick={handleSavePackages}
              disabled={updatePackagesMutation.isPending}
              className="btn-comic btn-comic-yellow text-xs py-1.5 px-3 font-black shadow-comic-sm"
            >
              <i className="ri-save-line" /> Lưu Bảng Giá Gói
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {packages.map((pkg, pIdx) => (
            <div
              key={pkg.id}
              className="card-comic-sm p-3.5 bg-gray-50 flex flex-col gap-3 border-2 border-black shadow-comic-sm"
            >
              <div className="flex items-center justify-between border-b border-gray-300 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="badge-comic badge-comic-yellow text-[10px] font-black">{pkg.id}</span>
                  <span className="font-extrabold text-sm text-black">{pkg.name}</span>
                </div>
                <span className="font-mono font-black text-sm text-[#E63946]">{formatVND(pkg.priceVND || pkg.amount || 0)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Tên gói hiển thị:</label>
                  <input
                    type="text"
                    value={pkg.name}
                    onChange={(e) => handlePackageChange(pIdx, 'name', e.target.value)}
                    className="input-comic text-xs font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Giá bán thực tế (VNĐ):</label>
                  <input
                    type="number"
                    value={pkg.priceVND || pkg.amount || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handlePackageChange(pIdx, 'priceVND', val);
                      handlePackageChange(pIdx, 'amount', val);
                    }}
                    className="input-comic text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Thời hạn hiệu lực (Ngày):</label>
                  <input
                    type="number"
                    value={pkg.durationDays}
                    onChange={(e) => handlePackageChange(pIdx, 'durationDays', Number(e.target.value))}
                    className="input-comic text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Giá gốc gạch ngang (VNĐ):</label>
                  <input
                    type="number"
                    value={pkg.originalCost || 0}
                    onChange={(e) => handlePackageChange(pIdx, 'originalCost', Number(e.target.value))}
                    className="input-comic text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Huy hiệu ưu đãi / Giảm giá:</label>
                  <input
                    type="text"
                    value={pkg.discount || ''}
                    onChange={(e) => handlePackageChange(pIdx, 'discount', e.target.value)}
                    placeholder="Ví dụ: Tiết kiệm 27% (Khuyên dùng)"
                    className="input-comic text-xs font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Mô tả ngắn gọn:</label>
                  <input
                    type="text"
                    value={pkg.description}
                    onChange={(e) => handlePackageChange(pIdx, 'description', e.target.value)}
                    className="input-comic text-xs"
                  />
                </div>
              </div>

              {/* Perks Management */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-gray-700 uppercase">
                    Danh Sách Đặc Quyền ({pkg.perks?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddPerk(pIdx)}
                    className="btn-comic text-[10px] py-0.5 px-2 bg-white"
                  >
                    + Thêm đặc quyền
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {(pkg.perks || []).map((perk, perkIdx) => (
                    <div key={perkIdx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={perk}
                        onChange={(e) => handlePerkChange(pIdx, perkIdx, e.target.value)}
                        className="input-comic text-[11px] py-1 px-2 flex-1 bg-white font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePerk(pIdx, perkIdx)}
                        className="w-6 h-6 rounded border border-black bg-white flex items-center justify-center text-red-600 hover:bg-red-50 text-xs font-black shrink-0"
                        title="Xóa"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSavePackages}
            disabled={updatePackagesMutation.isPending}
            className="btn-comic btn-comic-yellow text-sm py-2 px-5 font-black shadow-comic-sm"
          >
            {updatePackagesMutation.isPending ? 'Đang lưu...' : 'Lưu Toàn Bộ Cấu Hình Gói VIP'}
          </button>
        </div>
      </div>

      {/* 3. Cơ Chế Giới Hạn Gói / Nâng Cấp Cộng Dồn */}
      <div className="card-comic p-4 bg-[#FEF9C3] flex flex-col gap-2 border-2 border-black">
        <div className="flex items-center gap-2">
          <i className="ri-information-fill text-lg text-black font-bold" />
          <h4 className="font-extrabold text-xs uppercase text-black">
            Cơ Chế Giới Hạn Gói & Nâng Cấp Cộng Dồn Thời Gian VIP
          </h4>
        </div>
        <ul className="text-xs font-semibold text-gray-800 list-disc list-inside space-y-1">
          <li>
            <strong>Khóa gói đã đăng ký:</strong> Khi một người dùng đăng ký Gói 1 Tháng, gói đó sẽ bị khóa lại đối với tài khoản đó để ngăn mua lặp lại cùng cấp.
          </li>
          <li>
            <strong>Cho phép nâng cấp:</strong> Người dùng có thể nâng cấp lên các gói cao hơn (Gói 3 Tháng hoặc Gói 1 Năm).
          </li>
          <li>
            <strong>Cộng dồn thời hạn:</strong> Khi nâng cấp gói cao hơn, toàn bộ số ngày còn lại của gói cũ sẽ được cộng dồn với thời hạn của gói mới (ví dụ còn 25 ngày + 90 ngày = 115 ngày VIP).
          </li>
          <li>
            <strong>Tự động khóa gói cũ:</strong> Sau khi nâng cấp, tất cả các gói bằng hoặc thấp hơn gói mới đều tự động khóa lại đối với tài khoản đó.
          </li>
        </ul>
      </div>
    </div>
  );
};