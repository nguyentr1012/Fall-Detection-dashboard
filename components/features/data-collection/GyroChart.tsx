'use client'
import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GyroChartPoint } from '@/src/types'

interface Props {
  data: GyroChartPoint[]
}

export const GyroChart = React.memo(function GyroChart({ data }: Props) {
  const domain = React.useMemo(() => {
    if (!data.length) return [-100, 100]
    let min = 0; let max = 0
    data.forEach(d => {
      const vals = [d.gx, d.gy, d.gz]
      min = Math.min(min, ...vals); max = Math.max(max, ...vals)
    })
    
    const rawRange = max - min
    const targetRange = rawRange / 0.8
    const stepOptions = [10, 20, 50, 100, 200, 500, 1000]
    const step = stepOptions.find(s => s >= targetRange / 5) || 1000
    
    const niceMin = Math.floor(min / step) * step
    const niceMax = Math.ceil(max / step) * step
    
    if (niceMax - niceMin < step * 2) return [niceMin - step, niceMax + step]
    return [niceMin, niceMax]
  }, [data])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Gyroscope (deg/s)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="t" hide />
            <YAxis
              domain={domain}
              tickCount={5}
              tick={{ fontSize: 11 }}
              allowDataOverflow={false}
              interval={0}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v) => typeof v === 'number' ? v.toFixed(2) : v}
            />
            <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="gx" name="X" stroke="#ef4444" dot={false} isAnimationActive={false} strokeWidth={1.5} />
            <Line dataKey="gy" name="Y" stroke="#22c55e" dot={false} isAnimationActive={false} strokeWidth={1.5} />
            <Line dataKey="gz" name="Z" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
