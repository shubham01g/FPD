import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Dev-only escape hatch: some browsers/extensions/security suites block requests
  // to *.supabase.co outright, which surfaces in the app as an opaque
  // "Failed to fetch". With VITE_USE_SUPABASE_PROXY=true the browser talks only to
  // the dev server on localhost, and Node forwards to Supabase — same requests,
  // no cross-origin call for anything to block. Never active in a production build.
  const useSupabaseProxy =
    env.VITE_USE_SUPABASE_PROXY === 'true' && Boolean(env.VITE_SUPABASE_URL)

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    server: useSupabaseProxy
      ? {
          proxy: {
            '/sb-api': {
              target: env.VITE_SUPABASE_URL,
              changeOrigin: true,
              secure: true,
              ws: true, // realtime subscriptions ride the same prefix
              rewrite: (p) => p.replace(/^\/sb-api/, ''),
            },
          },
        }
      : undefined,
  }
})
