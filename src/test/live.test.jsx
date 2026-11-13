import { describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useLiveData, REFRESH_MS } from '../useLiveData'
import * as lib from '../lib'

const clone = () => structuredClone({ teams: lib.teams, ranks: lib.ranks, players: lib.players, updatedAt: lib.updatedAt })
const okFetch = (data) => vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }))
const original = clone()

// devolve os dados originais para não vazar entre testes
const restore = () => lib.setData(original)

describe('setData (lib)', () => {
  it('troca os dados quando válidos e rejeita arquivos inválidos', () => {
    const next = clone()
    next.updatedAt = '2030-01-01T00:00:00.000Z'
    expect(lib.setData(next)).toBe(true)
    expect(lib.updatedAt).toBe('2030-01-01T00:00:00.000Z')
    for (const bad of [null, {}, { players: [] }, { ...next, players: [] }, { ...next, teams: undefined }, { ...next, updatedAt: 1 }]) {
      expect(lib.setData(bad)).toBe(false)
    }
    expect(lib.updatedAt).toBe('2030-01-01T00:00:00.000Z') // inválido não altera
    restore()
  })
})

describe('useLiveData', () => {
  it('atualiza ao abrir e a cada 1 hora', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const data = clone()
    data.updatedAt = '2031-02-02T10:00:00.000Z'
    const f = okFetch(data)
    vi.stubGlobal('fetch', f)
    const { result } = renderHook(() => useLiveData())
    await waitFor(() => expect(result.current.status).toBe('ok'))
    expect(f).toHaveBeenCalledTimes(1)
    expect(f.mock.calls[0][0]).toMatch(/data\/players\.json\?t=\d+/)
    expect(f.mock.calls[0][1]).toEqual({ cache: 'no-store' })
    expect(result.current.version).toBe(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESH_MS)
    })
    expect(f).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('same') // mesma versão: não troca de novo
    expect(result.current.version).toBe(1)
    vi.useRealTimers()
    restore()
  })

  it('REFRESH_MS é exatamente 1 hora', () => expect(REFRESH_MS).toBe(3_600_000))

  it('falha de rede ou arquivo inválido: status erro e dados antigos mantidos', async () => {
    const before = lib.updatedAt
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500 })))
    const a = renderHook(() => useLiveData())
    await waitFor(() => expect(a.result.current.status).toBe('erro'))
    vi.stubGlobal('fetch', okFetch({ lixo: true }))
    const b = renderHook(() => useLiveData())
    await waitFor(() => expect(b.result.current.status).toBe('erro'))
    expect(lib.updatedAt).toBe(before)
  })

  it('não dispara duas buscas ao mesmo tempo', async () => {
    let resolve
    const f = vi.fn(() => new Promise((r) => (resolve = r)))
    vi.stubGlobal('fetch', f)
    const { result } = renderHook(() => useLiveData())
    await act(async () => {
      result.current.refresh()
      result.current.refresh()
    })
    expect(f).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ ok: false, status: 500 }))
  })
})

describe('botão Atualizar no app (notas preservadas)', () => {
  it('atualiza os dados e NÃO apaga notas nem atributos editados', async () => {
    const user = userEvent.setup()
    localStorage.setItem('copa-america-notas-v1', JSON.stringify({ 'Argentina:FRITZ': 77 }))
    localStorage.setItem('copa-america-atributos-v1', JSON.stringify({ 'Argentina:FRITZ': { KDA: 50 } }))
    const next = clone()
    next.updatedAt = '2032-03-03T12:30:00.000Z'
    // mudança nos dados: o rank do FRITZ sobe (a carta dele NÃO muda, só o rank mostrado)
    const fritz = next.players.find((p) => p.team === 'Argentina' && p.nick === 'FRITZ')
    fritz.badge = 113
    vi.stubGlobal('fetch', okFetch(next))
    render(<App />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Dados atualizados'))
    expect(screen.getByText(/Dados de/)).toHaveTextContent(/2032|03\/03/)
    // dados novos na tela
    expect(screen.getAllByText('Eternus 3').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Atributo IMP')).toHaveValue(null) // atributos continuam zerados: a carta é só sua
    // notas e atributos continuam
    expect(screen.getByLabelText('SUA NOTA')).toHaveValue(77)
    expect(screen.getByLabelText('Atributo KDA')).toHaveValue(50)
    expect(JSON.parse(localStorage.getItem('copa-america-notas-v1'))).toEqual({ 'Argentina:FRITZ': 77 })
    expect(JSON.parse(localStorage.getItem('copa-america-atributos-v1'))).toEqual({ 'Argentina:FRITZ': { KDA: 50 } })

    // clique manual no botão: mesma versão
    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Já está na versão mais recente'))
    expect(screen.getByLabelText('SUA NOTA')).toHaveValue(77)
    restore()
  })

  it('mostra erro sem quebrar quando a atualização falha', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Não foi possível atualizar'))
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Não foi possível atualizar'))
  })

  it('time escolhido que some após a atualização volta para o primeiro (sem travar)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(document.querySelector('nav[aria-label="Times"]')).getByRole('button', { name: /canada/i }))
    const next = clone()
    next.updatedAt = '2033-04-04T00:00:00.000Z'
    next.teams = next.teams.filter((t) => t.name !== 'Canada')
    next.players = next.players.filter((p) => p.team !== 'Canada')
    vi.stubGlobal('fetch', okFetch(next))
    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Dados atualizados'))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('FRITZ')
    restore()
  })
})
