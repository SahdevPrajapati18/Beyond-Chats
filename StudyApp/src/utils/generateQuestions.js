function normalizeSentences(text) {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()
  const parts = cleaned.split(/(?<=[.!?])\s+/)
  return parts.filter(s => s && s.length > 20).slice(0, 200)
}

function pickRandom(arr, n) {
  const copy = [...arr]
  const out = []
  while (copy.length && out.length < n) {
    const i = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}

export function generateQuizFromText(text, counts = { mcq: 5, saq: 3, laq: 2 }) {
  const sentences = normalizeSentences(text)
  const base = sentences.length ? sentences : [
    'This is a placeholder sentence when no content could be extracted from the PDF.'
  ]

  // MCQs: build from sentences, create one correct and three distractors from other sentences
  const mcqSources = pickRandom(base, Math.min(counts.mcq, base.length))
  const mcqs = mcqSources.map((s, idx) => {
    const correct = s
    const distractors = pickRandom(base.filter(x => x !== correct), 3)
    const options = [correct, ...distractors]
    // shuffle
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[options[i], options[j]] = [options[j], options[i]]
    }
    const answerIndex = options.indexOf(correct)
    return {
      id: `mcq-${idx}`,
      type: 'mcq',
      prompt: 'Choose the sentence that best matches the concept: ',
      options,
      answerIndex,
      explanation: correct,
    }
  })

  // SAQs: ask to explain or define a concept hinted by a sentence
  const saqSources = pickRandom(base, Math.min(counts.saq, base.length))
  const saqs = saqSources.map((s, idx) => ({
    id: `saq-${idx}`,
    type: 'saq',
    prompt: `In one or two sentences, explain: ${s}`,
    reference: s,
    explanation: s,
  }))

  // LAQs: open-ended prompts using clusters of sentences
  const laqSources = pickRandom(base, Math.min(counts.laq, base.length))
  const laqs = laqSources.map((s, idx) => ({
    id: `laq-${idx}`,
    type: 'laq',
    prompt: `Write a detailed answer (4-6 sentences): ${s}`,
    reference: s,
    explanation: s,
  }))

  return [...mcqs, ...saqs, ...laqs]
}


