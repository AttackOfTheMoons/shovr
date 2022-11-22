// eslint-disable-next-line no-undef
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
      'semi': ['error', 'always'],
      'eqeqeq': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'quotes': ['error', 'single']
    }
  };