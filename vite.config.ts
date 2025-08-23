import { defineConfig } from 'vite';
import path from "path";
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    strictPort: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env.CANISTER_ID_DHANIVERSE_BACKEND': JSON.stringify('dzbzg-eqaaa-aaaap-an3rq-cai'),
    'process.env.DFX_NETWORK': JSON.stringify('ic'),
  },
});