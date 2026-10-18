import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'

interface Props {
  value: number
  format: (v: number) => string
  className?: string
}

/** Liczba, która płynnie „dolicza” się do nowej wartości. */
export function AnimatedNumber({ value, format, className }: Props) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => format(v))

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [mv, value])

  return <motion.span className={className}>{text}</motion.span>
}
