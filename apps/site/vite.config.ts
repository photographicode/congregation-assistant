import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import path from 'node:path';
export default defineConfig({root:path.resolve('apps/site'),base:'./',plugins:[react()],build:{outDir:path.resolve('dist/site'),emptyOutDir:false,rollupOptions:{input:path.resolve('apps/site/tour.tsx'),output:{entryFileNames:'tour.js',assetFileNames:'[name][extname]'}}}});
