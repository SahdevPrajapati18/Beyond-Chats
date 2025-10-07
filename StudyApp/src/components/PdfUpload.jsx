import { useState, useRef } from 'react'

function PdfUpload({
  uploadedFiles,
  setUploadedFiles,
  sourceMode,
  setSourceMode,
  selectedFileId,
  setSelectedFileId
}) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

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
    e.stopPropagation()
    setIsDragging(false)

    const dtFiles = Array.from(e.dataTransfer?.files || [])
    if (dtFiles.length === 0) return

    const pdfs = dtFiles.filter(f => {
      return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    })

    if (pdfs.length === 0) {
      console.log('No PDF files detected in drop')
      return
    }

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
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-2">Upload materials</h2>
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
          Bring your course PDFs to generate targeted quizzes.
        </p>
      </div>

      <div className="relative mb-5">
        {/* We can trigger the hidden input by clicking the dropzone */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleUploadChange}
          className="hidden"
          id="pdf-upload-input"
        />

        <div
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-[120px] flex items-center justify-center ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-105 shadow-lg'
              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600'
          }`}
        >
          <div className="px-5 py-6 text-center pointer-events-none">
            <div className={`mx-auto size-10 rounded-full grid place-items-center mb-3 transition-colors ${
                isDragging ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-zinc-100 dark:bg-zinc-700'
              }`}>
              <svg viewBox="0 0 24 24" fill="none" className={`size-5 transition-colors ${
                  isDragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className={`text-sm font-medium transition-colors ${
                isDragging ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-600 dark:text-zinc-400'
              }`}>
              {isDragging ? 'Drop PDFs here!' : 'Drag and drop PDFs here, or '}
              <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
            </p>
            <p className={`text-xs mt-1 transition-colors ${
                isDragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-500'
              }`}>
              Only PDF files are supported
            </p>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold mb-2 text-zinc-800 dark:text-zinc-200">Your PDFs</h2>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map(file => (
              <div key={file.id} className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 rounded-full pl-2 pr-1 py-1 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="size-4 text-indigo-600 dark:text-indigo-400">
                  <path d="M8 3h5l5 5v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <button
                  className={`text-xs md:text-sm max-w-[12rem] truncate ${sourceMode === 'specific' && selectedFileId === file.id ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}
                  onClick={() => { setSourceMode('specific'); setSelectedFileId(file.id) }}
                  title={file.name}
                >
                  {file.name}
                </button>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  title="Open in new tab"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M20 4 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M11 5H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </a>
                <button
                  className="ml-1 size-6 grid place-items-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500"
                  onClick={() => handleRemoveFile(file.id)}
                  title="Remove"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M6 7h12M9 7v10m6-10v10M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default PdfUpload