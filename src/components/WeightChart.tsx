import { AnimatePresence, motion } from 'motion/react'
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatDay, formatDelta, formatKg, toTime, trendOf } from '../lib/weight'
import type { WeightEntry } from '../types'

interface Props {
  /** Pomiary posortowane rosnąco po dacie */
  entries: WeightEntry[]
  height: number
  /** 'spark' — mały wykres na kafelku, bez osi i interakcji */
  variant?: 'full' | 'spark'
}

const monthFmt = new Intl.DateTimeFormat('pl-PL', { month: 'short' })
const ease = [0.22, 1, 0.36, 1] as const

export function WeightChart({ entries, height, variant = 'full' }: Props) {
  const full = variant === 'full'
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId()

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (entries.length < 2) {
    return (
      <div ref={wrap} className="chart-empty" style={{ height }}>
        Dodaj co najmniej dwa pomiary, żeby zobaczyć trend.
      </div>
    )
  }

  const pad = full ? { l: 34, r: 44, t: 14, b: 28 } : { l: 4, r: 6, t: 6, b: 6 }
  const pw = Math.max(width - pad.l - pad.r, 1)
  const ph = height - pad.t - pad.b

  const times = entries.map((e) => toTime(e.date))
  const t0 = times[0]
  const t1 = times[times.length - 1]
  // Linia trendu tylko na pełnym wykresie (nie na kafelku)
  const trend = full ? trendOf(entries) : null

  const values = entries.map((e) => e.kg)
  if (trend) values.push(trend.at(trend.from), trend.at(t1))
  let yMin = Math.floor(Math.min(...values) - 0.4)
  let yMax = Math.ceil(Math.max(...values) + 0.4)
  if (yMax - yMin < 2) yMax = yMin + 2
  const step = yMax - yMin > 6 ? 2 : 1
  yMin = Math.floor(yMin / step) * step

  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0 || 1)) * pw
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * ph

  const pts = entries.map((e, i) => ({ e, px: x(times[i]), py: y(e.kg) }))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].px},${pad.t + ph} L${pts[0].px},${pad.t + ph} Z`

  const yTicks: number[] = []
  for (let v = yMin; v <= yMax; v += step) yTicks.push(v)

  const monthTicks: number[] = []
  const m = new Date(t0)
  m.setDate(1)
  m.setMonth(m.getMonth() + 1)
  while (m.getTime() <= t1) {
    monthTicks.push(m.getTime())
    m.setMonth(m.getMonth() + 1)
  }

  const last = pts[pts.length - 1]

  const onMove = (ev: PointerEvent<SVGSVGElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    const mx = ev.clientX - rect.left
    let best = 0
    pts.forEach((p, i) => {
      if (Math.abs(p.px - mx) < Math.abs(pts[best].px - mx)) best = i
    })
    setHover(best)
  }

  const onKey = (ev: KeyboardEvent<SVGSVGElement>) => {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault()
      const dir = ev.key === 'ArrowRight' ? 1 : -1
      setHover((h) => Math.min(pts.length - 1, Math.max(0, (h ?? (dir > 0 ? -1 : pts.length)) + dir)))
    }
  }

  const hp = hover !== null ? pts[hover] : null
  const prev = hover !== null && hover > 0 ? pts[hover - 1].e.kg : null

  return (
    <div ref={wrap} className={`chart chart-${variant}`} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role={full ? 'img' : undefined}
          aria-label={full ? 'Wykres wagi w czasie z linią trendu z ostatniego tygodnia' : undefined}
          aria-hidden={full ? undefined : true}
          tabIndex={full ? 0 : undefined}
          onPointerMove={full ? onMove : undefined}
          onPointerLeave={full ? () => setHover(null) : undefined}
          onKeyDown={full ? onKey : undefined}
          onBlur={full ? () => setHover(null) : undefined}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--ink)" stopOpacity={full ? 0.1 : 0.12} />
              <stop offset="100%" stopColor="var(--ink)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {full && (
            <g className="chart-grid">
              {yTicks.map((v) => (
                <g key={v}>
                  <line x1={pad.l} x2={pad.l + pw} y1={y(v)} y2={y(v)} />
                  <text x={pad.l - 8} y={y(v)} dy="0.32em" textAnchor="end">
                    {v}
                  </text>
                </g>
              ))}
              {monthTicks.map((t) => (
                <text key={t} x={x(t)} y={height - 8} textAnchor="middle">
                  {monthFmt.format(t).replace('.', '')}
                </text>
              ))}
            </g>
          )}

          {trend && (
            // pas „ostatni tydzień” — okres, z którego liczony jest trend
            <motion.rect
              className="chart-band"
              x={x(trend.from)}
              y={pad.t}
              width={Math.max(x(t1) - x(trend.from), 2)}
              height={ph}
              rx={6}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            />
          )}

          <motion.path
            d={area}
            fill={`url(#${gradId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          />

          {trend && (
            <motion.line
              className="chart-trend"
              x1={x(trend.from)}
              x2={x(t1)}
              y1={y(trend.at(trend.from))}
              y2={y(trend.at(t1))}
              // tylko opacity — animacja pathLength nadpisałaby przerywaną linię
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6, ease }}
            />
          )}

          <motion.path
            d={line}
            className="chart-line"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.15, duration: 1, ease }}
          />

          {hp && <line className="chart-crosshair" x1={hp.px} x2={hp.px} y1={pad.t} y2={pad.t + ph} />}

          {(full ? pts : [last]).map((p, i) => (
            <motion.circle
              key={p.e.id}
              className="chart-dot"
              data-active={hover !== null && pts[hover] === p}
              cx={p.px}
              cy={p.py}
              r={full ? 4 : 3.5}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: full ? 0.25 + (i / pts.length) * 0.9 : 1.05,
                type: 'spring',
                stiffness: 500,
                damping: 25,
              }}
              style={{ transformOrigin: `${p.px}px ${p.py}px` }}
            />
          ))}

          {full && (
            <>
              <text className="chart-endlabel" x={last.px + 10} y={last.py} dy="0.32em">
                {formatKg(last.e.kg)}
              </text>
              {trend && (
                <text
                  className="chart-trendlabel"
                  x={x(t1) + 10}
                  y={y(trend.at(t1))}
                  dy={Math.abs(y(trend.at(t1)) - last.py) < 14 ? (y(trend.at(t1)) > last.py ? '1.3em' : '-0.7em') : '0.32em'}
                >
                  trend
                </text>
              )}
            </>
          )}
        </svg>
      )}

      <AnimatePresence>
        {full && hp && (
          <motion.div
            className="chart-tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              left: Math.min(Math.max(hp.px, 70), width - 70),
              top: Math.max(hp.py - 64, 0),
            }}
          >
            <span className="tip-date">{formatDay(hp.e.date)}</span>
            <span className="tip-value">{formatKg(hp.e.kg)} kg</span>
            {prev !== null && <span className="tip-delta">{formatDelta(hp.e.kg - prev)} kg od poprzedniego</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
