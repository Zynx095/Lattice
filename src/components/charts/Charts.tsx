import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Table2, ChartLine } from 'lucide-react'
import { themeConfig } from '@/config'
import { cn, formatNumber } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Panel, type PanelProps } from '@/components/ui/primitives'

/**
 * Lightweight SVG charts. No chart library.
 *
 * Conventions (keep them when adding chart types):
 * - Colours come from themeConfig.chartColors (CSS variables, one set per theme) in fixed order, by series.
 * - One y-axis per chart. Gridlines and axis labels stay quiet.
 * - Two or more series get a legend. A single series is named by the panel title.
 * - Every chart has a hover read-out and can be shown as a table (ChartPanel).
 */

const COLORS = themeConfig.chartColors
const GRID = 'hsl(var(--border))'
const AXIS_TEXT = 'hsl(var(--subtle))'

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

/** A round upper bound and tick list for a 0-based axis. */
function niceScale(max: number, ticks = 4): number[] {
  if (max <= 0) return [0, 1]
  const rough = max / ticks
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow
  const wholeStep = max <= ticks ? 1 : step
  const top = Math.ceil(max / wholeStep) * wholeStep
  return Array.from({ length: Math.round(top / wholeStep) + 1 }, (_, i) => i * wholeStep)
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const flip = x > width * 0.6
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-28 rounded-md border border-border-strong bg-overlay px-2.5 py-2 text-sm shadow-pop"
      style={{ left: x, top: y, transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)` }}
    >
      {children}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/* ---------- Line chart ---------- */

export interface ChartSeries {
  label: string
  values: number[]
}

export interface LineChartProps {
  /** One label per point on the x-axis. */
  labels: string[]
  /** Up to five series. Colours are assigned in order. */
  series: ChartSeries[]
  height?: number
  /** Fills under the line. Use for a single series only. */
  area?: boolean
  formatValue?: (n: number) => string
}

export function LineChart({ labels, series, height = 220, area = false, formatValue = formatNumber }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const multi = series.length > 1
  const pad = { top: 10, right: multi ? 16 : 10, bottom: 24, left: 34 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const n = labels.length

  const ticks = useMemo(() => niceScale(Math.max(1, ...series.flatMap((s) => s.values))), [series])
  const top = ticks[ticks.length - 1]
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => pad.top + innerH - (v / top) * innerH
  const path = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))))

  const onMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left - pad.left) / Math.max(1, innerW)
    setHover(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))))
  }

  return (
    <div>
      {multi && <Legend items={series.map((s, i) => ({ label: s.label, color: COLORS[i] }))} />}
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Line chart: ${series.map((s) => s.label).join(', ')}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            className="touch-pan-y"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="num">
                  {formatValue(t)}
                </text>
              </g>
            ))}
            {labels.map((label, i) =>
              (n - 1 - i) % labelEvery === 0 ? (
                <text key={i} x={x(i)} y={height - 6} textAnchor={i === n - 1 ? 'end' : 'middle'} fontSize={11} fill={AXIS_TEXT}>
                  {label}
                </text>
              ) : null,
            )}

            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="hsl(var(--border-strong))" strokeWidth={1} />}

            {series.map((s, si) => (
              <g key={s.label}>
                {area && !multi && (
                  <path d={`${path(s.values)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={COLORS[si]} opacity={0.1} />
                )}
                <path d={path(s.values)} fill="none" stroke={COLORS[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {hover !== null && (
                  <circle cx={x(hover)} cy={y(s.values[hover])} r={4} fill={COLORS[si]} stroke="hsl(var(--surface))" strokeWidth={2} />
                )}
              </g>
            ))}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={x(hover)} y={pad.top + innerH / 2} width={width}>
            <p className="mb-1 text-subtle">{labels[hover]}</p>
            {series.map((s, i) => (
              <p key={s.label} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                  {s.label}
                </span>
                <span className="num font-medium">{formatValue(s.values[hover])}</span>
              </p>
            ))}
          </Tooltip>
        )}
      </div>
    </div>
  )
}

/* ---------- Bar chart (vertical, one series) ---------- */

export interface BarDatum {
  label: string
  value: number
}

export interface BarChartProps {
  data: BarDatum[]
  /** Name of the measure, shown in the tooltip. */
  measure: string
  height?: number
  formatValue?: (n: number) => string
}

export function BarChart({ data, measure, height = 220, formatValue = formatNumber }: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const pad = { top: 10, right: 8, bottom: 24, left: 34 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const ticks = niceScale(Math.max(1, ...data.map((d) => d.value)))
  const top = ticks[ticks.length - 1]
  const band = data.length ? innerW / data.length : 0
  const barW = Math.min(36, Math.max(4, band - 10))
  const y = (v: number) => pad.top + innerH - (v / top) * innerH

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Bar chart: ${measure}`} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="num">
                {formatValue(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + band * i + band / 2
            const h = Math.max(0, pad.top + innerH - y(d.value))
            const r = Math.min(4, h, barW / 2)
            const x0 = cx - barW / 2
            const yTop = y(d.value)
            const base = pad.top + innerH
            return (
              <g key={d.label} onPointerEnter={() => setHover(i)}>
                {/* Hit area is the full band, larger than the bar. */}
                <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH + pad.bottom} fill="transparent" />
                <path
                  d={`M${x0},${base}V${yTop + r}Q${x0},${yTop} ${x0 + r},${yTop}H${x0 + barW - r}Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r}V${base}Z`}
                  fill={COLORS[0]}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  className="transition-opacity duration-150"
                />
                <text x={cx} y={height - 6} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                  {d.label.length > 12 && band < 80 ? d.label.slice(0, 10) + '…' : d.label}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={pad.left + band * hover + band / 2} y={pad.top + innerH / 2} width={width}>
          <p className="mb-0.5 text-subtle">{data[hover].label}</p>
          <p className="flex justify-between gap-4">
            <span className="text-muted-foreground">{measure}</span>
            <span className="num font-medium">{formatValue(data[hover].value)}</span>
          </p>
        </Tooltip>
      )}
    </div>
  )
}

/* ---------- Bar list (horizontal, labelled) ---------- */

export interface BarListProps {
  data: BarDatum[]
  formatValue?: (n: number) => string
  /** Tailwind background class per label, for status-coloured rows. Defaults to the first chart colour. */
  colorFor?: (label: string) => string | undefined
}

export function BarList({ data, formatValue = formatNumber, colorFor }: BarListProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-muted-foreground">{d.label}</span>
            <span className="num font-medium">{formatValue(d.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-raised">
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', colorFor?.(d.label))}
              style={{ width: `${(d.value / max) * 100}%`, background: colorFor?.(d.label) ? undefined : COLORS[0] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Sparkline ---------- */

export function Sparkline({ values, width = 96, height = 28, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values.map((v, i) => `${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - ((v - min) / range) * (height - 6)).toFixed(1)}`)
  const [lastX, lastY] = points[points.length - 1].split(',')
  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <polyline points={points.join(' ')} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />
      <circle cx={lastX} cy={lastY} r={2.5} fill="hsl(var(--primary))" />
    </svg>
  )
}

/* ---------- Chart panel with a table view ---------- */

export interface ChartPanelProps extends Omit<PanelProps, 'children' | 'actions'> {
  children: React.ReactNode
  /** The same data as rows, for the "Show as table" toggle. First column is the row label. */
  table: { columns: string[]; rows: (string | number)[][] }
  /** Extra header controls, placed before the table toggle. */
  controls?: React.ReactNode
}

export function ChartPanel({ children, table, controls, ...panel }: ChartPanelProps) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Panel
      {...panel}
      actions={
        <>
          {controls}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setAsTable((v) => !v)}
            aria-label={asTable ? 'Show as chart' : 'Show as table'}
            title={asTable ? 'Show as chart' : 'Show as table'}
          >
            {asTable ? <ChartLine /> : <Table2 />}
          </Button>
        </>
      }
    >
      {asTable ? (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-subtle">
                {table.columns.map((c, i) => (
                  <th key={c} className={cn('sticky top-0 bg-card pb-2 font-medium', i > 0 && 'text-right')}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r} className="border-t border-border">
                  {row.map((cell, i) => (
                    <td key={i} className={cn('py-1.5', i > 0 ? 'num text-right' : 'text-muted-foreground')}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Panel>
  )
}
