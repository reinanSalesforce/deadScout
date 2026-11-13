# Copa América · Deadlock Premier — Cartinhas

Site React (Vite + Tailwind) com os jogadores da Copa América de Deadlock, stats do DeadChaps e EDL.gg, notas suas (salvas no navegador) e comparativo entre times.

## Rodar local

```bash
npm install
npm run dev
```

## Atualizar os dados dos jogadores

Os dados ficam em `src/data/players.json` (gerado antes do build, porque o navegador não consegue chamar as APIs direto por causa de CORS):

```bash
node scripts/fetch-data.mjs
```

Depois faça commit do `players.json` atualizado.

## Publicar no GitHub Pages

1. Envie esta pasta (raiz do repositório, branch `main`) para o GitHub.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. A cada push na `main`, o workflow `.github/workflows/deploy.yml` faz o build e publica.
4. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

O `vite.config.js` usa `base: './'`, então funciona com qualquer nome de repositório.
