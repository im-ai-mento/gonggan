import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 상대 경로로 설정하여 리포지토리 이름 상관없이 에셋 로딩 보장
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})