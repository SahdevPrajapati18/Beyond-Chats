const KEY = 'progress:v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { totals: { attempts: 0, correct: 0, questions: 0 }, topics: {} }
  } catch {
    return { totals: { attempts: 0, correct: 0, questions: 0 }, topics: {} }
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function recordQuizResult(questions, answers, score) {
  const state = load()
  state.totals.attempts += 1
  state.totals.correct += score
  state.totals.questions += questions.length

  for (const q of questions) {
    const topic = (q.reference || q.explanation || 'general').slice(0, 60)
    if (!state.topics[topic]) state.topics[topic] = { seen: 0, correct: 0 }
    state.topics[topic].seen += 1
    if (q.type === 'mcq') {
      if (answers[q.id] === q.answerIndex) state.topics[topic].correct += 1
    } else {
      const ans = String(answers[q.id] || '').toLowerCase()
      const ref = String(q.reference || q.explanation || '').toLowerCase()
      if (ans && ref && ans.split(' ').slice(0, 4).some(t => ref.includes(t))) state.topics[topic].correct += 1
    }
  }

  save(state)
  return state
}

export function getProgress() {
  return load()
}

export function resetProgress() {
  const init = { totals: { attempts: 0, correct: 0, questions: 0 }, topics: {} }
  save(init)
  return init
}


