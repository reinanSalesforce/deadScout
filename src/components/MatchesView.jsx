import { useMemo, useRef, useState } from 'react'
import TeamTable, { Nation, OvrBadge } from './match/TeamTable'
import SeriesList from './match/SeriesList'
import SeriesScreen from './match/SeriesScreen'
import FaceOff, { DuelCta, DuelPicker } from './match/FaceOff'
import GameStats from './match/GameStats'
import { BRACKET_URLS, MATCH_POLL_MS, useJsonSource } from '../useJsonSource'
import { COPA_BRACKET, boardFromBracket, boardFromSeries, computeBracket, validBracket } from '../bracket'
import { fmtDuration, laneOpponents, playerSummary, rateGame, seriesOf } from '../matches'

function Ranking({ games }) {
  const [min, setMin] = useState(1)
  const all = useMemo(() => playerSummary(games), [games])
  const list = all.filter((s) => s.games >= min).slice(0, 15)
  if (!all.length) return null
  return (
    <section className="panel p-4">
      <h3 className="panel-title">NOTA MÉDIA POR JOGADOR ({games.length} jogos)</h3>
      <label className="mb-2 flex items-center gap-2 text-xs text-muted">
        Mínimo de jogos
        <select value={min} onChange={(e) => setMin(Number(e.target.value))} aria-label="Mínimo de jogos" className="rounded-sm border border-line bg-black px-2 py-0.5">
          {[1, 2, 3, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {!list.length && <span>nenhum jogador com {min}+ jogos ainda</span>}
      </label>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[10px] tracking-[0.18em] text-muted">
              <th className="py-1">#</th>
              <th>JOGADOR</th>
              <th>SELEÇÃO / TIME</th>
              <th className="text-right">JOGOS</th>
              <th className="text-right">K/D/A</th>
              <th className="text-right">MVPs</th>
              <th className="text-right">MELHOR</th>
              <th className="text-right">MÉDIA</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr key={s.key} className="border-t border-line/60">
                <td className="py-1.5 text-muted">{i + 1}</td>
                <td className="font-bold">{s.name}</td>
                <td className="text-muted">
                  <Nation name={s.nation || '—'} />
                </td>
                <td className="text-right">{s.games}</td>
                <td className="text-right">
                  {s.kills}/{s.deaths}/{s.assists}
                </td>
                <td className="text-right">{s.mvps}</td>
                <td className="text-right">
                  <OvrBadge ovr={s.best} />
                </td>
                <td className="text-right">
                  <OvrBadge ovr={s.avg} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Aba "Torneios", em dois níveis como o site oficial:
//   1) lista de confrontos (cartões-tabela com os jogos Game 1, Game 2... um embaixo do outro);
//   2) tela do jogo: tabelas dos times, confronto de cartinhas e as estatísticas mais abaixo.
export default function MatchesView({ onOpenProfile }) {
  const [source, setSource] = useState('copa') // 'copa' (ao vivo) | 'demo' (Showdown #2, evento já encerrado)
  const [screen, setScreen] = useState('list') // 'list' | 'game'
  const [query, setQuery] = useState('')
  const [serieKey, setSerieKey] = useState(null)
  const [gameId, setGameId] = useState(null)
  const [focusSel, setFocusSel] = useState(null) // { gameId, account }: jogador do detalhe lá embaixo
  const [duelSel, setDuelSel] = useState(null) // { gameId, a, b }: confronto em andamento
  const [pickerOpen, setPickerOpen] = useState(false) // janela do "Novo confronto"
  const faceRef = useRef(null)

  const live = useJsonSource('matches.json', { pollMs: MATCH_POLL_MS })
  const demo = useJsonSource('demo.json', { enabled: source === 'demo' })
  // chave oficial da Copa (ao vivo, direto do site do torneio); sem rede usa a chave padrão
  const bracket = useJsonSource('bracket', { enabled: source === 'copa', pollMs: MATCH_POLL_MS, validate: validBracket, urls: BRACKET_URLS })
  const active = source === 'demo' ? demo : live
  const games = useMemo(() => active.data?.games ?? [], [active.data])
  const items = active.data?.items
  const series = useMemo(() => seriesOf(games), [games])

  const bracketMatches = useMemo(() => (source === 'copa' ? computeBracket(bracket.data ?? COPA_BRACKET) : null), [source, bracket.data])
  const board = useMemo(() => (bracketMatches ? boardFromBracket(bracketMatches, series) : boardFromSeries(series)), [bracketMatches, series])

  const current = series.find((s) => s.key === serieKey) ?? null
  const slot = current?.slots.find((x) => x.id === gameId && x.game) ?? current?.slots.find((x) => x.game) ?? null
  const game = slot?.game ?? null
  const inGame = screen === 'game' && !!current
  const inSeries = screen === 'series' && !!current
  // próximo game da série (com estatísticas) depois do que está aberto
  const nextSlot = current && slot ? current.slots.slice(current.slots.indexOf(slot) + 1).find((x) => x.game) : null
  const rated = game ? rateGame(game) : [] // 12 jogadores: cálculo leve

  // confronto deste jogo (se houver) e jogador do detalhe: o clicado; senão o do confronto; senão o MVP do jogo
  const duel = duelSel?.gameId === game?.id ? duelSel : null
  const focus =
    (focusSel?.gameId === game?.id ? rated.find((p) => p.account === focusSel.account) : null) ??
    (duel ? rated.find((p) => p.account === duel.a) : null) ??
    rated.find((p) => p.isMvp) ??
    null

  const openGame = (key, id) => {
    setSerieKey(key)
    setGameId(id)
    setScreen('game')
    setPickerOpen(false)
    window.scrollTo?.(0, 0)
  }
  // clicar num confronto da chave: tela com os games um abaixo do outro
  const openSeries = (key) => {
    setSerieKey(key)
    setGameId(null)
    setScreen('series')
    setPickerOpen(false)
    window.scrollTo?.(0, 0)
  }
  // voltar das estatísticas: cai na tela dos games do confronto (de onde se vai para o Game 2)
  const backToSeries = () => {
    setScreen('series')
    setPickerOpen(false)
    window.scrollTo?.(0, 0)
  }
  const backToList = () => {
    setScreen('list')
    setPickerOpen(false)
    window.scrollTo?.(0, 0)
  }
  const startDuel = (a, b) => {
    setDuelSel({ gameId: game.id, a, b })
    setFocusSel({ gameId: game.id, account: a })
    setPickerOpen(false)
    setTimeout(() => faceRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 0)
  }
  // "Novo confronto" (botão do topo, cartão no meio das tabelas ou botão do resultado): abre a janela de escolha
  const newDuel = () => setPickerOpen(true)
  // clicar na nota de MVP: só troca o jogador do detalhe ("Jogador"); NÃO abre nem altera o confronto
  const focusPlayer = (account) => setFocusSel({ gameId: game.id, account })
  // clicar num jogador da tabela: confronto dele contra o 1º adversário da lane (equipe 1 sempre à esquerda)
  const pick = (account) => {
    const p = rated.find((x) => x.account === account)
    const opp = p && laneOpponents(game, p)[0]
    setFocusSel({ gameId: game.id, account })
    if (!opp) return
    const o = rated.find((x) => x.account === opp.account)
    if (o) startDuel(...(p.teamIdx === 0 ? [p.account, o.account] : [o.account, p.account]))
  }
  const changeSource = (id) => {
    setSource(id)
    setScreen('list')
    setSerieKey(null)
    setGameId(null)
    setFocusSel(null)
    setDuelSel(null)
    setPickerOpen(false)
  }

  const copaEmpty = live.status !== 'idle' && live.status !== 'loading' && (live.data?.games?.length ?? 0) === 0
  const checked = active.checkedAt ? new Date(active.checkedAt).toLocaleTimeString('pt-BR', { timeStyle: 'short' }) : null

  return (
    <div className="grid gap-4">
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="font-head text-xs tracking-[0.25em] text-gold">TORNEIOS · {source === 'demo' ? 'EXEMPLO: SHOWDOWN #2' : 'COPA AMÉRICA'}</div>
          <div className="text-sm text-muted">
            Estatísticas oficiais de cada jogo (deadlockpremier.com) e a nota de cada jogador naquele jogo.{' '}
            <span role="status">
              {active.status === 'loading' && 'Atualizando…'}
              {active.status === 'erro' && <span className="text-neg">Não foi possível carregar os dados agora.</span>}
              {(active.status === 'ok' || active.status === 'same') && checked && source === 'copa' && `Verificado às ${checked} (confere a cada 1 min).`}
              {(active.status === 'ok' || active.status === 'same') && source === 'demo' && 'Evento encerrado: dados fixos.'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-sm border border-gold/60" role="group" aria-label="Evento">
            {[
              ['copa', 'Copa América'],
              ['demo', 'Exemplo: Showdown #2'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={source === id}
                onClick={() => changeSource(id)}
                className={`px-3 py-1 text-xs font-bold tracking-wider uppercase ${source === id ? 'bg-gold text-[#1a1305]' : 'bg-panel text-muted hover:text-gold2'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={active.refresh} aria-label="Atualizar partidas" className="rounded-sm border border-gold/50 px-3 py-1 text-xs font-bold tracking-wider text-gold2 hover:bg-gold/10">
            ↻ Atualizar
          </button>
        </div>
      </div>

      {source === 'copa' && copaEmpty && (
        <div className="rounded-sm border border-gold/40 bg-gold/5 p-5 text-center">
          <div className="font-head tracking-wider text-gold2">Ainda não há partidas publicadas da Copa América</div>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted">
            A Copa começa em 14/11 às 14:00 (ARG). Quando o site oficial publicar o primeiro jogo, ele aparece aqui sozinho, com a nota de cada jogador.
            Enquanto isso, veja como vai ficar com um campeonato que já aconteceu.
          </p>
          <button onClick={() => changeSource('demo')} className="mt-3 rounded-sm border border-gold px-4 py-1.5 text-xs font-bold tracking-widest text-gold2 hover:bg-gold/10">
            VER EXEMPLO (SHOWDOWN #2)
          </button>
        </div>
      )}

      {games.length > 0 && inSeries && <SeriesScreen series={current} onBack={backToList} onOpenGame={(id) => openGame(current.key, id)} />}

      {(games.length > 0 || source === 'copa') && !inGame && !inSeries && (
        <>
          <SeriesList board={board} query={query} onQuery={setQuery} onOpen={openGame} onOpenSeries={openSeries} />
          {games.length > 0 && <Ranking games={games} />}
        </>
      )}

      {games.length > 0 && inGame && (
        <div className="grid min-w-0 gap-4">
          <section className="panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button onClick={backToSeries} title="Voltar para os games deste confronto" className="rounded-sm border border-gold/60 px-3 py-1 text-xs font-bold tracking-wider text-gold2 hover:bg-gold/10">
                  ← GAMES
                </button>
                <button onClick={backToList} className="rounded-sm border border-line px-3 py-1 text-xs font-bold tracking-wider text-muted hover:border-gold hover:text-gold2">
                  ← CONFRONTOS
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {nextSlot && (
                  <button
                    onClick={() => setGameId(nextSlot.id)}
                    className="rounded-sm border border-line px-3 py-1 text-xs font-bold tracking-wider text-muted hover:border-gold hover:text-gold2"
                  >
                    PRÓXIMO GAME › (Game {nextSlot.gameNo || current.slots.indexOf(nextSlot) + 1})
                  </button>
                )}
                {game && (
                  <button
                    onClick={newDuel}
                    title="Escolher dois jogadores deste jogo e comparar as cartinhas"
                    className="rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-4 py-1.5 text-xs font-bold tracking-wider text-[#1a1305] hover:brightness-110"
                  >
                    ⚔ NOVO CONFRONTO
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-head text-xs tracking-[0.25em] text-gold">
                  {(current.title || '').toUpperCase()} · {current.stage}
                </div>
                <h2 className="mt-1 flex flex-wrap items-center gap-3 font-head text-2xl tracking-wider">
                  <Nation name={current.natA} big />
                  <span className="text-gold2">
                    {current.winsA}–{current.winsB}
                  </span>
                  <Nation name={current.natB} big />
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Jogos da série">
                {current.slots.map((x, i) => (
                  <button
                    key={x.id}
                    role="tab"
                    aria-selected={slot?.id === x.id}
                    onClick={() => x.game && setGameId(x.id)}
                    title={x.game ? undefined : 'Sem estatísticas publicadas para este jogo'}
                    className={`rounded-sm border px-3 py-1 text-xs font-bold tracking-wider uppercase ${
                      slot?.id === x.id ? 'border-gold bg-gold text-[#1a1305]' : x.game ? 'border-line bg-panel text-muted hover:text-gold2' : 'cursor-not-allowed border-dashed border-line text-muted/40'
                    }`}
                  >
                    Game {x.gameNo || i + 1}
                  </button>
                ))}
              </div>
            </div>
            {game && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span>
                  Vencedor: <b className="text-pos">{game.winner || '—'}</b>
                </span>
                <span>Duração {fmtDuration(game.duration)}</span>
                <span>{new Date(game.start * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <a href={`https://deadlockpremier.com/match.html?id=${game.id}`} target="_blank" rel="noreferrer" className="font-bold tracking-wider text-gold2 hover:underline">
                  ESTATÍSTICAS COMPLETAS NO SITE ↗
                </a>
              </div>
            )}
          </section>

          {game ? (
            <>
              <TeamTable team={game.teams[0]} rated={rated} winner={game.winner} focusAcc={focus?.account} onPick={pick} />
              <DuelCta onOpen={newDuel} />
              <TeamTable team={game.teams[1]} rated={rated} winner={game.winner} focusAcc={focus?.account} onPick={pick} />
              <p className="text-[11px] text-muted">
                A nota do jogo (1-99) é a média ponderada de KDA, dano/min, souls/min, dano em objetivos/min, farm/min (posição entre os 12 jogadores) e da nota de MVP do Statlocker. Clique num jogador para abrir o confronto dele na lane, ou use "Confrontar" para escolher dois jogadores.
              </p>

              <div ref={faceRef}>
                <FaceOff
                  key={game.id}
                  game={game}
                  rated={rated}
                  duel={duel}
                  onSwap={() => setDuelSel({ gameId: game.id, a: duel.b, b: duel.a })}
                  onReset={newDuel}
                  onOpenProfile={onOpenProfile}
                />
              </div>

              <GameStats game={game} rated={rated} focus={focus} onFocus={focusPlayer} items={items} />
              {pickerOpen && <DuelPicker game={game} rated={rated} onDuel={startDuel} onClose={() => setPickerOpen(false)} />}
            </>
          ) : (
            <div className="panel p-6 text-center text-muted">Este confronto ainda não tem estatísticas publicadas.</div>
          )}
        </div>
      )}
    </div>
  )
}
