import { useEffect, useMemo, useState } from 'react'
import { recordQuizResult } from '../utils/progress'

function keyForAttempt(quizId) {
  return `attempts:${quizId}`
}

function loadAttempts(quizId) {
  try {
    const raw = localStorage.getItem(keyForAttempt(quizId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAttempt(quizId, attempt) {
  const existing = loadAttempts(quizId)
  existing.unshift(attempt)
  localStorage.setItem(keyForAttempt(quizId), JSON.stringify(existing.slice(0, 10)))
}

export default function QuizPanel({ quizId, questions, onRegenerate }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [attempts, setAttempts] = useState([])

  useEffect(() => {
    setAttempts(loadAttempts(quizId))
  }, [quizId])

  useEffect(() => {
    // reset answers when questions change
    setAnswers({})
    setSubmitted(false)
  }, [questions])

  const score = useMemo(() => {
    if (!submitted) return 0
    let correct = 0
    for (const q of questions) {
      if (q.type === 'mcq') {
        const ans = answers[q.id]
        if (typeof ans === 'number' && ans === q.answerIndex) correct += 1
      } else if (q.type === 'saq' || q.type === 'laq') {
        const ans = (answers[q.id] || '').toLowerCase()
        const ref = (q.reference || q.explanation || '').toLowerCase()
        if (ans && ref && ans.split(' ').slice(0, 4).some(t => ref.includes(t))) correct += 1
      }
    }
    return correct
  }, [submitted, answers, questions])

  function handleSubmit() {
    setSubmitted(true)
    const result = {
      timestamp: Date.now(),
      total: questions.length,
      score,
      answers,
    }
    saveAttempt(quizId, result)
    setAttempts(loadAttempts(quizId))
    // record for progress tracking
    recordQuizResult(questions, answers, score)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Questions: {questions.length}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm"
          >Generate New Set</button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >Submit</button>
          ) : (
            <div className="text-sm font-medium text-emerald-700">Score: {score} / {questions.length}</div>
          )}
        </div>
      </div>

      <ol className="space-y-4">
        {questions.map((q, idx) => (
          <li key={q.id} className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50 dark:bg-gray-700/50 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Q{idx + 1} • {q.type.toUpperCase()}</div>
              {submitted && (
                <div className="text-xs text-gray-600 dark:text-gray-300">Explanation: <span className="text-gray-700 dark:text-gray-200">{q.explanation}</span></div>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div className="text-sm text-gray-800 dark:text-gray-100">{q.prompt}</div>

              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, i) => {
                    const isSelected = answers[q.id] === i
                    const isCorrect = submitted && q.answerIndex === i
                    const base = 'flex items-center gap-2 text-sm border rounded-md px-3 py-2 transition'
                    const color = isCorrect
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                      : isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
                        : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                    return (
                      <label key={i} className={`${base} ${color}`}>
                        <input
                          type="radio"
                          name={q.id}
                          disabled={submitted}
                          checked={isSelected}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: i }))}
                          className="text-brand-600 focus:ring-brand-600"
                        />
                        <span className="leading-5">{opt}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {(q.type === 'saq' || q.type === 'laq') && (
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-24 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={q.type === 'saq' ? 'Type a short answer...' : 'Type a detailed answer...'}
                  disabled={submitted}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      {attempts.length > 0 && (
        <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50 dark:bg-gray-700/50 dark:border-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100">Your Last Attempts</div>
          <ul className="divide-y">
            {attempts.map((a, i) => (
              <li key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{new Date(a.timestamp).toLocaleString()}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{a.score} / {a.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


