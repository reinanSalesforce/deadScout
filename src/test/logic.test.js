import { describe, expect, it } from 'vitest'
import { players, teams, ranks, teamsOf, groupOfTeam, GROUPS, keyOf, tierOf, rankOf, teamStats, rosterOf, radarOf, kdaOf, ago, fmt, fmtK, TIERS } from '../lib'

describe('dados da Copa', () => {
  const copa = () => teamsOf('Copa América')
  const copaPlayers = () => players.filter((p) => groupOfTeam(p.team) === 'Copa América')

  it('Copa América: 8 times e 51 jogadores', () => {
    expect(copa()).toHaveLength(8)
    expect(copaPlayers()).toHaveLength(51)
  })

  it('cada time da Copa tem 6 ou 7 jogadores e bandeira', () => {
    for (const t of copa()) {
      const n = rosterOf(t.name).length
      expect(n, t.name).toBeGreaterThanOrEqual(6)
      expect(n, t.name).toBeLessThanOrEqual(7)
      expect(t.flag).toMatch(/^https:\/\/deadlockpremier\.com\/flags\//)
    }
  })

  it('times pro do EDL: inclui Cloud9, Leviathan e Buff Enjoyers com elenco e link', () => {
    const edl = teamsOf('EDL')
    const names = edl.map((t) => t.name)
    for (const n of ['Cloud9', 'Leviathan', 'Buff Enjoyers']) expect(names).toContain(n)
    for (const t of edl) {
      expect(rosterOf(t.name).length, t.name).toBeGreaterThanOrEqual(4)
      expect(t.url, t.name).toMatch(/^https:\/\/edl\.gg\/teams\//)
      expect(t.flag, t.name).toBeTruthy()
    }
  })

  it('todo time pertence a um grupo conhecido e todo jogador a um time existente', () => {
    const ids = GROUPS.map((g) => g.id)
    for (const t of teams) expect(ids).toContain(t.group)
    const names = new Set(teams.map((t) => t.name))
    for (const p of players) expect(names.has(p.team), p.nick).toBe(true)
  })

  it('chaves de jogador são únicas', () => {
    const keys = players.map(keyOf)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('reservas marcados: LEO, SOYER, PELICAN, ESPOKE', () => {
    expect(copaPlayers().filter((p) => p.sub).map((p) => p.nick).sort()).toEqual(['ESPOKE', 'LEO', 'PELICAN', 'SOYER'])
  })

  it('jogadores com tracker têm id, link e match válido; sem tracker não têm stats', () => {
    for (const p of players) {
      if (p.found) {
        expect(p.id, p.nick).toBeTruthy()
        expect(p.profile, p.nick).toContain('deadchaps.gg/player/')
        expect(['alta', 'media', 'baixa'], p.nick).toContain(p.match)
      } else {
        expect(p.stats, p.nick).toBeUndefined()
        expect(p.recent, p.nick).toBeUndefined()
      }
    }
  })

  it('stats são números plausíveis', () => {
    for (const p of players.filter((x) => x.stats)) {
      const s = p.stats
      expect(s.games, p.nick).toBeGreaterThan(0)
      expect(s.accuracy, p.nick).toBeGreaterThanOrEqual(0)
      expect(s.accuracy, p.nick).toBeLessThanOrEqual(100)
      expect(Number.isFinite(kdaOf(s)), p.nick).toBe(true)
      if (p.wins != null) expect(p.wins + p.losses, p.nick).toBeLessThanOrEqual(s.games + 1)
    }
  })

  it('partidas recentes têm herói, K/D/A e id', () => {
    for (const p of players.filter((x) => x.recent?.length)) {
      expect(p.recent.length).toBeLessThanOrEqual(6)
      for (const m of p.recent) {
        expect(m.hero, p.nick).toBeTruthy()
        expect(m.id, p.nick).toBeTruthy()
        expect(Number.isInteger(m.k) && Number.isInteger(m.d) && Number.isInteger(m.a), p.nick).toBe(true)
        expect(typeof m.win).toBe('boolean')
      }
    }
  })

  it('EDL: jogadores da Copa com dados coerentes', () => {
    const edl = copaPlayers().filter((p) => p.edl)
    expect(edl.map((p) => p.nick).sort()).toEqual(['AVG', 'BRAEDEN', 'GOOBER', 'JONJON', 'LEAGUE', 'LEFAA', 'ROCAINE', 'SAIAH', 'SHADOVIS'])
    for (const p of edl) {
      expect(p.edl.url).toMatch(/^https:\/\/edl\.gg\/players\//)
      expect(p.edl.matchWr).toBeGreaterThanOrEqual(0)
      expect(p.edl.matchWr).toBeLessThanOrEqual(100)
    }
  })

  it('todo badge de rank com tier conhecido', () => {
    for (const p of players.filter((x) => x.badge)) {
      expect(ranks[Math.floor(p.badge / 10)], `${p.nick} badge ${p.badge}`).toBeDefined()
    }
  })
})

describe('tierOf (escala de notas)', () => {
  it.each([
    [100, 'god'],
    [90, 'god'],
    [89.9, 'craque'],
    [80, 'craque'],
    [79, 'bom'],
    [70, 'bom'],
    [69.5, 'mediano'],
    [60, 'mediano'],
    [59, 'bagre'],
    [0, 'bagre'],
  ])('nota %s => %s', (n, id) => {
    expect(tierOf(n).id).toBe(id)
  })
  it('sem nota => null', () => {
    expect(tierOf(null)).toBeNull()
    expect(tierOf(undefined)).toBeNull()
  })
  it('as 5 faixas existem em ordem decrescente', () => {
    expect(TIERS.map((t) => t.min)).toEqual([90, 80, 70, 60, 0])
  })
})

describe('rankOf', () => {
  it('0 = sem rank', () => expect(rankOf(0).name).toBe('Sem rank'))
  it('112 = Eternus 2', () => expect(rankOf(112).name).toBe('Eternus 2'))
  it('badge desconhecido não quebra', () => expect(rankOf(990).name).toMatch(/Rank/))
})

describe('teamStats (média do time)', () => {
  const roster = [
    { team: 'T', nick: 'A' },
    { team: 'T', nick: 'B' },
    { team: 'T', nick: 'C', sub: true },
  ]
  it('sem notas => média nula', () => {
    const s = teamStats(roster, {})
    expect(s.avg).toBeNull()
    expect(s.complete).toBe(false)
  })
  it('média parcial', () => {
    const s = teamStats(roster, { 'T:A': 80 })
    expect(s.avg).toBe(80)
    expect(s.rated).toHaveLength(1)
    expect(s.complete).toBe(false)
  })
  it('média final quando todos avaliados', () => {
    const s = teamStats(roster, { 'T:A': 80, 'T:B': 70, 'T:C': 90 })
    expect(s.avg).toBe(80)
    expect(s.complete).toBe(true)
  })
  it('exclui reservas quando pedido', () => {
    const g = { 'T:A': 80, 'T:B': 70 }
    const s = teamStats(roster, g, false)
    expect(s.counted).toHaveLength(2)
    expect(s.avg).toBe(75)
    expect(s.complete).toBe(true)
  })
  it('nota 0 conta (não é tratada como vazia)', () => {
    expect(teamStats(roster, { 'T:A': 0, 'T:B': 100 }).avg).toBe(50)
  })
})

describe('radar e formatadores', () => {
  it('radar tem 7 eixos entre 0 e 1', () => {
    const p = players.find((x) => x.stats && x.wins != null)
    const r = radarOf(p)
    expect(r).toHaveLength(7)
    r.forEach((a) => {
      expect(a.value).toBeGreaterThan(0)
      expect(a.value).toBeLessThanOrEqual(1)
    })
  })
  it('radar sem stats => null', () => expect(radarOf({})).toBeNull())
  it('fmt / fmtK', () => {
    expect(fmt(null)).toBe('–')
    expect(fmt(3.14159, 2)).toBe('3.14')
    expect(fmtK(950)).toBe('950')
    expect(fmtK(36300)).toBe('36.3k')
  })
  it('ago', () => {
    const iso = (h) => new Date(Date.now() - h * 36e5).toISOString().slice(0, 19)
    expect(ago(iso(0.5))).toMatch(/min atrás/)
    expect(ago(iso(5))).toMatch(/5h atrás/)
    expect(ago(iso(72))).toMatch(/3d atrás/)
  })
})
