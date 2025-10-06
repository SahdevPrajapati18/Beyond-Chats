import { useMemo, useRef, useState, useEffect } from 'react'
import { extractTextFromPdfUrl } from './utils/pdfText'
import { generateQuizFromText } from './utils/generateQuestions'
import QuizPanel from './components/QuizPanel'

function App() {
  const [sourceMode, setSourceMode] = useState('all')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [selectedFileId, setSelectedFileId] = useState(null)
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizId, setQuizId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const selectedFile = useMemo(() => {
    if (sourceMode === 'all') return null
    return uploadedFiles.find(f => f.id === selectedFileId) || null
  }, [sourceMode, uploadedFiles, selectedFileId])

  function handleUploadChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newItems = files.map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    setUploadedFiles(prev => [...prev, ...newItems])
    if (sourceMode === 'specific' && !selectedFileId && newItems[0]) {
      setSelectedFileId(newItems[0].id)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRemoveFile(id) {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
    if (selectedFileId === id) setSelectedFileId(null)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const dtFiles = Array.from(e.dataTransfer?.files || [])
    if (dtFiles.length === 0) return
    const pdfs = dtFiles.filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) return
    const newItems = pdfs.map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    setUploadedFiles(prev => [...prev, ...newItems])
    if (sourceMode === 'specific' && !selectedFileId && newItems[0]) {
      setSelectedFileId(newItems[0].id)
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  async function buildQuizFromSelection() {
    setIsGenerating(true)
    try {
      let combinedText = ''
      if (sourceMode === 'specific' && selectedFile) {
        combinedText = await extractTextFromPdfUrl(selectedFile.url)
      } else {
        // all PDFs: concatenate first few PDFs for speed
        const firstFew = uploadedFiles.slice(0, 3)
        for (const f of firstFew) {
          const t = await extractTextFromPdfUrl(f.url)
          combinedText += '\n' + t
        }
      }
      const questions = generateQuizFromText(combinedText)
      setQuizQuestions(questions)
      setQuizId(`quiz-${Date.now()}`)
    } catch (e) {
      console.error(e)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <div className="size-8 rounded-md bg-white/15 grid place-items-center">
              {/* simple book icon */}
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-white"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h9A2.5 2.5 0 0 1 20 4.5V18a2 2 0 0 1-2 2H9c-1.657 0-3 1.343-3 3V4.5Z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 6h10" stroke="currentColor" strokeWidth="1.5"/></svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Study Revision App</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-0.5 rounded-lg">
              <div className="grid grid-cols-2 rounded-md overflow-hidden">
                <button
                  onClick={() => setSourceMode('all')}
                  className={`px-3 py-1.5 text-sm transition ${sourceMode === 'all' ? 'bg-white text-indigo-700 font-medium' : 'text-white/90 hover:bg-white/10'}`}
                >All PDFs</button>
                <button
                  onClick={() => setSourceMode('specific')}
                  className={`px-3 py-1.5 text-sm transition ${sourceMode === 'specific' ? 'bg-white text-indigo-700 font-medium' : 'text-white/90 hover:bg-white/10'}`}
                >Specific</button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleUploadChange}
              className="hidden"
            />
            <button
              onClick={openFilePicker}
              className="inline-flex items-center gap-2 rounded-md bg-white/90 text-indigo-700 px-3 py-1.5 text-sm font-medium hover:bg-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-4"><path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Upload
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`mb-5 rounded-xl border-2 border-dashed transition cursor-pointer ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
        >
          <div className="px-5 py-6 text-center">
            <div className="mx-auto size-10 rounded-full bg-gray-100 grid place-items-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-gray-600"><path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p className="text-sm text-gray-700">Drag and drop PDFs here, or <span className="text-indigo-600 underline">browse</span></p>
            <p className="text-xs text-gray-500 mt-1">Only PDF files are supported</p>
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-medium mb-2 text-gray-700">Your PDFs</h2>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-2 border rounded-full pl-2 pr-1 py-1 bg-white shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" className="size-4 text-rose-600"><path d="M8 3h5l5 5v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.5"/><path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.5"/></svg>
                  <button
                    className={`text-xs md:text-sm max-w-[12rem] truncate ${sourceMode === 'specific' && selectedFileId === file.id ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}
                    onClick={() => { setSourceMode('specific'); setSelectedFileId(file.id) }}
                    title={file.name}
                  >{file.name}</button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-500 hover:text-gray-700"
                    title="Open in new tab"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="size-4"><path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 4 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 5H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.5"/></svg>
                  </a>
                  <button
                    className="ml-1 size-6 grid place-items-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-600"
                    onClick={() => handleRemoveFile(file.id)}
                    title="Remove"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="size-4"><path d="M6 7h12M9 7v10m6-10v10M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="h-[70vh] lg:h-[80vh] border rounded-xl bg-white overflow-hidden shadow-sm">
            <div className="h-12 border-b bg-gray-50 flex items-center justify-between px-3 text-sm">
              <div className="font-medium text-gray-800">PDF Viewer</div>
              {selectedFile && (
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-gray-600 truncate max-w-[14rem]" title={selectedFile.name}>{selectedFile.name}</span>
                  <a href={selectedFile.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs">Open</a>
                  <a href={selectedFile.url} download={selectedFile.name} className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs">Download</a>
                </div>
              )}
            </div>
            <div className="h-[calc(100%-3rem)]">
              {sourceMode === 'specific' && selectedFile ? (
                <iframe title={selectedFile.name} src={selectedFile.url} className="w-full h-full" />
              ) : uploadedFiles.length > 0 ? (
                <div className="p-6 text-sm text-gray-600">Select "Specific" and choose a file to preview.</div>
              ) : (
                <div className="p-6 text-sm text-gray-600">Upload a PDF to preview it here.</div>
              )}
            </div>
          </section>

          <section className="h-[70vh] lg:h-[80vh] border rounded-xl bg-white overflow-hidden shadow-sm">
            <div className="h-12 border-b bg-gray-50 flex items-center justify-between px-3 text-sm">
              <div className="font-medium text-gray-800">Quiz</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={buildQuizFromSelection}
                  disabled={uploadedFiles.length === 0 || isGenerating}
                  className="px-2.5 py-1 rounded-md bg-indigo-600 disabled:opacity-50 text-white text-xs"
                >{isGenerating ? 'Generating…' : 'Generate from Selection'}</button>
              </div>
            </div>
            <div className="p-3 h-[calc(100%-3rem)] overflow-auto">
              {quizQuestions.length === 0 ? (
                <div className="text-sm text-gray-600">Generate a quiz from your uploaded PDFs.</div>
              ) : (
                <QuizPanel
                  quizId={quizId}
                  questions={quizQuestions}
                  onRegenerate={buildQuizFromSelection}
                />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
