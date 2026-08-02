/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No reason to advertise the stack on every response.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No includeSubDomains: signal-cv.agradex.com lives on another box whose TLS we don't
          // control from here; pinning HSTS for the whole zone could brick it.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
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
