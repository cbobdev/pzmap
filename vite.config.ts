import { defineConfig } from 'vite';

// base '/pzmap/' so assets resolve under GitHub Pages project path.
// Override with BASE_PATH env (e.g. '/' for a custom domain).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/pzmap/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  // Repo lives on the Windows mount (/mnt/c) under WSL2, where inotify file
  // events don't fire — poll so edits actually trigger HMR.
  server: {
    watch: { usePolling: true, interval: 200 },
  },
});
