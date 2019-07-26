module.exports = {
  root: true,
  extends: '@clark/node-typescript',
  rules: {
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'unicorn/prevent-abbreviations': 'off'
  }
};
