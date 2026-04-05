import { defineConfig } from 'vite';

export default defineConfig({
  // Define a raiz do projeto onde está o index.html
  root: './',
  build: {
    outDir: 'dist', // Onde o código final "Enterprise" será gerado
  },
  server: {
    port: 3000, // Porta local para visualização
    open: true  // Abre o navegador automaticamente ao iniciar
  },
});