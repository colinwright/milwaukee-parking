import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves project sites from /<repo-name>/. Override with the
// BASE_PATH env var (e.g. "/" for a custom domain, or "/my-repo/").
const base = process.env.BASE_PATH || '/milwaukee-night-park/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
