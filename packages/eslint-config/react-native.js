module.exports = {
  extends: ['./base.js'],
  env: {
    'react-native/react-native': true,
  },
  plugins: ['react', 'react-native'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
  },
}
