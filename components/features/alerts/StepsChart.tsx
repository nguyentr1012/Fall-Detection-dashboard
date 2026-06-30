'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { BackendStepsDay } from '@/services/api'

interface Props {
  data: BackendStepsDay[]
  isLoading: boolean
}

export function StepsChart({ data, isLoading }: Props) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  // Build a continuous date range and fill missing dates with 0
  const chartData = (() => {
    if (!data.length) return []
    // Sort by date ascending
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    // Build a date set for quick lookup
    const dateMap = new Map(sorted.map(d => [d.date, d]))
    // Find the full range from first to last date
    const start = new Date(sorted[0].date + 'T00:00:00')
    const end = new Date(sorted[sorted.length - 1].date + 'T00:00:00')
    const result: { date: string; 'Bước chân': number }[] = []
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      const entry = dateMap.get(key)
      result.push({
        date: key.slice(5), // MM-DD
        'Bước chân': entry?.steps ?? 0,
      })
    }
    return result
  })()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Số bước chân theo ngày
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !isMounted ? null : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Chưa có dữ liệu bước chân
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200} minWidth={1}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v) => (v != null ? Number(v).toLocaleString() : '')}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Bước chân" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
