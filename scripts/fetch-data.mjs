// Coleta stats reais do DeadChaps (API pública usada pelo próprio site) para todos os jogadores da Copa América.
// Uso: node scripts/fetch-data.mjs
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = 'https://www.deadchaps.gg/api'
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (copa-america-cards)' }

// Lista oficial: https://deadlockpremier.com/copa-america.html  (subs/coaches em dourado => sub: true)
const TEAMS = {
  Argentina: { code: 'ar', flag: 'https://deadlockpremier.com/flags/argentina.svg', players: ['DAMAGE13', 'FRITZ', 'MAXI', 'NAVARS', 'NOZWER', 'SKYWALKER', ['LEO', true]] },
  Brazil: { code: 'br', flag: 'https://deadlockpremier.com/flags/brazil.svg', players: ['LAROKASHI', 'DK', '1WORST', 'MACHINE', 'BACALHAU', 'SNIPER', ['SOYER', true]] },
  Canada: { code: 'ca', flag: 'https://deadlockpremier.com/flags/canada.svg', players: ['AVG', 'BRAEDEN', 'CIKP', 'DEATHY', 'LEAGUE', 'ROCAINE'] },
  Chile: { code: 'cl', flag: 'https://deadlockpremier.com/flags/chile.svg', players: ['CARTOON', 'COLDY', 'HERO', 'LEG', 'SAGA', 'SEPHUKU'] },
  Mexico: { code: 'mx', flag: 'https://deadlockpremier.com/flags/mexico.png', players: ['GENERICEDBOI', 'JONKY', 'M4TTX', 'PROPERAL', 'RVZY', 'TRAXUS'] },
  Peru: { code: 'pe', flag: 'https://deadlockpremier.com/flags/peru.svg', players: ['BELUGA', 'EMPTYYY', 'LION', 'NEL', 'SCREAMS', 'SLYX'] },
  USA: { code: 'us', flag: 'https://deadlockpremier.com/flags/usa.svg', players: ['GOOBER', 'JONJON', 'LEFAA', 'SAIAH', 'SHADOVIS', 'DOUGE'] },
  Venezuela: { code: 've', flag: 'https://deadlockpremier.com/flags/venezuela.svg', players: ['DAEK', 'DASEIN', 'SRCALVILLO', 'OBELISK', 'ANTNOX', ['PELICAN', true], ['ESPOKE', true]] },
}

for (const t of Object.values(TEAMS)) t.group = 'Copa América'

// ---- Times profissionais do EDL.GG (Cloud9, Leviathan, Buff Enjoyers...): elenco vem da página do time.
const EDL_MIN_ROSTER = 4
async function loadEdlTeams() {
  const out = {}
  try {
    const res = await fetch('https://edl.gg/api/owned/teams?time=all&preload=true&includeFacets=false&contract=final-tables-v1', { headers: HEADERS })
    const rows = res.ok ? (await res.json()).rows : []
    for (let i = 0; i < rows.length; i += 5) {
      await Promise.all(
        rows.slice(i, i + 5).map(async (row) => {
          try {
            const html = await (await fetch('https://edl.gg' + row.href, { headers: HEADERS })).text()
            const roster = []
            for (const m of html.matchAll(/aria-label="([^"]*) statistics"/g)) {
              const name = m[1].replace(/&amp;/g, '&')
              if (name === 'Team player' || name.endsWith(' featured') || roster.includes(name)) continue
              roster.push(name)
            }
            if (roster.length < EDL_MIN_ROSTER) return
            const t = row.team
            out[t.name] = {
              group: 'EDL',
              code: (t.tag ?? t.name).toLowerCase(),
              flag: t.logoUrl,
              region: t.region,
              globalRank: t.globalRank ?? null,
              titles: t.titles,
              earnings: t.earnings,
              seriesWr: Math.round((t.seriesWins / Math.max(1, t.seriesWins + t.seriesLosses)) * 100),
              matchWr: Math.round((t.matchWins / Math.max(1, t.matchWins + t.matchLosses)) * 100),
              url: 'https://edl.gg' + row.href,
              players: roster,
            }
          } catch (e) {
            console.log('EDL time falhou:', row.team?.name, e.message)
          }
        }),
      )
    }
  } catch (e) {
    console.log('EDL times falhou:', e.message)
  }
  // ordena pelo ranking global (sem ranking vai pro fim)
  return Object.fromEntries(Object.entries(out).sort((a, b) => (a[1].globalRank ?? 99) - (b[1].globalRank ?? 99)))
}
Object.assign(TEAMS, await loadEdlTeams())
console.log('Times EDL:', Object.keys(TEAMS).filter((k) => TEAMS[k].group === 'EDL').join(', '))

// Nicks que aparecem diferente no DeadChaps (tags de time / grafia) — vistos no ranking do site
const ALIAS = { AVG: 'C9 Average', SAIAH: 'C9 Saiah', JONJON: 'C9 JonJon', BACALHAU: 'Bacas' }

const get = async (path) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(BASE + path, { headers: HEADERS })
      if (r.status === 404) return null
      if (r.ok) return await r.json()
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

const heroesRaw = (await get('/deadlock/heroes/slim')) ?? []
const heroes = Object.fromEntries(
  heroesRaw.map((h) => [h.id, { name: h.name, icon: h.images?.icon_image_small_webp ?? h.images?.icon_image_small ?? null, art: h.images?.top_bar_vertical_image_webp ?? h.images?.icon_hero_card_webp ?? null }]),
)
const ranksRaw = (await get('/deadlock/ranks')) ?? []
const ranks = Object.fromEntries(
  ranksRaw.map((r) => [r.tier, { name: r.name, color: r.color, img: r.images?.large_webp ?? r.images?.large }]),
)

async function build(team, entry) {
  const [nick, sub] = Array.isArray(entry) ? entry : [entry, false]
  const rec = { nick, team, sub, found: false }
  const q = ALIAS[nick] ?? nick
  const r = await get('/player/resolve?q=' + encodeURIComponent(q))
  const cands = r?.candidates ?? []
  // jogadores de torneio costumam ser os de maior rank entre homônimos
  const exact = cands
    .filter((c) => c.username.toLowerCase() === q.toLowerCase())
    .sort((a, b) => (b.badge ?? 0) - (a.badge ?? 0) || b.ranked_games - a.ranked_games)
  // tag de time/prefixo no DeadChaps: "C9 Lomein", "ttv/Jitzim"
  const tagged = cands
    .filter((c) => new RegExp(`(^|[\\s/|])${q.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(c.username.toLowerCase()))
    .sort((a, b) => (b.badge ?? 0) - (a.badge ?? 0) || b.ranked_games - a.ranked_games)
  // junta exatos + com tag; perfis ativos (>=5 ranked) primeiro, depois maior rank
  const pool = [...exact, ...tagged.filter((t) => !exact.includes(t))].sort(
    (a, b) =>
      Number((b.ranked_games ?? 0) >= 5) - Number((a.ranked_games ?? 0) >= 5) ||
      (b.badge ?? 0) - (a.badge ?? 0) ||
      b.ranked_games - a.ranked_games,
  )
  const pick = pool[0] ?? cands[0] ?? (r ? { steam_id: r.steam_id, username: r.username } : null)
  if (!pick) return rec
  const id = pick.steam_id
  const [p, s, h, m] = await Promise.all([
    get(`/player/${id}`),
    get(`/player/${id}/stats?modes=ranked`),
    get(`/player/${id}/heroes?modes=ranked`),
    get(`/player/${id}/matches?limit=6&modes=ranked`),
  ])
  // últimas partidas (qualquer modo): herói jogado + frag (K/D/A)
  rec.recent = (m?.matches ?? []).slice(0, 6).map((x) => ({
    hero: heroes[x.hero_id]?.name ?? `#${x.hero_id}`,
    icon: heroes[x.hero_id]?.icon ?? null,
    art: heroes[x.hero_id]?.art ?? null,
    souls: x.player_souls,
    delta: x.ranked_delta,
    badge: x.ranked_badge,
    avgBadge: x.average_badge,
    items: (x.final_items ?? []).slice(0, 12).map((i) => ({ n: i.name, img: i.image_url })),
    k: x.kills,
    d: x.deaths,
    a: x.assists,
    win: x.result === 'victory',
    mode: x.mode,
    date: x.date,
    mins: Math.round(x.duration / 60),
    id: x.match_id,
  }))
  rec.found = true
  rec.id = id
  rec.username = pick.username
  rec.profile = `https://www.deadchaps.gg/player/${id}`
  rec.avatar = p?.player?.avatar ?? pick.avatar_url ?? null
  rec.badge = pick.badge ?? p?.player?.rank ?? 0
  rec.matches30d = pick.matches_30d ?? 0
  // confiança do match: exato e único / exato com vários homônimos / aproximado
  rec.match = exact.length === 1 && pick === exact[0] && exact[0].ranked_games >= 10 ? 'alta' : pool.length ? 'media' : 'baixa'
  if (ALIAS[nick]) rec.match = 'media'
  rec.alts = cands.filter((c) => c.steam_id !== id).slice(0, 3).map((c) => ({ id: c.steam_id, name: c.username, games: c.ranked_games }))
  if (s && s.games) {
    rec.stats = {
      games: s.games,
      kills: s.averages.kills,
      deaths: s.averages.deaths,
      assists: s.averages.assists,
      souls: s.averages.souls,
      heroDmg: s.averages.hero_damage,
      objDmg: s.averages.obj_damage,
      lastHits: s.averages.last_hits,
      denies: s.averages.denies,
      accuracy: s.accuracy_pct,
      headshot: s.headshot_pct,
      bestKills: s.best_kills,
      bestKda: s.best_kda,
      winStreak: s.streaks?.highest_win ?? 0,
      avgMinutes: s.avg_game_seconds / 60,
    }
  }
  if (Array.isArray(h) && h.length) {
    const sorted = [...h].sort((a, b) => b.games - a.games)
    rec.wins = h.reduce((a, x) => a + x.wins, 0)
    rec.losses = h.reduce((a, x) => a + x.losses, 0)
    rec.heroes = sorted.slice(0, 3).map((x) => ({
      name: heroes[x.hero_id]?.name ?? `#${x.hero_id}`,
      icon: heroes[x.hero_id]?.icon ?? null,
      art: heroes[x.hero_id]?.art ?? null,
      games: x.games,
      wins: x.wins,
      winRate: x.win_rate,
      kda: (x.total_kills + x.total_assists) / Math.max(1, x.total_deaths),
    }))
  }
  return rec
}

const jobs = Object.entries(TEAMS).flatMap(([team, t]) => t.players.map((p) => [team, p]))
const players = []
for (let i = 0; i < jobs.length; i += 6) {
  players.push(...(await Promise.all(jobs.slice(i, i + 6).map(([t, p]) => build(t, p)))))
  console.log(`${Math.min(i + 6, jobs.length)}/${jobs.length}`)
}

// ---- EDL.GG: cenário competitivo (prêmios, títulos, MVPs, séries). API JSON usada pelo próprio site.
const EDL_ALIAS = { AVG: 'average' } // nick da Copa -> nome no EDL
try {
  const r = await fetch('https://edl.gg/api/owned/players?time=all&preload=true&includeFacets=false&contract=final-tables-v1', { headers: HEADERS })
  const edl = r.ok ? await r.json() : { rows: [] }
  const byName = new Map(edl.rows.map((x) => [x.identity.name.toLowerCase(), x]))
  const num = (c) => (c?.sortValue ?? null)
  for (const p of players) {
    const row = byName.get((EDL_ALIAS[p.nick] ?? p.nick).toLowerCase())
    // no EDL, o nome do jogador vem direto do EDL (sem alias de Copa)
    if (!row) continue
    const res = row.tableModes.results
    const perf = row.tableModes.performance
    p.edl = {
      url: 'https://edl.gg' + row.href,
      name: row.identity.name,
      photo: row.identity.imageSrc ?? null,
      earnings: num(res.earnings),
      titles: num(res.titles),
      mvps: num(res.mvps),
      seriesW: res.seriesWl?.wins ?? 0,
      seriesL: res.seriesWl?.losses ?? 0,
      seriesWr: num(res.seriesWr),
      matchW: res.matchesWl?.wins ?? 0,
      matchL: res.matchesWl?.losses ?? 0,
      matchWr: num(res.matchesWr),
      kd: num(perf.kd),
      kda: num(perf.kda),
      kp: num(perf.kp),
      dpm: num(perf.dpm),
      spm: num(perf.spm),
      heroes: (res.mostPlayedHeroes?.heroes ?? []).slice(0, 4).map((h) => ({ name: h.name, icon: h.iconSrc, matches: h.matches })),
    }
  }
  console.log('EDL:', players.filter((p) => p.edl).map((p) => p.nick).join(', '))
} catch (e) {
  console.log('EDL falhou:', e.message)
}

const teams = Object.entries(TEAMS).map(([name, t]) => {
  const { players: _p, ...meta } = t
  return { name, ...meta }
})
mkdirSync('src/data', { recursive: true })
writeFileSync(
  'src/data/players.json',
  JSON.stringify({ updatedAt: new Date().toISOString(), teams, ranks, players }, null, 1),
)
console.log('ok:', players.filter((p) => p.found).length, 'encontrados de', players.length)
console.log('não encontrados:', players.filter((p) => !p.found).map((p) => p.nick).join(', '))
