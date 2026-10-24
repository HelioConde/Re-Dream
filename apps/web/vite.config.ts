import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Re-Dream/' : '/',
  server: { host: '0.0.0.0', port: 5173 },
});
