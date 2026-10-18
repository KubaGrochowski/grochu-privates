const pln = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatPLN = (v: number) => `${pln.format(v)} zł`
export const formatAmount = (v: number) => pln.format(v)

const dayMonth = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })

export function formatMeetingDate(iso?: string) {
  if (!iso) return null
  const date = new Date(`${iso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000)

  let rel: string
  if (days === 0) rel = 'dziś'
  else if (days === 1) rel = 'jutro'
  else if (days === -1) rel = 'wczoraj'
  else if (days > 1) rel = `za ${days} dni`
  else rel = `${-days} dni temu`

  return { label: dayMonth.format(date), rel, days }
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one
  const d = n % 10
  const t = n % 100
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return few
  return many
}
