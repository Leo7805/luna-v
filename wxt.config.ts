/** Configures Luna's WXT build output and Vite plugins. */
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  manifest: { permissions: ['storage'] },
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
