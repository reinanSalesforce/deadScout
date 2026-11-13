import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MatchRow from '../components/MatchRow'
import { players } from '../lib'

const base = { hero: 'Vyper', k: 5, d: 2, a: 3, souls: 30000, badge: 112, date: '2026-11-13T06:18:20', mins: 28, id: '1', items: [] }

describe('MatchRow (MMR)', () => {
  it('vitória mostra +delta em verde', () => {
    render(<MatchRow m={{ ...base, win: true, delta: 350 }} />)
    expect(screen.getByText('+350')).toHaveClass('text-pos')
    expect(screen.getByText('VITÓRIA')).toBeInTheDocument()
  })
  it('derrota mostra -delta em vermelho', () => {
    render(<MatchRow m={{ ...base, win: false, delta: -350 }} />)
    expect(screen.getByText('-350')).toHaveClass('text-neg')
    expect(screen.getByText('DERROTA')).toBeInTheDocument()
  })
  it.each([0, null, undefined])('delta %s não mostra "+0": exibe traço', (delta) => {
    render(<MatchRow m={{ ...base, win: true, delta }} />)
    expect(screen.queryByText(/\+0/)).not.toBeInTheDocument()
    expect(screen.getByTitle(/não registrou variação/)).toHaveTextContent('–')
  })
})

describe('MMR nos dados coletados', () => {
  const all = players.flatMap((p) => p.recent ?? [])
  it('vitória nunca perde pontos e derrota nunca ganha', () => {
    expect(all.filter((m) => m.win && m.delta < 0)).toHaveLength(0)
    expect(all.filter((m) => !m.win && m.delta > 0)).toHaveLength(0)
  })
})
