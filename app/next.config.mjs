/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // In dev, proxy /api to the FastAPI backend so cookies stay same-origin.
  async rewrites() {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (base) {
      return [
        {
          source: "/api/:path*",
          destination: `${base}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
