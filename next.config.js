var ESLintPlugin = require('eslint-webpack-plugin')

module.exports = {
  reactStrictMode: true,
  images: {
    loader: 'custom',
    domains: ['avatars.githubusercontent.com'],
  },
  webpack: (config) => {
    config.plugins.push(
      new ESLintPlugin({
        extensions: ['js', 'jsx', 'ts', 'tsx'],
      })
    )
    return config
  },
}
