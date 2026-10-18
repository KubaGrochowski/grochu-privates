import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, Trash2, TrendingDown, TrendingUp, Weight, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Collapse } from '../components/Collapse'
import { DetailPanel } from '../components/DetailPanel'
import { WeightChart } from '../components/WeightChart'
import { uid } from '../lib/storage'
import { formatDay, formatDelta, formatKg, sortByDate, trendOf } from '../lib/weight'
import type { WeightEntry } from '../types'

export const WEIGHT_TITLE = 'Moja waga na przestrzeni miesięcy'

function describeTrend(perWeek: number | undefined) {
  if (perWeek === undefined) return { label: 'brak danych', Icon: Minus }
  if (Math.abs(perWeek) < 0.1) return { label: 'stabilna', Icon: Minus }
  return perWeek < 0
    ? { label: 'spada', Icon: TrendingDown }
    : { label: 'rośnie', Icon: TrendingUp }
}

function useWeightStats(entries: WeightEntry[]) {
  const sorted = sortByDate(entries)
  const last = sorted[sorted.length - 1]
  const trend = trendOf(sorted)
  return { sorted, last, trend, desc: describeTrend(trend?.perWeek) }
}

/* ---------- Kafelek na pulpicie ---------- */

export function WeightPreview({ entries }: { entries: WeightEntry[] }) {
  // Trend celowo pokazujemy dopiero w widoku szczegółowym
  const { sorted, last } = useWeightStats(entries)

  return (
    <>
      <div className="tile-top">
        <span className="tile-icon">
          <Weight size={16} />
        </span>
        <span className="tile-label">{WEIGHT_TITLE}</span>
      </div>

      <div className="tile-figure">
        {last ? (
          <AnimatedNumber value={last.kg} format={formatKg} className="big" />
        ) : (
          <span className="big">—</span>
        )}
        <span className="big-unit">kg{last && ` · ${formatDay(last.date)}`}</span>
      </div>

      <WeightChart entries={sorted} height={38} variant="spark" />
    </>
  )
}

/* ---------- Widok szczegółowy ---------- */

interface DetailProps {
  entries: WeightEntry[]
  setEntries: (fn: (prev: WeightEntry[]) => WeightEntry[]) => void
  onClose: () => void
}

export function WeightDetail({ entries, setEntries, onClose }: DetailProps) {
  const [adding, setAdding] = useState(false)
  const { sorted, last, trend, desc } = useWeightStats(entries)
  const newestFirst = [...sorted].reverse()

  return (
    <DetailPanel
      title={WEIGHT_TITLE}
      icon={<Weight size={16} />}
      onClose={onClose}
      actions={
        <motion.button
          className="add-btn"
          onClick={() => setAdding((a) => !a)}
          aria-label={adding ? 'Zamknij formularz' : 'Dodaj pomiar'}
          animate={{ rotate: adding ? 45 : 0 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={18} />
        </motion.button>
      }
    >
      <div className="stats">
        <div className="stat">
          <span className="summary-label">Aktualnie</span>
          <span className="stat-value">
            {last ? formatKg(last.kg) : '—'} <small>kg</small>
          </span>
          {last && <span className="stat-sub">{formatDay(last.date)}</span>}
        </div>
        <div className="stat">
          <span className="summary-label">Trend z ostatniego tygodnia</span>
          <span className="stat-value">
            <desc.Icon size={20} /> {desc.label}
          </span>
          {trend && (
            <span className="stat-sub">
              {formatDelta(trend.perWeek)} kg · od {formatDay(trend.fromDate)}
            </span>
          )}
        </div>
      </div>

      <WeightChart entries={sorted} height={260} />

      <Collapse open={adding}>
        <AddWeightForm
          onAdd={(e) => {
            setEntries((prev) => [...prev, e])
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      </Collapse>

      <ul className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {newestFirst.map((e, i) => {
            const prev = newestFirst[i + 1]
            return (
              <motion.li
                key={e.id}
                layout
                className="row weight-row"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.04 + i * 0.03, duration: 0.22 } }}
                exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              >
                <div className="row-main">
                  <span className="row-title">{formatDay(e.date)}</span>
                  {prev && <span className="row-meta">{formatDelta(e.kg - prev.kg)} kg od poprzedniego</span>}
                </div>
                <div className="row-side">
                  <span className="cost">
                    {formatKg(e.kg)} <small>kg</small>
                  </span>
                  <button
                    className="icon-btn ghost danger"
                    onClick={() => setEntries((p) => p.filter((x) => x.id !== e.id))}
                    aria-label={`Usuń pomiar z ${formatDay(e.date)}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </DetailPanel>
  )
}

function AddWeightForm({
  onAdd,
  onCancel,
}: {
  onAdd: (e: WeightEntry) => void
  onCancel: () => void
}) {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [date, setDate] = useState(iso)
  const [kg, setKg] = useState('')

  const parsed = Number.parseFloat(kg.replace(',', '.'))
  const valid = date !== '' && Number.isFinite(parsed) && parsed > 20 && parsed < 400

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onAdd({ id: uid(), date, kg: Math.round(parsed * 10) / 10 })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Data pomiaru</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Waga</span>
          <div className="input-suffix">
            <input
              autoFocus
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder="0,0"
            />
            <span>kg</span>
          </div>
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          <X size={15} /> Anuluj
        </button>
        <button type="submit" className="btn primary" disabled={!valid}>
          Dodaj pomiar
        </button>
      </div>
    </form>
  )
}
