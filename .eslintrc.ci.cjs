/** @type {import("eslint").Linter.Config} */
const config = {
  extends: './.eslint.cjs',
  rules: {
    'no-magic-numbers': 'error',
  },
};
