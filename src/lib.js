import bundled from './data/players.json'

// Dados dos jogadores: começam com o arquivo empacotado no build e podem ser trocados em tempo de
// execução (botão "Atualizar" / a cada 1 hora) por setData(). Exportados como "live bindings".
export let teams, ranks, players, updatedAt
let withStats = []

const isData = (d) =>
  !!d && Array.isArray(d.players) && d.players.length > 0 && Array.isArray(d.teams) && d.teams.length > 0 && !!d.ranks && typeof d.updatedAt === 'string'

function apply(raw) {
  ;({ teams, ranks, players, updatedAt } = raw)
  withStats = players.filter((p) => p.stats && p.wins != null)
}
apply(bundled)

// troca os dados se o arquivo for válido; devolve true/false
export function setData(raw) {
  if (!isData(raw)) return false
  apply(raw)
  return true
}

export const keyOf = (p) => `${p.team}:${p.nick}`

// Escala de notas (mesma ideia da carta de referência)
export const TIERS = [
  { id: 'god', label: 'GOD', range: '90+', min: 90, color: '#f5d061' },
  { id: 'craque', label: 'Craque', range: '80-89', min: 80, color: '#c77dff' },
  { id: 'bom', label: 'Bom', range: '70-79', min: 70, color: '#4ade80' },
  { id: 'mediano', label: 'Mediano', range: '60-69', min: 60, color: '#7dd3fc' },
  { id: 'bagre', label: 'Bagre', range: '0-59', min: 0, color: '#c08457' },
]
export const tierOf = (n) => (n == null ? null : TIERS.find((t) => n >= t.min))

export const rankOf = (badge) => {
  if (!badge) return { name: 'Sem rank', color: '#8a8070', img: null }
  const tier = Math.floor(badge / 10)
  const sub = badge % 10
  const r = ranks[tier]
  return r
    ? { name: `${r.name} ${sub || ''}`.trim(), color: r.color, img: r.img }
    : { name: `Rank ${badge}`, color: '#8a8070', img: null }
}

export const rosterOf = (name) => players.filter((p) => p.team === name)

// grupos de times: Copa América (seleções) e EDL (times profissionais)
export const GROUPS = [
  { id: 'Copa América', label: 'Copa América' },
  { id: 'EDL', label: 'Times pro (EDL)' },
]
export const teamsOf = (group) => teams.filter((t) => (t.group ?? 'Copa América') === group)
export const groupOfTeam = (name) => teams.find((t) => t.name === name)?.group ?? 'Copa América'

// média das notas dadas pelo usuário (null se ninguém foi avaliado)
export const teamStats = (roster, grades, includeSubs = true) => {
  const counted = roster.filter((p) => includeSubs || !p.sub)
  const rated = counted.filter((p) => grades[keyOf(p)] != null)
  const avg = rated.length ? rated.reduce((a, p) => a + grades[keyOf(p)], 0) / rated.length : null
  return { counted, rated, avg, complete: counted.length > 0 && rated.length === counted.length }
}

export const kdaOf =(s) => (s.kills + s.assists) / Math.max(1, s.deaths)

// ---- Radar: cada eixo normalizado (percentil) contra todos os jogadores do torneio
const AXES = [
  { label: 'KDA', get: (p) => kdaOf(p.stats) },
  { label: 'DANO', get: (p) => p.stats.heroDmg },
  { label: 'SOULS', get: (p) => p.stats.souls },
  { label: 'MIRA', get: (p) => p.stats.accuracy },
  { label: 'HS%', get: (p) => p.stats.headshot },
  { label: 'OBJ', get: (p) => p.stats.objDmg },
  { label: 'WIN%', get: (p) => (p.wins / Math.max(1, p.wins + p.losses)) * 100 },
]
// percentil dentro do mesmo grupo (Copa x Copa, pro x pro)
const pct = (axis, v, group) => {
  const vals = withStats.filter((p) => groupOfTeam(p.team) === group).map(axis.get)
  return vals.filter((x) => x <= v).length / Math.max(1, vals.length)
}
export const radarOf = (p) => {
  if (!p.stats || p.wins == null) return null
  const g = groupOfTeam(p.team)
  return AXES.map((a) => ({ label: a.label, value: pct(a, a.get(p), g) }))
}

// ---- Atributos da SUA carta (estilo FUT): 6 notas de 1 a 99 que SÓ você preenche. Começam vazias e nunca mudam
// sozinhas (nem com atualização de dados): é a sua opinião, para ser comparada com a carta que o torneio gerou.
// São os mesmos 6 atributos da carta do torneio (matches.js: GAME_ATTRS), para a comparação ser um a um.
export const ATTRS = [
  { k: 'KDA', desc: 'Abates + assistências por morte', w: 0.2 },
  { k: 'DMG', desc: 'Dano em heróis por minuto', w: 0.2 },
  { k: 'SOU', desc: 'Souls por minuto', w: 0.15 },
  { k: 'OBJ', desc: 'Dano em objetivos por minuto', w: 0.1 },
  { k: 'FRM', desc: 'Last hits + denies por minuto', w: 0.1 },
  { k: 'IMP', desc: 'Impacto: nota de MVP do Statlocker (0-100)', w: 0.25 },
]

// valores da carta: só o que a pessoa digitou (vazio = null)
export const attrValues = (_p, overrides = {}) => Object.fromEntries(ATTRS.map((a) => [a.k, overrides?.[a.k] ?? null]))

// nota geral: média ponderada dos atributos disponíveis (pesos renormalizados)
export const ovrOf = (values) => {
  const have = ATTRS.filter((a) => values[a.k] != null)
  if (!have.length) return null
  const w = have.reduce((s, a) => s + a.w, 0)
  return Math.round(have.reduce((s, a) => s + values[a.k] * a.w, 0) / w)
}

export const fmt = (n, d = 1) => (n == null ? '–' : Number(n).toFixed(d))
export const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`)

export const ago = (iso) => {
  const h = (Date.now() - new Date(iso + 'Z').getTime()) / 36e5
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}min atrás`
  if (h < 48) return `${Math.round(h)}h atrás`
  return `${Math.round(h / 24)}d atrás`
}
