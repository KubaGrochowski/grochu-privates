import type { WeightEntry } from '../types'

const DAY = 86_400_000

export const toTime = (iso: string) => new Date(`${iso}T00:00:00`).getTime()

export const sortByDate = (entries: WeightEntry[]) =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date))

const TREND_DAYS = 7

/**
 * Trend z ostatniego tygodnia: regresja liniowa po pomiarach z 7 dni przed ostatnim pomiarem.
 * Gdy w tym oknie jest tylko jeden pomiar, dokładamy poprzedni, żeby było z czym porównać.
 * Zwraca zmianę w kg na tydzień, początek i koniec okna oraz funkcję linii trendu.
 */
export function trendOf(sorted: WeightEntry[]) {
  if (sorted.length < 2) return null
  const end = toTime(sorted[sorted.length - 1].date)
  let start = sorted.findIndex((e) => toTime(e.date) >= end - TREND_DAYS * DAY)
  if (start > sorted.length - 2) start = sorted.length - 2
  const window = sorted.slice(start)
  const pts = window.map((e) => ({ x: toTime(e.date) / DAY, y: e.kg }))
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p.x, 0) / n
  const my = pts.reduce((s, p) => s + p.y, 0) / n
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  if (sxx === 0) return null
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx
  return {
    perWeek: slope * TREND_DAYS,
    from: toTime(window[0].date),
    fromDate: window[0].date,
    to: end,
    at: (time: number) => my + slope * (time / DAY - mx),
  }
}

const kg1 = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const formatKg = (v: number) => kg1.format(v)

/** Liczba ze znakiem: +0,6 / −0,3 / 0,0 */
export function formatDelta(v: number) {
  const r = Math.round(v * 10) / 10
  if (r === 0) return '0,0'
  return `${r > 0 ? '+' : '−'}${kg1.format(Math.abs(r))}`
}

const shortDate = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })
export const formatDay = (iso: string) => shortDate.format(new Date(`${iso}T00:00:00`))
