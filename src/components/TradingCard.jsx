import { useState } from 'react'
import { rankOf, tierOf } from '../lib'

const MATCH = {
  alta: { t: 'Perfil confirmado', c: 'text-pos border-pos/50' },
  media: { t: 'Perfil provável', c: 'text-gold2 border-gold/50' },
  baixa: { t: 'Verificar perfil', c: 'text-neg border-neg/50' },
}

function Portrait({ p }) {
  const [err, setErr] = useState(false)
  if (!p.avatar || err)
    return (
      <div className="grid size-full place-items-center bg-panel2 font-head text-6xl text-(--tier)">{p.nick[0]}</div>
    )
  return (
    <img src={p.avatar} alt={p.nick} onError={() => setErr(true)} referrerPolicy="no-referrer" className="size-full object-cover" />
  )
}

// A "cartinha": arte do herói mais jogado ao fundo, nota em destaque, rank, bandeira e tracker.
export default function TradingCard({ player: p, team, grade }) {
  const rank = rankOf(p.badge)
  const tier = tierOf(grade)
  const art = p.heroes?.[0]?.art ?? p.recent?.[0]?.art
  const heroName = p.heroes?.[0]?.name

  return (
    <article
      style={{ '--tier': tier?.color ?? '#c9a24b' }}
      className="relative isolate mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border-2 border-(--tier) bg-panel shadow-[0_0_50px_-12px_var(--tier)] transition-shadow"
    >
      {/* arte de fundo */}
      <div
        className="absolute inset-0 -z-20 scale-110 bg-cover bg-top opacity-60 blur-[1px]"
        style={art ? { backgroundImage: `url(${art})` } : undefined}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/40 to-black/90" />
      <div className="absolute inset-x-0 top-0 -z-10 h-1 bg-(--tier)" />

      <div className="flex min-h-[400px] flex-col p-4">
        {/* topo: nota + bandeira/rank */}
        <div className="flex items-start justify-between">
          <div className="text-(--tier)">
            <div className="font-head text-5xl leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{grade ?? '–'}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-[0.25em]">{tier?.label ?? 'sem nota'}</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <img
              src={team.flag}
              alt={team.name}
              title={team.name}
              className={`rounded-sm shadow ${team.group === 'EDL' ? 'size-9 object-contain' : 'h-5 w-8 object-cover'}`}
            />
            {rank.img ? (
              <img src={rank.img} alt={rank.name} title={rank.name} className="size-12 object-contain drop-shadow-lg" />
            ) : (
              <div className="grid size-12 place-items-center rounded-full border border-dashed border-muted/60 text-[10px] text-muted">S/R</div>
            )}
          </div>
        </div>

        {/* retrato */}
        <div className="mx-auto my-3 size-32 overflow-hidden rounded-md border-2 border-(--tier) bg-black shadow-[0_0_30px_-6px_var(--tier)]">
          <Portrait p={p} />
        </div>

        {/* identificação */}
        <div className="mt-auto text-center">
          <h2 className="font-head text-4xl leading-none tracking-wider break-words drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{p.nick}</h2>
          <div className="mt-2 text-lg font-bold tracking-wide" style={{ color: rank.color }}>
            {rank.name}
          </div>
          {heroName && <div className="text-sm text-muted">Main: {heroName}</div>}
          {p.sub && (
            <span className="mt-2 inline-block rounded-sm border border-gold px-2 text-[11px] font-bold tracking-widest text-gold2">
              RESERVA / COACH
            </span>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {p.found ? (
              <>
                <span className={`rounded-sm border px-2 py-0.5 text-xs font-bold ${MATCH[p.match].c}`}>{MATCH[p.match].t}</span>
                <a
                  href={p.profile}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-3 py-1 text-xs font-bold tracking-[0.15em] text-[#1a1305] hover:brightness-110"
                >
                  ABRIR TRACKER ↗
                </a>
              </>
            ) : (
              <span className="rounded-sm border border-dashed border-neg px-3 py-1 text-xs font-bold tracking-[0.15em] text-neg">
                SEM TRACKER
              </span>
            )}
          </div>
          {p.found && p.username.toLowerCase() !== p.nick.toLowerCase() && (
            <div className="mt-2 text-xs text-muted">no tracker: {p.username}</div>
          )}
        </div>
      </div>
    </article>
  )
}
