import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**', '.wrangler/**', '.stryker-tmp/**', 'reports/mutation/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { languageOptions: { globals: { ...globals.browser, ...globals.node }, parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', '**/infrastructure/**', '**/ui/**'] }],
      'no-restricted-globals': ['error', 'Date'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Inject randomness.' }]
    }
  }
);
