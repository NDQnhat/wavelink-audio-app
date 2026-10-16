import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
  showItemCount?: boolean;
  alwaysShow?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
  showItemCount = true,
  alwaysShow = false,
}) => {
  if (!alwaysShow && totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 12))) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className={`flex flex-col items-center gap-2 pt-3 pb-2 w-full ${className}`}>
      {/* Page Controls */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* Prev button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className={`btn-comic text-xs py-1 px-2.5 flex items-center gap-1 bg-white ${
            currentPage <= 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:bg-gray-100'
          }`}
          title="Trang trước"
        >
          <i className="ri-arrow-left-s-line text-sm font-bold" />
          <span className="hidden sm:inline font-bold">Trước</span>
        </button>

        {/* Number buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-xs font-bold text-gray-400 select-none">
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded border-2 border-black flex items-center justify-center text-xs font-black transition-all ${
                isActive
                  ? 'bg-[#FFE600] text-black shadow-comic-sm scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className={`btn-comic text-xs py-1 px-2.5 flex items-center gap-1 bg-white ${
            currentPage >= totalPages ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:bg-gray-100'
          }`}
          title="Trang sau"
        >
          <span className="hidden sm:inline font-bold">Sau</span>
          <i className="ri-arrow-right-s-line text-sm font-bold" />
        </button>
      </div>

      {/* Info indicator */}
      {showItemCount && (
        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
          <span>
            Trang <strong className="text-black">{currentPage}</strong> / {totalPages || 1}
          </span>
          {typeof totalItems === 'number' && (
            <>
              <span>•</span>
              <span>
                Tổng <strong className="text-black">{totalItems}</strong> mục ({pageSize || 12}/trang)
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
