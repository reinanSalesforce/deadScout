import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import fixture from './fixtures/showdown.json'
import { BYE, COPA_BRACKET, boardFromBracket, boardFromSeries, computeBracket, validBracket } from '../bracket'
import { seriesOf } from '../matches'

const bracket = (over = {}) => ({ ...COPA_BRACKET, ...over })
const byId = (list) => Object.fromEntries(list.map((m) => [m.id, m]))
const final = (a, b) => ({ a, b, st: 'final' })

describe('chave da Copa (portada do site oficial)', () => {
  const m = byId(computeBracket(COPA_BRACKET))

  it('8 times, eliminatória dupla: 14 confrontos (7 em cima, 6 embaixo e a Grand Final)', () => {
    const list = computeBracket(COPA_BRACKET)
    expect(list).toHaveLength(14)
    expect(list.filter((x) => x.sec === 'upper')).toHaveLength(7)
    expect(list.filter((x) => x.sec === 'lower')).toHaveLength(6)
    expect(list.filter((x) => x.sec === 'final')).toHaveLength(1)
  })

  it('quartas pelos seeds: 1x8, 4x5, 2x7, 3x6 (mesmos pares do site)', () => {
    expect([m['W1-1'].A, m['W1-1'].B]).toEqual(['Argentina', 'Peru'])
    expect([m['W1-2'].A, m['W1-2'].B]).toEqual(['Mexico', 'Venezuela'])
    expect([m['W1-3'].A, m['W1-3'].B]).toEqual(['Chile', 'Brazil'])
    expect([m['W1-4'].A, m['W1-4'].B]).toEqual(['Canada', 'USA'])
  })

  it('nomes das etapas no padrão do site', () => {
    expect(['W1-1', 'W2-1', 'W3-1', 'L1-1', 'L1-2', 'L2-1', 'L3-1', 'L4-1', 'GF'].map((id) => m[id].stage)).toEqual([
      'Upper Quarterfinal 1',
      'Upper Semifinal 1',
      'Upper Final',
      'Lower Round 1.1',
      'Lower Round 1.2',
      'Lower Round 2.1',
      'Lower Round 3',
      'Lower Final',
      'Grand Final',
    ])
    expect([...new Set(computeBracket(COPA_BRACKET).map((x) => x.column))]).toEqual([
      'Upper Quarterfinals',
      'Upper Semifinals',
      'Upper Final',
      'Lower Round 1',
      'Lower Round 2',
      'Lower Round 3',
      'Lower Final',
      'Grand Final',
    ])
  })

  it('times ainda não definidos mostram "Vencedor/Perdedor de ..."', () => {
    expect(m['W2-1'].A).toBeNull()
    expect(m['W2-1'].aLabel).toBe('Vencedor Upper Quarterfinal 1')
    expect(m['L1-1'].aLabel).toBe('Perdedor Upper Quarterfinal 1')
    expect(m['L2-1'].bLabel).toBe('Perdedor Upper Semifinal 2')
    expect(m['GF'].aLabel).toBe('Vencedor Upper Final')
    expect(m['GF'].bLabel).toBe('Vencedor Lower Final')
    expect(m['W1-1'].aLabel).toBeNull() // time já conhecido
  })

  it('resultado final avança o vencedor para a próxima rodada e o perdedor para a chave de baixo', () => {
    const r = byId(computeBracket(bracket({ results: { 'W1-1': final(2, 0), 'W1-2': final(1, 2) } })))
    expect(r['W2-1'].A).toBe('Argentina')
    expect(r['W2-1'].B).toBe('Venezuela') // Mexico 1 x 2 Venezuela
    expect(r['W2-1'].bLabel).toBeNull()
    expect(r['W2-2'].aLabel).toBe('Vencedor Upper Quarterfinal 3') // ainda sem resultado
    expect(r['L1-1'].A).toBe('Peru')
    expect(r['L1-1'].B).toBe('Mexico') // perdedor de W1-2 (Mexico 1 x 2 Venezuela)
    expect(r['W2-1'].sa).toBeNull()
    expect(r['W1-1']).toMatchObject({ sa: 2, sb: 0, st: 'final' })
  })

  it('jogo ao vivo ou empatado não avança ninguém', () => {
    const live = byId(computeBracket(bracket({ results: { 'W1-1': { a: 1, b: 0, st: 'live' }, 'W1-2': final(1, 1) } })))
    expect(live['W2-1'].A).toBeNull()
    expect(live['W2-1'].B).toBeNull()
    expect(live['W1-1'].st).toBe('live')
  })

  it('campeão: vencedor da Grand Final', () => {
    const results = { 'W1-1': final(2, 0), 'W1-2': final(2, 0), 'W1-3': final(2, 0), 'W1-4': final(2, 0), 'W2-1': final(2, 0), 'W2-2': final(2, 0), 'W3-1': final(2, 0) }
    const r = byId(computeBracket(bracket({ results })))
    // Argentina (seed 1) vence as 3 rodadas; na final de cima enfrenta o Chile (vencedor de Chile x Brazil / Canada x USA)
    expect(r['W3-1'].out).toMatchObject({ w: 'Argentina', l: 'Chile' })
    expect(r['GF'].A).toBe('Argentina')
    expect(r['L4-1'].B).toBe('Chile') // perdedor da final de cima cai para a Lower Final
  })

  it('número de times que não é potência de 2: byes avançam sozinhos e não viram cartões', () => {
    const six = bracket({ teams: ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => ({ name })) })
    const list = computeBracket(six)
    const r = byId(list)
    expect(list.some((x) => x.A === BYE || x.B === BYE)).toBe(false)
    expect(r['W1-1']).toBeUndefined() // seed 1 x BYE
    expect(r['W2-1'].A).toBe('A') // o seed 1 passou direto
  })

  it('formato fora da eliminatória dupla ou sem times: null; validBracket confere', () => {
    expect(computeBracket(bracket({ format: 'single' }))).toBeNull()
    expect(computeBracket(null)).toBeNull()
    expect(computeBracket(bracket({ teams: [] }))).toBeNull()
    expect(validBracket(COPA_BRACKET)).toBe(true)
    expect(validBracket({})).toBe(false)
    expect(validBracket({ teams: [{ name: 'x' }] })).toBe(false)
  })

  it('reset da final só aparece se o time da chave de baixo vencer a 1ª final', () => {
    const base = { 'W1-1': final(2, 0), 'W1-2': final(2, 0), 'W1-3': final(2, 0), 'W1-4': final(2, 0), 'W2-1': final(2, 0), 'W2-2': final(2, 0), 'W3-1': final(2, 0) }
    expect(computeBracket(bracket({ opts: { reset: true }, results: base })).some((x) => x.reset)).toBe(false)
    const lowerWins = { ...base, L1: final(0, 0) }
    expect(computeBracket(bracket({ opts: { reset: true }, results: lowerWins })).some((x) => x.id === 'GF2')).toBe(false)
  })
})

describe('quadro (cartões da chave ligados às partidas)', () => {
  const copaGame = (a, b, winner = a) => {
    const g = structuredClone(fixture.games.find((x) => x.id === 96842920))
    Object.assign(g, { title: 'Copa America', natA: a, natB: b, winner, sk: `${a}-${b}` })
    g.teams[0].nation = a
    g.teams[1].nation = b
    return g
  }

  it('a série publicada entra no confronto da chave com os mesmos dois times (em qualquer ordem)', () => {
    const series = seriesOf([copaGame('Brazil', 'Chile')])
    const board = boardFromBracket(computeBracket(COPA_BRACKET), series)
    const card = board.upper.flatMap((c) => c.items).find((c) => c.stage === 'Upper Quarterfinal 3')
    expect(card.serieKey).toBe(series[0].key)
    expect(card.slots.filter((x) => x.game)).toHaveLength(1) // 1 jogo com estatísticas (a série lista 2 jogos)
    // placar vem da série (Brazil venceu 1 jogo); a ordem dos times é a da chave (Chile x Brazil)
    expect(card.rows.map((r) => [r.name, r.score, r.won])).toEqual([['Chile', 0, false], ['Brazil', 1, true]])
    expect(board.other).toHaveLength(0)
  })

  it('placar da chave (resultado oficial) vale mais que o da série', () => {
    const series = seriesOf([copaGame('Brazil', 'Chile')])
    const board = boardFromBracket(computeBracket(bracket({ results: { 'W1-3': final(0, 2) } })), series)
    const card = board.upper.flatMap((c) => c.items).find((c) => c.stage === 'Upper Quarterfinal 3')
    expect(card.rows.map((r) => [r.name, r.score, r.won])).toEqual([['Chile', 0, false], ['Brazil', 2, true]])
  })

  it('série que não encaixa na chave vai para "outros"; cartões sem partida ficam sem jogos', () => {
    const series = seriesOf([copaGame('Brazil', 'Argentina')]) // não é um confronto possível na 1ª rodada
    const board = boardFromBracket(computeBracket(COPA_BRACKET), series)
    expect(board.other).toHaveLength(1)
    const cards = [...board.upper, ...board.lower].flatMap((c) => c.items)
    expect(cards.every((c) => c.slots.length === 0)).toBe(true)
    expect(cards.every((c) => c.rows.every((r) => r.score === null))).toBe(true)
  })

  it('exemplo sem chave oficial: colunas por rodada em ordem cronológica, lower separado', () => {
    const board = boardFromSeries(seriesOf(fixture.games))
    expect(board.upper.map((c) => c.name)).toEqual(['Upper Quarterfinal'])
    expect(board.upper[0].items.map((c) => c.stage)).toEqual(['Upper Quarterfinal 1', 'Upper Quarterfinal 2', 'Upper Quarterfinal 4'])
    expect(board.lower).toEqual([])
    expect(board.groups).toEqual([])
  })
})

describe('Copa na tela', () => {
  const route = (map) =>
    vi.fn((url) => {
      const hit = Object.entries(map).find(([k]) => String(url).includes(k))
      return Promise.resolve(hit ? { ok: true, status: 200, json: () => Promise.resolve(hit[1]) } : { ok: false, status: 404 })
    })
  const open = async (map) => {
    vi.stubGlobal('fetch', route(map))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    return { user, list: await screen.findByRole('region', { name: 'Confrontos' }) }
  }

  it('mostra a chave da Copa mesmo sem partidas e sem rede (chave padrão)', async () => {
    const { list } = await open({ 'matches.json': { games: [] } })
    expect(screen.getByRole('heading', { name: /CONFRONTOS \(14\)/ })).toBeInTheDocument()
    expect(within(list).getByRole('heading', { name: 'Upper bracket' })).toBeInTheDocument()
    expect(within(list).getByRole('heading', { name: 'Lower bracket' })).toBeInTheDocument()
    expect(within(list).getAllByRole('heading', { level: 5 }).map((h) => h.textContent)).toEqual([
      'Upper Quarterfinals',
      'Upper Semifinals',
      'Upper Final',
      'Grand Final',
      'Lower Round 1',
      'Lower Round 2',
      'Lower Round 3',
      'Lower Final',
    ])
    const q1 = within(list).getByRole('region', { name: /Confronto: Upper Quarterfinal 1/ })
    expect(within(q1).getByText('Argentina')).toBeInTheDocument()
    expect(within(q1).getByText('Peru')).toBeInTheDocument()
    expect(within(q1).getByText('Aguardando a partida')).toBeInTheDocument()
    expect(within(list).getByText('Vencedor Upper Quarterfinal 1')).toBeInTheDocument()
    expect(screen.getByText(/Ainda não há partidas publicadas da Copa América/)).toBeInTheDocument()
  })

  it('usa a chave oficial ao vivo (resultados) quando o site do torneio responde', async () => {
    const live = { ...COPA_BRACKET, results: { 'W1-1': final(2, 1), 'W1-2': { a: 1, b: 0, st: 'live' } } }
    const { list } = await open({ 'matches.json': { games: [] }, 'api/bracket': live })
    await waitFor(() => expect(within(list).getByRole('region', { name: /Confronto: Upper Quarterfinal 1/ })).toHaveTextContent('2'))
    const q1 = within(list).getByRole('region', { name: /Confronto: Upper Quarterfinal 1/ })
    expect(within(q1).getByText('2')).toHaveClass('bg-gold') // vencedor destacado
    expect(within(list).getByText('AO VIVO')).toBeInTheDocument()
    // vencedor da 1ª quarta já aparece na semifinal
    const sf1 = within(list).getByRole('region', { name: /Confronto: Upper Semifinal 1/ })
    expect(within(sf1).getByText('Argentina')).toBeInTheDocument()
  })

  it('chave oficial inválida cai na chave padrão', async () => {
    await open({ 'matches.json': { games: [] }, 'api/bracket': { lixo: true } })
    expect(screen.getByRole('heading', { name: /CONFRONTOS \(14\)/ })).toBeInTheDocument()
  })

  it('"Exemplo: Showdown #2" mostra as séries publicadas (sem a chave da Copa)', async () => {
    const { user } = await open({ 'matches.json': { games: [] }, 'demo.json': fixture })
    await user.click(screen.getByRole('button', { name: /VER EXEMPLO/ }))
    const heading = await screen.findByRole('heading', { name: new RegExp(`CONFRONTOS \\(${seriesOf(fixture.games).length}\\)`) })
    expect(heading).toBeInTheDocument()
    expect(screen.queryByText('Aguardando a partida')).not.toBeInTheDocument()
    // volta para a Copa: a chave de 14 confrontos
    await user.click(screen.getByRole('button', { name: 'Copa América' }))
    expect(await screen.findByRole('heading', { name: /CONFRONTOS \(14\)/ })).toBeInTheDocument()
  })

  it('a chave é lida direto do site do torneio (URL pública com CORS)', async () => {
    const f = route({ 'matches.json': { games: [] } })
    vi.stubGlobal('fetch', f)
    render(<App />)
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Torneios' }))
    await screen.findByRole('region', { name: 'Confrontos' })
    expect(f.mock.calls.some((c) => c[0] === 'https://deadlockpremier.com/api/bracket?featured=1')).toBe(true)
  })
})
