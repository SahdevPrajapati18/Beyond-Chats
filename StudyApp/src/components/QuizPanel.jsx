import { useEffect, useMemo, useState } from 'react'

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
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Questions: {questions.length}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
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
          <li key={q.id} className="border rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
              <div className="text-sm font-medium">Q{idx + 1} • {q.type.toUpperCase()}</div>
              {submitted && (
                <div className="text-xs text-gray-600">Explanation: <span className="text-gray-700">{q.explanation}</span></div>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div className="text-sm text-gray-800">{q.prompt}</div>

              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <label key={i} className={`flex items-center gap-2 text-sm ${submitted && q.answerIndex === i ? 'text-emerald-700 font-medium' : ''}`}>
                      <input
                        type="radio"
                        name={q.id}
                        disabled={submitted}
                        checked={answers[q.id] === i}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: i }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {(q.type === 'saq' || q.type === 'laq') && (
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-24"
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
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium">Your Last Attempts</div>
          <ul className="divide-y">
            {attempts.map((a, i) => (
              <li key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-700">{new Date(a.timestamp).toLocaleString()}</span>
                <span className="font-medium text-gray-900">{a.score} / {a.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


