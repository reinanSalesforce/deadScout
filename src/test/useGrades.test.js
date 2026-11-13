import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useGrades } from '../useGrades'

const KEY = 'copa-america-notas-v1'

describe('useGrades (autosave)', () => {
  it('começa vazio', () => {
    const { result } = renderHook(() => useGrades())
    expect(result.current.grades).toEqual({})
    expect(result.current.savedAt).toBeNull()
  })

  it('salva no localStorage a cada mudança', () => {
    const { result } = renderHook(() => useGrades())
    act(() => result.current.setGrade('Brazil:DK', '77'))
    expect(result.current.grades['Brazil:DK']).toBe(77)
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ 'Brazil:DK': 77 })
    expect(result.current.savedAt).not.toBeNull()
  })

  it('recarrega as notas salvas', () => {
    localStorage.setItem(KEY, JSON.stringify({ 'USA:LEFAA': 91 }))
    const { result } = renderHook(() => useGrades())
    expect(result.current.grades['USA:LEFAA']).toBe(91)
  })

  it('limita entre 0 e 100 e arredonda a 1 casa', () => {
    const { result } = renderHook(() => useGrades())
    act(() => result.current.setGrade('a', '150'))
    act(() => result.current.setGrade('b', '-5'))
    act(() => result.current.setGrade('c', '72.34'))
    expect(result.current.grades).toEqual({ a: 100, b: 0, c: 72.3 })
  })

  it('campo vazio ou inválido remove a nota', () => {
    const { result } = renderHook(() => useGrades())
    act(() => result.current.setGrade('a', 80))
    act(() => result.current.setGrade('a', ''))
    expect(result.current.grades).toEqual({})
    act(() => result.current.setGrade('a', 80))
    act(() => result.current.setGrade('a', 'abc'))
    expect(result.current.grades).toEqual({})
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({})
  })

  it('várias notas seguidas não se perdem', () => {
    const { result } = renderHook(() => useGrades())
    act(() => {
      result.current.setGrade('a', 60)
      result.current.setGrade('b', 70)
      result.current.setGrade('c', 80)
    })
    expect(result.current.grades).toEqual({ a: 60, b: 70, c: 80 })
  })

  it('clearAll apaga tudo', () => {
    const { result } = renderHook(() => useGrades())
    act(() => result.current.setGrade('a', 60))
    act(() => result.current.clearAll())
    expect(result.current.grades).toEqual({})
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({})
  })

  it('localStorage corrompido não quebra', () => {
    localStorage.setItem(KEY, '{not json')
    const { result } = renderHook(() => useGrades())
    expect(result.current.grades).toEqual({})
  })
})
