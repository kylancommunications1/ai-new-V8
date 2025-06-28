import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from root directory
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), '');
  
  return {
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    open: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:12001',
        changeOrigin: true,
        secure: false
      },
      '/webhook': {
        target: 'http://localhost:12001',
        changeOrigin: true,
        secure: false
      }
    },
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:12001',
        changeOrigin: true,
        secure: false
      },
      '/webhook': {
        target: 'http://localhost:12001',
        changeOrigin: true,
        secure: false
      }
    },
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:12001'),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY)
  }
  };
});