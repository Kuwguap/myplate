/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
  },
  async rewrites() {
    // In production (Vercel), frontend calls backend via NEXT_PUBLIC_API_URL directly; rewrites only for local dev
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
      const base = apiUrl.replace(/\/api\/?$/, '')
      return [
        { source: '/api/:path*', destination: `${base}/api/:path*`, basePath: false }
      ]
    }
    return []
  },
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    }
    return config
  },
}

export default nextConfig 