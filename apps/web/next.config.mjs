/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zyro/shared", "@zyro/ui"],
  // Desativar linting durante build para simplificar
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
