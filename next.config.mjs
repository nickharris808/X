/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'tesseract.js'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'tesseract.js': 'commonjs tesseract.js',
      })
    }
    return config
  },
}

export default nextConfig
