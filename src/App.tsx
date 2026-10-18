import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { ArrowUpRight, LogOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { seedPrintItems, seedShopping, seedSubscriptions, seedWeights } from './data'
import { ready } from './lib/cloud'
import { supabase } from './lib/supabase'
import { fetchSnapshot, mergeSnapshot, type SyncInfo } from './lib/driveSync'
import { useSyncedState } from './lib/storage'
import { PrintDetail, PrintPreview } from './tiles/PrintTile'
import { ShoppingDetail, ShoppingPreview } from './tiles/ShoppingTile'
import { SubsDetail, SubsPreview } from './tiles/SubsTile'
import { WeightDetail, WeightPreview } from './tiles/WeightTile'
import type { PrintItem, ShoppingItem, Subscription, WeightEntry } from './types'

type TileId = 'print' | 'subs' | 'weight' | 'shopping'

const ease = [0.22, 1, 0.36, 1] as const

function Tile({
  id,
  index,
  onOpen,
  children,
}: {
  id: TileId
  index: number
  onOpen: (id: TileId) => void
  children: ReactNode
}) {
  return (
    <motion.button
      className="tile"
      onClick={() => onOpen(id)}
      style={{ borderRadius: 28 }}
      initial={{ opacity: 0, y: 24 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 260, damping: 32, delay: 0.1 + index * 0.08 },
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
    >
      {children}
      <span className="tile-arrow" aria-hidden>
        <ArrowUpRight size={16} />
      </span>
    </motion.button>
  )
}

export default function App() {
  const [printItems, setPrintItems] = useSyncedState<PrintItem[]>('gp.print.v2', seedPrintItems)
  const [subs, setSubs] = useSyncedState<Subscription[]>('gp.subs.v4', seedSubscriptions)
  const [weights, setWeights] = useSyncedState<WeightEntry[]>('gp.weight', seedWeights)
  const [shopping, setShopping] = useSyncedState<ShoppingItem[]>('gp.shopping', seedShopping)
  const [hiddenDrive, setHiddenDrive] = useSyncedState<string[]>('gp.drive.hidden', [])
  const [syncInfo, setSyncInfo] = useSyncedState<SyncInfo | null>('gp.drive.sync', null)
  const [open, setOpen] = useState<TileId | null>(null)
  const close = useCallback(() => setOpen(null), [])

  // Synchronizacja z migawką Dysku: przy starcie i po powrocie do okna
  const latest = useRef({ printItems, hiddenDrive, syncInfo })
  latest.current = { printItems, hiddenDrive, syncInfo }
  useEffect(() => {
    let busy = false
    const sync = async () => {
      if (busy) return
      busy = true
      // najpierw stan z serwera (np. z telefonu), żeby nie dodać tych samych plików drugi raz
      await ready
      await new Promise((r) => setTimeout(r, 50))
      const snap = await fetchSnapshot()
      busy = false
      const { printItems: items, hiddenDrive: hidden, syncInfo: info } = latest.current
      if (!snap || info?.fetchedAt === snap.fetchedAt) return
      const r = mergeSnapshot(items, snap, hidden)
      setPrintItems(() => r.items)
      setHiddenDrive(() => hidden.filter((id) => snap.files.some((f) => f.id === id)))
      setSyncInfo(() => ({
        fetchedAt: snap.fetchedAt,
        folderName: snap.folderName,
        fileCount: snap.files.length,
        added: r.added,
        renamed: r.renamed,
        removed: r.removed,
      }))
    }
    sync()
    const onVisible = () => document.visibilityState === 'visible' && sync()
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <main className="page">
        <motion.header
          className="page-head"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h1>
            Grochu Privates<span className="accent">.</span>
          </h1>
          {supabase && (
            <button
              className="icon-btn logout-btn"
              onClick={() => void supabase!.auth.signOut()}
              aria-label="Wyloguj"
              title="Wyloguj"
            >
              <LogOut size={16} />
            </button>
          )}
        </motion.header>

        <section className="grid">
          <Tile id="print" index={0} onOpen={setOpen}>
            <PrintPreview items={printItems} />
          </Tile>
          <Tile id="subs" index={1} onOpen={setOpen}>
            <SubsPreview subs={subs} />
          </Tile>
          <Tile id="weight" index={2} onOpen={setOpen}>
            <WeightPreview entries={weights} />
          </Tile>
          <Tile id="shopping" index={3} onOpen={setOpen}>
            <ShoppingPreview items={shopping} />
          </Tile>
        </section>
      </main>

      <AnimatePresence>
        {open === 'print' && (
          <PrintDetail
            key="print"
            items={printItems}
            setItems={setPrintItems}
            syncInfo={syncInfo}
            onHideDrive={(id) => setHiddenDrive((h) => [...h, id])}
            onClose={close}
          />
        )}
        {open === 'subs' && <SubsDetail key="subs" subs={subs} setSubs={setSubs} onClose={close} />}
        {open === 'weight' && (
          <WeightDetail key="weight" entries={weights} setEntries={setWeights} onClose={close} />
        )}
        {open === 'shopping' && (
          <ShoppingDetail key="shopping" items={shopping} setItems={setShopping} onClose={close} />
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
