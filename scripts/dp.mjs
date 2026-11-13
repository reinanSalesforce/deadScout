// Utilitários do site oficial do torneio (deadlockpremier.com). API JSON usada pelo próprio site:
//   GET /api/match?archive=1       -> lista de partidas publicadas
//   GET /api/match?view=<id>&v=4   -> estatísticas completas de uma partida
export const DP = 'https://deadlockpremier.com'
export const NATIONS = ['Argentina', 'Brazil', 'Canada', 'Chile', 'Mexico', 'Peru', 'USA', 'Venezuela']

// partida da Copa América: título com "Copa" ou as duas seleções entre as 8 nações
export const isCopa = (m) =>
  /copa/i.test(m?.title ?? '') || (NATIONS.includes(m?.natA) && NATIONS.includes(m?.natB))

// aceita só a cor (texto) ou { color, key } vindos da API de heróis
const heroInfo = (h) => (typeof h === 'string' ? { color: h, key: null } : { color: h?.color ?? null, key: h?.key ?? null })

const seriesIds = (view) => (view.games ?? []).map((x) => x.id).filter(Boolean)

// Caminho de cada jogador: texto com 4 caracteres por posição [x, y] a cada `pathStep` segundos (mesma decodificação do site).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
export function decodePath(str) {
  const out = []
  if (!str) return out
  const v = (i) => ((B64.indexOf(str[i]) << 6) + B64.indexOf(str[i + 1]) - 2048) * 6
  for (let i = 0; i + 3 < str.length; i += 4) out.push([v(i), v(i + 2)])
  return out
}

// Lane REAL do jogador: média da posição entre 1:30 e 6:00 (Yellow = oeste, Blue = meio, Green = leste).
// Em campeonatos as lanes são escolhidas à mão, então a lane "atribuída" pelo jogo costuma não bater.
export function laneFromPath(path, step = 2) {
  const pts = decodePath(path)
  let sx = 0
  let n = 0
  for (let i = Math.round(90 / step); i < Math.round(360 / step) && i < pts.length; i++) {
    sx += pts[i][0]
    n++
  }
  if (!n) return null
  const x = sx / n
  return x < -3000 ? 'Y' : x > 3000 ? 'G' : 'B'
}

// Resume a resposta de /api/match?view= no que o site usa (mantém o arquivo pequeno).
// Itens ficam como IDs; o dicionário id -> {n, img, slot, tier} vai uma vez só no arquivo (collectItems).
export function compactGame(view, heroColors = {}) {
  const g = view.g
  const nat = (t) => (t === view.sideA ? view.natA : view.natB)
  const sl = view.sl?.players ?? {}
  // tempos de abate de cada jogador: cada morte [segundo, slot do assassino, ...] vira um abate do assassino (se for do outro time)
  const all = g.teams.flatMap((t) => t.players.map((p) => ({ p, team: t.team })))
  const killTimes = new Map()
  for (const { p, team } of all)
    for (const d of p.deaths ?? []) {
      const killer = all.find((q) => q.p.slot === d[1])
      if (killer && killer.team !== team) killTimes.set(killer.p.account, [...(killTimes.get(killer.p.account) ?? []), d[0]])
    }
  return {
    id: g.id,
    // série = menor ID entre os jogos que a própria API lista para o confronto
    sk: seriesIds(view).includes(g.id) ? `s${Math.min(...seriesIds(view))}` : null,
    // jogos que a API lista para o confronto (inclui os que ainda não têm dados publicados)
    listed: (view.games ?? []).filter((x) => x.id).map((x) => ({ id: x.id, gameNo: x.gameNo ?? null })),
    gameNo: view.gameNo ?? null,
    title: view.title ?? '',
    stage: view.stage ?? '',
    bo: view.bo ?? 0,
    natA: view.natA,
    natB: view.natB,
    winner: nat(g.winner),
    duration: g.duration,
    start: g.start,
    score: view.score ?? null,
    // fase de lane (Statlocker), marcos de objetivos e rank médio dos times
    lanes: view.sl?.lanes ?? [],
    obj: g.obj ?? [],
    teamRank: view.sl?.teamRank ?? null,
    teams: g.teams.map((t) => ({
      team: t.team,
      nation: nat(t.team),
      kills: t.kills,
      souls: t.souls,
      players: t.players.map((p) => {
        const reg = view.names?.[p.account]
        const s = sl[p.account]
        return {
          account: p.account,
          name: reg?.name ?? p.steam,
          registered: !!reg,
          nation: reg?.nation ?? null,
          avatar: p.avatar ?? null,
          hero: p.hero,
          heroCls: p.heroCls,
          // arquivo da imagem do herói (nem sempre igual a heroCls: ghost -> spectre, viper -> kali...)
          heroKey: heroInfo(heroColors[p.hero]).key,
          color: heroInfo(heroColors[p.hero]).color,
          lane: p.lane ?? null, // lane atribuída pelo jogo
          laneC: laneFromPath(p.path, g.pathStep || 2), // lane real (Y/B/G), como no site
          kt: (killTimes.get(p.account) ?? []).sort((a, b) => a - b), // segundos dos abates
          dt: (p.deaths ?? []).map((d) => d[0]), // segundos das mortes
          k: p.k,
          d: p.d,
          a: p.a,
          souls: p.souls,
          lastHits: p.lastHits ?? 0,
          denies: p.denies ?? 0,
          level: p.level ?? 0,
          dmg: p.dmg ?? 0,
          heal: p.heal ?? 0,
          taken: p.taken ?? 0,
          bossDmg: p.bossDmg ?? 0,
          mvp: s?.mvp ?? null,
          place: s?.place ?? null,
          rank: s?.rank ?? null,
          src: p.src ?? null, // renda por fonte (troopers, neutrals, objectives, kills, assists, breakables, denies)
          nw: p.nw ?? [], // [segundo, souls] a cada 3-5 min
          items: (p.items ?? []).slice(0, 12),
          sl: s
            ? {
                cat: s.cat ?? [],
                spk: s.spk ?? [],
                aw: (s.aw ?? []).slice(0, 4).map((a) => ({ n: a.n, l: a.l, d: a.d })),
                dmg: (s.dmg ?? []).slice(0, 6),
                dmgTot: s.dmgTot ?? 0,
                x: s.x ?? {},
              }
            : null,
        }
      }),
    })),
  }
}

// junta no dicionário os itens usados na partida (id -> dados do item)
export function collectItems(view, dict) {
  for (const t of view.g.teams)
    for (const p of t.players)
      for (const id of (p.items ?? []).slice(0, 12)) {
        const it = view.items?.[id]
        if (it && !dict[id]) dict[id] = { n: it.n, img: it.img, slot: it.slot ?? null, tier: it.tier ?? null }
      }
  return dict
}

export async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (copa-america-cards)' }, cache: 'no-store' })
      if (r.ok) return await r.json()
      if (r.status === 404) return null
    } catch {}
    await new Promise((r) => setTimeout(r, 600))
  }
  return null
}
