import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Checkbox } from '../components/Checkbox'
import { Collapse } from '../components/Collapse'
import { DetailPanel } from '../components/DetailPanel'
import { plural } from '../lib/format'
import { uid } from '../lib/storage'
import type { ShoppingItem } from '../types'

// do kupienia na górze, kupione na dole; poza tym kolejność dodania
const sortItems = (items: ShoppingItem[]) =>
  [...items].sort((a, b) => Number(a.bought) - Number(b.bought))

/* ---------- Kafelek na pulpicie ---------- */

export function ShoppingPreview({ items }: { items: ShoppingItem[] }) {
  const toBuy = items.filter((i) => !i.bought).length

  return (
    <>
      <div className="tile-top">
        <span className="tile-icon">
          <ShoppingBag size={16} />
        </span>
        <span className="tile-label">Do kupienia</span>
      </div>

      <div className="tile-figure">
        <AnimatedNumber value={toBuy} format={(v) => String(Math.round(v))} className="big" />
        <span className="big-unit">{plural(toBuy, 'rzecz', 'rzeczy', 'rzeczy')} do kupienia</span>
      </div>

      <div className="segments" aria-hidden>
        {sortItems(items).map((i, idx) => (
          <motion.span
            key={i.id}
            className={`seg ${i.bought ? 'seg-printed' : 'seg-todo'}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.25 + idx * Math.min(0.07, 0.6 / items.length), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
    </>
  )
}

/* ---------- Widok szczegółowy ---------- */

type Filter = 'all' | 'todo' | 'done'
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'todo', label: 'Do kupienia' },
  { key: 'done', label: 'Kupione' },
]

interface DetailProps {
  items: ShoppingItem[]
  setItems: (fn: (prev: ShoppingItem[]) => ShoppingItem[]) => void
  onClose: () => void
}

export function ShoppingDetail({ items, setItems, onClose }: DetailProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)

  const visible = sortItems(items).filter((i) =>
    filter === 'all' ? true : filter === 'todo' ? !i.bought : i.bought,
  )

  return (
    <DetailPanel
      title="Do kupienia"
      icon={<ShoppingBag size={16} />}
      onClose={onClose}
      actions={
        <motion.button
          className="add-btn"
          onClick={() => setAdding((a) => !a)}
          aria-label={adding ? 'Zamknij formularz' : 'Dodaj rzecz do kupienia'}
          animate={{ rotate: adding ? 45 : 0 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={18} />
        </motion.button>
      }
    >
      <Collapse open={adding}>
        <AddShoppingForm
          onAdd={(item) => {
            setItems((prev) => [...prev, item])
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      </Collapse>

      <LayoutGroup id="shopping-filters">
        <div className="tabs" role="tablist">
          {filters.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className="tab"
              onClick={() => setFilter(f.key)}
            >
              {filter === f.key && (
                <motion.span
                  layoutId="tab-pill"
                  className="tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="tab-text">{f.label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      <motion.ul className="list" layout>
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((item, idx) => (
            <motion.li
              key={item.id}
              layout
              className="row shop-row"
              data-done={item.bought}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.04 + idx * 0.03, duration: 0.22 } }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <Checkbox
                checked={item.bought}
                onChange={() =>
                  setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, bought: !i.bought } : i)))
                }
                label={`Oznacz „${item.name}” jako kupione`}
              />
              <div className="row-main">
                <span className="row-title">{item.name}</span>
                {item.note && <span className="row-meta">{item.note}</span>}
              </div>
              <div className="row-side">
                <button
                  className="icon-btn ghost danger"
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  aria-label={`Usuń ${item.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <motion.li className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {filter === 'done' ? 'Nic jeszcze nie zostało kupione.' : 'Wszystko kupione. 🎉'}
          </motion.li>
        )}
      </motion.ul>
    </DetailPanel>
  )
}

function AddShoppingForm({
  onAdd,
  onCancel,
}: {
  onAdd: (i: ShoppingItem) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ id: uid(), name: name.trim(), note: note.trim() || undefined, bought: false })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Co kupić</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Podkładka pod mysz"
          />
        </label>
        <label className="field">
          <span>
            Notatka <em>opcjonalnie</em>
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="np. 27 cali, max 800 zł"
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          <X size={15} /> Anuluj
        </button>
        <button type="submit" className="btn primary" disabled={!name.trim()}>
          Dodaj do listy
        </button>
      </div>
    </form>
  )
}
