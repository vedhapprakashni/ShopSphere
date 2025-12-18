const nextConfig = {
  webpack(config: any, { dev }: { dev: boolean }) {
    if (dev) {
      config.devtool = false
    }
    return config
  },
}

export default nextConfig;
