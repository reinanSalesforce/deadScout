import { LANES, heroImg } from '../../matches'
import { fmtK, teams, tierOf } from '../../lib'

const COLS = 'grid-cols-[30px_minmax(130px,1.5fr)_minmax(110px,1fr)_78px_56px_56px_52px_52px_46px]'
const flagOf = (nation) => teams.find((t) => t.name === nation)?.flag

export function Nation({ name, big = false }) {
  const flag = flagOf(name)
  return (
    <span className="inline-flex items-center gap-1.5">
      {flag && <img src={flag} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />}
      <span className={big ? 'font-head tracking-wider uppercase' : ''}>{name}</span>
    </span>
  )
}

export function OvrBadge({ ovr }) {
  const t = tierOf(ovr)
  return (
    <span style={{ '--tier': t?.color ?? '#6b5a2e' }} className="inline-block min-w-9 rounded-sm border border-(--tier) bg-black px-1 text-center font-head text-base text-(--tier)">
      {ovr ?? '–'}
    </span>
  )
}

// Time de um jogo no modelo do site: faixa com resultado, net worth e abates + tabela de jogadores.
export default function TeamTable({ team, rated, winner, focusAcc, onPick }) {
  const rows = rated.filter((p) => p.teamIdx === team.team).sort((a, b) => b.ovr - a.ovr)
  const won = !!winner && team.nation === winner // jogo sem nomes de time publicados: ninguém marcado como vencedor
  return (
    <section className={`panel overflow-hidden ${won ? 'border-pos/40' : ''}`}>
      <header className={`flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 ${won ? 'bg-pos/10' : 'bg-neg/5'}`}>
        <span className="flex items-center gap-3">
          <Nation name={team.nation || `Time ${team.team + 1}`} big />
          {winner && <b className={`rounded-sm border px-2 py-0.5 text-xs tracking-widest ${won ? 'border-pos/60 text-pos' : 'border-neg/50 text-neg'}`}>{won ? 'VITÓRIA' : 'DERROTA'}</b>}
        </span>
        <span className="flex items-center gap-4 text-xs text-muted">
          <span>
            NET WORTH <b className="text-sm text-gold2">{fmtK(team.souls)}</b>
          </span>
          <span>
            ABATES <b className="text-sm text-white/90">{team.kills}</b>
          </span>
        </span>
      </header>
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className={`grid ${COLS} gap-2 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-muted`}>
            <span>#</span>
            <span>JOGADOR</span>
            <span>HERÓI</span>
            <span>K / D / A</span>
            <span>SOULS</span>
            <span>DANO</span>
            <span>OBJ.</span>
            <span>CURA</span>
            <span className="text-right">NOTA</span>
          </div>
          {rows.map((p) => (
            <button
              key={p.account}
              onClick={() => onPick(p.account)}
              aria-pressed={focusAcc === p.account}
              title="Ver o confronto deste jogador"
              className={`grid w-full ${COLS} items-center gap-2 border-t border-line/60 px-3 py-1.5 text-left text-sm transition hover:bg-gold/10 ${focusAcc === p.account ? 'bg-gold/15' : ''}`}
            >
              <span className="text-xs text-muted">{p.place ?? '–'}</span>
              <span className="flex min-w-0 items-center gap-2">
                {p.avatar ? <img src={p.avatar} alt="" referrerPolicy="no-referrer" className="size-7 rounded-sm object-cover" /> : <span className="size-7 rounded-sm bg-panel2" />}
                <b className="truncate">{p.name}</b>
                {p.isMvp && <span title="MVP do jogo" className="text-gold2">★</span>}
                {p.laneC && <i title={`Lane ${LANES[p.laneC].name}`} className="size-2 shrink-0 rounded-full" style={{ background: LANES[p.laneC].color }} />}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-muted">
                <img src={heroImg(p)} alt="" referrerPolicy="no-referrer" className="size-6 rounded-full border border-gold/60" />
                <span className="truncate">{p.hero}</span>
              </span>
              <span className="font-bold">
                {p.k}/<span className="text-neg">{p.d}</span>/{p.a}
              </span>
              <span>{fmtK(p.souls)}</span>
              <span>{fmtK(p.dmg)}</span>
              <span>{fmtK(p.bossDmg)}</span>
              <span>{fmtK(p.heal)}</span>
              <span className="text-right">
                <OvrBadge ovr={p.ovr} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
