import { useMemo, useRef, useState, useEffect } from 'react'
import { extractTextFromPdfUrl } from './utils/pdfText'
import { generateQuizFromText } from './utils/generateQuestions'
import Header from './components/Header'
import PdfUpload from './components/PdfUpload'
import MainLayout from './components/MainLayout'

function App() {
  const [sourceMode, setSourceMode] = useState('all')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [selectedFileId, setSelectedFileId] = useState(null)
  const fileInputRef = useRef(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizId, setQuizId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [rightTab, setRightTab] = useState('quiz')
  const [isDark, setIsDark] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(false)

  const selectedFile = useMemo(() => {
    if (sourceMode === 'all') return null
    return uploadedFiles.find(f => f.id === selectedFileId) || null
  }, [sourceMode, uploadedFiles, selectedFileId])

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

  // theme persistence (manual CSS via body.theme-dark)
  useEffect(() => {
    const saved = localStorage.getItem('theme:dark')
    const body = document.body
    if (saved === 'true') {
      setIsDark(true)
      body.classList.add('theme-dark')
    } else {
      // Default to light on first load
      setIsDark(true)
      body.classList.remove('theme-dark')
      if (saved === null) localStorage.setItem('theme:dark', 'false')
    }
  }, [])

  useEffect(() => {
    const body = document.body
    if (isDark) {
      body.classList.add('theme-dark')
    } else {
      body.classList.remove('theme-dark')
    }
    localStorage.setItem('theme:dark', String(isDark))
  }, [isDark])

  return (
    <div className="min-h-screen app-shell flex flex-col">
      <Header
        sourceMode={sourceMode}
        setSourceMode={setSourceMode}
        isDark={isDark}
        setIsDark={setIsDark}
        isChatVisible={isChatVisible}
        setIsChatVisible={setIsChatVisible}
        onFileUpload={(e) => {
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
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 flex-1 w-full">
        <PdfUpload
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          sourceMode={sourceMode}
          setSourceMode={setSourceMode}
          selectedFileId={selectedFileId}
          setSelectedFileId={setSelectedFileId}
        />

        <MainLayout
          sourceMode={sourceMode}
          selectedFile={selectedFile}
          uploadedFiles={uploadedFiles}
          isChatVisible={isChatVisible}
          rightTab={rightTab}
          setRightTab={setRightTab}
          quizQuestions={quizQuestions}
          quizId={quizId}
          isGenerating={isGenerating}
          buildQuizFromSelection={buildQuizFromSelection}
          onChatToggle={() => setIsChatVisible(false)}
        />
      </main>

      <footer className="border-t bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-gray-600 dark:text-gray-300 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>© {new Date().getFullYear()} Study Revision App</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-gray-800 dark:hover:text-gray-100" href="#">Privacy</a>
            <a className="hover:text-gray-800 dark:hover:text-gray-100" href="#">Terms</a>
            <span className="text-gray-400 dark:text-gray-500">v0.1</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
