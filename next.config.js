/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'images.unsplash.com', 
      'cdn.example.com',
      'images.bayut.com',
      'bayut-production.s3.eu-central-1.amazonaws.com',
      'www.propertyfinder.ae',
      'propertyfinder.ae'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.bayut.com',
      },
      {
        protocol: 'https',
        hostname: '**.propertyfinder.ae',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  env: {
    SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;

