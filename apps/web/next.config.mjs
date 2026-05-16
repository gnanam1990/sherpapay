/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@sherpapay/core',
    '@sherpapay/parser',
    '@sherpapay/safety',
    '@sherpapay/scheduler',
    '@sherpapay/celo',
    '@sherpapay/ui',
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }
    return config
  },
}

export default nextConfig
