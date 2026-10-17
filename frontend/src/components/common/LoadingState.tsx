import React from 'react';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center gap-3 bg-white/70 backdrop-blur-md rounded-xl border-2 border-black shadow-comic-sm my-2 fade-in-comic animate-pulse">
      <div className="w-12 h-12 rounded-full border-2 border-black bg-[#FFE600] flex items-center justify-center shadow-comic">
        <i className="ri-loader-4-line text-2xl text-black animate-spin" />
      </div>
      <span className="text-xs font-bold text-gray-800">{message}</span>
    </div>
  );
};
