import { useRef, useState } from 'react'
import DownloadButton from './DownloadButton'
import FutCard from './FutCard'
import GameCard from './match/GameCard'
import { Legend } from './TradingCard'
import { roleOf } from '../heroRoles'
import { GAME_ATTRS, GAME_SCALE_MIN, MATCH_TOLERANCE, gradeVsGames, heroAsset, heroImg, onGameScale } from '../matches'
import { ATTRS, attrValues, keyOf, rankOf, tierOf } from '../lib'

const VERDICT = {
  bateu: { t: 'Bateu', c: 'text-pos border-pos/60 bg-pos/10' },
  pior: { t: 'Você achou pior', c: 'text-gold2 border-gold/60 bg-gold/10' },
  melhor: { t: 'Você achou melhor', c: 'text-neg border-neg/60 bg-neg/10' },
}
const COMMON = ATTRS.map((a) => a.k) // as duas cartas têm os mesmos 6 atributos

// heróis usados no torneio, do mais jogado para o menos, com a arte da carta e o ícone
const tournamentHeroes = (rows, owned = []) => {
  const map = new Map()
  for (const r of rows) {
    const mine = owned.find((h) => h.name === r.hero) ?? heroAsset(r.hero)
    const cur = map.get(r.hero) ?? { name: r.hero, count: 0, art: heroImg(r.p, 'card') ?? mine?.card ?? mine?.art, img: heroImg(r.p, 'sm') ?? mine?.icon }
    cur.count += 1
    map.set(r.hero, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

// média dos jogos como se fosse uma carta só
function averageOf(rows) {
  const values = {}
  for (const a of GAME_ATTRS) {
    const v = rows.map((r) => r.p.values[a.k]).filter((x) => x != null)
    values[a.k] = v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null
  }
  const top = tournamentHeroes(rows)[0]
  const last = rows.filter((r) => r.hero === top?.name).pop()?.p ?? rows[rows.length - 1].p // herói mais jogado define a função
  return { ...last, values, ovr: Math.round(rows.reduce((s, r) => s + r.ovr, 0) / rows.length), isMvp: false, laneC: null }
}

// Painel "Minha nota x Jogos": sua carta (com a sua nota) ao lado da carta que o torneio gerou (por jogo ou na média).
export default function GradeVsGames({ player, team, overrides, grade, games, onUse }) {
  const [pick, setPick] = useState(null) // null = média de todos os jogos
  const mineRef = useRef(null)
  const gameRef = useRef(null)
  const { rows, avg, hits } = gradeVsGames(games, player, keyOf, grade)
  if (!rows.length) return null

  const row = rows.find((r) => r.id === pick) ?? null
  const gameP = row ? row.p : averageOf(rows)
  const gameOvr = row ? row.ovr : avg
  const clamped = grade != null && grade < GAME_SCALE_MIN

  const mine = attrValues(player, overrides)
  const myTier = tierOf(grade)
  // o que o jogo não trouxe (foto, rank, arte do herói) vem do cadastro do jogador
  const sameHero = player.heroes?.find((h) => h.name === gameP.hero) ?? heroAsset(gameP.hero)
  const fallback = { avatar: player.avatar, rank: player.badge, art: sameHero ? (sameHero.card ?? sameHero.art) : undefined, color: sameHero?.color, icon: sameHero?.icon }
  const used = tournamentHeroes(rows, player.heroes) // heróis do torneio (pool da carta do torneio)
  const cuts = !row && used.length > 1 ? used.slice(0, 3) : undefined // média: um corte de cada herói (até 3)
  const diff = grade == null ? null : gameOvr - onGameScale(grade)
  const verdict = diff == null ? null : Math.abs(diff) <= MATCH_TOLERANCE ? 'bateu' : diff > 0 ? 'pior' : 'melhor'

  return (
    <section className="panel p-4" aria-label="Minha nota x Jogos">
      <h3 className="panel-title">MINHA NOTA x JOGOS</h3>

      {/* qual jogo comparar */}
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Jogo a comparar">
        <button
          onClick={() => setPick(null)}
          aria-pressed={!row}
          className={`rounded-sm border px-2.5 py-1 text-xs font-bold tracking-wider ${!row ? 'border-gold bg-gold/15 text-gold2' : 'border-line text-muted hover:text-gold2'}`}
        >
          MÉDIA DOS {rows.length} {rows.length === 1 ? 'JOGO' : 'JOGOS'}
        </button>
        {rows.map((r) => {
          const v = r.verdict ? VERDICT[r.verdict] : null
          return (
            <button
              key={r.id}
              onClick={() => setPick(r.id)}
              aria-pressed={row?.id === r.id}
              title={`${r.title}${r.stage ? ` · ${r.stage}` : ''} · ${r.hero}`}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold tracking-wider ${row?.id === r.id ? 'border-gold bg-gold/15 text-gold2' : 'border-line text-muted hover:text-gold2'}`}
            >
              GAME {r.gameNo ?? '·'} <span style={{ color: tierOf(r.ovr)?.color }}>{r.ovr}</span>
              {v && <span className={`size-2 rounded-full border ${r.verdict === 'bateu' ? 'border-pos bg-pos' : r.verdict === 'pior' ? 'border-gold bg-gold' : 'border-neg bg-neg'}`} aria-label={v.t} />}
            </button>
          )
        })}
      </div>

      {/* as duas cartas lado a lado */}
      <div className="grid items-start justify-center gap-x-4 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(300px,max-content))]">
        <figure ref={mineRef} className="m-0 grid gap-2">
          <figcaption className="text-center font-head text-xs tracking-[0.2em] text-gold">SUA CARTA</figcaption>
          <FutCard
            nick={player.nick}
            ovr={grade ?? null}
            tierColor={myTier?.color}
            tierLabel={myTier?.label}
            role={roleOf(used[0]?.name)}
            team={team}
            rank={rankOf(player.badge)}
            hero={null}
            photo={player.avatar}
            avatar={player.avatar}
            pool={used.map((h) => ({ name: h.name, img: h.img }))}
            attrs={ATTRS.map((a) => ({ k: a.k, desc: a.desc, value: mine[a.k] }))}
            tip={{ text: grade != null ? `SUA NOTA ${grade}` : 'SEM NOTA SUA', color: myTier?.color }}
            ariaLabel={`Sua carta de ${player.nick}`}
          />
          <p className="text-center text-xs text-muted">Só o que você preencheu: esta carta não muda sozinha.</p>
          <div className="text-center"><DownloadButton getRoot={() => mineRef.current} name={`sua-carta-${player.nick}`} /></div>
        </figure>

        <figure ref={gameRef} className="m-0 grid gap-2">
          <figcaption className="text-center font-head text-xs tracking-[0.2em] text-gold">
            {row ? `CARTA DO TORNEIO · GAME ${row.gameNo ?? ''}` : 'CARTA DO TORNEIO · MÉDIA'}
          </figcaption>
          <GameCard player={gameP} fallback={fallback} heroes={cuts} pool={used} tipText={row ? undefined : `MÉDIA DE ${rows.length} ${rows.length === 1 ? 'JOGO' : 'JOGOS'}`} />
          <p className="text-center text-xs text-muted">Calculada só com as estatísticas {row ? 'deste jogo' : 'dos jogos da Copa'}.</p>
          <div className="text-center">
            <DownloadButton getRoot={() => gameRef.current} name={`carta-torneio-${player.nick}`} />
          </div>
        </figure>
      </div>

      <div className="mt-3">
        <Legend
          attrs={GAME_ATTRS}
          title="O QUE É CADA NOTA?"
          note="As duas cartas usam os mesmos 6 atributos. Na carta do torneio, KDA, DMG, SOU, OBJ e FRM são a posição do jogador entre os 12 do jogo (1º = 99, último = 45) e IMP é a nota de MVP do Statlocker. Na sua carta, é o que você digitou."
        />
      </div>

      {/* resultado da comparação */}
      <div className="mt-4 rounded-sm border border-line bg-panel2 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            Você deu <b style={{ color: myTier?.color }}>{grade ?? '–'}</b>, o {row ? 'jogo' : 'torneio'} gerou <b style={{ color: tierOf(gameOvr)?.color }}>{gameOvr}</b>
          </span>
          {verdict ? (
            <span className={`rounded-sm border px-2 py-0.5 text-xs font-bold ${VERDICT[verdict].c}`}>{VERDICT[verdict].t}</span>
          ) : (
            <span className="text-xs text-muted">Dê uma nota ao jogador para comparar.</span>
          )}
          {grade != null && <span className="ml-auto text-xs text-muted">Bateu em {hits} de {rows.length} {rows.length === 1 ? 'jogo' : 'jogos'} (até {MATCH_TOLERANCE} pontos)</span>}
        </div>

        <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Atributos em comum">
          {COMMON.map((k) => {
            const a = mine[k]
            const b = gameP.values[k]
            const d = a != null && b != null ? b - a : null
            return (
              <li key={k} className="rounded-sm border border-line px-2 py-1.5 text-center">
                <div className="text-[11px] tracking-[0.15em] text-muted">{k}</div>
                <div className="text-sm">
                  <span className="text-muted">{a ?? '–'}</span> → <b>{b ?? '–'}</b>
                </div>
                <div className={`text-xs ${d == null ? 'text-muted' : d > 0 ? 'text-pos' : d < 0 ? 'text-neg' : 'text-muted'}`}>{d == null ? '' : d > 0 ? `+${d}` : d}</div>
              </li>
            )
          })}
        </ul>

        {clamped && (
          <p className="mt-2 text-xs text-muted">
            As notas dos jogos vão de {GAME_SCALE_MIN} a 99. Sua nota {grade} vale {onGameScale(grade)} nesta comparação ("pior que quase todos").
          </p>
        )}
        {grade != null && avg != null && grade !== avg && (
          <button
            onClick={() => onUse(avg)}
            className="mt-3 rounded-sm border border-gold/60 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-gold2 hover:bg-gold/10"
          >
            USAR A MÉDIA ({avg}) COMO MINHA NOTA
          </button>
        )}
      </div>
    </section>
  )
}
