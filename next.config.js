/** @type {import('next').NextConfig} */
const nextConfig = {
  // 在此配置 Next.js 选项
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 优化客户端 chunk 加载
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            echarts: {
              test: /[\\/]node_modules[\\/](echarts|echarts-for-react)[\\/]/,
              name: "echarts",
              chunks: "all",
              priority: 10,
            },
          },
        },
      };
    }
    return config;
  },
  // 确保静态资源正确生成
  generateBuildId: async () => {
    return process.env.BUILD_ID || `build-${Date.now()}`;
  },
};

module.exports = nextConfig;

