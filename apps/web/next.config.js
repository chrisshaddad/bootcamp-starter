/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Turbopack to include these workspace packages in its build graph
  // instead of treating them as external. Relies on npm workspace symlinks
  // (node_modules/@repo/*) which npm manages automatically.
  transpilePackages: ['@repo/contracts', '@repo/db'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
