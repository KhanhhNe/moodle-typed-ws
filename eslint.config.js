import antfu from '@antfu/eslint-config'

export default antfu({}, {
  rules: {
    'ts/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      fixStyle: 'separate-type-imports',
    }],
    'import/order': ['error', {
      'newlines-between': 'always',
      'alphabetize': {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
  },
})