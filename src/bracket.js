// Chave do torneio (eliminatória dupla), portada do motor do site oficial (deadlockpremier.com/overlay/bracket-core.js).
// O site publica { format, teams (na ordem de seed), opts, results } em /api/bracket?featured=1; quem joga contra quem é calculado
// só pela quantidade de times, então os IDs dos confrontos (W1-1, L2-1, GF...) são estáveis.
import { phaseOf } from './matches'

export const BYE = 'BYE'
const pow2 = (n) => {
  let p = 1
  while (p < n) p *= 2
  return p
}
// ordem dos seeds na 1ª rodada: [1,8,4,5,2,7,3,6] para 8 times (1 x 8, 4 x 5, 2 x 7, 3 x 6)
const seedOrder = (P) => {
  let o = [1]
  while (o.length < P) {
    const n = o.length * 2
    const x = []
    for (const s of o) x.push(s, n + 1 - s)
    o = x
  }
  return o
}
const num = (v) => {
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? 0 : n
}

// Chave padrão da Copa América (a mesma que o site publica, para o layout aparecer mesmo sem rede)
export const COPA_BRACKET = {
  name: 'Copa America 2026',
  format: 'double',
  teams: ['Argentina', 'Chile', 'Canada', 'Mexico', 'Venezuela', 'USA', 'Brazil', 'Peru'].map((name) => ({ name })),
  opts: { bestOf: 3, reset: false },
  results: {},
}

export const validBracket = (d) => Array.isArray(d?.teams) && d.teams.length >= 2

// Estrutura + resultados. Devolve a lista de confrontos na ordem do torneio ou null se o formato não for eliminatória dupla.
export function computeBracket(b) {
  if (!b || b.format !== 'double' || !Array.isArray(b.teams) || b.teams.length < 2) return null
  const names = b.teams.map((t) => t.name)
  const N = names.length
  const P = pow2(Math.max(2, N))
  const R = Math.log2(P)
  const ord = seedOrder(P)
  const res = b.results ?? {}
  const matches = {}
  const order = []
  const add = (m) => {
    matches[m.id] = m
    order.push(m.id)
    return m
  }

  // chave de cima
  for (let r = 1; r <= R; r++) {
    const cnt = P / 2 ** r
    for (let i = 0; i < cnt; i++) {
      const a = r === 1 ? { seed: ord[2 * i] } : { win: `W${r - 1}-${2 * i + 1}` }
      const c = r === 1 ? { seed: ord[2 * i + 1] } : { win: `W${r - 1}-${2 * i + 2}` }
      add({ id: `W${r}-${i + 1}`, sec: 'upper', round: r, idx: i, count: cnt, a, b: c })
    }
  }
  // chave de baixo
  const lowerRounds = []
  let prev = []
  const c1 = P / 4
  const rd1 = []
  for (let j = 0; j < c1; j++) {
    const id = `L1-${j + 1}`
    add({ id, sec: 'lower', round: 1, idx: j, a: { lose: `W1-${2 * j + 1}` }, b: { lose: `W1-${2 * j + 2}` } })
    rd1.push(id)
  }
  lowerRounds.push(rd1)
  prev = rd1
  let L = 1
  for (let k = 1; k <= R - 1; k++) {
    const cnt2 = P / 2 ** (k + 1)
    L++
    const rd2 = []
    for (let j2 = 0; j2 < cnt2; j2++) {
      const wi = k % 2 === 1 ? cnt2 - j2 : j2 + 1 // inverte a ordem de entrada para evitar reencontros rápidos
      const id = `L${L}-${j2 + 1}`
      add({ id, sec: 'lower', round: L, idx: j2, a: { win: prev[j2] }, b: { lose: `W${k + 1}-${wi}` } })
      rd2.push(id)
    }
    lowerRounds.push(rd2)
    prev = rd2
    if (k < R - 1) {
      L++
      const rd3 = []
      for (let j3 = 0; j3 < cnt2 / 2; j3++) {
        const id = `L${L}-${j3 + 1}`
        add({ id, sec: 'lower', round: L, idx: j3, a: { win: prev[2 * j3] }, b: { win: prev[2 * j3 + 1] } })
        rd3.push(id)
      }
      lowerRounds.push(rd3)
      prev = rd3
    }
  }
  add({ id: 'GF', sec: 'final', round: 1, idx: 0, a: { win: `W${R}-1` }, b: { win: prev[0] } })
  if (b.opts?.reset) add({ id: 'GF2', sec: 'final', round: 2, idx: 0, a: { win: `W${R}-1` }, b: { win: prev[0] }, reset: true })

  // nomes das etapas, no padrão do site (Upper Quarterfinal 1, Lower Round 1.1, Lower Final...)
  const lowerLast = lowerRounds.length - 1
  for (const id of order) {
    const m = matches[id]
    if (m.sec === 'upper') {
      const left = R - m.round
      m.column = left === 0 ? 'Upper Final' : left === 1 ? 'Upper Semifinals' : left === 2 ? 'Upper Quarterfinals' : `Upper Round ${m.round}`
      m.stage = left === 0 ? 'Upper Final' : left === 1 ? `Upper Semifinal ${m.idx + 1}` : left === 2 ? `Upper Quarterfinal ${m.idx + 1}` : `Upper Round ${m.round}.${m.idx + 1}`
    } else if (m.sec === 'lower') {
      const li = lowerRounds.findIndex((r) => r.includes(id))
      const last = li === lowerLast
      m.column = last ? 'Lower Final' : `Lower Round ${li + 1}`
      m.stage = last ? 'Lower Final' : lowerRounds[li].length > 1 ? `Lower Round ${li + 1}.${m.idx + 1}` : `Lower Round ${li + 1}`
    } else {
      m.column = 'Grand Final'
      m.stage = m.reset ? 'Grand Final (reset)' : 'Grand Final'
    }
  }

  // resultados: quem joga e quem avançou
  const memo = {}
  const slot = (src) => {
    if (!src) return null
    if ('seed' in src) return src.seed <= N ? names[src.seed - 1] : BYE
    const o = outcome(src.win ?? src.lose)
    return o ? (src.win ? o.w : o.l) : null
  }
  function outcome(id) {
    if (id in memo) return memo[id]
    memo[id] = null
    const m = matches[id]
    if (!m) return null
    const A = slot(m.a)
    const B = slot(m.b)
    const r = res[id] ?? {}
    let o = null
    if (A === BYE && B === BYE) o = { w: BYE, l: BYE, bye: true }
    else if (A === BYE && B !== null) o = { w: B, l: BYE, bye: true }
    else if (B === BYE && A !== null) o = { w: A, l: BYE, bye: true }
    else if (A !== null && B !== null && r.st === 'final' && num(r.a) !== num(r.b)) o = num(r.a) > num(r.b) ? { w: A, l: B } : { w: B, l: A }
    memo[id] = o
    return o
  }
  const label = (src) => {
    const id = src.win ?? src.lose
    return `${src.win ? 'Vencedor' : 'Perdedor'} ${matches[id]?.stage ?? ''}`.trim()
  }
  for (const id of order) {
    const m = matches[id]
    const r = res[id] ?? {}
    m.A = slot(m.a)
    m.B = slot(m.b)
    m.aLabel = m.A === null && !('seed' in m.a) ? label(m.a) : null
    m.bLabel = m.B === null && !('seed' in m.b) ? label(m.b) : null
    m.sa = r.a === undefined ? null : num(r.a)
    m.sb = r.b === undefined ? null : num(r.b)
    m.st = r.st ?? ''
    m.out = outcome(id)
    m.bestOf = b.opts?.bestOf ?? 3
  }
  // a final de reset só é necessária se o time da chave de baixo vencer a 1ª final
  if (matches.GF2) matches.GF2.needed = !!(matches.GF.out && matches.GF.out.w === matches.GF.B && matches.GF.B !== BYE)
  return order
    .map((id) => matches[id])
    .filter((m) => m.A !== BYE && m.B !== BYE && !(m.reset && !m.needed)) // sem byes e sem reset desnecessário
}

// ---------------------------------------------------------------------------
// "Quadro" para a tela: colunas por rodada (Upper bracket / Lower bracket) com cartões no formato do site.
// card = { key, stage, grand, serieKey, slots: [{ id, gameNo, game }], rows: [{ name, label, score, won }] }

const pairKey = (a, b) => [a, b].sort().join('||')

export function boardFromBracket(matches, series) {
  const used = new Set()
  const bySeries = new Map()
  for (const s of series) {
    const k = pairKey(s.natA, s.natB)
    if (!bySeries.has(k)) bySeries.set(k, [])
    bySeries.get(k).push(s)
  }
  const upper = new Map()
  const lower = new Map()
  for (const m of matches) {
    // série publicada deste confronto (mesmos dois times; em caso de repetição, a ainda não usada)
    let s = null
    if (m.A && m.B) s = (bySeries.get(pairKey(m.A, m.B)) ?? []).find((x) => !used.has(x.key)) ?? null
    if (s) used.add(s.key)
    const live = s && { a: s.natA === m.A ? s.winsA : s.winsB, b: s.natA === m.A ? s.winsB : s.winsA }
    const sa = m.sa ?? live?.a ?? null
    const sb = m.sb ?? live?.b ?? null
    const won = (mine, other, name) => (m.out ? m.out.w === name : sa != null && sb != null && mine > other)
    const card = {
      key: m.id,
      stage: m.stage,
      grand: m.sec === 'final',
      status: m.st,
      serieKey: s?.key ?? null,
      slots: s?.slots ?? [],
      rows: [
        { name: m.A, label: m.aLabel, score: sa, won: !!m.A && sa != null && sb != null && won(sa, sb, m.A) },
        { name: m.B, label: m.bLabel, score: sb, won: !!m.B && sa != null && sb != null && won(sb, sa, m.B) },
      ],
    }
    const target = m.sec === 'lower' ? lower : upper
    if (!target.has(m.column)) target.set(m.column, [])
    target.get(m.column).push(card)
  }
  const toCols = (map) => [...map.entries()].map(([name, items]) => ({ name, items }))
  // séries publicadas que não encaixaram em nenhum confronto da chave
  const other = series.filter((s) => !used.has(s.key)).map(cardFromSeries)
  return { upper: toCols(upper), lower: toCols(lower), other, groups: [] }
}

export function cardFromSeries(s) {
  return {
    key: s.key,
    stage: s.stage || s.title,
    grand: /^Grand/i.test(s.stage),
    status: '',
    serieKey: s.key,
    slots: s.slots,
    rows: [
      { name: s.natA, label: null, score: s.winsA, won: s.winsA > s.winsB },
      { name: s.natB, label: null, score: s.winsB, won: s.winsB > s.winsA },
    ],
  }
}

const kindOf = (stage = '') => (/^Group/i.test(stage) ? 'groups' : /^Lower/i.test(stage) ? 'lower' : /^(Upper|Grand)/i.test(stage) ? 'upper' : 'other')

// quadro a partir só das séries publicadas (eventos já encerrados, sem a chave oficial)
export function boardFromSeries(series) {
  const out = { upper: new Map(), lower: new Map(), other: [], groups: [] }
  const first = new Map()
  for (const s of series) {
    const kind = kindOf(s.stage)
    const card = cardFromSeries(s)
    if (kind === 'groups') out.groups.push(card)
    else if (kind === 'other') out.other.push(card)
    else {
      const col = phaseOf(s.stage)
      const m = out[kind]
      if (!m.has(col)) m.set(col, [])
      m.get(col).push({ ...card, _stage: s.stage, _start: s.start })
      first.set(col, Math.min(first.get(col) ?? Infinity, s.start))
    }
  }
  const toCols = (map) =>
    [...map.entries()]
      .map(([name, items]) => ({
        name,
        first: first.get(name),
        items: items.sort((a, b) => a._stage.localeCompare(b._stage, undefined, { numeric: true }) || a._start - b._start),
      }))
      .sort((a, b) => a.first - b.first)
  return { upper: toCols(out.upper), lower: toCols(out.lower), other: out.other, groups: out.groups }
}
