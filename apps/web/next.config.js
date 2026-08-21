import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, '');

    return {
      beforeFiles: apiOrigin
        ? [
            {
              source: '/api/:path*',
              destination: `${apiOrigin}/:path*`,
            },
          ]
        : [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
