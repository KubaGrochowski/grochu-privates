import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { CalendarDays, Cloud, CloudOff, Printer, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Checkbox } from '../components/Checkbox'
import { Collapse } from '../components/Collapse'
import { DetailPanel } from '../components/DetailPanel'
import type { SyncInfo } from '../lib/driveSync'
import { formatMeetingDate, plural } from '../lib/format'
import { uid } from '../lib/storage'
import type { PrintItem } from '../types'

type StatusKey = 'printed' | 'ready' | 'missing'

export function statusOf(item: PrintItem): { key: StatusKey; label: string } {
  if (item.printed) return { key: 'printed', label: 'Wydrukowane' }
  if (item.driveStatus === 'found') return { key: 'ready', label: 'Gotowe do druku i na tablicę' }
  return { key: 'missing', label: 'Brak pliku na Dysku' }
}

const order: Record<StatusKey, number> = { ready: 0, missing: 1, printed: 2 }
const sortItems = (items: PrintItem[]) =>
  [...items].sort(
    (a, b) =>
      order[statusOf(a).key] - order[statusOf(b).key] ||
      (a.meetingDate ?? '9').localeCompare(b.meetingDate ?? '9') ||
      (b.driveModified ?? '').localeCompare(a.driveModified ?? ''),
  )

/* ---------- Kafelek na pulpicie ---------- */

export function PrintPreview({ items }: { items: PrintItem[] }) {
  const toPrint = items.filter((i) => !i.printed).length

  return (
    <>
      <div className="tile-top">
        <span className="tile-icon">
          <Printer size={16} />
        </span>
        <span className="tile-label">Druk na zebranie</span>
      </div>

      <div className="tile-figure">
        <AnimatedNumber value={toPrint} format={(v) => String(Math.round(v))} className="big" />
        <span className="big-unit">{plural(toPrint, 'pozycja', 'pozycje', 'pozycji')} do wydruku</span>
      </div>

      <div className="segments" aria-hidden>
        {sortItems(items).map((i, idx) => (
          <motion.span
            key={i.id}
            className={`seg seg-${statusOf(i).key}`}
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
  { key: 'todo', label: 'Do druku' },
  { key: 'done', label: 'Wydrukowane' },
]

interface DetailProps {
  items: PrintItem[]
  setItems: (fn: (prev: PrintItem[]) => PrintItem[]) => void
  syncInfo: SyncInfo | null
  /** Plik z Dysku usunięty ręcznie z listy — nie przywracamy go przy synchronizacji */
  onHideDrive: (driveId: string) => void
  onClose: () => void
}

const syncFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

function syncSummary(info: SyncInfo) {
  const changes = [
    info.added && `nowe: ${info.added}`,
    info.renamed && `zmienione nazwy: ${info.renamed}`,
    info.removed && `usunięte: ${info.removed}`,
  ].filter(Boolean)
  return changes.length ? changes.join(', ') : 'bez zmian'
}

export function PrintDetail({ items, setItems, syncInfo, onHideDrive, onClose }: DetailProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)

  const visible = sortItems(items).filter((i) =>
    filter === 'all' ? true : filter === 'todo' ? !i.printed : i.printed,
  )

  const update = (id: string, patch: Partial<PrintItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  return (
    <DetailPanel
      title="Druk na zebranie"
      icon={<Printer size={16} />}
      onClose={onClose}
      actions={
        <motion.button
          className="add-btn"
          onClick={() => setAdding((a) => !a)}
          aria-label={adding ? 'Zamknij formularz' : 'Dodaj pozycję'}
          animate={{ rotate: adding ? 45 : 0 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={18} />
        </motion.button>
      }
    >
      <div className="notice">
        {syncInfo ? <RefreshCw size={16} /> : <CloudOff size={16} />}
        {syncInfo ? (
          <span>
            Folder „{syncInfo.folderName}” sprawdzany we wtorki i niedziele rano. Ostatnio:{' '}
            {syncFmt.format(new Date(syncInfo.fetchedAt))} — {syncInfo.fileCount}{' '}
            {plural(syncInfo.fileCount, 'plik', 'pliki', 'plików')}, {syncSummary(syncInfo)}.
          </span>
        ) : (
          <span>Dysk Google nie został jeszcze odczytany.</span>
        )}
      </div>

      <Collapse open={adding}>
        <AddPrintForm
          onAdd={(item) => {
            setItems((prev) => [...prev, item])
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      </Collapse>

      <LayoutGroup id="print-filters">
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
            <PrintRow
              key={item.id}
              item={item}
              index={idx}
              onToggle={() => update(item.id, { printed: !item.printed })}
              onToggleDrive={() =>
                update(item.id, { driveStatus: item.driveStatus === 'found' ? 'missing' : 'found' })
              }
              onDelete={() => {
                if (item.driveId) onHideDrive(item.driveId)
                setItems((prev) => prev.filter((i) => i.id !== item.id))
              }}
            />
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <motion.li className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {filter === 'done' ? 'Nic jeszcze nie zostało wydrukowane.' : 'Wszystko wydrukowane. 🎉'}
          </motion.li>
        )}
      </motion.ul>
    </DetailPanel>
  )
}

interface RowProps {
  item: PrintItem
  index: number
  onToggle: () => void
  onToggleDrive: () => void
  onDelete: () => void
}

function PrintRow({ item, index, onToggle, onToggleDrive, onDelete }: RowProps) {
  const status = statusOf(item)
  const date = formatMeetingDate(item.meetingDate)
  const onDrive = formatMeetingDate(item.driveModified)
  const showFile = item.fileName && !item.fileName.startsWith(item.title)
  // oznaczenie „nowe” przez 7 dni od dodania przez synchronizację
  const isNew =
    !item.printed && !!item.syncedAt && Date.now() - new Date(item.syncedAt).getTime() < 7 * 86_400_000

  return (
    <motion.li
      layout
      className="row"
      data-done={item.printed}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.04 + index * 0.03, duration: 0.22 } }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    >
      <Checkbox
        checked={item.printed}
        onChange={onToggle}
        label={`Oznacz „${item.title}” jako wydrukowane`}
      />
      <div className="row-main">
        <span className="row-title">
          {item.title}
          {isNew && <span className="badge-new">nowe</span>}
        </span>
        <span className="row-meta">
          {item.meeting && <span>{item.meeting}</span>}
          {date && (
            <span className="meta-date" data-soon={date.days >= 0 && date.days <= 3}>
              <CalendarDays size={12} /> {date.label} · {date.rel}
            </span>
          )}
          {onDrive && (
            <span className="meta-date">
              <Cloud size={12} /> na Dysku od {onDrive.label}
            </span>
          )}
        </span>
        {showFile && <span className="row-file">{item.fileName}</span>}
      </div>
      <div className="row-side">
        <motion.button
          layout="position"
          className={`chip chip-${status.key}`}
          onClick={item.printed ? undefined : onToggleDrive}
          disabled={item.printed}
          title={item.printed ? undefined : 'Kliknij, aby przełączyć status pliku na Dysku'}
          whileTap={item.printed ? undefined : { scale: 0.95 }}
        >
          <i className={`dot dot-${status.key}`} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {status.label}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <button className="icon-btn ghost danger" onClick={onDelete} aria-label="Usuń pozycję">
          <Trash2 size={15} />
        </button>
      </div>
    </motion.li>
  )
}

function AddPrintForm({
  onAdd,
  onCancel,
}: {
  onAdd: (i: PrintItem) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [meeting, setMeeting] = useState('')
  const [date, setDate] = useState('')
  const [fileName, setFileName] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !meeting.trim()) return
    onAdd({
      id: uid(),
      title: title.trim(),
      meeting: meeting.trim(),
      meetingDate: date || undefined,
      fileName: fileName.trim() || undefined,
      driveStatus: 'missing',
      printed: false,
    })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Co wydrukować</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Regulamin parkingu"
          />
        </label>
        <label className="field">
          <span>Na jakie zebranie</span>
          <input
            value={meeting}
            onChange={(e) => setMeeting(e.target.value)}
            placeholder="np. Zebranie wspólnoty"
          />
        </label>
        <label className="field">
          <span>Data zebrania</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>
            Nazwa pliku na Dysku <em>opcjonalnie</em>
          </span>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="np. regulamin.pdf"
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          <X size={15} /> Anuluj
        </button>
        <button type="submit" className="btn primary" disabled={!title.trim() || !meeting.trim()}>
          Dodaj do listy
        </button>
      </div>
    </form>
  )
}
