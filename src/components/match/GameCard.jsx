import FutCard from '../FutCard'
import { GAME_ATTRS, LANES, heroImg } from '../../matches'
import { rankOf, teams, tierOf } from '../../lib'

// Carta DO JOGO: notas calculadas só com as estatísticas daquela partida.
export default function GameCard({ player: p }) {
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
      team={team}
      rank={rankOf(p.rank)}
      hero={{ name: p.hero, art: heroImg(p, 'card'), color: p.color }}
      avatar={p.avatar}
      attrs={GAME_ATTRS.map((a) => ({ k: a.k, desc: a.desc, value: p.values[a.k] }))}
      tip={{ text: p.isMvp ? 'MVP DO JOGO' : lane ? `LANE ${lane.name.toUpperCase()}` : 'NOTA DO JOGO', color: p.isMvp ? '#f5d061' : (lane?.color ?? tier?.color) }}
      ariaLabel={`Carta de ${p.name} neste jogo`}
    />
  )
}
