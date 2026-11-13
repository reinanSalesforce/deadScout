// Lógica pura das partidas do torneio: notas por jogo, séries e resumo da Copa.
import { players as datasetPlayers } from './lib'

// vincula o jogador da partida ao cadastro do site (por seleção + nick; ou pela conta Steam)
// imagens de um herói pelo nome, a partir de qualquer jogador do cadastro que o tenha jogado (plano B quando o jogo não traz a imagem)
export const heroAsset = (name) => {
  for (const p of datasetPlayers) {
    const h = (p.heroes ?? []).find((x) => x.name === name)
    if (h) return h
  }
  return undefined
}

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

// ---------------------------------------------------------------------------
// "Minha nota x Jogos": compara a nota que a pessoa deu (0-100) com a nota que cada jogo do jogador gerou.
// Escala justa: as notas dos jogos vão de 45 a 99 (posição entre os 12 jogadores). Uma nota sua abaixo de 45
// vale 45 na comparação ("pior que quase todos"), em vez de nunca poder bater.
export const GAME_SCALE_MIN = 45
export const MATCH_TOLERANCE = 10
export const onGameScale = (grade) => Math.min(99, Math.max(GAME_SCALE_MIN, grade))

// Carreira NA COPA de um jogador: só os jogos do torneio (média, frag, heróis e lista dos jogos, do mais recente para o mais antigo).
// Devolve null se ele ainda não jogou.
export function copaCareer(games, player, key) {
  const list = []
  for (const g of games ?? []) {
    for (const p of rateGame(g)) {
      const found = findDatasetPlayer(p)
      if (!found || key(found) !== key(player)) continue
      const nation = p.nation ?? p.teamNation
      list.push({ g, p, nation, win: g.winner === nation, opp: nation === g.natA ? g.natB : g.natA })
    }
  }
  if (!list.length) return null
  list.sort((a, b) => (b.g.start ?? 0) - (a.g.start ?? 0) || (b.g.gameNo ?? 0) - (a.g.gameNo ?? 0))
  const n = list.length
  const sum = (f) => list.reduce((s, x) => s + f(x), 0)
  const [K, D, A] = [sum((x) => x.p.k), sum((x) => x.p.d), sum((x) => x.p.a)]
  const wins = list.filter((x) => x.win).length
  const values = {}
  for (const a of GAME_ATTRS) {
    const v = list.map((x) => x.p.values[a.k]).filter((x) => x != null)
    values[a.k] = v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null
  }
  const byHero = new Map()
  for (const x of list) {
    const owned = (player.heroes ?? []).find((o) => o.name === x.p.hero) ?? heroAsset(x.p.hero) // plano B das imagens: cadastro do jogador ou de qualquer outro
    const h = byHero.get(x.p.hero) ?? { name: x.p.hero, games: 0, wins: 0, k: 0, d: 0, a: 0, art: heroImg(x.p, 'vertical') ?? owned?.art, icon: heroImg(x.p, 'sm') ?? owned?.icon, color: x.p.color ?? owned?.color }
    h.games += 1
    h.wins += x.win ? 1 : 0
    h.k += x.p.k
    h.d += x.p.d
    h.a += x.p.a
    byHero.set(x.p.hero, h)
  }
  for (const x of list) {
    const h = byHero.get(x.p.hero)
    x.art = h.art
    x.icon = h.icon
  }
  return {
    list,
    games: n,
    wins,
    winRate: (wins / n) * 100,
    kills: K / n,
    deaths: D / n,
    assists: A / n,
    kda: (K + A) / Math.max(1, D),
    souls: sum((x) => x.p.souls) / n,
    heroDmg: sum((x) => x.p.dmg) / n,
    objDmg: sum((x) => x.p.bossDmg) / n,
    ovr: Math.round(sum((x) => x.p.ovr) / n),
    mvps: list.filter((x) => x.p.isMvp).length,
    bestKills: Math.max(...list.map((x) => x.p.k)),
    bestKda: Math.max(...list.map((x) => (x.p.k + x.p.a) / Math.max(1, x.p.d))),
    values,
    heroes: [...byHero.values()].map((h) => ({ ...h, winRate: (h.wins / h.games) * 100, kda: (h.k + h.a) / Math.max(1, h.d) })).sort((a, b) => b.games - a.games),
  }
}

// veredito: 'bateu' (até 10 pontos), 'pior' (você deu menos que o jogo) ou 'melhor' (você deu mais)
export const verdictOf = (gameOvr, grade) => {
  if (grade == null || gameOvr == null) return null
  const diff = gameOvr - onGameScale(grade)
  return Math.abs(diff) <= MATCH_TOLERANCE ? 'bateu' : diff > 0 ? 'pior' : 'melhor'
}

export function gradeVsGames(games, player, key, grade) {
  const rows = []
  for (const g of games ?? []) {
    for (const p of rateGame(g)) {
      const found = findDatasetPlayer(p)
      if (!found || key(found) !== key(player)) continue
      const diff = grade == null ? null : p.ovr - onGameScale(grade)
      rows.push({
        id: g.id,
        title: `${g.natA || 'Time A'} x ${g.natB || 'Time B'}`,
        stage: g.stage,
        gameNo: g.gameNo,
        start: g.start,
        hero: p.hero,
        p, // jogador do jogo já com notas (para a carta do jogo)
        ovr: p.ovr,
        isMvp: p.isMvp,
        diff,
        verdict: verdictOf(p.ovr, grade),
      })
    }
  }
  rows.sort((a, b) => (a.start ?? 0) - (b.start ?? 0) || (a.gameNo ?? 0) - (b.gameNo ?? 0))
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.ovr, 0) / rows.length) : null
  const hits = rows.filter((r) => r.verdict === 'bateu').length
  return { rows, avg, hits }
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
