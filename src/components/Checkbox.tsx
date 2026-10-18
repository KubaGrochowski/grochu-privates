import { motion } from 'motion/react'

interface Props {
  checked: boolean
  onChange: () => void
  label: string
}

export function Checkbox({ checked, onChange, label }: Props) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="checkbox"
      data-checked={checked}
      onClick={onChange}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
        <motion.path
          d="M4.5 10.5l3.5 3.5 7.5-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        />
      </svg>
    </motion.button>
  )
}
