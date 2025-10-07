/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.unsplash.com', 'cdn.example.com'],
  },
  env: {
    SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;

