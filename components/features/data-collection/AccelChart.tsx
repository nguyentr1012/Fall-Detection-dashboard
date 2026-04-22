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
            <YAxis domain={[-8, 8]} tickCount={5} tick={{ fontSize: 11 }} />
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
