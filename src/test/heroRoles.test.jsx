import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import FutCard from '../components/FutCard'
import TradingCard from '../components/TradingCard'
import { exemploJogos } from '../exemploNota'
import { HERO_ROLE, ROLES, roleOf } from '../heroRoles'
import { players } from '../lib'
import fixture from './fixtures/showdown.json'

describe('funções dos heróis', () => {
  it('são 4: Carry, Suporte, Anti-carry e Tank, cada uma com sigla, nome e descrição', () => {
    expect(Object.values(ROLES).map((r) => r.name)).toEqual(['Carry', 'Suporte', 'Anti-carry', 'Tank'])
    for (const r of Object.values(ROLES)) {
      expect(r.label).toBe(r.label.toUpperCase())
      expect(r.label.length).toBeLessThanOrEqual(10) // cabe sob a nota da carta
      expect(r.desc.length).toBeGreaterThan(10)
    }
  })

  it('toda classificação aponta para uma função existente e as 4 funções têm heróis', () => {
    for (const [hero, role] of Object.entries(HERO_ROLE)) expect(ROLES[role], hero).toBeDefined()
    for (const role of Object.keys(ROLES)) expect(Object.values(HERO_ROLE).filter((r) => r === role).length, role).toBeGreaterThanOrEqual(5)
  })

  it('exemplos conferidos com o estilo de jogo das partidas', () => {
    expect(roleOf('Vindicta').name).toBe('Carry') // muito dano
    expect(roleOf('Lady Geist').name).toBe('Carry')
    expect(roleOf('Rem').name).toBe('Suporte') // muita cura/suporte
    expect(roleOf('Paige').name).toBe('Suporte')
    expect(roleOf('Calico').name).toBe('Anti-carry')
    expect(roleOf('Abrams').name).toBe('Tank')
    expect(roleOf('Mo & Krill').name).toBe('Tank')
  })

  it('herói sem classificação (ex.: Violet, herói novo) ou nome inválido: null', () => {
    expect(roleOf('Violet')).toBeNull()
    expect(roleOf(undefined)).toBeNull()
    expect(roleOf('')).toBeNull()
    expect(roleOf('toString')).toBeNull() // não herda do Object
  })

  it('todos os heróis que aparecem nos dados (jogadores, partidas recentes e partidas de exemplo) têm função, menos o Violet', () => {
    const names = new Set()
    for (const p of players) {
      for (const h of p.heroes ?? []) names.add(h.name)
      for (const m of p.recent ?? []) names.add(m.hero)
    }
    for (const g of fixture.games) for (const t of g.teams) for (const p of t.players) names.add(p.hero)
    expect(names.size).toBeGreaterThan(20)
    const semFuncao = [...names].filter((n) => !roleOf(n))
    expect(semFuncao.filter((n) => n !== 'Violet')).toEqual([])
  })
})

describe('função na carta (no lugar de Craque/Bagre)', () => {
  const base = { nick: 'X', ovr: 55, tierColor: '#c08457', tierLabel: 'Bagre', attrs: [], hero: { name: 'Shiv' } }

  it('mostra a função do herói sob a nota, com a descrição na dica', () => {
    render(<FutCard {...base} role={ROLES.anti} />)
    const label = document.querySelector('[data-role]')
    expect(label).toHaveTextContent('ANTI-CARRY')
    expect(label.getAttribute('title')).toMatch(/Anti-carry: Mergulha/)
    expect(screen.queryByText('Bagre')).not.toBeInTheDocument()
  })

  it('sem função definida, mostra a faixa da nota como antes', () => {
    render(<FutCard {...base} role={null} />)
    expect(screen.getByText('Bagre')).toBeInTheDocument()
    expect(document.querySelector('[data-role]')).toBeNull()
  })

  const fritz = players.find((p) => p.team === 'Argentina' && p.nick === 'FRITZ')
  const attrs = { overrides: {}, setAttr() {}, resetAttrs() {} }

  it('cartinha do jogador: sem jogo da Copa não tem função nem herói; mostra a faixa da nota', () => {
    render(<TradingCard player={fritz} team={{ name: 'Argentina' }} grade={70} attrs={attrs} games={[]} />)
    const card = screen.getByRole('article', { name: /Carta de FRITZ/ })
    expect(card.querySelector('[data-role]')).toBeNull()
    expect(within(card).queryByRole('list', { name: 'Pool de heróis' })).not.toBeInTheDocument()
  })

  it('cartinha do jogador: depois dos jogos da Copa, a função é a do herói mais jogado e a pool traz os heróis dos jogos', () => {
    render(<TradingCard player={fritz} team={{ name: 'Argentina' }} grade={70} attrs={attrs} games={exemploJogos(fritz)} />)
    const card = screen.getByRole('article', { name: /Carta de FRITZ/ })
    expect(card.querySelector('[data-role]')).not.toBeNull()
    expect(within(within(card).getByRole('list', { name: 'Pool de heróis' })).getAllByRole('listitem')).toHaveLength(3) // 3 jogos, 3 heróis
    expect(within(card).queryByText(/^(Mediano|Bagre|Bom|Craque|GOD)$/i)).not.toBeInTheDocument()
  })

  it('carta do jogo (Torneios): cada carta traz a função do herói que o jogador usou naquele jogo', async () => {
    const route = (map) =>
      vi.fn((url) => {
        const hit = Object.entries(map).find(([k]) => String(url).includes(k))
        return Promise.resolve(hit ? { ok: true, status: 200, json: () => Promise.resolve(hit[1]) } : { ok: false, status: 404 })
      })
    vi.stubGlobal('fetch', route({ 'matches.json': { games: [] }, 'demo.json': fixture }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Torneios' }))
    await user.click(await screen.findByRole('button', { name: /VER EXEMPLO/ }))
    const list = await screen.findByRole('region', { name: 'Confrontos' })
    const q1 = within(list).getAllByRole('region').find((r) => r.getAttribute('aria-label').startsWith('Confronto: Upper Quarterfinal 1'))
    await user.click(within(q1).getAllByRole('button', { name: /Ver game/ })[0])
    await user.click(screen.getByRole('button', { name: 'CONFRONTAR' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Novo confronto' })).getByRole('button', { name: 'Melhor x melhor' }))
    const cards = within(screen.getByRole('region', { name: 'Confronto' })).getAllByRole('article')
    expect(cards).toHaveLength(2)
    for (const c of cards) {
      const hero = c.querySelector('img[aria-hidden]') && c.textContent
      expect(hero).toBeTruthy()
      const label = c.querySelector('[data-role]')
      expect(label).not.toBeNull()
      expect(['CARRY', 'SUPORTE', 'ANTI-CARRY', 'TANK']).toContain(label.textContent)
    }
  })
})
