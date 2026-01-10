import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@momentovino/types', '@momentovino/utils'],
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:5328/api/:path*',
        },
      ]
    }
    return []
  },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
}

export default config
