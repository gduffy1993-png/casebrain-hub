/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  eslint: {
    dirs: ["app", "components", "lib", "tests"],
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  reactStrictMode: true,
};

export default nextConfig;

