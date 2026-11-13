import { rankOf, tierOf } from '../lib'

// Cartinha pequena do companheiro de time.
export default function MiniCard({ player: p, grade, active, onClick }) {
  const tier = tierOf(grade)
  const rank = rankOf(p.badge)
  return (
    <button
      onClick={onClick}
      style={{ '--tier': tier?.color ?? '#6b5a2e' }}
      className={`relative grid w-[78px] shrink-0 gap-0.5 rounded-sm border border-b-[3px] border-b-(--tier) p-1 text-center transition hover:-translate-y-1 hover:border-gold ${
        active ? 'border-gold bg-gold/10' : 'border-line bg-panel'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-panel2">
        {p.avatar ? (
          <img src={p.avatar} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center font-head text-3xl text-muted">{p.nick[0]}</span>
        )}
        <em className="absolute right-0.5 bottom-0.5 rounded-sm border border-(--tier) bg-black px-1 text-sm leading-tight font-bold text-(--tier) not-italic">
          {grade ?? '–'}
        </em>
        {p.sub && <i className="absolute top-1 left-1 size-2 rounded-full bg-gold2" title="Reserva / coach" />}
      </div>
      <b className="truncate text-[13px] tracking-wide">{p.nick}</b>
      <small className="truncate text-[11px]" style={{ color: rank.color }}>
        {rank.name}
      </small>
    </button>
  )
}
