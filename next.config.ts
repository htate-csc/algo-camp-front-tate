import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api-paiza/:path*",
        destination: "https://api.paiza.io/:path*",
      },
    ]
  },
}

export default nextConfig
