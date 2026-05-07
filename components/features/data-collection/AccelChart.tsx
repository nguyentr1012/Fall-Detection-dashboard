'use client'
import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AccelChartPoint } from '@/src/types'

interface Props {
  data: AccelChartPoint[]
}

export const AccelChart = React.memo(function AccelChart({ data }: Props) {
  const domain = React.useMemo(() => {
    if (!data.length) return [-2, 2]
    let min = 0; let max = 0
    data.forEach(d => {
      const vals = [d.ax, d.ay, d.az, d.svm]
      min = Math.min(min, ...vals); max = Math.max(max, ...vals)
    })
    
    const rawRange = max - min
    const targetRange = rawRange / 0.8
    const stepOptions = [0.1, 0.2, 0.5, 1, 2, 5, 10]
    const step = stepOptions.find(s => s >= targetRange / 5) || 10
    
    const niceMin = Math.floor(min / step) * step
    const niceMax = Math.ceil(max / step) * step
    
    // Đảm bảo tối thiểu 4 ticks
    if (niceMax - niceMin < step * 2) return [niceMin - step, niceMax + step]
    return [niceMin, niceMax]
  }, [data])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Accelerometer (g)</CardTitle>
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
              formatter={(v) => typeof v === 'number' ? v.toFixed(3) : v}
            />
            <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="ax" name="X" stroke="#ef4444" dot={false} isAnimationActive={false} strokeWidth={1.5} />
            <Line dataKey="ay" name="Y" stroke="#22c55e" dot={false} isAnimationActive={false} strokeWidth={1.5} />
            <Line dataKey="az" name="Z" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={1.5} />
            <Line
              dataKey="svm" name="SVM"
              stroke="#7c3aed" dot={false} isAnimationActive={false}
              strokeWidth={1.5} strokeDasharray="5 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
