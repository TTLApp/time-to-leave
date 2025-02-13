import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    files: [
        '**/*.cjs', '**/*.js', '**/*.mjs'
    ],

    ignores: [
        '**/assets/',
        '**/coverage/',
        '**/node_modules/',
        '**/*.svg',
        '**/*.html',
        '**/*.css',
        '**/release-builds',
    ],
}, ...compat.extends('eslint:recommended'), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.commonjs,
            ...globals.node,
            ...globals.mocha,
            ...globals.jquery,
            Atomics: 'readonly',
            SharedArrayBuffer: 'readonly',
        },

        ecmaVersion: 2020,
        sourceType: 'module',

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    rules: {
        'block-spacing': 'error',
        'eqeqeq': ['error', 'always'],

        'brace-style': ['error', 'allman', {
            'allowSingleLine': true,
        }],

        'func-call-spacing': ['error', 'never'],
        'indent': 'error',
        'keyword-spacing': 'error',
        'linebreak-style': ['error', 'unix'],
        'no-extra-semi': 'error',
        'no-lonely-if': 'error',
        'no-var': 'error',

        'prefer-const': ['error', {
            'destructuring': 'all',
        }],

        'quotes': ['error', 'single'],
        'semi': 'error',
        'no-trailing-spaces': 'error',

        'semi-spacing': ['error', {
            'before': false,
            'after': true,
        }],

        'space-before-blocks': 'error',
        'space-before-function-paren': ['error', 'never'],
    },
}];