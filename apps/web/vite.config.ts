import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({ root:path.resolve('apps/web'), base:'./', plugins:[react()], build:{outDir:path.resolve('dist/v2'),emptyOutDir:true,target:'es2022',rollupOptions:{output:{manualChunks:{react:['react','react-dom'],dialogs:['@radix-ui/react-dialog']}}}}, worker:{format:'es'} });
