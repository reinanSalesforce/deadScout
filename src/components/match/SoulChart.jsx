import { OBJ_KINDS, fmtDuration, fmtLeadK, soulLead } from '../../matches'

const A = '#D9922B' // time de cima (âmbar)
const B = '#5B7FB5' // time de baixo (safira)
const W = 640
const H = 170
const PAD = { l: 8, r: 8, t: 14, b: 26 }

// Curva de souls (time A menos time B) com os marcos de objetivos, como o "Soul lead" do site oficial.
export default function SoulChart({ game }) {
  const pts = soulLead(game)
  const dur = Math.max(1, game.duration)
  const max = Math.max(1000, ...pts.map((p) => Math.abs(p.lead)))
  const x = (t) => PAD.l + (t / dur) * (W - PAD.l - PAD.r)
  const mid = PAD.t + (H - PAD.t - PAD.b) / 2
  const y = (v) => mid - (v / max) * ((H - PAD.t - PAD.b) / 2 - 4)
  const line = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.lead).toFixed(1)}`).join(' ')
  const area = `${x(0)},${mid} ${line} ${x(pts.at(-1).t)},${mid}`
  const endLead = pts.at(-1)?.lead ?? 0
  const leader = endLead >= 0 ? game.teams[0] : game.teams[1]
  const ticks = []
  for (let t = 0; t <= dur; t += 300) ticks.push(t)

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted">
        <span className="font-head tracking-[0.2em] text-gold">SOUL LEAD</span>
        <span>
          <b style={{ color: endLead >= 0 ? A : B }}>{leader.nation || `Time ${leader.team + 1}`}</b> {fmtLeadK(Math.abs(endLead))} no fim · ≈ estimativas entre os pontos gravados
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Curva de souls: ${leader.nation} lidera por ${fmtLeadK(Math.abs(endLead))} no fim`}>
        <defs>
          <clipPath id="sc-up">
            <rect x="0" y="0" width={W} height={mid} />
          </clipPath>
          <clipPath id="sc-down">
            <rect x="0" y={mid} width={W} height={H - mid} />
          </clipPath>
        </defs>
        <line x1={PAD.l} x2={W - PAD.r} y1={mid} y2={mid} stroke="#3a352b" strokeWidth="1" />
        <polygon points={area} fill={A} fillOpacity="0.4" clipPath="url(#sc-up)" />
        <polygon points={area} fill={B} fillOpacity="0.4" clipPath="url(#sc-down)" />
        <polyline points={line} fill="none" stroke="#f0d58a" strokeWidth="2" strokeLinejoin="round" />
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="10" fill="#9a917f">
            {Math.round(t / 60)}:00
          </text>
        ))}
        {(game.obj ?? []).map(([t, lostTeam, kind, lane], i) => {
          // marco do lado de quem PERDEU a estrutura (Rejuvenator: de quem pegou)
          const top = kind === 'R' ? lostTeam === 0 : lostTeam === 1
          return (
            <g key={i} transform={`translate(${x(t)} ${top ? PAD.t - 2 : H - PAD.b + 2})`}>
              <title>{`${OBJ_KINDS[kind] ?? kind}${lane ? ` (${lane})` : ''} · ${fmtDuration(t)} · ${kind === 'R' ? 'pego por' : 'perdido por'} ${game.teams[lostTeam]?.nation || `Time ${lostTeam + 1}`}`}</title>
              <circle r="6" fill="#141414" stroke={lostTeam === 0 ? A : B} strokeWidth="1.5" />
              <text textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="700" fill="#efe9da">
                {kind}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
        {Object.entries(OBJ_KINDS).map(([k, n]) => (
          <span key={k}>
            <b className="text-white/80">{k}</b> {n}
          </span>
        ))}
      </div>
    </div>
  )
}
