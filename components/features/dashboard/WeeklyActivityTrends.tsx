'use client'
import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStepsHistory } from '@/hooks/useDeviceData'

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function WeeklyActivityTrends() {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  const { data: history = [], isLoading } = useStepsHistory(7)

  // Dựng cửa sổ 7 ngày gần nhất (kể cả ngày trống) để các cột luôn thẳng hàng.
  const { chartData, todayISO } = useMemo(() => {
    const byDate = new Map(history.map((h) => [h.date, h]))
    const today = new Date()
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (6 - i))
      const iso = toLocalISODate(d)
      const rec = byDate.get(iso)
      return {
        day: DAY_LABELS[d.getDay()],
        date: iso,
        steps: rec?.steps ?? 0,
        distance_km: rec?.distance_km ?? 0,
      }
    })
    return { chartData: days, todayISO: toLocalISODate(today) }
  }, [history])

  const totalSteps = chartData.reduce((s, d) => s + d.steps, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Hoạt động 7 ngày</h3>
          <p className="text-xs text-gray-500 mt-0.5">Tổng số bước chân theo ngày.</p>
        </div>
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
          {totalSteps.toLocaleString('vi-VN')} bước
        </span>
      </div>

      <div className="h-48 mt-4 min-w-0">
        {isMounted && isLoading && (
          <div className="h-full w-full animate-pulse rounded-lg bg-gray-100" />
        )}
        {isMounted && !isLoading && totalSteps === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Chưa có dữ liệu bước chân
          </div>
        )}
        {isMounted && !isLoading && totalSteps > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={36} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis hide />
              <Tooltip
                cursor={false}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: any, _n: any, item: any) => [
                  `${Number(v).toLocaleString('vi-VN')} bước · ${item?.payload?.distance_km ?? 0} km`,
                  'Hoạt động',
                ]}
              />
              <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.date === todayISO ? '#1d4ed8' : '#bfdbfe'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
