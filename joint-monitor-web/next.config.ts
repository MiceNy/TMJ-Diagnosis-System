import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.22:3000", 
    "192.168.1.22", 
    "localhost:3000",
    "*.trycloudflare.com",
    "*.ngrok-free.dev"
  ],
  // THÊM ĐOẠN NÀY ĐỂ TRÁNH LỖI KHI ĐIỆN THOẠI TRUY CẬP VÀO LINK CLOUDFLARE
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,PATCH,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, 
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  devIndicators: {
    
  },
};

export default nextConfig;