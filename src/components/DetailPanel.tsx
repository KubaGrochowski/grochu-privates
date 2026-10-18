import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface Props {
  title: string
  icon: ReactNode
  onClose: () => void
  actions?: ReactNode
  children: ReactNode
}

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Pełny widok kafelka. Animujemy wyłącznie transform i opacity —
 * to robi karta graficzna, więc otwieranie jest płynne i szybkie.
 */
export function DetailPanel({ title, icon, onClose, actions, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="detail-root">
      <motion.div
        className="backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.section
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99, transition: { duration: 0.14, ease: 'easeIn' } }}
        transition={{ duration: 0.24, ease }}
      >
        <header className="detail-head">
          <button className="icon-btn" onClick={onClose} aria-label="Wróć">
            <ArrowLeft size={18} />
          </button>
          <div className="detail-title">
            <span className="tile-icon">{icon}</span>
            <h2>{title}</h2>
          </div>
          <div className="detail-actions">{actions}</div>
        </header>
        <div className="detail-body">{children}</div>
      </motion.section>
    </div>
  )
}
