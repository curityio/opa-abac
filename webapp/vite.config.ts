import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Share the repo-root .env with the API. Only ISSUER reaches the browser.
  envDir: '..',
  envPrefix: 'ISSUER',
});
