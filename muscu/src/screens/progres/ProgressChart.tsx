import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MetricDef } from '../../lib/stats'
import { fmtMetric } from '../../lib/stats'
import { fmtDate, fmtNum1, fmtSeconds } from '../../lib/format'

interface Point {
  date: number
  value: number
}

function ChartTooltip({ active, payload, def }: { active?: boolean; payload?: { payload: Point }[]; def: MetricDef }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl bg-toast px-3 py-2 shadow-lg">
      <div className="text-[12px] text-muted">{fmtDate(p.date)}</div>
      <div className="text-[15px] font-bold text-ink">{fmtMetric(def, p.value)}</div>
    </div>
  )
}

/** Courbe d'évolution d'un indicateur, une valeur par séance. Toucher la courbe affiche le détail. */
export function ProgressChart({ data, def }: { data: Point[]; def: MetricDef }) {
  return (
    <div className="h-[210px] w-full select-none" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#2a2d33" />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t: number) => fmtDate(t)}
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tickMargin={8}
          />
          <YAxis
            width={44}
            domain={['auto', 'auto']}
            allowDecimals={def.unit === 'kg'}
            tickFormatter={(v: number) => (def.unit === 's' ? fmtSeconds(v) : fmtNum1(v))}
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickCount={4}
          />
          <Tooltip content={<ChartTooltip def={def} />} cursor={{ stroke: '#5a5d64', strokeWidth: 1 }} />
          <Line
            type="linear"
            dataKey="value"
            stroke="#c6f135"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#c6f135', stroke: '#16171a', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#c6f135', stroke: '#16171a', strokeWidth: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
