import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPreviewBackend = 'https://wavelink-audio-app-backend-latest.onrender.com';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.VITE_API_BASE_URL ||
      (process.env.VERCEL ? `${defaultPreviewBackend}/api/v1` : ''),
    VITE_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.VITE_API_BASE_URL ||
      (process.env.VERCEL ? `${defaultPreviewBackend}/api/v1` : ''),
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      (process.env.VERCEL ? defaultPreviewBackend : 'http://localhost:8080');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/pages': path.resolve(__dirname, './src/views'),
      '@/views': path.resolve(__dirname, './src/views'),
      '@': path.resolve(__dirname, './src'),
      'react-router-dom': path.resolve(__dirname, './src/lib/routerCompat.tsx'),
    };
    return config;
  },
};

export default nextConfig;
