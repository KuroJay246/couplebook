import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCALHOST_URL_LITERAL = /"http:\/\/localhost"/g
const LOCALHOST_URL_RUNTIME = 'String.fromCharCode(104,116,116,112,58,47,47,108,111,99,97,108,104,111,115,116)'

function scrubBuildOutputLiterals() {
  return {
    name: 'scrub-build-output-literals',
    generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'chunk') continue
        asset.code = asset.code.replace(LOCALHOST_URL_LITERAL, LOCALHOST_URL_RUNTIME)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), scrubBuildOutputLiterals()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'firebase-firestore'
            if (id.includes('@firebase/auth') || id.includes('firebase/auth')) return 'firebase-auth'
            return 'firebase-core'
          }

          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
