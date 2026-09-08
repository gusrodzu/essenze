import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  server:{port:5173},
  build:{
    chunkSizeWarningLimit:650,
    rollupOptions:{
      output:{
        manualChunks(id){
          if(!id.includes('node_modules'))return;
          if(id.includes('react')||id.includes('react-router'))return 'vendor-react';
          if(id.includes('@tanstack'))return 'vendor-query';
          if(id.includes('lucide-react'))return 'vendor-icons';
          if(id.includes('axios'))return 'vendor-http';
          if(id.includes('zod')||id.includes('react-hook-form'))return 'vendor-forms';
          return 'vendor';
        }
      }
    }
  }
});
