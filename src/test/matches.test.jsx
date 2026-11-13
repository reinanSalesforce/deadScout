import { describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import fixture from './fixtures/showdown.json'
import {
  GAME_ATTRS,
  HERO_ASSET,
  findDatasetPlayer,
  fmtDuration,
  heroImg,
  incomeShares,
  laneMates,
  laneOpponents,
  laneReport,
  ovrFrom,
  phaseOf,
  playerSummary,
  rateGame,
  seriesOf,
  soulLead,
  soulsAt,
} from '../matches'
import { MATCH_POLL_MS, sourcesFor, useJsonSource } from '../useJsonSource'
import { collectItems, compactGame, decodePath, isCopa, laneFromPath } from '../../scripts/dp.mjs'

const games = fixture.games
const game1 = games.find((g) => g.id === 96842920) // Showdown #2 · Upper Quarterfinal 1 · Game 1 (Requiem x Berzerkers)

// "Copa de mentira": mesmas estatísticas, mas com seleções e jogadores registrados da Copa
function copaLike() {
  const g = structuredClone(game1)
  g.title = 'Copa America'
  g.natA = 'Brazil'
  g.natB = 'Chile'
  g.winner = 'Brazil'
  g.teams[0].nation = 'Brazil'
  g.teams[1].nation = 'Chile'
  const one = g.teams[0].players.find((p) => p.name === '1Worst')
  Object.assign(one, { name: '1WORST', registered: true, nation: 'Brazil' })
  return { updatedAt: '2026-11-14T20:00:00.000Z', event: 'Copa America', games: [g], items: fixture.items }
}

const route = (map) =>
  vi.fn((url) => {
    const hit = Object.entries(map).find(([k]) => String(url).includes(k))
    return Promise.resolve(hit ? { ok: true, status: 200, json: () => Promise.resolve(hit[1]) } : { ok: false, status: 404 })
  })

describe('notas por jogo (rateGame)', () => {
  const rated = rateGame(game1)

  it('avalia os 12 jogadores com 6 atributos e nota geral entre 1 e 99', () => {
    expect(rated).toHaveLength(12)
    for (const p of rated) {
      expect(Object.keys(p.values)).toEqual(GAME_ATTRS.map((a) => a.k))
      for (const a of GAME_ATTRS) {
        expect(p.values[a.k], `${p.name} ${a.k}`).toBeGreaterThanOrEqual(1)
        expect(p.values[a.k], `${p.name} ${a.k}`).toBeLessThanOrEqual(99)
      }
      expect(p.ovr).toBeGreaterThanOrEqual(1)
      expect(p.ovr).toBeLessThanOrEqual(99)
    }
  })

  it('o melhor de cada atributo relativo recebe 99 e o pior fica a partir de 45', () => {
    for (const k of ['KDA', 'DMG', 'SOU', 'OBJ', 'FRM']) {
      const vals = rated.map((p) => p.values[k])
      expect(Math.max(...vals), k).toBe(99)
      expect(Math.min(...vals), k).toBeGreaterThanOrEqual(45)
    }
  })

  it('mais dano por minuto nunca dá nota menor', () => {
    const m = game1.duration / 60
    const byDmg = [...rated].sort((a, b) => a.dmg / m - b.dmg / m)
    for (let i = 1; i < byDmg.length; i++) expect(byDmg[i].values.DMG).toBeGreaterThanOrEqual(byDmg[i - 1].values.DMG)
  })

  it('IMP usa a nota de MVP do Statlocker e há exatamente um MVP do jogo', () => {
    for (const p of rated.filter((x) => x.mvp != null)) expect(p.values.IMP).toBe(Math.max(1, Math.min(99, Math.round(p.mvp))))
    const mvps = rated.filter((p) => p.isMvp)
    expect(mvps).toHaveLength(1)
    expect(mvps[0].ovr).toBe(Math.max(...rated.map((p) => p.ovr)))
  })

  it('sem nota de MVP, a nota geral renormaliza os pesos', () => {
    expect(ovrFrom({ KDA: 80, DMG: 60, SOU: null, OBJ: null, FRM: null, IMP: null })).toBe(70)
    expect(ovrFrom({ KDA: null, DMG: null, SOU: null, OBJ: null, FRM: null, IMP: null })).toBeNull()
    const noMvp = structuredClone(game1)
    noMvp.teams.forEach((t) => t.players.forEach((p) => (p.mvp = null)))
    for (const p of rateGame(noMvp)) {
      expect(p.values.IMP).toBeNull()
      expect(p.ovr).not.toBeNull()
    }
  })

  it('pesos somam 100%', () => expect(GAME_ATTRS.reduce((s, a) => s + a.w, 0)).toBeCloseTo(1))
})

describe('estatísticas do jogo (modelo do site oficial)', () => {
  it('fase de lane bate com o site: Yellow 10.3K–9.1K, 0–0 abates, 1º Guardian de Berzerkers aos 8:03', () => {
    const [y, b, g] = laneReport(game1)
    expect(y.name).toBe('Yellow')
    expect(y.souls.map((s) => Math.round(s / 100) / 10)).toEqual([10.3, 9.1])
    expect(y.kills).toEqual([0, 0])
    expect(y.lead).toBe(0) // Requiem (time 0) na frente
    expect(Math.round(y.diff / 100) / 10).toBe(1.2)
    expect(y.firstGuardian).toEqual({ t: 483, team: 1 })
    expect(b.firstGuardian).toEqual({ t: 537, team: 1 }) // 8:57
    expect(g.kills).toEqual([3, 2]) // Green no site: 3 – 2
    expect(g.firstGuardian).toEqual({ t: 475, team: 1 }) // 7:55
  })

  it('cada lane tem 2 jogadores de cada time (lane real, pela posição)', () => {
    for (const l of laneReport(game1)) expect(l.sides.map((s) => s.length)).toEqual([2, 2])
  })

  it('adversários e dupla de lane', () => {
    const p = rateGame(game1).find((x) => x.name === 'FRITZ')
    const opps = laneOpponents(game1, p)
    expect(opps).toHaveLength(2)
    expect(opps.every((o) => o.laneC === p.laneC && o.teamIdx !== p.teamIdx)).toBe(true)
    const mates = laneMates(game1, p)
    expect(mates).toHaveLength(1)
    expect(game1.teams[p.teamIdx].players.some((q) => q.account === mates[0].account)).toBe(true) // da mesma equipe
  })

  it('sem lane conhecida, o adversário vem da mesma posição de souls no outro time', () => {
    const g = structuredClone(game1)
    g.teams.forEach((t) => t.players.forEach((p) => (p.laneC = null)))
    const p = rateGame(g)[0]
    const opps = laneOpponents(g, p)
    expect(opps).toHaveLength(1)
    expect(opps[0].teamIdx).not.toBe(p.teamIdx)
  })

  it('curva de souls: começa em 0, termina no placar final e Requiem lidera', () => {
    const pts = soulLead(game1)
    expect(pts[0]).toMatchObject({ t: 0, lead: 0 })
    const end = pts.at(-1)
    expect(end.t).toBe(game1.duration)
    expect(Math.abs(end.a - game1.teams[0].souls)).toBeLessThan(2) // soma dos net worth do time
    expect(Math.round(end.lead / 100) / 10).toBe(61.4) // "+61.4K at end" no site
    expect(pts.map((p) => p.t)).toEqual([...pts.map((p) => p.t)].sort((a, b) => a - b))
  })

  it('soulsAt interpola entre os pontos gravados', () => {
    const p = { nw: [[100, 1000], [200, 3000]] }
    expect(soulsAt(p, 0)).toBe(0)
    expect(soulsAt(p, 50)).toBe(500)
    expect(soulsAt(p, 150)).toBe(2000)
    expect(soulsAt(p, 999)).toBe(3000)
    expect(soulsAt({ nw: [] }, 10)).toBe(0)
  })

  it('renda por fonte soma 100% e ordena as fontes existentes', () => {
    const p = game1.teams[0].players[0]
    const inc = incomeShares(p)
    expect(inc.reduce((s, i) => s + i.pct, 0)).toBeCloseTo(100)
    expect(inc[0].k).toBe('troopers')
    expect(incomeShares({ src: null })).toEqual([])
  })

  it('decodificação do caminho e lane pela posição média', () => {
    // 2 chars por coordenada: "gs" = (32*64+44-2048)*6 ... só confere o formato e os limites da lane
    expect(decodePath('')).toEqual([])
    const left = 'AAAA'.repeat(200) // (0*64+0-2048)*6 = -12288 -> Yellow
    expect(laneFromPath(left)).toBe('Y')
    const mid = 'gAgA'.repeat(200) // (32*64-2048)*6 = 0 -> Blue
    expect(laneFromPath(mid)).toBe('B')
    const right = 'wAwA'.repeat(200) // (48*64-2048)*6 = 6144 -> Green
    expect(laneFromPath(right)).toBe('G')
    expect(laneFromPath('')).toBeNull()
  })
})

describe('séries e resumo', () => {
  const series = seriesOf(games)

  it('agrupa os jogos em séries com placar e abas Game 1, 2, 3', () => {
    const uq1 = series.find((s) => s.stage === 'Upper Quarterfinal 1')
    expect(uq1.games).toHaveLength(2)
    expect([uq1.winsA, uq1.winsB].sort()).toEqual([0, 2])
    expect(uq1.slots.map((x) => x.gameNo)).toEqual([1, 2])
    const uq2 = series.find((s) => s.stage === 'Upper Quarterfinal 2')
    expect(uq2.slots.map((x) => x.gameNo)).toEqual([1, 2, 3])
    expect(uq2.winsA + uq2.winsB).toBe(3)
  })

  it('jogo listado pela API mas sem dados aparece como aba vazia', () => {
    const uq4 = series.find((s) => s.stage === 'Upper Quarterfinal 4')
    expect(uq4.slots.length).toBe(3)
    expect(uq4.slots.filter((x) => x.game)).toHaveLength(1)
    expect(uq4.slots.filter((x) => !x.game)).toHaveLength(2)
  })

  it('séries ordenadas da mais recente para a mais antiga', () => {
    const lasts = series.map((s) => s.last)
    expect(lasts).toEqual([...lasts].sort((a, b) => b - a))
  })

  it('resumo por jogador usa a conta Steam e calcula a média', () => {
    const s = playerSummary(games)
    expect(new Set(s.map((x) => x.key)).size).toBe(s.length)
    for (const x of s) {
      expect(x.avg).toBeGreaterThanOrEqual(1)
      expect(x.best).toBeGreaterThanOrEqual(x.avg)
    }
    const top = s[0]
    const mine = games.flatMap((g) => rateGame(g)).filter((p) => String(p.account) === top.key)
    expect(top.games).toBe(mine.length)
    expect(top.avg).toBe(Math.round(mine.reduce((a, p) => a + p.ovr, 0) / mine.length))
  })
})

describe('scripts/dp.mjs', () => {
  it('isCopa reconhece o título ou duas seleções da Copa', () => {
    expect(isCopa({ title: 'Copa America 2026' })).toBe(true)
    expect(isCopa({ title: 'Showdown #2', natA: 'Brazil', natB: 'Chile' })).toBe(true)
    expect(isCopa({ title: 'Showdown #2', natA: 'Requiem', natB: 'Berzerkers' })).toBe(false)
    expect(isCopa({ title: 'x', natA: 'Brazil', natB: 'Requiem' })).toBe(false)
  })

  const view = {
    sideA: 1,
    natA: 'Brazil',
    natB: 'Chile',
    title: 'Copa America',
    stage: 'Upper Quarterfinal 1',
    gameNo: 2,
    bo: 3,
    score: [1, 0],
    games: [{ id: 5, gameNo: 1 }, { id: 9, gameNo: 2 }],
    names: { 100: { name: 'DK', nation: 'Brazil' } },
    sl: { players: { 100: { mvp: 77.5, place: 2, rank: 111, cat: [1], spk: [0.5], aw: [{ n: 'A', l: 'GOLD', d: 'x', extra: 1 }], dmg: [['Gun', 10]], dmgTot: 10, x: { kp: 0.5 } } }, lanes: [{ n: 1 }], teamRank: [105, 114] },
    items: { 1: { n: 'Item', img: 'x.png', slot: 'weapon', tier: 2 } },
    g: {
      id: 9,
      winner: 1,
      duration: 1200,
      start: 1000,
      pathStep: 2,
      obj: [[475, 1, 'G', 'Y']],
      teams: [
        { team: 0, souls: 10, kills: 3, players: [{ account: 200, slot: 1, steam: 'Chile guy', hero: 'Shiv', heroCls: 'shiv', k: 1, d: 1, a: 3, souls: 4, items: [1], deaths: [[300, 2, 0, 0, 5]], nw: [[180, 4]], path: '' }] },
        { team: 1, souls: 20, kills: 7, players: [{ account: 100, slot: 2, steam: 'dk', hero: 'Vyper', heroCls: 'kali', k: 5, d: 0, a: 1, souls: 9, items: [1, 99], deaths: [], nw: [[180, 9]], src: { troopers: 9 }, path: 'AAAA'.repeat(200) }] },
      ],
    },
  }

  it('compactGame traduz lados, vencedor, nicks registrados, série e estatísticas do jogo', () => {
    const c = compactGame(view, { Vyper: '#abc123' })
    expect(c.winner).toBe('Brazil') // team 1 == sideA == natA
    expect(c.teams[0].nation).toBe('Chile')
    expect(c.sk).toBe('s5')
    expect(c.listed).toEqual([{ id: 5, gameNo: 1 }, { id: 9, gameNo: 2 }])
    expect(c.obj).toEqual([[475, 1, 'G', 'Y']])
    expect(c.teamRank).toEqual([105, 114])
    const dk = c.teams[1].players[0]
    expect(dk).toMatchObject({ name: 'DK', registered: true, nation: 'Brazil', color: '#abc123', mvp: 77.5, place: 2, rank: 111, laneC: 'Y' })
    expect(dk.items).toEqual([1, 99]) // itens ficam como IDs; o dicionário vai uma vez no arquivo
    expect(dk.nw).toEqual([[180, 9]])
    expect(dk.sl.aw).toEqual([{ n: 'A', l: 'GOLD', d: 'x' }]) // só os campos usados
    expect(dk.sl.x).toEqual({ kp: 0.5 })
    expect(c.teams[0].players[0]).toMatchObject({ name: 'Chile guy', registered: false, sl: null })
  })

  it('abates do assassino vêm das mortes do adversário (e não contam mortes do próprio time)', () => {
    const c = compactGame(view)
    expect(c.teams[1].players[0].kt).toEqual([300]) // slot 2 matou o slot 1
    expect(c.teams[0].players[0].dt).toEqual([300])
    expect(c.teams[0].players[0].kt).toEqual([])
  })

  it('jogos sem lista de série (fase de grupos) não têm chave de série', () => {
    expect(compactGame({ ...view, games: [] }).sk).toBeNull()
  })

  it('collectItems monta o dicionário só com itens usados e conhecidos', () => {
    const dict = collectItems(view, {})
    expect(dict).toEqual({ 1: { n: 'Item', img: 'x.png', slot: 'weapon', tier: 2 } })
  })
})

describe('useJsonSource (ao vivo)', () => {
  it('em localhost usa só o arquivo do próprio site; no GitHub Pages tenta a branch live-data antes', () => {
    expect(sourcesFor('matches.json')).toHaveLength(1)
    const old = window.location
    Object.defineProperty(window, 'location', { value: { ...old, hostname: 'user.github.io' }, configurable: true })
    const urls = sourcesFor('matches.json')
    expect(urls[0]).toBe('https://raw.githubusercontent.com/reinanSalesforce/deadlock/live-data/matches.json')
    expect(urls).toHaveLength(2)
    Object.defineProperty(window, 'location', { value: old, configurable: true })
  })

  it('confere a cada 1 minuto e só troca os dados quando mudam', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const a = { games: [{ id: 1 }] }
    const f = route({ 'matches.json': a })
    vi.stubGlobal('fetch', f)
    const { result } = renderHook(() => useJsonSource('matches.json', { pollMs: MATCH_POLL_MS }))
    await waitFor(() => expect(result.current.status).toBe('ok'))
    expect(result.current.data).toEqual(a)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MATCH_POLL_MS)
    })
    expect(f.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(result.current.status).toBe('same')
    expect(MATCH_POLL_MS).toBe(60_000)
    vi.useRealTimers()
  })

  it('arquivo inválido ou erro de rede: status erro, sem quebrar', async () => {
    vi.stubGlobal('fetch', route({ 'matches.json': { lixo: 1 } }))
    const { result } = renderHook(() => useJsonSource('matches.json'))
    await waitFor(() => expect(result.current.status).toBe('erro'))
    expect(result.current.data).toBeNull()
  })

  it('não busca quando desativado', async () => {
    const f = route({})
    vi.stubGlobal('fetch', f)
    renderHook(() => useJsonSource('demo.json', { enabled: false }))
    await new Promise((r) => setTimeout(r, 30))
    expect(f).not.toHaveBeenCalled()
  })
})

describe('imagens dos heróis', () => {
  const players = games.flatMap((g) => g.teams.flatMap((t) => t.players))

  it('usa o arquivo real da imagem quando o nome interno é diferente (Lady Geist = ghost -> spectre)', () => {
    expect(heroImg({ heroCls: 'ghost' })).toMatch(/\/spectre_sm\.webp$/)
    expect(heroImg({ heroCls: 'ghost' }, 'card')).toMatch(/\/spectre_card\.webp$/)
    for (const [cls, file] of Object.entries(HERO_ASSET)) expect(heroImg({ heroCls: cls }), cls).toContain(`/${file}_sm.webp`)
    expect(heroImg({ heroCls: 'yamato' })).toMatch(/\/yamato_sm\.webp$/) // igual ao nome interno: não muda
  })

  it('heroKey (da coleta) tem prioridade sobre o nome interno', () => {
    expect(heroImg({ heroCls: 'ghost', heroKey: 'spectre' })).toMatch(/spectre_sm/)
    expect(heroImg({ heroCls: 'abc', heroKey: 'xyz' })).toMatch(/xyz_sm/)
    expect(heroImg({})).toBeNull()
    expect(heroImg(null)).toBeNull()
  })

  it('todo jogador dos dados coletados tem heroKey e a URL nunca usa um nome interno sabidamente errado', () => {
    for (const p of players) {
      expect(p.heroKey, `${p.name} (${p.hero})`).toBeTruthy()
      expect(heroImg(p)).toContain(`/${p.heroKey}_sm.webp`)
      expect(Object.keys(HERO_ASSET)).not.toContain(heroImg(p).split('/').pop().replace('_sm.webp', ''))
    }
  })

  it('compactGame grava heroKey a partir do dicionário de heróis (texto = só cor)', () => {
    const view = {
      sideA: 0, natA: 'A', natB: 'B', g: { id: 1, winner: 0, duration: 600, start: 1, teams: [
        { team: 0, souls: 1, kills: 1, players: [{ account: 1, slot: 1, steam: 'x', hero: 'Lady Geist', heroCls: 'ghost', k: 0, d: 0, a: 0, souls: 1 }] },
        { team: 1, souls: 1, kills: 1, players: [{ account: 2, slot: 2, steam: 'y', hero: 'Shiv', heroCls: 'shiv', k: 0, d: 0, a: 0, souls: 1 }] },
      ] },
    }
    const c = compactGame(view, { 'Lady Geist': { color: '#218440', key: 'spectre' }, Shiv: '#123456' })
    expect(c.teams[0].players[0]).toMatchObject({ heroKey: 'spectre', color: '#218440' })
    expect(c.teams[1].players[0]).toMatchObject({ heroKey: null, color: '#123456' })
  })

  it('na tabela e no seletor a imagem do herói usa o arquivo certo', async () => {
    const lady = structuredClone(game1)
    const p = lady.teams[0].players[0]
    Object.assign(p, { hero: 'Lady Geist', heroCls: 'ghost', heroKey: undefined })
    delete p.heroKey
    vi.stubGlobal('fetch', route({ 'matches.json': { games: [lady], items: fixture.items } }))
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    await screen.findByRole('region', { name: 'Confrontos' })
    await user.click(within(screen.getAllByRole('listitem')[0]).getByRole('button'))
    const imgs = [...document.querySelectorAll('img[src*="heroes/"]')].map((i) => i.getAttribute('src'))
    expect(imgs.some((s) => s.includes('/spectre_sm.webp'))).toBe(true)
    expect(imgs.some((s) => s.includes('/ghost_sm.webp'))).toBe(false)
  })
})

describe('aba Torneios', () => {
  const open = async (map) => {
    vi.stubGlobal('fetch', route(map))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    return user
  }
  const openDemo = async () => {
    const user = await open({ 'matches.json': { games: [] }, 'demo.json': fixture })
    await user.click(await screen.findByRole('button', { name: /VER EXEMPLO/ }))
    await screen.findByRole('region', { name: 'Confrontos' })
    return user
  }
  const card = (stage) => within(screen.getByRole('region', { name: 'Confrontos' })).getAllByRole('region').find((r) => r.getAttribute('aria-label').startsWith(`Confronto: ${stage}`))
  const openGame = async (user, stage, n = 1) => {
    await user.click(within(within(card(stage)).getByRole('list', { name: 'Jogos' })).getAllByRole('listitem')[n - 1].querySelector('button'))
  }
  const rows = () => screen.getAllByTitle('Ver o confronto deste jogador')

  it('Copa sem partidas: avisa e oferece o exemplo (Showdown #2) com todos os confrontos', async () => {
    const user = await open({ 'matches.json': { updatedAt: '2026-01-01T00:00:00Z', games: [] }, 'demo.json': fixture })
    expect(await screen.findByText(/Ainda não há partidas publicadas da Copa América/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /VER EXEMPLO/ }))
    expect(await screen.findByRole('heading', { name: new RegExp(`CONFRONTOS \\(${seriesOf(games).length}\\)`) })).toBeInTheDocument()
    expect(screen.getByText(/EXEMPLO: SHOWDOWN #2/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Confrontos' })).getAllByRole('region')).toHaveLength(seriesOf(games).length)
  })

  it('lista no modelo do site: cada confronto é um cartão com os times, o placar e os jogos um embaixo do outro', async () => {
    await openDemo()
    const uq2 = card('Upper Quarterfinal 2')
    // dois times com o placar (vencedor destacado)
    const s = seriesOf(games).find((x) => x.stage === 'Upper Quarterfinal 2')
    expect(within(uq2).getByText(s.natA)).toBeInTheDocument()
    expect(within(uq2).getByText(s.natB)).toBeInTheDocument()
    expect(within(uq2).getByText(String(s.winsA))).toBeInTheDocument()
    // "Match IDs" com o ID de cada jogo e um botão "Ver game N" (vencedor e duração na dica do botão)
    expect(within(uq2).getByText('Match IDs:')).toBeInTheDocument()
    const items = within(within(uq2).getByRole('list', { name: 'Jogos' })).getAllByRole('listitem')
    expect(items.map((li) => li.querySelector('button').textContent)).toEqual(['Ver game 1', 'Ver game 2', 'Ver game 3'])
    expect(items.map((li) => li.querySelector('b').textContent)).toEqual(s.slots.map((x) => String(x.id)))
    for (const li of items) expect(li.querySelector('button').getAttribute('title')).toMatch(/venceu · \d+:\d\d/)
  })

  it('chave em colunas por rodada (cronológicas) e filtro por time ou fase', async () => {
    // duas fases: as quartas (antigas) e uma final (mais recente)
    const data = structuredClone(fixture)
    for (const g of data.games.filter((x) => x.stage === 'Upper Quarterfinal 4')) {
      g.stage = 'Grand Final'
      g.start += 10_000_000
    }
    vi.stubGlobal('fetch', route({ 'matches.json': { games: [] }, 'demo.json': data }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    await user.click(await screen.findByRole('button', { name: /VER EXEMPLO/ }))
    const list = await screen.findByRole('region', { name: 'Confrontos' })
    expect(within(list).getByRole('heading', { name: 'Upper bracket' })).toBeInTheDocument()
    // colunas em ordem cronológica: quartas -> final
    expect(within(list).getAllByRole('heading', { level: 5 }).map((h) => h.textContent)).toEqual(['Upper Quarterfinal', 'Grand Final'])
    expect(card('Grand Final').className).toMatch(/border-gold/) // a final tem destaque dourado
    // filtro por fase/time
    await user.type(within(list).getByLabelText('Filtrar confrontos'), 'Grand')
    expect(within(list).getAllByRole('region')).toHaveLength(1)
    await user.clear(within(list).getByLabelText('Filtrar confrontos'))
    await user.type(within(list).getByLabelText('Filtrar confrontos'), 'zzz-nada')
    expect(within(list).getByText('Nenhum confronto encontrado.')).toBeInTheDocument()
  })

  it('phaseOf agrupa por fase: tira o número final e junta a fase de grupos', () => {
    expect(phaseOf('Upper Quarterfinal 1')).toBe('Upper Quarterfinal')
    expect(phaseOf('Lower Round 1.1')).toBe('Lower Round 1') // uma coluna por rodada
    expect(phaseOf('Lower Round 2.2')).toBe('Lower Round 2')
    expect(phaseOf('Group C - Round 3')).toBe('Fase de grupos')
    expect(phaseOf('Grand Final')).toBe('Grand Final')
    expect(phaseOf('')).toBe('Sem fase')
    expect(phaseOf(undefined)).toBe('Sem fase')
  })

  it('clicar em VER JOGO vai para a tela de cartinhas e estatísticas; ← CONFRONTOS volta', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1', 1)
    expect(screen.queryByRole('region', { name: 'Confrontos' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /CURVA DE SOULS/ })).toBeInTheDocument()
    expect(rows()).toHaveLength(12)
    await user.click(screen.getByRole('button', { name: /← CONFRONTOS/ }))
    expect(screen.getByRole('region', { name: 'Confrontos' })).toBeInTheDocument()
    expect(screen.queryAllByTitle('Ver o confronto deste jogador')).toHaveLength(0)
  })

  it('o Game 2 da lista abre o Game 2 (e não o 1)', async () => {
    const user = await openDemo()
    const uq1 = seriesOf(games).find((x) => x.stage === 'Upper Quarterfinal 1')
    await openGame(user, 'Upper Quarterfinal 1', 2)
    const tabs = within(screen.getByRole('tablist', { name: 'Jogos da série' })).getAllByRole('tab')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    const g2 = uq1.slots[1].game
    expect(screen.getByText(/ESTATÍSTICAS COMPLETAS NO SITE/, { selector: 'a' }).getAttribute('href')).toContain(String(g2.id))
  })

  it('séries com Game 1, 2 e 3: troca de jogo na tela do jogo e mostra as tabelas com notas e o placar de cada time', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 2', 1)
    const tabs = within(screen.getByRole('tablist', { name: 'Jogos da série' })).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Game 1', 'Game 2', 'Game 3'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    await user.click(tabs[2])
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(rows()).toHaveLength(12)
    expect(screen.getAllByTitle('MVP do jogo')).toHaveLength(1)
    expect(screen.getAllByText('NET WORTH')).toHaveLength(2)
    expect(screen.getAllByText(/^(VITÓRIA|DERROTA)$/)).toHaveLength(2)
  })

  it('jogo sem estatísticas publicadas aparece apagado na lista e não abre', async () => {
    const user = await openDemo()
    const items = within(within(card('Upper Quarterfinal 4')).getByRole('list', { name: 'Jogos' })).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    const disabled = items.filter((li) => li.querySelector('button').getAttribute('aria-disabled') === 'true')
    expect(disabled).toHaveLength(2)
    expect(disabled[0].querySelector('button').getAttribute('title')).toMatch(/Sem estatísticas publicadas/)
    await user.click(disabled[0].querySelector('button'))
    expect(screen.getByRole('region', { name: 'Confrontos' })).toBeInTheDocument() // continua na lista
  })

  const openPicker = async (user) => {
    await user.click(screen.getByRole('button', { name: 'CONFRONTAR' }))
    return screen.getByRole('dialog', { name: 'Novo confronto' })
  }
  const faceResult = () => screen.getByRole('region', { name: 'Confronto' })

  it('cartão "Novo confronto" no meio das duas tabelas; sem confronto não há cartas nem janela', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const cta = screen.getByRole('group', { name: 'Novo confronto' })
    expect(within(cta).getByText(/⚔ NOVO CONFRONTO/)).toBeInTheDocument()
    expect(within(cta).getByRole('button', { name: 'CONFRONTAR' })).toBeInTheDocument()
    expect(cta.firstChild.className).toMatch(/backdrop-blur/) // vidro fosco
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Confronto' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    // posição: depois da tabela do time 1 e antes da tabela do time 2
    const order = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
    const [t1, t2] = [...document.querySelectorAll('section')].filter((s) => /NET WORTH/.test(s.textContent) && s.querySelector('header'))
    expect(order(t1, cta)).toBeTruthy()
    expect(order(cta, t2)).toBeTruthy()
    // estatísticas continuam mais abaixo
    for (const h of [/CURVA DE SOULS/, /FASE DE LANE/, /NOTA DE MVP/, /^JOGADOR/]) expect(screen.getByRole('heading', { name: h })).toBeInTheDocument()
    expect(order(cta, screen.getByRole('heading', { name: /CURVA DE SOULS/ }))).toBeTruthy()
  })

  it('Confrontar abre a janela com equipe 1, equipe 2 e Comparar; Esc, ✕ e clicar fora fecham', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    let dialog = await openPicker(user)
    expect(within(dialog).getByRole('heading', { name: /NOVO CONFRONTO/ })).toBeInTheDocument()
    expect(within(within(dialog).getByRole('group', { name: 'Jogadores da equipe 1' })).getAllByRole('button')).toHaveLength(6)
    expect(within(within(dialog).getByRole('group', { name: 'Jogadores da equipe 2' })).getAllByRole('button')).toHaveLength(6)
    expect(within(dialog).getByRole('button', { name: 'COMPARAR' })).toBeDisabled()
    expect(dialog.className).toMatch(/backdrop-blur/) // fundo desfocado
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('button', { name: /Fechar/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    dialog = await openPicker(user)
    await user.click(dialog) // clicar no fundo desfocado
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('escolhe um jogador de cada equipe, compara (a janela fecha e as cartas aparecem abaixo)', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const dialog = await openPicker(user)
    const t1 = within(within(dialog).getByRole('group', { name: 'Jogadores da equipe 1' })).getAllByRole('button')
    const t2 = within(within(dialog).getByRole('group', { name: 'Jogadores da equipe 2' })).getAllByRole('button')
    const n1 = t1[1].querySelector('b').textContent
    const n2 = t2[2].querySelector('b').textContent
    await user.click(t1[1])
    expect(t1[1]).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByRole('button', { name: 'COMPARAR' })).toBeDisabled() // falta a equipe 2
    await user.click(t2[2])
    expect(within(dialog).getByRole('button', { name: 'COMPARAR' })).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'COMPARAR' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const cards = within(faceResult()).getAllByRole('article')
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([`Carta de ${n1} neste jogo`, `Carta de ${n2} neste jogo`])
    expect(within(faceResult()).getByText('VS')).toBeInTheDocument()
    // o resultado fica depois das tabelas e antes das estatísticas
    const order = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
    expect(order(screen.getByRole('group', { name: 'Novo confronto' }), faceResult())).toBeTruthy()
    expect(order(faceResult(), screen.getByRole('heading', { name: /CURVA DE SOULS/ }))).toBeTruthy()
    // inverter lados
    await user.click(within(faceResult()).getByRole('button', { name: /INVERTER/ }))
    expect(within(faceResult()).getAllByRole('article').map((c) => c.getAttribute('aria-label'))).toEqual([`Carta de ${n2} neste jogo`, `Carta de ${n1} neste jogo`])
  })

  it('o botão do resultado reabre a janela e um novo confronto substitui o anterior', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    let dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('button', { name: 'Lane Yellow' }))
    const before = within(faceResult()).getAllByRole('article').map((c) => c.getAttribute('aria-label'))
    await user.click(within(faceResult()).getByRole('button', { name: /NOVO CONFRONTO/ }))
    dialog = screen.getByRole('dialog', { name: 'Novo confronto' })
    await user.click(within(dialog).getByRole('button', { name: 'Lane Blue' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const after = within(faceResult()).getAllByRole('article').map((c) => c.getAttribute('aria-label'))
    expect(after).not.toEqual(before)
    expect(within(faceResult()).getByText(/lane Blue/)).toBeInTheDocument()
  })

  it('atalhos: lane e "Melhor x melhor" comparam na hora', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    let dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('button', { name: 'Lane Yellow' }))
    expect(within(faceResult()).getByText(/lane Yellow/)).toBeInTheDocument()
    expect(within(faceResult()).getAllByRole('article')).toHaveLength(2)
    await user.click(within(faceResult()).getByRole('button', { name: /NOVO CONFRONTO/ }))
    dialog = screen.getByRole('dialog', { name: 'Novo confronto' })
    await user.click(within(dialog).getByRole('button', { name: /Melhor x melhor/ }))
    const cards = within(faceResult()).getAllByRole('article')
    expect(cards).toHaveLength(2)
    const rated = rateGame(game1)
    const bestOf = (t) => rated.filter((p) => p.teamIdx === t).sort((a, b) => b.ovr - a.ovr)[0].name
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([`Carta de ${bestOf(0)} neste jogo`, `Carta de ${bestOf(1)} neste jogo`])
  })

  it('jogadores de lanes diferentes: "confronto livre"', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const dialog = await openPicker(user)
    const rated = rateGame(game1)
    const a = rated.find((p) => p.teamIdx === 0 && p.laneC === 'Y')
    const b = rated.find((p) => p.teamIdx === 1 && p.laneC === 'G')
    const btn = (g, name) => within(within(dialog).getByRole('group', { name: g })).getAllByRole('button').find((x) => x.querySelector('b').textContent === name)
    await user.click(btn('Jogadores da equipe 1', a.name))
    await user.click(btn('Jogadores da equipe 2', b.name))
    await user.click(within(dialog).getByRole('button', { name: 'COMPARAR' }))
    expect(within(faceResult()).getByText(/confronto livre/)).toBeInTheDocument()
  })

  it('passos numerados: ficam concluídos conforme os jogadores são escolhidos', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const dialog = await openPicker(user)
    const steps = () => within(within(dialog).getByRole('list', { name: 'Passos do confronto' })).getAllByRole('listitem')
    expect(steps().map((s) => s.textContent)).toEqual(['1Escolha um jogador da equipe 1', '2Escolha um jogador da equipe 2', '3Clique em Comparar'])
    await user.click(within(within(dialog).getByRole('group', { name: 'Jogadores da equipe 1' })).getAllByRole('button')[0])
    expect(steps()[0].textContent).toMatch(/^✓/)
    expect(steps()[1].textContent).toMatch(/^2/)
    await user.click(within(within(dialog).getByRole('group', { name: 'Jogadores da equipe 2' })).getAllByRole('button')[0])
    expect(steps().map((s) => s.textContent.charAt(0))).toEqual(['✓', '✓', '✓'])
  })

  it('botão dourado "Novo confronto" no topo da tela do jogo também abre a janela', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const top = screen.getByRole('button', { name: /⚔ NOVO CONFRONTO/ })
    expect(top.className).toMatch(/from-\[#d8b25a\]/)
    await user.click(top)
    expect(screen.getByRole('dialog', { name: 'Novo confronto' })).toBeInTheDocument()
  })

  it('clicar num jogador da tabela abre direto o confronto dele contra o adversário da lane (equipe 1 à esquerda)', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const row = rows().find((r) => r.textContent.includes('FRITZ'))
    await user.click(row)
    expect(row).toHaveAttribute('aria-pressed', 'true')
    const face = screen.getByRole('region', { name: 'Confronto' })
    const labels = within(face).getAllByRole('article').map((a) => a.getAttribute('aria-label'))
    expect(labels).toHaveLength(2)
    expect(labels[0]).toBe('Carta de FRITZ neste jogo') // FRITZ é do time 0 (Requiem): fica à esquerda
    expect(within(face).getByText(/lane (Yellow|Blue|Green)/)).toBeInTheDocument()
  })

  it('cartas do jogo são somente leitura e as barras de duelo cobrem os 6 atributos', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    await user.click(rows()[0])
    const face = screen.getByRole('region', { name: 'Confronto' })
    for (const card of within(face).getAllByRole('article')) {
      for (const a of GAME_ATTRS) expect(within(card).getByLabelText(`Atributo ${a.k}`)).toHaveAttribute('readonly')
    }
    for (const a of GAME_ATTRS) expect(within(face).getAllByText(a.k).length).toBeGreaterThan(0)
    expect(within(face).getByText('NOTA DO JOGO')).toBeInTheDocument()
  })

  it('nota de MVP só troca o jogador do detalhe: não abre nem altera o confronto', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const mvp = screen.getByRole('heading', { name: /NOTA DE MVP/ }).closest('section')
    const deep = () => screen.getByRole('heading', { name: /^JOGADOR/ }).closest('section')
    // 1) sem confronto aberto: clicar não cria confronto (nem cartas, nem janela)
    const btn1 = within(mvp).getAllByRole('button')[2]
    await user.click(btn1)
    expect(within(deep()).getByText(btn1.querySelector('b').textContent)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Confronto' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // 2) com um confronto aberto (clicando na tabela): trocar na nota de MVP mantém as mesmas cartas
    await user.click(rows().find((r) => r.textContent.includes('FRITZ')))
    const cards = () => within(screen.getByRole('region', { name: 'Confronto' })).getAllByRole('article').map((a) => a.getAttribute('aria-label'))
    const before = cards()
    const other = within(mvp).getAllByRole('button').find((b) => !before.some((l) => l.includes(b.querySelector('b').textContent)))
    await user.click(other)
    expect(within(deep()).getByText(other.querySelector('b').textContent)).toBeInTheDocument()
    expect(cards()).toEqual(before)
  })

  it('estatísticas: fase de lane, curva e jogador em foco trocam ao escolher na nota de MVP', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const lanes = screen.getByRole('heading', { name: /FASE DE LANE/ }).closest('section')
    expect(within(lanes).getByText('Lane Yellow')).toBeInTheDocument()
    expect(within(lanes).getAllByText('Souls aos 8:00')).toHaveLength(3)
    expect(screen.getByRole('img', { name: /Curva de souls: .* lidera por/ })).toBeInTheDocument()
    const mvp = screen.getByRole('heading', { name: /NOTA DE MVP/ }).closest('section')
    const btn = within(mvp).getAllByRole('button')[3]
    const name = btn.querySelector('b').textContent
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    const deep = screen.getByRole('heading', { name: /^JOGADOR/ }).closest('section')
    expect(within(deep).getByText(name)).toBeInTheDocument()
    expect(within(deep).getByText('RENDA POR FONTE')).toBeInTheDocument()
    expect(within(deep).getByText('DANO POR FONTE')).toBeInTheDocument()
    expect(within(deep).getByText('ESTILO DE JOGO')).toBeInTheDocument()
  })

  it('link para as estatísticas completas do site oficial abre em nova aba', async () => {
    const user = await openDemo()
    await openGame(user, 'Upper Quarterfinal 1')
    const links = screen.getAllByText(/ESTATÍSTICAS COMPLETAS NO SITE/)
    expect(links.length).toBeGreaterThan(0)
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank')
      expect(a.getAttribute('rel')).toContain('noreferrer')
      expect(a.getAttribute('href')).toMatch(/deadlockpremier\.com\/match\.html\?id=\d+/)
    }
  })

  it('Copa com partidas: sem aviso; jogador cadastrado abre a cartinha e o perfil dele', async () => {
    const user = await open({ 'matches.json': copaLike() })
    await screen.findByRole('heading', { name: /CONFRONTOS \(14\)/ }) // a chave inteira da Copa (14 confrontos)
    expect(screen.queryByText(/Ainda não há partidas publicadas/)).not.toBeInTheDocument()
    expect(screen.getByText(/TORNEIOS · COPA AMÉRICA/)).toBeInTheDocument()
    // Brazil x Chile é o Upper Quarterfinal 3 da chave: a série publicada entra nesse cartão
    await openGame(user, 'Upper Quarterfinal 3')
    await user.click(rows().find((b) => b.textContent.includes('1WORST')))
    const face = screen.getByRole('region', { name: 'Confronto' })
    await user.click(within(face).getByRole('button', { name: /ABRIR CARTINHA E PERFIL/ }))
    const profile = await screen.findByRole('dialog', { name: /Perfil de 1WORST/ })
    expect(within(profile).getByLabelText('SUA NOTA')).toBeInTheDocument()
  })

  it('falha ao carregar: mostra erro sem quebrar', async () => {
    await open({})
    expect(await screen.findByText(/Não foi possível carregar os dados agora/)).toBeInTheDocument()
  })

  it('findDatasetPlayer liga o jogador da partida ao cadastro por seleção + nick', () => {
    const p = copaLike().games[0].teams[0].players.find((x) => x.name === '1WORST')
    expect(findDatasetPlayer({ ...p, teamNation: 'Brazil' })?.nick).toBe('1WORST')
    expect(findDatasetPlayer({ ...game1.teams[0].players[1], teamNation: 'Requiem' })).toBeUndefined()
  })
})

describe('casos de borda da aba Torneios', () => {
  const openOnly = async (data) => {
    vi.stubGlobal('fetch', route({ 'matches.json': data }))
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    await screen.findByRole('region', { name: 'Confrontos' })
    await user.click(within(screen.getAllByRole('listitem')[0]).getByRole('button'))
    return user
  }

  it('jogo sem nomes de time publicados não marca vencedor nem quebra', async () => {
    const g = structuredClone(game1)
    g.natA = ''
    g.natB = ''
    g.winner = ''
    g.teams.forEach((t) => (t.nation = ''))
    await openOnly({ games: [g], items: fixture.items })
    expect(screen.queryByText('VITÓRIA')).not.toBeInTheDocument()
    expect(screen.queryByText('DERROTA')).not.toBeInTheDocument()
    expect(screen.getAllByText('Time 1').length).toBeGreaterThan(0)
  })

  it('jogo sem dados do Statlocker (sl/lane) ainda mostra tabela, confronto e estatísticas básicas', async () => {
    const g = structuredClone(game1)
    g.teams.forEach((t) => t.players.forEach((p) => Object.assign(p, { sl: null, mvp: null, place: null, laneC: null })))
    g.obj = []
    await openOnly({ games: [g], items: fixture.items })
    expect(screen.getByRole('button', { name: 'CONFRONTAR' })).toBeInTheDocument()
    expect(screen.getByText(/Sem estatísticas detalhadas do Statlocker/)).toBeInTheDocument()
  })

  it('"mínimo de jogos" filtra o ranking de notas médias (na lista de confrontos)', async () => {
    vi.stubGlobal('fetch', route({ 'matches.json': { games: [] }, 'demo.json': fixture }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    await user.click(await screen.findByRole('button', { name: /VER EXEMPLO/ }))
    await screen.findByRole('table')
    const gamesCol = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map((r) => Number(within(r).getAllByRole('cell')[3].textContent))
    expect(gamesCol().some((n) => n < 2)).toBe(true)
    await user.selectOptions(screen.getByLabelText('Mínimo de jogos'), '2')
    expect(gamesCol().length).toBeGreaterThan(0)
    expect(gamesCol().every((n) => n >= 2)).toBe(true)
    await user.selectOptions(screen.getByLabelText('Mínimo de jogos'), '5')
    expect(screen.getByText(/nenhum jogador com 5\+ jogos ainda/)).toBeInTheDocument()
  })

  it('o botão Atualizar da aba busca de novo', async () => {
    const f = route({ 'matches.json': { games: [] } })
    vi.stubGlobal('fetch', f)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    await screen.findByText(/Ainda não há partidas/)
    const before = f.mock.calls.filter((c) => String(c[0]).includes('matches.json')).length
    await user.click(screen.getByRole('button', { name: 'Atualizar partidas' }))
    await waitFor(() => expect(f.mock.calls.filter((c) => String(c[0]).includes('matches.json')).length).toBeGreaterThan(before))
  })
})

describe('tela do confronto: games um abaixo do outro', () => {
  const openDemo = async () => {
    vi.stubGlobal('fetch', route({ 'matches.json': { games: [] }, 'demo.json': fixture }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    await user.click(await screen.findByRole('button', { name: /VER EXEMPLO/ }))
    await screen.findByRole('region', { name: 'Confrontos' })
    return user
  }
  const openSeries = async (user, stage) => {
    await user.click(screen.getByRole('button', { name: new RegExp(`^Abrir confronto: ${stage}`) }))
    return screen.getByRole('region', { name: 'Games do confronto' })
  }
  const gameRows = (screen_) => within(within(screen_).getByRole('list', { name: 'Games' })).getAllByRole('listitem')
  const selectedTab = () => within(screen.getByRole('tablist', { name: 'Jogos da série' })).getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true').textContent

  it('clicar no confronto abre a tela dos games, um abaixo do outro, com vencedor, abates, duração e MVP', async () => {
    const user = await openDemo()
    const s = await openSeries(user, 'Upper Quarterfinal 2')
    expect(screen.queryByRole('region', { name: 'Confrontos' })).not.toBeInTheDocument() // saiu da chave
    const info = seriesOf(games).find((x) => x.stage === 'Upper Quarterfinal 2')
    expect(within(s).getByText(`${info.winsA}–${info.winsB}`)).toBeInTheDocument()
    const rows = gameRows(s)
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.querySelector('b').textContent)).toEqual(['Game 1', 'Game 2', 'Game 3'])
    for (const [i, r] of rows.entries()) {
      const g = info.slots[i].game
      expect(r.textContent).toContain(g.winner)
      expect(r.textContent).toContain(fmtDuration(g.duration))
      expect(r.textContent).toContain(`${g.teams[0].kills} – ${g.teams[1].kills}`)
      expect(r.textContent).toContain(rateGame(g).find((p) => p.isMvp).name)
      expect(within(r).getByText('VER ESTATÍSTICAS ›')).toBeInTheDocument()
    }
  })

  it('clicar num game abre as estatísticas; ← GAMES volta para a tela dos games e dali vai para o Game 2', async () => {
    const user = await openDemo()
    let s = await openSeries(user, 'Upper Quarterfinal 1')
    await user.click(within(gameRows(s)[0]).getByRole('button'))
    expect(screen.getByRole('heading', { name: /CURVA DE SOULS/ })).toBeInTheDocument()
    expect(selectedTab()).toBe('Game 1')
    await user.click(screen.getByRole('button', { name: /← GAMES/ }))
    s = screen.getByRole('region', { name: 'Games do confronto' }) // voltou para a tela dos games, não para a chave
    expect(screen.queryByRole('region', { name: 'Confrontos' })).not.toBeInTheDocument()
    await user.click(within(gameRows(s)[1]).getByRole('button'))
    expect(selectedTab()).toBe('Game 2')
    expect(screen.getByText(/ESTATÍSTICAS COMPLETAS NO SITE/, { selector: 'a' }).getAttribute('href')).toContain(String(seriesOf(games).find((x) => x.stage === 'Upper Quarterfinal 1').slots[1].id))
  })

  it('"Próximo game" pula para o Game 2 e some no último game', async () => {
    const user = await openDemo()
    const s = await openSeries(user, 'Upper Quarterfinal 1')
    await user.click(within(gameRows(s)[0]).getByRole('button'))
    await user.click(screen.getByRole('button', { name: /PRÓXIMO GAME/ }))
    expect(selectedTab()).toBe('Game 2')
    expect(screen.queryByRole('button', { name: /PRÓXIMO GAME/ })).not.toBeInTheDocument()
  })

  it('← CONFRONTOS leva à chave (da tela dos games e da tela de estatísticas)', async () => {
    const user = await openDemo()
    const s = await openSeries(user, 'Upper Quarterfinal 1')
    await user.click(within(s).getByRole('button', { name: /← CONFRONTOS/ }))
    expect(screen.getByRole('region', { name: 'Confrontos' })).toBeInTheDocument()
    await openSeries(user, 'Upper Quarterfinal 1')
    await user.click(within(gameRows(screen.getByRole('region', { name: 'Games do confronto' }))[0]).getByRole('button'))
    await user.click(screen.getByRole('button', { name: /← CONFRONTOS/ }))
    expect(screen.getByRole('region', { name: 'Confrontos' })).toBeInTheDocument()
  })

  it('game sem estatísticas aparece desabilitado e não abre', async () => {
    const user = await openDemo()
    const s = await openSeries(user, 'Upper Quarterfinal 4')
    const rows = gameRows(s)
    expect(rows).toHaveLength(3)
    const off = rows.filter((r) => r.querySelector('button').getAttribute('aria-disabled') === 'true')
    expect(off).toHaveLength(2)
    expect(off[0].textContent).toMatch(/Sem estatísticas publicadas/)
    await user.click(off[0].querySelector('button'))
    expect(screen.getByRole('region', { name: 'Games do confronto' })).toBeInTheDocument() // continua nela
  })

  it('o atalho "Ver game N" do cartão ainda abre as estatísticas direto; ← GAMES leva à tela dos games', async () => {
    const user = await openDemo()
    const q1 = within(screen.getByRole('region', { name: 'Confrontos' })).getAllByRole('region').find((r) => r.getAttribute('aria-label').startsWith('Confronto: Upper Quarterfinal 1'))
    await user.click(within(q1).getByRole('button', { name: 'Ver game 2' }))
    expect(selectedTab()).toBe('Game 2')
    await user.click(screen.getByRole('button', { name: /← GAMES/ }))
    expect(screen.getByRole('region', { name: 'Games do confronto' })).toBeInTheDocument()
  })

  it('o cartão abre com o teclado (Enter) e mostra a dica "ver games"', async () => {
    const user = await openDemo()
    const card = screen.getByRole('button', { name: /^Abrir confronto: Upper Quarterfinal 1/ })
    expect(card).toHaveTextContent('ver games ›')
    card.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('region', { name: 'Games do confronto' })).toBeInTheDocument()
  })

  it('cartões da chave da Copa sem partidas não são clicáveis (nada para mostrar)', async () => {
    vi.stubGlobal('fetch', route({ 'matches.json': { games: [] } }))
    render(<App />)
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Torneios' }))
    await screen.findByRole('region', { name: 'Confrontos' })
    expect(screen.queryAllByRole('button', { name: /^Abrir confronto/ })).toHaveLength(0)
    expect(screen.queryByText('ver games ›')).not.toBeInTheDocument()
  })
})
