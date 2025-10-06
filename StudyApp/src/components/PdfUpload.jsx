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

    // Filter for PDF files and check file type
    const pdfs = dtFiles.filter(f => {
      return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    })

    if (pdfs.length === 0) {
      console.log('No PDF files detected in drop')
      return
    }

    console.log(`Processing ${pdfs.length} PDF files`)

    const newItems = pdfs.map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))

    console.log('New items created:', newItems)

    setUploadedFiles(prev => {
      const updated = [...prev, ...newItems]
      console.log('Updated uploaded files:', updated)
      return updated
    })

    if (sourceMode === 'specific' && !selectedFileId && newItems[0]) {
      setSelectedFileId(newItems[0].id)
    }
  }

  function openFilePicker() {
    console.log('Opening file picker...')
    if (fileInputRef.current) {
      console.log('File input found, clicking...')
      fileInputRef.current.click()
      console.log('File input clicked')
    } else {
      console.log('File input ref is null')
    }
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="text-sm font-semibold strong mb-2">Upload materials</h2>
        <p className="text-xs strong mb-2">Bring your course PDFs to generate targeted quizzes.</p>
      </div>

      <div className="relative mb-5">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleUploadChange}
          className="absolute opacity-0 w-full h-full cursor-pointer z-10"
          id="pdf-upload-input"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-[120px] flex items-center justify-center z-0 ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105 shadow-lg'
              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          <div className="px-5 py-6 text-center pointer-events-none">
            <div className={`mx-auto size-10 rounded-full grid place-items-center mb-3 transition-colors ${
              isDragging ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <svg viewBox="0 0 24 24" fill="none" className={`size-5 transition-colors ${
                isDragging ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-200'
              }`}>
                <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className={`text-sm strong transition-colors ${
              isDragging ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
            }`}>
              {isDragging ? 'Drop PDFs here!' : 'Drag and drop PDFs here, or'} <span className="text-brand-500 underline">browse</span>
            </p>
            <p className={`text-xs strong mt-1 transition-colors ${
              isDragging ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              Only PDF files are supported
            </p>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Your PDFs</h2>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map(file => (
              <div key={file.id} className="flex items-center gap-2 border rounded-full pl-2 pr-1 py-1 panel shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="size-4 text-brand-600">
                  <path d="M8 3h5l5 5v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <button
                  className={`text-xs md:text-sm max-w-[12rem] truncate ${sourceMode === 'specific' && selectedFileId === file.id ? 'font-semibold text-brand-600' : ''}`}
                  onClick={() => { setSourceMode('specific'); setSelectedFileId(file.id) }}
                  title={file.name}
                >
                  {file.name}
                </button>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Open in new tab"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M20 4 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M11 5H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </a>
                <button
                  className="ml-1 size-6 grid place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 hover:text-red-600"
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
