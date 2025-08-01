import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./trpc.ts'],
  tsconfig: 'tsconfig.json',
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  outDir: 'dist',
});
