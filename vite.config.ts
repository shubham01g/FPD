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

// Every name src/ reads as `import.meta.env.VITE_<NAME>`. Anything absent from
// this list is not resolved through the VITEE_ alias below.
const CLIENT_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'STRIPE_PUBLISHABLE_KEY']

export default defineConfig(({ mode }) => {
  // Load from the config's own directory, not process.cwd(): running the dev
  // server from a parent folder otherwise leaves this `env` empty while Vite
  // still injects import.meta.env from here — the client would then aim at
  // /sb-api with no proxy registered to serve it.
  const env = loadEnv(mode, __dirname, '')

  // The Vercel dashboard refuses keys beginning with VITE_, so the deployed
  // values are stored one letter off as VITEE_*. Accept either spelling here.
  const readEnv = (name: string) => env[`VITE_${name}`] || env[`VITEE_${name}`] || ''

  // Pin the canonical VITE_* name into the bundle so no file under src/ has to
  // know which spelling a given environment happened to use. Vite only exposes
  // names matching its VITE_ prefix, so a VITEE_ var would otherwise be dropped
  // from the build entirely and the app would fall back to its placeholders.
  const define: Record<string, string> = {}
  for (const name of CLIENT_ENV) {
    const value = readEnv(name)
    // Unset names are left alone, so each call site keeps its own fallback.
    if (value) define[`import.meta.env.VITE_${name}`] = JSON.stringify(value)
  }

  const supabaseUrl = readEnv('SUPABASE_URL')

  // Dev-only escape hatch: some browsers/extensions/security suites block requests
  // to *.supabase.co outright, which surfaces in the app as an opaque
  // "Failed to fetch". With VITE_USE_SUPABASE_PROXY=true the browser talks only to
  // the dev server on localhost, and Node forwards to Supabase — same requests,
  // no cross-origin call for anything to block. Never active in a production build.
  const useSupabaseProxy =
    env.VITE_USE_SUPABASE_PROXY === 'true' && Boolean(supabaseUrl)

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

    define,

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    server: useSupabaseProxy
      ? {
          proxy: {
            '/sb-api': {
              target: supabaseUrl,
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
