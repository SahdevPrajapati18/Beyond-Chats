import { useEffect, useMemo, useState, useCallback } from 'react'
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
  const [isLoading, setIsLoading] = useState(false)

  // Memoized attempts loading - only run when quizId changes
  useEffect(() => {
    const loadedAttempts = loadAttempts(quizId)
    setAttempts(loadedAttempts)
  }, [quizId])

  // Reset answers when questions change
  useEffect(() => {
    setAnswers({})
    setSubmitted(false)
  }, [questions])

  const calculateScore = (questions, answers) => {
    let correct = 0;
    for (const q of questions) {
        if (q.type === 'mcq') {
            const ans = answers[q.id];
            if (typeof ans === 'number' && ans === q.answerIndex) correct += 1;
        } else if (q.type === 'saq' || q.type === 'laq') {
            const ans = (answers[q.id] || '').toLowerCase();
            const ref = (q.reference || q.explanation || '').toLowerCase();
            if (ans && ref && ans.split(' ').slice(0, 4).some(t => ref.includes(t))) correct += 1;
        }
    }
    return correct;
  };

  const score = useMemo(() => {
    if (!submitted) return 0;
    return calculateScore(questions, answers);
  }, [submitted, questions, answers]);


  const handleSubmit = useCallback(async () => {
    setIsLoading(true);

    const currentScore = calculateScore(questions, answers);
    setSubmitted(true);

    const result = {
        timestamp: Date.now(),
        total: questions.length,
        score: currentScore,
        answers,
    };

    saveAttempt(quizId, result);
    setAttempts(prevAttempts => [result, ...prevAttempts].slice(0, 10));
    recordQuizResult(questions, answers, currentScore);

    setIsLoading(false);
  }, [quizId, questions, answers]);

  // Memoized answer handler for better performance
  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }, [])

  return (
    <div className="space-y-4">
      {/* Header with responsive design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Questions: {questions.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white text-sm transition-colors"
          >
            Generate New Set
          </button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={isLoading || Object.keys(answers).length === 0}
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-sm transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          ) : (
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-md">
              Score: {score} / {questions.length}
            </div>
          )}
        </div>
      </div>

      {/* Questions list with improved responsiveness */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md"
          >
            {/* Question header */}
            <div className="px-3 py-2 border-b bg-gray-50 dark:bg-gray-700/50 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Q{idx + 1} • {q.type.toUpperCase()}
              </div>
              {submitted && q.explanation && (
                <div className="text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                  <span className="font-medium">Explanation:</span> {q.explanation}
                </div>
              )}
            </div>

            {/* Question content */}
            <div className="p-3 space-y-3">
              <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                {q.prompt}
              </div>

              {/* MCQ Options */}
              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, i) => {
                    const isSelected = answers[q.id] === i
                    const isCorrect = submitted && q.answerIndex === i
                    const baseClasses = 'flex items-start gap-2 text-sm border rounded-md px-3 py-2 transition-all cursor-pointer'
                    const colorClasses = isCorrect
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-500'
                      : isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200 dark:border-brand-500'
                        : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'

                    return (
                      <label
                        key={i}
                        className={`${baseClasses} ${colorClasses} ${submitted ? '' : 'hover:shadow-sm'}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          disabled={submitted}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(q.id, i)}
                          className="text-brand-600 focus:ring-brand-600 mt-0.5"
                        />
                        <span className="leading-5 flex-1">{opt}</span>
                        {submitted && isCorrect && (
                          <span className="text-emerald-600 text-xs">✓ Correct</span>
                        )}
                        {submitted && isSelected && !isCorrect && (
                          <span className="text-red-600 text-xs">✗ Incorrect</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Short/Long Answer */}
              {(q.type === 'saq' || q.type === 'laq') && (
                <div className="space-y-2">
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
                    placeholder={q.type === 'saq' ? 'Type a short answer...' : 'Type a detailed answer...'}
                    disabled={submitted}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    rows={q.type === 'saq' ? 2 : 4}
                  />
                  {submitted && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                      Reference: {q.reference || q.explanation || 'No reference provided'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Attempts history with responsive design */}
      {attempts.length > 0 && (
        <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50 dark:bg-gray-700/50 dark:border-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100">
            Your Last Attempts
          </div>
          <div className="max-h-48 overflow-y-auto">
            {attempts.map((a, i) => (
              <div key={i} className="px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(a.timestamp).toLocaleString()}
                </span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  a.score / a.total >= 0.8
                    ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30'
                    : a.score / a.total >= 0.6
                    ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
                    : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
                }`}>
                  {a.score} / {a.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


