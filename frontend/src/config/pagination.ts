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
