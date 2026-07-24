/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the on-screen Next.js dev indicator (the "N" logo button).
  // Dev-only UI; has no effect on production builds.
  devIndicators: false,
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
