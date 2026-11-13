import { useRef, useState } from 'react'

// nome por extenso sob cada sigla, para quem não conhece KDA, DMG, SOU...
const ATTR_NAME = { KDA: 'abates', DMG: 'dano', SOU: 'souls', KP: 'particip.', ECO: 'souls', UTL: 'utilidade', OBJ: 'objetivos', FRM: 'farm', IMP: 'impacto' }

function Medallion({ nick, avatar, color }) {
  const [err, setErr] = useState(false)
  return (
    <div className="grid size-full place-items-center overflow-hidden rounded-full bg-[#1a1612]">
      {!avatar || err ? (
        <span className="font-head text-2xl" style={{ color }}>
          {nick[0]}
        </span>
      ) : (
        <img src={avatar} alt={nick} onError={() => setErr(true)} referrerPolicy="no-referrer" className="size-full object-cover" />
      )}
    </div>
  )
}

// Carta no formato FUT com visual do Deadlock (apresentação pura): arte do herói, moldura metálica por faixa,
// seis atributos (1-99). Com `onAttr` os números são editáveis; sem ele, ficam só para leitura.
export default function FutCard({ nick, ovr, tierColor, tierLabel, role, team, rank, hero, heroes, pool, avatar, photo, attrs, onAttr, onReset, tip, ariaLabel }) {
  const ref = useRef(null)
  const [photoErr, setPhotoErr] = useState(false)
  const usePhoto = Boolean(photo) && !photoErr // com `photo`, a foto do jogador vira a arte e some o medalhão
  const cuts = (heroes ?? []).filter((h) => h.art).slice(0, 3) // até 3 cortes de herói na arte
  const color = tierColor ?? '#c9a24b'
  const heroColor = hero?.color ?? color
  const isEdl = team?.group === 'EDL'

  // inclinação 3D + brilho que segue o mouse (só com mouse; desligado em "reduzir movimento")
  const onMove = (e) => {
    if (e.pointerType === 'touch' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const s = ref.current.style
    s.setProperty('--ry', `${(x - 0.5) * 14}deg`)
    s.setProperty('--rx', `${(0.5 - y) * 12}deg`)
    s.setProperty('--mx', `${x * 100}%`)
    s.setProperty('--my', `${y * 100}%`)
    s.setProperty('--shine', '1')
  }
  const onLeave = () => {
    const s = ref.current?.style
    if (!s) return
    for (const k of ['--rx', '--ry', '--shine']) s.removeProperty(k)
  }

  return (
    <article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-label={ariaLabel ?? `Carta de ${nick}`}
      style={{ '--tier': color, '--hero': heroColor }}
      className="fut relative mx-auto w-[300px] drop-shadow-[0_14px_28px_rgba(0,0,0,0.65)]"
    >
      {/* moldura metálica na cor da faixa */}
      <div
        className="shield p-[3px]"
        style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${color} 55%, white), ${color} 42%, color-mix(in srgb, ${color} 50%, black))` }}
      >
        <div className="shield relative h-[436px] overflow-hidden bg-[#0e0c09]">
          {/* brilho na cor do herói */}
          <div className="absolute inset-0" style={{ background: `radial-gradient(120% 70% at 78% 18%, color-mix(in srgb, var(--hero) 50%, transparent), transparent 62%)` }} />
          {/* textura de linhas diagonais */}
          <div className="absolute inset-0 opacity-60 [background:repeating-linear-gradient(135deg,rgba(255,255,255,0.035)_0_2px,transparent_2px_7px)]" />

          {/* arte oficial do herói */}
          {usePhoto ? (
            // a foto do jogador ocupa o fundo da carta (no lugar do herói)
            <img
              src={photo}
              alt=""
              aria-hidden="true"
              data-photo
              referrerPolicy="no-referrer"
              onError={() => setPhotoErr(true)}
              className="absolute top-0 right-0 h-[262px] w-[262px] max-w-none object-cover [mask-image:linear-gradient(to_bottom,#000_55%,transparent),linear-gradient(to_right,transparent,#000_38%)] [mask-composite:intersect] [-webkit-mask-composite:source-in] opacity-95"
            />
          ) : cuts.length > 1 ? (
            // vários heróis (até 3): um corte de cada, lado a lado
            <div
              data-cuts={cuts.length}
              className="absolute top-0 right-0 flex h-[262px] w-[210px] [mask-image:linear-gradient(to_bottom,#000_55%,transparent),linear-gradient(to_right,transparent,#000_30%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]"
            >
              {cuts.map((c) => (
                <img key={c.name} src={c.art} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="h-full min-w-0 flex-1 object-cover object-top opacity-95" />
              ))}
            </div>
          ) : hero?.art && (
            <img
              src={hero.art}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="absolute top-0 right-0 h-[262px] w-auto max-w-none [mask-image:linear-gradient(to_bottom,#000_55%,transparent),linear-gradient(to_right,transparent,#000_38%)] [mask-composite:intersect] [-webkit-mask-composite:source-in] opacity-95"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-[200px] bg-gradient-to-t from-black via-black/80 to-transparent" />

          {/* nota geral, faixa, time e rank */}
          <div className="absolute top-7 left-7 flex w-[70px] flex-col items-center text-(--tier)">
            <div className="font-head text-[54px] leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">{ovr ?? '–'}</div>
            {/* como a posição da carta de FIFA: a função do herói (Carry, Suporte, Anti-carry, Tank); sem função, a faixa da nota */}
            <div
              title={role ? `${role.name}: ${role.desc}` : undefined}
              data-role={role?.name}
              className="mt-1 max-w-[84px] text-center text-[9px] leading-none font-bold tracking-[0.1em] whitespace-nowrap uppercase"
            >
              {role?.label ?? tierLabel ?? 'sem nota'}
            </div>
            <div className="my-2 h-px w-10 bg-(--tier)/60" />
            {team?.flag ? (
              <img src={team.flag} alt={team.name} title={team.name} className={`rounded-sm drop-shadow ${isEdl ? 'size-8 object-contain' : 'h-[18px] w-7 object-cover'}`} />
            ) : (
              team && <div className="max-w-[70px] truncate text-[10px] font-bold tracking-wider text-white/85 uppercase">{team.name}</div>
            )}
            {rank?.img ? (
              <img src={rank.img} alt={rank.name} title={rank.name} className="mt-2 size-11 object-contain drop-shadow-lg" />
            ) : (
              <div className="mt-2 grid size-10 place-items-center rounded-full border border-dashed border-muted/60 text-[10px] text-muted">S/R</div>
            )}
            {hero && <div className="mt-2 max-w-[78px] truncate text-center text-[10px] font-bold tracking-[0.15em] text-white/85 uppercase">{hero.name}</div>}
          </div>

          {/* medalhão do jogador (foto do perfil) */}
          {!usePhoto && (
            <div className="absolute top-[170px] right-5 size-[58px] rounded-full border-2 border-(--tier) shadow-[0_0_18px_-2px_var(--tier)]">
              <Medallion nick={nick} avatar={avatar} color={color} />
            </div>
          )}

          {/* placa do nome */}
          <h2 className="absolute inset-x-3 top-[218px] truncate text-center font-head text-[27px] leading-none tracking-[0.08em] text-white uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
            {nick}
          </h2>
          <div className="absolute inset-x-9 top-[254px] flex items-center gap-2 text-(--tier)" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-(--tier)" />
            <span className="size-1.5 rotate-45 bg-(--tier)" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-(--tier)" />
          </div>

          {/* atributos em uma linha, como na carta de FIFA: sigla em cima, valor embaixo */}
          <div className="absolute inset-x-3 top-[266px] flex justify-between text-(--tier)">
            {attrs.map((a) => (
              <label
                key={a.k}
                title={a.desc}
                className={`block w-[46px] text-center ${onAttr ? 'cursor-text' : ''}`}
              >
                <span className="block text-[11px] font-bold tracking-[0.12em] text-white/80">{a.k}</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  inputMode="numeric"
                  aria-label={`Atributo ${a.k}`}
                  placeholder="--"
                  value={a.value ?? ''}
                  readOnly={!onAttr}
                  tabIndex={onAttr ? 0 : -1}
                  onChange={(e) => onAttr?.(a.k, e.target.value)}
                  className={`attr-input !w-full !text-center font-head text-[24px] leading-tight ${a.edited ? 'text-white' : ''}`}
                />
                <span className="mx-auto mt-0.5 block h-[3px] w-8 overflow-hidden rounded-full bg-white/10">
                  <i className="block h-full rounded-full bg-(--tier) transition-[width] duration-300" style={{ width: `${a.value ?? 0}%` }} />
                </span>
                <span className="mt-0.5 block text-[9px] leading-none tracking-wide text-white/60 uppercase">{ATTR_NAME[a.k] ?? ''}</span>
              </label>
            ))}
          </div>

          {/* pool: heróis principais */}
          {pool?.length > 0 && (
            <div role="list" aria-label="Pool de heróis" className="absolute inset-x-6 top-[336px] flex flex-wrap items-center justify-center gap-2">
              {pool.slice(0, 5).map((h) => (
                <span key={h.name} role="listitem" title={h.name} className="grid size-[36px] place-items-center overflow-hidden rounded-full border-2 border-(--tier)/80 bg-black/60">
                  {h.img ? <img src={h.img} alt={h.name} referrerPolicy="no-referrer" className="size-full object-cover" /> : <span className="text-[10px] font-bold text-white/80">{h.name[0]}</span>}
                </span>
              ))}
            </div>
          )}

          {/* ponta da carta */}
          <div className="absolute inset-x-8 bottom-[38px] flex flex-col items-center gap-0.5 text-center">
            {tip && (
              <span
                style={{ color: tip.color, borderColor: `color-mix(in srgb, ${tip.color ?? color} 55%, transparent)` }}
                className="max-w-full truncate rounded-full border bg-black/60 px-3 py-1 font-head text-[13px] leading-none tracking-[0.12em] whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
              >
                {tip.text}
              </span>
            )}
            {onReset && (
              <button onClick={onReset} className="text-[11px] text-white/70 underline hover:text-white">
                limpar atributos
              </button>
            )}
          </div>

          {/* brilho holográfico que acompanha o mouse */}
          <div className="fut-shine pointer-events-none absolute inset-0" />
        </div>
      </div>
    </article>
  )
}
