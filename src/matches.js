// Lógica pura das partidas do torneio: notas por jogo, séries e resumo da Copa.
import { players as datasetPlayers } from './lib'

// vincula o jogador da partida ao cadastro do site (por seleção + nick; ou pela conta Steam)
export const findDatasetPlayer = (p) => {
  const nation = p.nation ?? p.teamNation
  return (
    datasetPlayers.find((x) => x.team === nation && x.nick.toLowerCase() === p.name.toLowerCase()) ??
    (p.registered ? datasetPlayers.find((x) => x.id && Number(x.id) === p.account && x.team === nation) : undefined)
  )
}

// Atributos da carta do JOGO (cada um 1-99). Os cinco primeiros são a posição do jogador entre os 12
// da partida (1º = 99, último = 45); IMP vem direto da nota de MVP (0-100) calculada pelo Statlocker.
export const GAME_ATTRS = [
  { k: 'KDA', desc: 'Abates + assistências por morte', w: 0.2, get: (p) => (p.k + p.a) / Math.max(1, p.d) },
  { k: 'DMG', desc: 'Dano em heróis por minuto', w: 0.2, get: (p, m) => p.dmg / m },
  { k: 'SOU', desc: 'Souls por minuto', w: 0.15, get: (p, m) => p.souls / m },
  { k: 'OBJ', desc: 'Dano em objetivos por minuto', w: 0.1, get: (p, m) => p.bossDmg / m },
  { k: 'FRM', desc: 'Last hits + denies por minuto', w: 0.1, get: (p, m) => (p.lastHits + p.denies) / m },
  { k: 'IMP', desc: 'Impacto: nota de MVP do Statlocker (0-100)', w: 0.25, get: null },
]

const clamp = (x) => Math.max(1, Math.min(99, Math.round(x)))

// posição relativa (com empates pela média) -> 45..99
const relRating = (vals, v) => {
  const n = vals.length
  if (n < 2) return 72
  const less = vals.filter((x) => x < v).length
  const eq = vals.filter((x) => x === v).length
  return Math.round(45 + ((less + (eq - 1) / 2) / (n - 1)) * 54)
}

export const ovrFrom = (values) => {
  const have = GAME_ATTRS.filter((a) => values[a.k] != null)
  if (!have.length) return null
  const w = have.reduce((s, a) => s + a.w, 0)
  return Math.round(have.reduce((s, a) => s + values[a.k] * a.w, 0) / w)
}

export const allPlayers = (game) => game.teams.flatMap((t) => t.players.map((p) => ({ ...p, teamIdx: t.team, teamNation: t.nation })))

// Notas de todos os jogadores de um jogo. Devolve a lista já com { values, ovr } e marca o MVP do jogo.
export function rateGame(game) {
  const players = allPlayers(game)
  const minutes = Math.max(1, game.duration / 60)
  const rated = players.map((p) => {
    const values = {}
    for (const a of GAME_ATTRS) {
      if (a.get) values[a.k] = relRating(players.map((q) => a.get(q, minutes)), a.get(p, minutes))
      else values[a.k] = p.mvp != null ? clamp(p.mvp) : null
    }
    return { ...p, values, ovr: ovrFrom(values) }
  })
  const best = rated.reduce((b, p) => (p.ovr > (b?.ovr ?? -1) ? p : b), null)
  return rated.map((p) => ({ ...p, isMvp: p === best }))
}

// agrupa jogos em séries (mesma chave `sk` ou mesmo confronto/fase)
export function seriesOf(games) {
  const map = new Map()
  for (const g of games) {
    const key = g.sk ?? `${g.title}|${g.stage}|${[g.natA, g.natB].sort().join('x')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(g)
  }
  return [...map.entries()]
    .map(([key, gs]) => {
      const sorted = [...gs].sort((a, b) => (a.gameNo ?? 0) - (b.gameNo ?? 0) || a.start - b.start)
      const f = sorted[0]
      const winsA = sorted.filter((g) => g.winner === f.natA).length
      const winsB = sorted.filter((g) => g.winner === f.natB).length
      // abas "Game 1, Game 2…": usa a lista da API (inclui jogos ainda sem dados publicados)
      const listed = new Map()
      for (const g of sorted) for (const x of g.listed ?? []) listed.set(x.id, x)
      const slots = listed.size
        ? [...listed.values()]
            .sort((a, b) => (a.gameNo ?? 0) - (b.gameNo ?? 0))
            .map((x) => ({ id: x.id, gameNo: x.gameNo, game: sorted.find((g) => g.id === x.id) ?? null }))
        : sorted.map((g) => ({ id: g.id, gameNo: g.gameNo, game: g }))
      return {
        slots,
        key,
        title: f.title,
        stage: f.stage,
        bo: f.bo,
        natA: f.natA || 'Time A', // alguns jogos chegam do site sem os nomes dos times
        natB: f.natB || 'Time B',
        winsA,
        winsB,
        start: Math.min(...sorted.map((g) => g.start)),
        last: Math.max(...sorted.map((g) => g.start)),
        games: sorted,
      }
    })
    .sort((a, b) => b.last - a.last)
}

// Resumo por jogador em todos os jogos: nota média, melhor nota, MVPs. Chave: seleção + nick registrado.
export function playerSummary(games) {
  const map = new Map()
  for (const g of games) {
    for (const p of rateGame(g)) {
      const nation = p.nation ?? p.teamNation
      const key = String(p.account) // a conta Steam é a identidade estável do jogador
      const cur = map.get(key) ?? { key, name: p.name, nation, account: p.account, avatar: p.avatar, games: 0, sum: 0, best: 0, mvps: 0, kills: 0, deaths: 0, assists: 0 }
      if (p.registered) {
        cur.name = p.name
        cur.nation = nation
      }
      cur.games += 1
      cur.sum += p.ovr ?? 0
      cur.best = Math.max(cur.best, p.ovr ?? 0)
      cur.mvps += p.isMvp ? 1 : 0
      cur.kills += p.k
      cur.deaths += p.d
      cur.assists += p.a
      map.set(key, cur)
    }
  }
  return [...map.values()]
    .map((s) => ({ ...s, avg: Math.round(s.sum / s.games) }))
    .sort((a, b) => b.avg - a.avg || b.games - a.games)
}

// O nome interno do herói no site do torneio nem sempre é o do arquivo da imagem (ex.: Lady Geist = "ghost", mas a imagem é "spectre").
// Corrigido na coleta (heroKey) e, para dados antigos, por esta tabela.
export const HERO_ASSET = { atlas: 'bull', dynamo: 'sumo', orion: 'archer', ghost: 'spectre', forge: 'engineer', krill: 'digger', viper: 'kali' }

export const heroImg = (p, kind = 'sm') => {
  const key = p?.heroKey ?? HERO_ASSET[p?.heroCls] ?? p?.heroCls
  return key ? `https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/${key}_${kind}.webp` : null
}

export const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

// ---------------------------------------------------------------------------
// Estatísticas do jogo no modelo do site oficial (Soul lead, Laning phase, renda por fonte...)
// Os totais só são gravados a cada 3-5 min; entre os pontos usamos interpolação (o site marca como "≈").

export const LANES = {
  Y: { name: 'Yellow', color: '#F1CC30' },
  B: { name: 'Blue', color: '#29B1CC' },
  G: { name: 'Green', color: '#59B247' },
}
export const OBJ_KINDS = { G: 'Guardian', W: 'Walker', B: 'Base Guardian', S: 'Shrine', P: 'Patron', C: 'Patron down', R: 'Rejuvenator' }
export const INCOME = [
  { k: 'troopers', label: 'Troopers', color: '#C49C47' },
  { k: 'neutrals', label: 'Neutrals', color: '#6FA36B' },
  { k: 'objectives', label: 'Objetivos', color: '#B5784A' },
  { k: 'kills', label: 'Abates', color: '#C25B5B' },
  { k: 'assists', label: 'Assistências', color: '#8A6FC2' },
  { k: 'breakables', label: 'Urn / Rift', color: '#5B9BB5' },
  { k: 'denies', label: 'Denies', color: '#8C8C8C' },
]
export const CATS = [
  ['Dano', 'Dano em heróis inimigos comparado ao lobby'],
  ['Farm', 'Souls de troopers e neutros'],
  ['Push', 'Dano em Guardians, Walkers e base'],
  ['Suporte', 'Cura, escudos e assistências'],
  ['Tank', 'Dano absorvido pelo time'],
  ['Início', 'Impacto nos primeiros minutos'],
]

// souls do jogador no segundo t (interpolação linear entre os pontos gravados, a partir de 0)
export function soulsAt(p, t) {
  const nw = p.nw ?? []
  if (!nw.length) return 0
  let prev = [0, 0]
  for (const [s, v] of nw) {
    if (s >= t) return prev[1] + (v - prev[1]) * ((t - prev[0]) / (s - prev[0] || 1))
    prev = [s, v]
  }
  return nw[nw.length - 1][1]
}

// Curva de souls (net worth do time A menos o do time B) em cada ponto gravado.
export function soulLead(game) {
  const times = new Set([0])
  for (const t of game.teams) for (const p of t.players) for (const [s] of p.nw ?? []) times.add(s)
  return [...times]
    .sort((a, b) => a - b)
    .map((t) => {
      const [a, b] = game.teams.map((tm) => tm.players.reduce((sum, p) => sum + soulsAt(p, t), 0))
      return { t, a, b, lead: a - b }
    })
}

// Fase de lane (primeiros 8 min): lane REAL de cada jogador (posição no mapa), souls, abates e primeiro Guardian derrubado.
export function laneReport(game, t = 480) {
  return Object.keys(LANES).map((L) => {
    const sides = game.teams.map((tm) => tm.players.filter((p) => p.laneC === L))
    const souls = sides.map((ps) => ps.reduce((s, p) => s + soulsAt(p, t), 0))
    const kills = sides.map((ps) => ps.reduce((s, p) => s + (p.kt ?? []).filter((x) => x <= t).length, 0))
    const diff = souls[0] - souls[1]
    const lead = Math.abs(diff) >= 0.06 * Math.max(souls[0], souls[1], 1) ? (diff > 0 ? 0 : 1) : null
    const g = (game.obj ?? []).filter((o) => o[2] === 'G' && o[3] === L).sort((a, b) => a[0] - b[0])[0]
    return { lane: L, ...LANES[L], sides, souls, kills, diff: Math.abs(diff), lead, firstGuardian: g ? { t: g[0], team: g[1] } : null }
  })
}

// adversários na mesma lane (2 por lane); sem posição conhecida, usa quem ficou na mesma posição de souls no outro time
export function laneOpponents(game, p) {
  const other = game.teams.find((t) => t.team !== p.teamIdx)
  if (!other) return []
  const byLane = p.laneC ? other.players.filter((q) => q.laneC === p.laneC) : []
  if (byLane.length) return byLane
  const mine = game.teams.find((t) => t.team === p.teamIdx)
  const idx = [...mine.players].sort((a, b) => b.souls - a.souls).findIndex((q) => q.account === p.account)
  const pick = [...other.players].sort((a, b) => b.souls - a.souls)[idx]
  return pick ? [pick] : []
}

export const laneMates = (game, p) =>
  (game.teams.find((t) => t.team === p.teamIdx)?.players ?? []).filter((q) => q.account !== p.account && p.laneC && q.laneC === p.laneC)

// renda por fonte (percentuais) do jogador
export function incomeShares(p) {
  const src = p.src ?? {}
  const total = INCOME.reduce((s, i) => s + (src[i.k] ?? 0), 0)
  return INCOME.map((i) => ({ ...i, value: src[i.k] ?? 0, pct: total ? ((src[i.k] ?? 0) / total) * 100 : 0 })).filter((i) => i.value > 0)
}

export const fmtLeadK = (n) => `${n < 0 ? '-' : ''}${(Math.abs(n) / 1000).toFixed(1)}K`

// fase do torneio a partir do nome da etapa ("Upper Quarterfinal 1" -> "Upper Quarterfinal"; fase de grupos junta)
export const phaseOf = (stage = '') => {
  if (/^Group/i.test(stage)) return 'Fase de grupos'
  const m = stage.match(/^(.*?)\s+(\d+)\.\d+\s*$/) // "Lower Round 1.2" -> "Lower Round 1" (uma coluna por rodada)
  return (m ? `${m[1]} ${m[2]}` : stage.replace(/\s*\d+\s*$/, '')).trim() || 'Sem fase'
}
