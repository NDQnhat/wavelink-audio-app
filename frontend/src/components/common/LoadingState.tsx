import React from 'react';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center gap-3 fade-in-comic">
      <div className="w-12 h-12 rounded-full border-2 border-black bg-[#FFE600] flex items-center justify-center shadow-comic">
        <i className="ri-loader-4-line text-2xl text-black animate-spin" />
      </div>
      <span className="text-xs font-bold text-gray-700">{message}</span>
    </div>
  );
};
