import { resolve } from 'node:path';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import pkg from '../../package.json' with { type: 'json' };

export default defineConfig({
  root: 'src',
  build: {
    emptyOutDir: true,
    outDir: '../dist',
    target: 'esnext',
    sourcemap: true,
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'src/index.html'),
        shared: resolve(import.meta.dirname, 'src/index.html'),
      },
    },
  },
  define: {
    'import.meta.env.APP_NAME': JSON.stringify(pkg.name),
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    viteStaticCopy({ targets: [{ src: resolve(import.meta.dirname, '../ui/assets/*'), dest: '.', rename: { stripBase: true } }] }),
    compression(),
    visualizer({ gzipSize: true }),
    { name: 'html-transform', transformIndexHtml: (html: string) => html.replace(/%APP_NAME%/g, pkg.name).replace(/%APP_VERSION%/g, pkg.version) },
  ],
});
