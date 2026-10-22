import { AudioItem } from '@/types';

const getBackendUrl = () => {
  if (process.env.BACKEND_INTERNAL_URL && process.env.BACKEND_INTERNAL_URL.trim().length > 0) {
    return process.env.BACKEND_INTERNAL_URL.trim().replace(/\/api\/v1\/?$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim().length > 0) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.trim().replace(/\/api\/v1\/?$/, '');
  }
  if (process.env.VITE_API_BASE_URL && process.env.VITE_API_BASE_URL.trim().length > 0) {
    return process.env.VITE_API_BASE_URL.trim().replace(/\/api\/v1\/?$/, '');
  }
  // Môi trường Vercel Cloud: Luôn dùng Render Backend Preview
  if (process.env.VERCEL) {
    return 'https://wavelink-audio-app-backend-latest.onrender.com';
  }
  return 'http://localhost:8080';
};

export async function fetchServerAudio(id: string | number): Promise<AudioItem | null> {
  const backendUrl = getBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/v1/audios/${id}`, {
      next: { revalidate: 60 }, // ISR: Cache 60s
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.success && data.data) {
      return data.data as AudioItem;
    }
  } catch (err) {
    console.warn(`[fetchServerAudio] Failed to fetch audio ID ${id}:`, err);
  }
  return null;
}

export async function fetchServerAllAudios(): Promise<AudioItem[]> {
  const backendUrl = getBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/v1/audios?limit=1000`, {
      next: { revalidate: 300 }, // Cache 5 minutes
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data as AudioItem[];
    }
  } catch (err) {
    console.warn('[fetchServerAllAudios] Failed to fetch audios list:', err);
  }
  return [];
}
