import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load .env and .env.test (mode defaults to "test" in Vitest)
  // Third arg '' = load ALL vars, not just VITE_-prefixed ones
  const env = loadEnv(mode, process.cwd(), '');

  return {
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    test: {
      globals: true,
      env,
      coverage: {
        all: true,
        include: ['actions/**/*.js', 'libs/**/*.js', 'components/**/*.js', 'app/**/*.js'],
      },
      projects: [
        // Unit tests — schemas, middleware (pure logic, fast)
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['tests/unit/**/*.test.{js,jsx}'],
          },
        },

        // Integration tests — RLS, DB integrity, auth, inventory (real Supabase)
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'node',
            include: ['tests/integration/**/*.test.{js,jsx}'],
            setupFiles: ['./tests/setup-integration.js'],
            testTimeout: 15000,
            fileParallelism: false,
          },
        },

        // Action tests — server actions with real Supabase (mock only Next.js)
        {
          extends: true,
          test: {
            name: 'actions',
            environment: 'node',
            include: ['tests/actions/**/*.test.{js,jsx}'],
            setupFiles: ['./tests/setup-integration.js'],
            testTimeout: 15000,
            fileParallelism: false,
          },
        },

        // Component tests — UI behavior (jsdom, mock server actions)
        {
          resolve: {
            alias: {
              '@': path.resolve(import.meta.dirname, '.'),
            },
          },
          plugins: [
            {
              name: 'treat-js-as-jsx',
              enforce: 'pre',
              async transform(code, id) {
                if (!/\.js$/.test(id) || id.includes('node_modules')) return null;
                return transformWithEsbuild(code, id, {
                  loader: 'jsx',
                  jsx: 'automatic',
                });
              },
            },
            react(),
          ],
          test: {
            name: 'components',
            globals: true,
            environment: 'jsdom',
            include: ['tests/components/**/*.test.{js,jsx}'],
            setupFiles: ['./tests/setup.js'],
          },
        },
      ],
    },
  };
});
