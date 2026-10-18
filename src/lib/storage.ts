import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { isCloudOnline, push, ready, remoteEntry, subscribe } from './cloud'

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : initial
  } catch {
    return initial
  }
}

/** Stan zapisywany w localStorage przeglądarki. Zmiana klucza wczytuje dane od nowa. */
export function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = useState(() => ({ key, value: read(key, initial) }))

  let current = state
  if (state.key !== key) {
    current = { key, value: read(key, initial) }
    setState(current)
  }

  useEffect(() => {
    try {
      localStorage.setItem(current.key, JSON.stringify(current.value))
    } catch {
      /* brak dostępu do storage — działamy tylko w pamięci */
    }
  }, [current.key, current.value])

  const setValue = (action: SetStateAction<T>) =>
    setState((prev) => ({
      key: prev.key,
      value: typeof action === 'function' ? (action as (p: T) => T)(prev.value) : action,
    }))

  return [current.value, setValue] as const
}

const stampKey = (key: string) => `${key}@updatedAt`

function readStamp(key: string) {
  try {
    return Number(localStorage.getItem(stampKey(key))) || 0
  } catch {
    return 0
  }
}

function writeStamp(key: string, t: number) {
  try {
    localStorage.setItem(stampKey(key), String(t))
  } catch {
    /* jw. */
  }
}

const hasData = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined)

/**
 * Jak useLocalState, ale synchronizowany z serwerem między urządzeniami.
 * Wygrywa nowsza wersja (znacznik czasu ostatniej zmiany); zmiany zrobione offline
 * zostają wysłane, gdy serwer znów odpowie.
 */
export function useSyncedState<T>(key: string, initial: T) {
  const [value, setLocal] = useLocalState<T>(key, initial)
  const current = useRef(value)
  current.current = value

  useEffect(() => {
    const reconcile = () => {
      const r = remoteEntry<T>(key)
      const local = readStamp(key)
      if (r && r.updatedAt > local) {
        writeStamp(key, r.updatedAt)
        current.current = r.value
        setLocal(r.value)
      } else if (isCloudOnline() && r && local > r.updatedAt) {
        push(key, current.current, local)
      } else if (isCloudOnline() && !r && hasData(current.current)) {
        // jednorazowe przeniesienie: w bazie nic nie ma, a ta przeglądarka ma wpisy.
        // Puste dane z nowego urządzenia nigdy nie nadpisują bazy.
        const t = local || Date.now()
        writeStamp(key, t)
        push(key, current.current, t)
      }
    }
    void ready.then(reconcile)
    return subscribe(reconcile)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setLocal zmienia się co render, ale działa tak samo
  }, [key])

  const set = useCallback(
    (action: SetStateAction<T>) => {
      const next = typeof action === 'function' ? (action as (p: T) => T)(current.current) : action
      current.current = next
      const t = Date.now()
      writeStamp(key, t)
      setLocal(next)
      push(key, next, t)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jw.
    [key],
  )

  return [value, set] as const
}

export const uid = () => Math.random().toString(36).slice(2, 10)
