/**
 * Tự động xác định Domain URL của trang web:
 * 1. Biến môi trường tùy chỉnh NEXT_PUBLIC_SITE_URL (ưu tiên cao nhất nếu có domain riêng)
 * 2. Biến VERCEL_URL được Vercel tự động cấp (ví dụ: wavelink-audio-app.vercel.app)
 * 3. Fallback mặc định
 */
export const getSiteUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }

  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/\/+$/, '')}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  return 'https://wavelink.app';
};
