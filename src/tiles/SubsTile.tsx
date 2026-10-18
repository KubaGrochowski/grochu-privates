import { AnimatePresence, motion } from 'motion/react'
import { Plus, CircleDollarSign, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { BrandIcon } from '../components/BrandIcon'
import { Collapse } from '../components/Collapse'
import { DetailPanel } from '../components/DetailPanel'
import { formatAmount, formatPLN } from '../lib/format'
import { uid } from '../lib/storage'
import type { Subscription } from '../types'

const total = (subs: Subscription[]) => subs.reduce((s, x) => s + x.cost, 0)
const byCost = (subs: Subscription[]) => [...subs].sort((a, b) => b.cost - a.cost)

/** Pasek udziałów — każda subskrypcja jako odcinek proporcjonalny do kosztu. */
function ShareBar({ subs, delay = 0 }: { subs: Subscription[]; delay?: number }) {
  const sum = total(subs)
  if (sum === 0) return <div className="share-bar empty-bar" />
  return (
    <div className="share-bar" aria-hidden>
      <AnimatePresence initial={false}>
        {byCost(subs).map((s, i) => (
          <motion.span
            key={s.id}
            layout
            className={`share share-${i % 5}`}
            initial={{ flexGrow: 0, opacity: 0 }}
            animate={{ flexGrow: s.cost / sum, opacity: 1 }}
            exit={{ flexGrow: 0, opacity: 0 }}
            transition={{ delay: delay + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            title={`${s.name}: ${formatPLN(s.cost)}`}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Kafelek na pulpicie ---------- */

export function SubsPreview({ subs }: { subs: Subscription[] }) {
  const sum = total(subs)
  return (
    <>
      <div className="tile-top">
        <span className="tile-icon">
          <CircleDollarSign size={16} />
        </span>
        <span className="tile-label">Miesięczne subskrypcje</span>
      </div>

      <div className="tile-figure">
        <AnimatedNumber value={sum} format={formatAmount} className="big" />
        <span className="big-unit">zł miesięcznie</span>
      </div>

      <ShareBar subs={subs} delay={0.25} />
    </>
  )
}

/* ---------- Widok szczegółowy ---------- */

interface DetailProps {
  subs: Subscription[]
  setSubs: (fn: (prev: Subscription[]) => Subscription[]) => void
  onClose: () => void
}

export function SubsDetail({ subs, setSubs, onClose }: DetailProps) {
  const [adding, setAdding] = useState(subs.length === 0)
  const sum = total(subs)

  return (
    <DetailPanel
      title="Miesięczne subskrypcje"
      icon={<CircleDollarSign size={16} />}
      onClose={onClose}
      actions={
        <motion.button
          className="add-btn"
          onClick={() => setAdding((a) => !a)}
          aria-label={adding ? 'Zamknij formularz' : 'Dodaj subskrypcję'}
          animate={{ rotate: adding ? 45 : 0 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={18} />
        </motion.button>
      }
    >
      <div className="summary">
        <div>
          <span className="summary-label">Łącznie miesięcznie</span>
          <div className="summary-figure">
            <AnimatedNumber value={sum} format={formatAmount} className="big" />
            <span className="big-unit">zł</span>
          </div>
        </div>
        <div className="summary-side">
          <span className="summary-label">Rocznie</span>
          <AnimatedNumber value={sum * 12} format={formatPLN} className="mono" />
        </div>
      </div>
      <ShareBar subs={subs} />

      <Collapse open={adding}>
        <AddSubForm
          onAdd={(s) => {
            setSubs((prev) => [...prev, s])
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      </Collapse>

      <ul className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {byCost(subs).map((s, i) => (
            <motion.li
              key={s.id}
              layout
              className="row sub-row"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.04 + i * 0.03, duration: 0.22 } }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <BrandIcon name={s.name} />
              <div className="row-main">
                <span className="row-title">{s.name}</span>
                {s.description && <span className="row-meta">{s.description}</span>}
              </div>
              <div className="row-side">
                <span className="cost">
                  {formatAmount(s.cost)} <small>zł</small>
                </span>
                <button
                  className="icon-btn ghost danger"
                  onClick={() => setSubs((prev) => prev.filter((x) => x.id !== s.id))}
                  aria-label={`Usuń ${s.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {subs.length === 0 && (
          <motion.li className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Brak subskrypcji. Dodaj pierwszą przyciskiem +.
          </motion.li>
        )}
      </ul>
    </DetailPanel>
  )
}

function AddSubForm({
  onAdd,
  onCancel,
}: {
  onAdd: (s: Subscription) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')

  const parsed = Number.parseFloat(cost.replace(/\s/g, '').replace(',', '.'))
  const valid = name.trim() !== '' && Number.isFinite(parsed) && parsed >= 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onAdd({
      id: uid(),
      name: name.trim(),
      description: description.trim() || undefined,
      cost: Math.round(parsed * 100) / 100,
    })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Czego dotyczy</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Netflix"
          />
        </label>
        <label className="field">
          <span>Koszt miesięczny</span>
          <div className="input-suffix">
            <input
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0,00"
            />
            <span>zł</span>
          </div>
        </label>
        <label className="field span-2">
          <span>
            Opis <em>opcjonalnie</em>
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="np. Plan rodzinny, płatne kartą 10. dnia miesiąca"
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          <X size={15} /> Anuluj
        </button>
        <button type="submit" className="btn primary" disabled={!valid}>
          Dodaj subskrypcję
        </button>
      </div>
    </form>
  )
}
