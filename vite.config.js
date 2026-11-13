import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' = caminhos relativos, funciona no GitHub Pages em qualquer nome de repositório
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
