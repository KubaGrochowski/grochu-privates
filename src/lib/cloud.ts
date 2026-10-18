/**
 * Synchronizacja z Supabase (tabela app_state, Row Level Security — widzi ją tylko właściciel).
 * Bez konfiguracji Supabase albo offline wszystko działa lokalnie (localStorage).
 */
import { supabase } from './supabase'

export interface Stored<T = unknown> {
  value: T
  updatedAt: number
}

type Listener = () => void

let remote: Record<string, Stored> = {}
let online = false
let started = false
const listeners = new Set<Listener>()

let resolveReady!: () => void
/** Rozwiązuje się po pierwszym pobraniu stanu z bazy (albo od razu, gdy bazy nie ma). */
export const ready = new Promise<void>((r) => (resolveReady = r))

async function pull() {
  if (!supabase) return
  const { data, error } = await supabase.from('app_state').select('key, value, updated_at')
  if (error || !data) return
  remote = Object.fromEntries(data.map((r) => [r.key as string, { value: r.value, updatedAt: Number(r.updated_at) }]))
  online = true
  listeners.forEach((l) => l())
}

/** Wywoływane po zalogowaniu (albo od razu, gdy Supabase nie jest skonfigurowany). */
export async function startCloud() {
  if (started) return
  started = true
  if (supabase) {
    await pull()
    window.addEventListener('focus', () => void pull())
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void pull())
  }
  resolveReady()
}

export const isCloudOnline = () => online
export const remoteEntry = <T>(key: string) => remote[key] as Stored<T> | undefined

export function subscribe(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** Wysyła zmianę do bazy (z krótkim opóźnieniem, żeby nie wysyłać każdego kliknięcia osobno). */
export function push(key: string, value: unknown, updatedAt: number) {
  if (!supabase || !started) return
  clearTimeout(timers.get(key))
  timers.set(
    key,
    setTimeout(async () => {
      timers.delete(key)
      const { data, error } = await supabase!.rpc('put_state', {
        p_key: key,
        p_value: value,
        p_updated_at: updatedAt,
      })
      if (error) return // offline — dane są w localStorage, wyślemy przy następnej zmianie
      online = true
      if (data === true) remote[key] = { value, updatedAt }
      else void pull() // w bazie jest nowsza wersja (np. z telefonu) — pobierz ją
    }, 400),
  )
}
