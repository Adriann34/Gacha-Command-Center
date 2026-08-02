import tseslint from '@typescript-eslint/eslint-plugin'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.history/**'],
  },
  {
    linterOptions: {
      // The project has one legacy suppression for a plugin that is not installed.
      noInlineConfig: true,
    },
  },
  ...tseslint.configs['flat/recommended'],
  {
    rules: {
      // The existing Firebase error adapter intentionally accepts unknown error values.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
