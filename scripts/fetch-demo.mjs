// Exemplo completo: baixa TODAS as partidas do Showdown #2 (evento já encerrado, mesmo formato da Copa)
// e grava public/data/demo.json. Rode uma vez (os dados não mudam): node scripts/fetch-demo.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { DP, collectItems, compactGame, getJson } from './dp.mjs'

const html = await (await fetch(`${DP}/events/showdown-2.html`, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()
const ids = [...new Set([...html.matchAll(/data-match="(\d+)"/g)].map((m) => Number(m[1])))]

let colors = {}
try {
  const hs = await getJson('https://www.deadchaps.gg/api/deadlock/heroes/slim')
  colors = Object.fromEntries((hs ?? []).map((h) => [h.name, { color: h.color, key: h.images?.icon_image_small_webp?.split('/').pop().replace('_sm.webp', '') ?? null }]))
} catch {}

const games = []
const items = {}
const failed = []
for (let i = 0; i < ids.length; i += 6) {
  const part = await Promise.all(
    ids.slice(i, i + 6).map(async (id) => {
      const v = await getJson(`${DP}/api/match?view=${id}&v=4`)
      if (!v?.ok || !v.view?.g) {
        failed.push(id)
        return null
      }
      collectItems(v.view, items)
      return compactGame(v.view, colors)
    }),
  )
  games.push(...part.filter(Boolean))
  process.stdout.write(`\r${Math.min(i + 6, ids.length)}/${ids.length}`)
}
games.sort((a, b) => a.start - b.start || (a.gameNo ?? 0) - (b.gameNo ?? 0))

mkdirSync('public/data', { recursive: true })
writeFileSync(
  'public/data/demo.json',
  JSON.stringify({ event: 'Showdown #2', note: 'Evento já encerrado, usado como exemplo do formato da Copa América.', games, items }),
)
console.log(`\n${games.length} jogos em ${new Set(games.map((g) => g.sk)).size} séries` + (failed.length ? ` · sem dados: ${failed.join(', ')}` : ''))
