import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Details from '../components/Details'
import { exemploJogos } from '../exemploNota'
import { copaCareer } from '../matches'
import { keyOf, players } from '../lib'

const fritz = players.find((p) => p.team === 'Argentina' && p.nick === 'FRITZ')

describe('perfil só com a Copa', () => {
  it('sem jogo da Copa: aviso + link da carreira no tracker, sem dados de ranked', () => {
    render(<Details player={fritz} grade={70} games={[]} />)
    expect(screen.getByRole('link', { name: /VER CARREIRA NO TRACKER/ })).toHaveAttribute('href', fritz.profile)
    expect(screen.getByText(/Ainda sem jogo da Copa para FRITZ/)).toBeInTheDocument()
    for (const t of [/DESEMPENHO/, /FRAG/, /HERÓIS/, /ÚLTIMAS PARTIDAS/, /RANKED/]) expect(screen.queryByText(t)).not.toBeInTheDocument()
  })

  it('com jogos: desempenho, frag, heróis e últimos jogos são só da Copa', () => {
    const games = exemploJogos(fritz)
    render(<Details player={fritz} grade={70} games={games} />)
    expect(screen.getByRole('link', { name: /VER CARREIRA NO TRACKER/ })).toHaveAttribute('target', '_blank')
    expect(screen.getByText('DESEMPENHO · COPA AMÉRICA')).toBeInTheDocument()
    expect(screen.getByText('FRAG · COPA')).toBeInTheDocument()
    expect(screen.getByText('HERÓIS NA COPA')).toBeInTheDocument()
    const list = screen.getByText('ÚLTIMOS JOGOS DA COPA').closest('section')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3) // 3 jogos
    expect(within(list).getAllByText(/VITÓRIA|DERROTA/)).toHaveLength(3)
    expect(screen.queryByText(/ÚLTIMAS PARTIDAS/)).not.toBeInTheDocument()
  })

  it('copaCareer soma só os jogos do jogador: média, KDA e heróis distintos', () => {
    const c = copaCareer(exemploJogos(fritz), fritz, keyOf)
    expect(c.games).toBe(3)
    const k = c.list.reduce((s, x) => s + x.p.k, 0)
    const a = c.list.reduce((s, x) => s + x.p.a, 0)
    const d = c.list.reduce((s, x) => s + x.p.d, 0)
    expect(c.kills).toBeCloseTo(k / 3)
    expect(c.kda).toBeCloseTo((k + a) / d)
    expect(c.heroes.reduce((s, h) => s + h.games, 0)).toBe(3)
    expect(copaCareer([], fritz, keyOf)).toBeNull()
  })
})
