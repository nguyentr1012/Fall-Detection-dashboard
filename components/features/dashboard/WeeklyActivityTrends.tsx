'use client'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TODAY_INDEX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

const WEEKLY_DATA = [
  { day: 'MON', value: 62 },
  { day: 'TUE', value: 78 },
  { day: 'WED', value: 55 },
  { day: 'THU', value: 95 },
  { day: 'FRI', value: 88 },
  { day: 'SAT', value: 42 },
  { day: 'SUN', value: 51 },
]

export function WeeklyActivityTrends() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Weekly Activity Trends</h3>
          <p className="text-xs text-gray-500 mt-0.5">Sleep quality is improving compared to last week.</p>
        </div>
        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
          +12% vs LW
        </span>
      </div>

      <div className="h-48 mt-4 min-w-0">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WEEKLY_DATA} barSize={36} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
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
                formatter={(v: number) => [`${v} min`, 'Active Time']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {WEEKLY_DATA.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === TODAY_INDEX ? '#1d4ed8' : '#bfdbfe'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
