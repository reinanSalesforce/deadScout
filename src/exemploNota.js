// Jogos de MENTIRA só para ver o painel "Minha nota x Jogos" antes da Copa (abra o site com ?exemplo no endereço).
const mk = (i, name, nation, f, hero = 'Shiv') => ({
  name, account: 9000 + i, hero, nation, k: f, a: f, d: 1, dmg: f * 1000, souls: f * 1000, bossDmg: f * 100, lastHits: f * 10, denies: 0, mvp: f * 8,
})

export function exemploJogos(player) {
  const make = (id, adv, f, stage, hero) => ({
    id: `ex${id}`, gameNo: id, start: id, duration: 1800, natA: player.team, natB: adv, stage,
    teams: [
      { team: 0, nation: player.team, players: [mk(0, player.nick, player.team, f, hero), ...[1, 2, 3, 4, 5].map((i) => mk(i, `a${i}`, player.team, 6))] },
      { team: 1, nation: adv, players: [6, 7, 8, 9, 10, 11].map((i) => mk(i, `b${i}`, adv, 6)) },
    ],
  })
  return [make(1, 'Peru', 11, 'Upper Quarterfinal 1', player.heroes?.[0]?.name ?? 'Shiv'), make(2, 'Peru', 5, 'Upper Quarterfinal 1', player.heroes?.[1]?.name ?? 'Shiv'), make(3, 'Chile', 2, 'Upper Semifinal 1', player.heroes?.[2]?.name ?? 'Shiv')]
}
