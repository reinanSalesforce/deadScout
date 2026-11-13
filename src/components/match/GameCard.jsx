import FutCard from '../FutCard'
import { roleOf } from '../../heroRoles'
import { GAME_ATTRS, LANES, heroImg } from '../../matches'
import { rankOf, teams, tierOf } from '../../lib'

// Carta DO JOGO: notas calculadas só com as estatísticas daquela partida.
export default function GameCard({ player: p, tipText, fallback, heroes, pool }) {
  const tier = tierOf(p.ovr)
  const nation = p.nation ?? p.teamNation
  const team = teams.find((t) => t.name === nation) ?? { name: nation || 'Time' }
  const lane = p.laneC ? LANES[p.laneC] : null
  return (
    <FutCard
      nick={p.name}
      ovr={p.ovr}
      tierColor={tier?.color}
      tierLabel={tier?.label}
      role={roleOf(p.hero)}
      team={team}
      rank={rankOf(p.rank ?? fallback?.rank)}
      hero={{ name: p.hero, art: heroImg(p, 'card') ?? fallback?.art, color: p.color ?? fallback?.color }}
      heroes={heroes}
      pool={pool ?? [{ name: p.hero, img: heroImg(p, 'sm') ?? fallback?.icon }]}
      avatar={p.avatar ?? fallback?.avatar}
      attrs={GAME_ATTRS.map((a) => ({ k: a.k, desc: a.desc, value: p.values[a.k] }))}
      tip={{ text: tipText ?? (p.isMvp ? 'MVP DO JOGO' : lane ? `LANE ${lane.name.toUpperCase()}` : 'NOTA DO JOGO'), color: tipText ? tier?.color : p.isMvp ? '#f5d061' : (lane?.color ?? tier?.color) }}
      ariaLabel={`Carta de ${p.name} neste jogo`}
    />
  )
}
