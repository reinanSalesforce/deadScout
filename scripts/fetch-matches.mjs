// Coleta as partidas da Copa América publicadas no deadlockpremier.com e grava public/data/matches.json.
// Uso: node scripts/fetch-matches.mjs     (roda a cada 5 min no GitHub Actions: .github/workflows/live-matches.yml)
// O exemplo (Showdown #2, evento já encerrado) fica em public/data/demo.json (scripts/fetch-demo.mjs).
import { mkdirSync, writeFileSync } from 'node:fs'
import { DP, collectItems, compactGame, getJson, isCopa } from './dp.mjs'

const arch = await getJson(`${DP}/api/match?archive=1`)
if (!arch?.ok) {
  console.error('API de partidas indisponível. Arquivo anterior mantido.')
  process.exit(1)
}

let heroColors = {}
try {
  const hs = await getJson('https://www.deadchaps.gg/api/deadlock/heroes/slim')
  heroColors = Object.fromEntries((hs ?? []).map((h) => [h.name, { color: h.color, key: h.images?.icon_image_small_webp?.split('/').pop().replace('_sm.webp', '') ?? null }]))
} catch {}

const games = []
const items = {}
for (const m of (arch.matches ?? []).filter(isCopa)) {
  const v = await getJson(`${DP}/api/match?view=${m.id}&v=4`)
  if (v?.ok && v.view?.g) {
    const c = compactGame(v.view, heroColors)
    games.push({ ...c, sk: m.sk ?? c.sk })
    collectItems(v.view, items)
  }
}
games.sort((a, b) => a.start - b.start || (a.gameNo ?? 0) - (b.gameNo ?? 0))

// updatedAt vem dos dados (fim do último jogo): se nada mudou o arquivo fica idêntico e nada é publicado de novo.
const last = Math.max(0, ...games.map((g) => g.start + g.duration))
const out = { updatedAt: new Date(last * 1000).toISOString(), event: 'Copa America', games, items }

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/matches.json', JSON.stringify(out))
console.log(`Copa: ${games.length} jogo(s) · publicados na API: ${arch.matches?.length ?? 0}`)
