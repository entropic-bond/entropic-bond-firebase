import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
		globals: true,
		environment: 'node',
		exclude: ['**/node_modules', '**/dist', '.idea', '.git', '.cache','**/lib', '**/out'],
	},
	build: {
		lib: {
			entry: import.meta.dirname + '/src/index.ts',
			name: 'entropic-bond-firebase',
			fileName: 'entropic-bond-firebase'
		},
		sourcemap: true,
		outDir: 'lib',
	},
})
