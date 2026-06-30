'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { BackendStepsDay } from '@/services/api'

interface Props {
  data: BackendStepsDay[]
  isLoading: boolean
}

export function DistanceChart({ data, isLoading }: Props) {
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
    const result: { date: string; km: number }[] = []
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      const entry = dateMap.get(key)
      result.push({
        date: key.slice(5), // MM-DD
        km: entry?.distance_km != null ? Number(entry.distance_km.toFixed(2)) : 0,
      })
    }
    return result
  })()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Quãng đường di chuyển (km/ngày)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !isMounted ? null : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Chưa có dữ liệu quãng đường
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200} minWidth={1}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" km" />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v) => [`${v ?? 0} km`, 'Quãng đường']}
              />
              <Line
                type="monotone"
                dataKey="km"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
