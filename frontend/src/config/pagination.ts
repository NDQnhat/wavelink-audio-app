/**
 * WaveLink Global Pagination Configuration
 * Default: 12 items per page as requested by user.
 * Configurable via env variable: VITE_ITEMS_PER_PAGE or VITE_PAGE_SIZE
 */
export const getPageSize = (): number => {
  const envVal = Number(import.meta.env.VITE_ITEMS_PER_PAGE || import.meta.env.VITE_PAGE_SIZE);
  return !isNaN(envVal) && envVal > 0 ? envVal : 12;
};

export const DEFAULT_PAGE_SIZE = getPageSize();

/**
 * Số lượng thông báo trên mỗi trang lấy từ env VITE_NOTIFICATIONS_PER_PAGE,
 * dự phòng VITE_ITEMS_PER_PAGE hoặc mặc định 12.
 */
export const getNotificationPageSize = (): number => {
  const envVal = Number(
    import.meta.env.VITE_NOTIFICATIONS_PER_PAGE ||
    import.meta.env.VITE_ITEMS_PER_PAGE ||
    import.meta.env.VITE_PAGE_SIZE
  );
  return !isNaN(envVal) && envVal > 0 ? envVal : 12;
};

export const NOTIFICATION_PAGE_SIZE = getNotificationPageSize();
