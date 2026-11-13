import { useState } from 'react'
import TeamAverage from './TeamAverage'
import { GROUPS, fmt, kdaOf, keyOf, rankOf, rosterOf, teamStats, teams, teamsOf, tierOf } from '../lib'

const stop = (e) => e.stopPropagation()

function Row({ p, grade, onGrade, onOpen }) {
  const rank = rankOf(p.badge)
  const tier = tierOf(grade)
  const s = p.stats
  const games = (p.wins ?? 0) + (p.losses ?? 0)
  const wr = games ? Math.round((p.wins / games) * 100) : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onOpen(p))}
      title="Clique para ver o perfil completo"
      style={{ '--tier': tier?.color ?? '#6b5a2e' }}
      className="grid cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-line border-l-[3px] border-l-(--tier) bg-panel px-3 py-2 transition hover:border-gold hover:bg-panel2"
    >
      <div className="size-12 overflow-hidden rounded-sm bg-panel2">
        {p.avatar ? (
          <img src={p.avatar} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center font-head text-xl text-muted">{p.nick[0]}</span>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <b className="truncate text-lg tracking-wide">{p.nick}</b>
          {p.sub && <span className="rounded-sm border border-gold px-1 text-[10px] font-bold text-gold2">RES</span>}
          {p.edl && <span className="rounded-sm border border-souls/60 px-1 text-[10px] font-bold text-souls" title={`EDL: ${p.edl.titles} títulos · $${Math.round(p.edl.earnings)}`}>EDL {p.edl.titles}🏆</span>}
          {!p.found && <span className="rounded-sm border border-dashed border-neg px-1 text-[10px] font-bold text-neg">SEM TRACKER</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span className="font-bold" style={{ color: rank.color }}>
            {rank.name}
          </span>
          {s && (
            <>
              <span>KDA {fmt(kdaOf(s), 1)}</span>
              {wr != null && <span className={wr >= 50 ? 'text-pos' : 'text-neg'}>{wr}% WR</span>}
            </>
          )}
          {p.heroes?.[0] && (
            <span className="flex items-center gap-1">
              {p.heroes[0].icon && <img src={p.heroes[0].icon} alt="" className="size-4 rounded-full" />}
              {p.heroes[0].name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1" onClick={stop} onKeyDown={stop}>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          inputMode="decimal"
          placeholder="--"
          aria-label={`Nota de ${p.nick}`}
          value={grade ?? ''}
          onChange={(e) => onGrade(keyOf(p), e.target.value)}
          className="w-20 rounded-sm border border-line bg-black px-2 py-1 text-center font-head text-2xl text-(--tier) placeholder:text-muted/40 focus:border-(--tier)"
        />
      </div>
    </div>
  )
}

function Column({ side, teamName, setTeamName, other, grades, setGrade, includeSubs, onOpen }) {
  const team = teams.find((t) => t.name === teamName)
  const roster = rosterOf(teamName)
  return (
    <section className="grid min-w-0 content-start gap-3">
      <div className="flex items-center gap-3 rounded-sm border border-gold/60 bg-panel px-3 py-2">
        <img src={team.flag} alt="" className={`h-8 w-10 rounded-sm ${team.group === 'EDL' ? 'object-contain' : 'object-cover'}`} />
        <label className="min-w-0 flex-1">
          <span className="sr-only">Time {side}</span>
          <select
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full rounded-sm border border-line bg-black px-2 py-1 font-head text-lg tracking-wider uppercase"
          >
            {GROUPS.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {teamsOf(g.id).map((t) => (
                  <option key={t.name} value={t.name} disabled={t.name === other}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {team.group === 'EDL' && (
          <a
            href={team.url}
            target="_blank"
            rel="noreferrer"
            title="Abrir o time no EDL.gg"
            className="shrink-0 text-right text-[11px] leading-tight font-bold tracking-wider text-gold2 hover:underline"
          >
            #{team.globalRank ?? '–'} · {team.region}
            <br />
            {team.titles} títulos ↗
          </a>
        )}
      </div>
      <TeamAverage roster={roster} grades={grades} includeSubs={includeSubs} compact />
      <div className="grid gap-2">
        {roster.map((p) => (
          <Row key={keyOf(p)} p={p} grade={grades[keyOf(p)]} onGrade={setGrade} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

export default function CompareView({ grades, setGrade, includeSubs, onToggleSubs, onOpen }) {
  const [a, setA] = useState('Argentina')
  const [b, setB] = useState('Brazil')
  const sa = teamStats(rosterOf(a), grades, includeSubs)
  const sb = teamStats(rosterOf(b), grades, includeSubs)
  const diff = sa.avg != null && sb.avg != null ? sa.avg - sb.avg : null
  const leader = diff == null ? null : diff === 0 ? 'Empate' : diff > 0 ? a : b

  const swap = () => {
    setA(b)
    setB(a)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-panel px-4 py-3">
        <div>
          <div className="font-head text-xs tracking-[0.25em] text-gold">COMPARATIVO</div>
          <div className="text-sm text-muted">Dê a nota de cada jogador aqui mesmo. Clique na linha para abrir o perfil completo em um pop-up.</div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={includeSubs} onChange={(e) => onToggleSubs(e.target.checked)} className="accent-gold" />
            Incluir reservas
          </label>
          <button onClick={swap} className="rounded-sm border border-line px-3 py-1 text-sm text-muted hover:border-gold hover:text-gold2">
            ⇄ Trocar lados
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Column side="A" teamName={a} setTeamName={setA} other={b} grades={grades} setGrade={setGrade} includeSubs={includeSubs} onOpen={onOpen} />
        <Column side="B" teamName={b} setTeamName={setB} other={a} grades={grades} setGrade={setGrade} includeSubs={includeSubs} onOpen={onOpen} />
      </div>

      <div className="sticky bottom-2 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-sm border border-gold bg-bg/95 px-3 py-2 text-center shadow-xl backdrop-blur sm:gap-8 sm:px-4 sm:py-3">
        <Score name={a} avg={sa.avg} win={leader === a} />
        <div className="min-w-24 sm:min-w-32">
          <div className="font-head text-[10px] tracking-[0.2em] text-gold sm:text-[11px]">DIFERENÇA</div>
          <div className="text-xl leading-tight font-bold sm:text-2xl">{diff == null ? '–' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`}</div>
          <div className="text-[11px] text-muted sm:text-xs">{leader ? (leader === 'Empate' ? 'empate' : `à frente: ${leader}`) : 'avalie os dois'}</div>
        </div>
        <Score name={b} avg={sb.avg} win={leader === b} />
      </div>
    </div>
  )
}

const Score = ({ name, avg, win }) => (
  <div style={{ '--tier': tierOf(avg)?.color ?? '#6b5a2e' }}>
    <div className="truncate font-head text-[10px] tracking-[0.2em] text-muted uppercase sm:text-[11px]">{name}</div>
    <div className={`font-head text-3xl text-(--tier) sm:text-4xl ${win ? 'drop-shadow-[0_0_10px_var(--tier)]' : ''}`}>{avg != null ? avg.toFixed(1) : '–'}</div>
  </div>
)
