module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    env: {
      'es6': 'true'
    },

    rules: {
      'semi': 'error',
      'eqeqeq': 'error',
      'no-nonnull':'off',
      "@typescript-eslint/no-non-null-assertion": "warn",
      'quotes': ['single', 'error']
    }
  };