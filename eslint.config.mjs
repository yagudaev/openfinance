import nextConfig from 'eslint-config-next'

const eslintConfig = [
  { ignores: ['src/generated/**'] },
  ...nextConfig,
]

export default eslintConfig
