import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GradeVsGames from '../components/GradeVsGames'
import { gradeVsGames, onGameScale } from '../matches'
import { keyOf, players } from '../lib'

const star = players.find((p) => p.found)
const mk = (i, name, nation, f) => ({ name, account: 9000 + i, hero: 'Shiv', nation, k: f, a: f, d: 1, dmg: f * 1000, souls: f * 1000, bossDmg: f * 100, lastHits: f * 10, denies: 0, mvp: f * 8 })
const game = (id, bestFirst) => ({
  id,
  gameNo: id,
  start: id,
  duration: 1800,
  natA: star.team,
  natB: 'Outro',
  stage: 'Upper Quarterfinal 1',
  teams: [
    { team: 0, nation: star.team, players: [mk(0, star.nick, star.team, bestFirst ? 12 : 1), ...[1, 2, 3, 4, 5].map((i) => mk(i, `a${i}`, star.team, 6))] },
    { team: 1, nation: 'Outro', players: [6, 7, 8, 9, 10, 11].map((i) => mk(i, `b${i}`, 'Outro', 6)) },
  ],
})

describe('onGameScale (escala justa)', () => {
  it('nota abaixo de 45 vale 45; acima de 99 vale 99; o resto fica igual', () => {
    expect(onGameScale(20)).toBe(45)
    expect(onGameScale(72)).toBe(72)
    expect(onGameScale(100)).toBe(99)
  })
})

describe('gradeVsGames', () => {
  const games = [game(1, true), game(2, false)]

  it('acha os jogos do jogador pela seleção + nick e dá o veredito de cada um', () => {
    const r = gradeVsGames(games, star, keyOf, 95)
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0].ovr).toBeGreaterThan(90) // melhor do jogo
    expect(r.rows[0].verdict).toBe('bateu')
    expect(r.rows[1].ovr).toBeLessThan(60) // pior do jogo
    expect(r.rows[1].verdict).toBe('melhor') // você achou melhor que o jogo
    expect(r.hits).toBe(1)
    expect(r.avg).toBe(Math.round((r.rows[0].ovr + r.rows[1].ovr) / 2))
  })

  it('nota baixa (20) não fica impossível de bater: vale 45 e bate com um jogo ruim', () => {
    const r = gradeVsGames(games, star, keyOf, 20)
    expect(r.rows[1].verdict).toBe('bateu')
    expect(r.rows[0].verdict).toBe('pior') // você achou pior que o jogo
  })

  it('sem nota: sem veredito; jogador sem jogos: lista vazia', () => {
    expect(gradeVsGames(games, star, keyOf, null).rows.every((x) => x.verdict === null)).toBe(true)
    expect(gradeVsGames([], star, keyOf, 50).rows).toEqual([])
    expect(gradeVsGames(undefined, star, keyOf, 50).rows).toEqual([])
  })
})

describe('painel Minha nota x Jogos', () => {
  const games = [game(1, true), game(2, false)]

  it('não aparece quando o jogador não tem jogos', () => {
    const { container } = render(<GradeVsGames player={star} grade={70} games={[]} onUse={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra um veredito por jogo, o resumo e usa a média como nota', async () => {
    const onUse = vi.fn()
    render(<GradeVsGames player={star} grade={95} games={games} onUse={onUse} />)
    const panel = screen.getByRole('region', { name: 'Minha nota x Jogos' })
    // duas cartas lado a lado: a sua (com a sua nota) e a do torneio (média dos jogos)
    expect(within(panel).getByRole('article', { name: /Sua carta de/ })).toHaveTextContent('95')
    expect(within(panel).getAllByRole('article')).toHaveLength(2)
    // cada carta traz a sua pool de heróis (a do torneio: os heróis usados nos jogos)
    expect(within(panel).getAllByRole('list', { name: 'Pool de heróis' })).toHaveLength(2)
    expect(within(panel).getByText(/Bateu em 1 de 2 jogos/)).toBeInTheDocument()
    // um botão por jogo, com a bolinha do veredito
    expect(within(panel).getByLabelText('Bateu')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Você achou melhor')).toBeInTheDocument()
    // escolher o Game 2 troca a carta do torneio e o veredito
    await userEvent.click(within(panel).getByRole('button', { name: /GAME 2/ }))
    expect(within(panel).getByText('CARTA DO TORNEIO · GAME 2')).toBeInTheDocument()
    expect(within(panel).getByText('Você achou melhor', { selector: 'span.rounded-sm' })).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: /MÉDIA DOS 2 JOGOS/ }))
    await userEvent.click(within(panel).getByRole('button', { name: /USAR A MÉDIA/ }))
    expect(onUse).toHaveBeenCalledWith(expect.any(Number))
  })

  it('nota abaixo de 45 explica a escala', () => {
    render(<GradeVsGames player={star} grade={20} games={games} onUse={() => {}} />)
    expect(screen.getByText(/vale 45 nesta comparação/)).toBeInTheDocument()
  })
})
