import { defineConfig } from 'vite'
import { resolve } from 'path'

/**
 * Dedicated build for the Form Filler content script.
 *
 * Chrome injects content scripts as classic scripts, so `import` statements are
 * illegal inside them. This pass bundles everything — the pattern engine and the
 * faker locales — into a single self-contained `content.js` (`format: "iife"`,
 * no code splitting), and runs after the main build without clearing `dist`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome100',
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/content/form-filler.ts'),
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'content.js',
        assetFileNames: 'assets/content.[ext]',
      },
    },
  },
})
