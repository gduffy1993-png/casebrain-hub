/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    // Next.js 14: keep pdfkit (and AFM font data) outside the webpack server
    // chunk so Helvetica.afm resolves from node_modules/pdfkit/js/data at runtime.
    serverComponentsExternalPackages: ["pdfkit"],
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
    tsconfigPath: "./tsconfig.build.json",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
};

export default nextConfig;

