import { useEffect, useMemo, useState } from 'react'
import { getProgress, resetProgress } from '../utils/progress'

export default function Dashboard() {
  const [data, setData] = useState(getProgress())

  useEffect(() => {
    // refresh on mount
    setData(getProgress())
  }, [])

  const overallPct = useMemo(() => {
    if (data.totals.questions === 0) return 0
    return Math.round((data.totals.correct / data.totals.questions) * 100)
  }, [data])

  const topicEntries = useMemo(() => {
    return Object.entries(data.topics)
      .map(([k, v]) => ({ topic: k, ...v, pct: v.seen ? Math.round((v.correct / v.seen) * 100) : 0 }))
      .sort((a, b) => a.pct - b.pct)
  }, [data])

  function handleReset() {
    const next = resetProgress()
    setData(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">Attempts: {data.totals.attempts}</div>
        <button onClick={handleReset} className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100">Reset</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border rounded-lg bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Questions</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.totals.questions}</div>
        </div>
        <div className="border rounded-lg bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Correct</div>
          <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{data.totals.correct}</div>
        </div>
        <div className="border rounded-lg bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{overallPct}%</div>
          <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="h-full bg-emerald-500 dark:bg-emerald-400 rounded" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium dark:bg-gray-700/50 dark:border-gray-700 dark:text-gray-100">Strengths & Weaknesses</div>
        {topicEntries.length === 0 ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">No data yet. Take a quiz to populate your dashboard.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {topicEntries.map((t) => (
              <li key={t.topic} className="px-3 py-2 text-sm flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-1" title={t.topic}>{t.topic}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Seen: {t.seen} • Correct: {t.correct}</div>
                </div>
                <div className="w-28 text-right font-medium text-gray-900 dark:text-gray-100">{t.pct}%</div>
                <div className="w-40 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <div className={`${t.pct >= 60 ? 'bg-emerald-500 dark:bg-emerald-400' : t.pct >= 40 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'} h-full rounded`} style={{ width: `${t.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


