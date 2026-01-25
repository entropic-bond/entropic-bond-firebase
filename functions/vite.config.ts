import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['cjs'],
    },
    outDir: 'lib',
    emptyOutDir: true,
    rollupOptions: {
      // Externalize dependencies that should not be bundled
      external: [
        'firebase-functions',
        'firebase-functions/v2',
        'firebase-admin',
        'entropic-bond',
      ],
    },
    target: 'node22',
    sourcemap: true,
    ssr: true, 
  },
});
