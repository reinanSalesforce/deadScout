import Radar from './Radar'
import { fmt, fmtK, keyOf, tierOf } from '../lib'
import { GAME_ATTRS, copaCareer, fmtDuration } from '../matches'

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

// A carreira de verdade (ranked, histórico, heróis de sempre) fica no tracker: aqui só vale o que aconteceu na Copa.
function CareerLink({ p }) {
  return (
    <section className="panel flex flex-wrap items-center justify-between gap-3 p-4" aria-label="Carreira completa">
      <div className="min-w-0 flex-1">
        <h3 className="font-head text-xs tracking-[0.25em] text-gold">CARREIRA COMPLETA</h3>
        <p className="mt-1 text-sm text-muted">
          {p.found
            ? 'Frag, heróis mais jogados e histórico de ranked de toda a carreira dele ficam no tracker (DeadChaps).'
            : 'Este jogador não tem tracker no DeadChaps: não foi possível achar a carreira dele. Você ainda pode dar a nota.'}
        </p>
      </div>
      {p.found && (
        <a
          href={p.profile}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-3 py-1.5 text-xs font-bold tracking-[0.15em] text-[#1a1305] hover:brightness-110"
        >
          VER CARREIRA NO TRACKER ↗
        </a>
      )}
    </section>
  )
}

const clamp01 = (x) => Math.max(0, Math.min(1, x))

function CopaPanels({ c, color }) {
  const radar = GAME_ATTRS.map((a) => ({ label: a.k, value: clamp01(((c.values[a.k] ?? 45) - 45) / 54) }))
  return (
    <>
      <Panel title="DESEMPENHO · COPA AMÉRICA">
        <div className="grid items-center gap-4 md:grid-cols-[210px_1fr]">
          <div className="text-center">
            <Radar data={radar} color={color} />
            <small className="text-[11px] text-muted">média das notas dos jogos da Copa (45 a 99)</small>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat l="Jogos" v={c.games} />
            <Stat l="Win rate" v={`${fmt(c.winRate, 0)}%`} accent={c.winRate >= 50 ? 'text-pos' : 'text-neg'} />
            <Stat l="Nota média" v={c.ovr} accent="text-gold2" />
            <Stat l="KDA" v={fmt(c.kda, 2)} />
            <Stat l="Souls/jogo" v={fmtK(c.souls)} accent="text-souls" />
            <Stat l="Dano/jogo" v={fmtK(c.heroDmg)} />
            <Stat l="Dano obj." v={fmtK(c.objDmg)} />
            <Stat l="MVPs" v={c.mvps} accent="text-gold2" />
          </dl>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="FRAG · COPA">
          <div className="grid gap-2">
            <div className="rounded-sm border border-line bg-panel2 px-3 py-2 [border-left-color:var(--color-neg)] [border-left-width:3px]">
              <small className="text-[11px] tracking-[0.15em] text-muted">MÉDIA K / D / A</small>
              <div className="text-3xl font-bold">
                {fmt(c.kills, 1)} <span className="text-neg">/ {fmt(c.deaths, 1)}</span> / {fmt(c.assists, 1)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Recorde de abates" v={c.bestKills} accent="text-gold2" />
              <Stat l="Melhor KDA" v={fmt(c.bestKda, 1)} accent="text-gold2" />
            </div>
          </div>
        </Panel>

        <Panel title="HERÓIS NA COPA">
          <div className="grid gap-2">
            {c.heroes.map((h) => {
              const col = h.winRate >= 50 ? 'var(--color-pos)' : 'var(--color-neg)'
              return (
                <div
                  key={h.name}
                  style={{ '--c': col, background: `linear-gradient(90deg, color-mix(in srgb, ${col} 22%, transparent), transparent 80%), #141414` }}
                  className="relative flex min-h-11 items-center gap-2 overflow-hidden rounded-sm border border-[#262626] py-1 pr-2.5 pl-[68px]"
                >
                  <div
                    className="absolute inset-y-0 left-0 w-16 bg-cover bg-[position:50%_8%] [mask-image:linear-gradient(90deg,#000_50%,transparent)]"
                    style={h.art ? { backgroundImage: `url(${h.art})` } : undefined}
                  />
                  <div className="relative min-w-0 flex-1 leading-tight">
                    <strong className="block truncate text-sm tracking-wide uppercase">{h.name}</strong>
                    <small className="text-xs text-muted">{h.games} {h.games === 1 ? 'jogo' : 'jogos'}</small>
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
      </div>

      <Panel title="ÚLTIMOS JOGOS DA COPA">
        <ul className="grid gap-2">
          {c.list.map(({ g, p: gp, win, opp, art }) => {
            const col = win ? 'var(--color-pos)' : 'var(--color-neg)'
            const kda = (gp.k + gp.a) / Math.max(1, gp.d)
            return (
              <li
                key={g.id}
                style={{ '--c': col }}
                className="relative grid grid-cols-2 overflow-hidden rounded-sm border border-[#262626] bg-[#141414] md:grid-cols-[minmax(220px,1.4fr)_minmax(110px,1fr)_minmax(80px,0.6fr)_minmax(110px,0.9fr)]"
              >
                {/* herói + resultado */}
                <div
                  className="relative col-span-2 flex min-h-[84px] flex-col justify-center overflow-hidden py-2 pr-3 pl-24 md:col-span-1"
                  style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${col} 28%, transparent), transparent 85%)` }}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-20 bg-cover bg-[position:50%_8%] [mask-image:linear-gradient(90deg,#000_55%,transparent)]"
                    style={art ? { backgroundImage: `url(${art})` } : undefined}
                  />
                  <b className="relative text-xl leading-none font-bold tracking-wide text-(--c)">{win ? 'VITÓRIA' : 'DERROTA'}</b>
                  <strong className="relative mt-0.5 text-sm tracking-wide uppercase">{gp.hero}</strong>
                  <small className="relative text-[13px] text-muted">
                    vs {opp} · {g.stage ? `${g.stage} · ` : ''}
                    {g.gameNo ? `Game ${g.gameNo} · ` : ''}
                    {fmtDuration(g.duration)}
                  </small>
                </div>

                {/* K/D/A */}
                <div className="flex flex-col justify-center gap-1 px-4 py-3 md:border-l md:border-[#262626]">
                  <span className="text-[11px] font-bold tracking-[0.25em] text-muted">K / D / A</span>
                  <div className="flex items-baseline gap-1.5 text-[26px] leading-none font-bold">
                    <span>{gp.k}</span>
                    <i className="text-xl text-neg not-italic">/</i>
                    <span className="text-neg">{gp.d}</span>
                    <i className="text-xl text-neg not-italic">/</i>
                    <span>{gp.a}</span>
                  </div>
                  <small className="text-[13px] text-muted">
                    <b className="text-white">{fmt(kda, 2)}</b> KDA · <span className="font-bold text-souls">◆ {fmtK(gp.souls)}</span>
                  </small>
                </div>

                {/* nota do jogo */}
                <div className="flex flex-col justify-center gap-1 px-4 py-3 md:border-l md:border-[#262626]">
                  <span className="text-[11px] font-bold tracking-[0.25em] text-muted">NOTA</span>
                  <strong className="font-head text-[26px] leading-none" style={{ color: tierOf(gp.ovr)?.color }} title="Nota do jogo (45 a 99)">
                    {gp.ovr}
                  </strong>
                  <small className="text-[13px] text-gold2">{gp.isMvp ? 'MVP do jogo' : '\u00a0'}</small>
                </div>

                {/* dano */}
                <div className="flex flex-col justify-center gap-1 border-t border-[#262626] px-4 py-3 md:border-t-0 md:border-l">
                  <span className="text-[11px] font-bold tracking-[0.25em] text-muted">DANO</span>
                  <strong className="text-[26px] leading-none">{fmtK(gp.dmg)}</strong>
                  <small className="text-[13px] text-muted">objetivos {fmtK(gp.bossDmg)}</small>
                </div>

                <span className="absolute bottom-0 left-0 h-[3px] w-1/4 bg-(--c)" />
              </li>
            )
          })}
        </ul>
      </Panel>
    </>
  )
}

// Perfil do jogador. Os números são da COPA (jogos do torneio); a carreira inteira fica no link do tracker.
export default function Details({ player: p, grade, games }) {
  const color = tierOf(grade)?.color ?? '#f0d58a'
  const career = copaCareer(games, p, keyOf)

  return (
    <div className="grid min-w-0 gap-4">
      <CareerLink p={p} />
      {career ? (
        <CopaPanels c={career} color={color} />
      ) : (
        <div className="rounded-sm border border-dashed border-line bg-panel2/40 p-5 text-center text-sm text-muted">
          Ainda sem jogo da Copa para {p.nick}. O desempenho, o frag, os heróis e os últimos jogos aparecem aqui assim que ele jogar.
        </div>
      )}
      <EdlPanel p={p} />
    </div>
  )
}
