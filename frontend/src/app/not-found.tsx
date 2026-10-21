import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[60vh] text-center">
      <div className="card-comic p-8 max-w-sm w-full bg-white border-2 border-black flex flex-col items-center gap-4 shadow-[4px_4px_0_#000]">
        <div className="w-16 h-16 rounded-full border-2 border-black bg-[#FFE600] flex items-center justify-center font-black text-2xl shadow-[2px_2px_0_#000]">
          404
        </div>
        <h2 className="font-black text-lg uppercase text-black">
          Không Tìm Thấy Trang
        </h2>
        <p className="text-xs font-semibold text-gray-600">
          Nội dung hoặc audio bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link
          href="/home"
          className="btn-comic btn-comic-primary text-xs py-2 px-4 font-bold mt-2"
        >
          <i className="ri-home-4-line mr-1" /> Về Trang Chủ
        </Link>
      </div>
    </div>
  );
}
