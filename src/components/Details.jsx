import Radar from './Radar'
import MatchRow from './MatchRow'
import { fmt, fmtK, kdaOf, radarOf, tierOf } from '../lib'

const Stat = ({ l, v, accent }) => (
  <div className="rounded-sm border border-line bg-panel2 px-3 py-2">
    <dt className="text-[11px] tracking-[0.15em] text-muted uppercase">{l}</dt>
    <dd className={`text-2xl leading-tight font-bold ${accent ?? ''}`}>{v}</dd>
  </div>
)

const Panel = ({ title, children, className = '' }) => (
  <section className={`panel p-4 ${className}`}>
    <h3 className="panel-title">{title}</h3>
    {children}
  </section>
)

function EdlPanel({ p }) {
  const e = p.edl
  if (!e) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-3 text-sm text-muted">
        Sem registro competitivo no EDL.gg (prêmios, títulos e séries de torneios).
      </div>
    )
  }
  return (
    <Panel title="CENÁRIO COMPETITIVO · EDL.GG">
      <div className="grid gap-3">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat l="Prêmios" v={`$${Math.round(e.earnings ?? 0).toLocaleString('en-US')}`} accent="text-pos" />
          <Stat l="Títulos" v={e.titles ?? 0} accent="text-gold2" />
          <Stat l="MVPs" v={e.mvps ?? 0} accent="text-gold2" />
          <Stat l="KD / KDA" v={`${fmt(e.kd, 2)} / ${fmt(e.kda, 1)}`} />
          <Stat l="Séries" v={`${e.seriesW}-${e.seriesL}`} />
          <Stat l="Séries WR" v={`${fmt(e.seriesWr, 0)}%`} accent={e.seriesWr >= 50 ? 'text-pos' : 'text-neg'} />
          <Stat l="Partidas WR" v={`${fmt(e.matchWr, 0)}% (${e.matchW}-${e.matchL})`} accent={e.matchWr >= 50 ? 'text-pos' : 'text-neg'} />
          <Stat l="KP / DPM / SPM" v={`${fmt(e.kp, 0)}% · ${fmt(e.dpm, 0)} · ${fmt(e.spm, 0)}`} />
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {e.heroes.map((h) => (
              <span key={h.name} className="flex items-center gap-1.5 rounded-sm bg-panel2 py-1 pr-2 pl-1 text-sm">
                {h.icon && <img src={h.icon} alt="" referrerPolicy="no-referrer" className="size-6 rounded-full border border-gold" />}
                {h.name} <span className="text-muted">· {h.matches}</span>
              </span>
            ))}
          </div>
          <a href={e.url} target="_blank" rel="noreferrer" className="text-xs font-bold tracking-widest text-gold2 hover:underline">
            VER NO EDL ↗
          </a>
        </div>
      </div>
    </Panel>
  )
}

export default function Details({ player: p, grade }) {
  const s = p.stats
  const color = tierOf(grade)?.color ?? '#f0d58a'
  const games = (p.wins ?? 0) + (p.losses ?? 0)
  const wr = games ? (p.wins / games) * 100 : null

  return (
    <div className="grid min-w-0 gap-4">
      {s && (
        <Panel title="DESEMPENHO · RANKED">
          <div className="grid items-center gap-4 md:grid-cols-[210px_1fr]">
            <div className="text-center">
              {radarOf(p) && <Radar data={radarOf(p)} color={color} />}
              <small className="text-[11px] text-muted">percentil vs. jogadores do mesmo grupo</small>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat l="Partidas" v={s.games} />
              <Stat l="Win rate" v={wr != null ? `${fmt(wr, 0)}%` : '–'} accent={wr >= 50 ? 'text-pos' : 'text-neg'} />
              <Stat l="KDA" v={fmt(kdaOf(s), 2)} />
              <Stat l="Souls/jogo" v={fmtK(s.souls)} accent="text-souls" />
              <Stat l="Dano/jogo" v={fmtK(s.heroDmg)} />
              <Stat l="Dano obj." v={fmtK(s.objDmg)} />
              <Stat l="Mira" v={`${fmt(s.accuracy, 0)}%`} />
              <Stat l="Headshot" v={`${fmt(s.headshot, 0)}%`} />
              <Stat l="Seq. vitórias" v={`${s.winStreak}W`} />
            </dl>
          </div>
        </Panel>
      )}

      <EdlPanel p={p} />

      <div className="grid gap-4 lg:grid-cols-2">
        {s && (
          <Panel title="FRAG">
            <div className="grid gap-2">
              <div className="rounded-sm border border-line bg-panel2 px-3 py-2 [border-left-color:var(--color-neg)] [border-left-width:3px]">
                <small className="text-[11px] tracking-[0.15em] text-muted">MÉDIA K / D / A</small>
                <div className="text-3xl font-bold">
                  {fmt(s.kills, 1)} <span className="text-neg">/ {fmt(s.deaths, 1)}</span> / {fmt(s.assists, 1)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat l="Recorde de abates" v={s.bestKills} accent="text-gold2" />
                <Stat l="Melhor KDA" v={fmt(s.bestKda, 1)} accent="text-gold2" />
              </div>
            </div>
          </Panel>
        )}

        {p.heroes?.length > 0 && (
          <Panel title="HERÓIS MAIS JOGADOS">
            <div className="grid gap-2">
              {p.heroes.map((h) => {
                const c = h.winRate >= 50 ? 'var(--color-pos)' : 'var(--color-neg)'
                return (
                  <div
                    key={h.name}
                    style={{ '--c': c, background: `linear-gradient(90deg, color-mix(in srgb, ${c} 22%, transparent), transparent 80%), #141414` }}
                    className="relative flex min-h-11 items-center gap-2 overflow-hidden rounded-sm border border-[#262626] py-1 pr-2.5 pl-[68px]"
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-16 bg-cover bg-[position:50%_8%] [mask-image:linear-gradient(90deg,#000_50%,transparent)]"
                      style={h.art ? { backgroundImage: `url(${h.art})` } : undefined}
                    />
                    <div className="relative min-w-0 flex-1 leading-tight">
                      <strong className="block truncate text-sm tracking-wide uppercase">{h.name}</strong>
                      <small className="text-xs text-muted">{h.games} jogos</small>
                    </div>
                    <div className="relative text-right leading-tight">
                      <b className="block text-base text-(--c)">{fmt(h.winRate, 0)}%</b>
                      <small className="text-xs text-muted">{fmt(h.kda, 1)} KDA</small>
                    </div>
                    <span className="absolute bottom-0 left-0 h-0.5 w-1/4 bg-(--c)" />
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </div>

      <Panel title="ÚLTIMAS PARTIDAS">
        {p.recent?.length > 0 ? (
          <div className="grid gap-2">
            {p.recent.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-neg bg-neg/5 p-5 text-center text-neg">
            {p.found
              ? 'Este jogador não tem partidas ranked recentes no tracker.'
              : 'Este jogador não tem tracker no DeadChaps: não foi possível carregar partidas, heróis ou stats. Você ainda pode dar a nota.'}
          </div>
        )}
      </Panel>
    </div>
  )
}
