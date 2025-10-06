import { useState, useRef } from 'react'

function Header({
  sourceMode,
  setSourceMode,
  isDark,
  setIsDark,
  isChatVisible,
  setIsChatVisible,
  onFileUpload
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const fileInputRef = useRef(null)

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return (
    <header className="border-b border-brand-900/10 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 text-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 select-none">
          <div className="size-8 rounded-md bg-white/20 ring-1 ring-white/20 grid place-items-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-5 text-white">
              <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h9A2.5 2.5 0 0 1 20 4.5V18a2 2 0 0 1-2 2H9c-1.657 0-3 1.343-3 3V4.5Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 6h10" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Study Revision App</h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-white/10 p-0.5 rounded-lg shadow-sm backdrop-blur-sm">
            <div className="grid grid-cols-2 rounded-md overflow-hidden">
              <button
                onClick={() => setSourceMode('all')}
                className={`px-3 py-1.5 text-sm transition ${sourceMode === 'all' ? 'bg-white/30 text-white font-medium backdrop-blur-sm ring-1 ring-white/30' : 'text-white/90 hover:bg-white/15'}`}
              >All PDFs</button>
              <button
                onClick={() => setSourceMode('specific')}
                className={`px-3 py-1.5 text-sm transition ${sourceMode === 'specific' ? 'bg-white/30 text-white font-medium backdrop-blur-sm ring-1 ring-white/30' : 'text-white/90 hover:bg-white/15'}`}
              >Specific</button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={onFileUpload}
            className="hidden"
          />
          <button
            onClick={openFilePicker}
            className="inline-flex items-center gap-2 rounded-md bg-brand-700/80 hover:bg-brand-800/80 text-white px-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm ring-1 ring-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-4">
              <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Upload
          </button>

          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isChatVisible
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
            title={isChatVisible ? 'Hide AI Companion' : 'Show AI Companion'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {isChatVisible ? 'Hide Chat' : 'AI Companion'}
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className="inline-flex items-center gap-2 rounded-md bg-white/20 px-2.5 py-1.5 text-sm font-medium hover:bg-white/25"
            title="Toggle dark mode"
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" className="size-4">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="size-4">
                <path d="M12 3v2m0 14v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M3 12h2m14 0h2M4.22 19.78l1.42-1.42m12.72-12.72 1.42-1.42M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isChatVisible
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
            title={isChatVisible ? 'Hide AI Companion' : 'Show AI Companion'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex items-center gap-2 rounded-md bg-white/20 px-2.5 py-1.5 text-sm font-medium hover:bg-white/25"
            title="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/20 bg-brand-600/90 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-3 space-y-3">
            <div className="bg-white/10 p-0.5 rounded-lg shadow-sm">
              <div className="grid grid-cols-2 rounded-md overflow-hidden">
                <button
                  onClick={() => { setSourceMode('all'); setIsMobileMenuOpen(false); }}
                  className={`px-3 py-2 text-sm transition ${sourceMode === 'all' ? 'bg-white/30 text-white font-medium' : 'text-white/90 hover:bg-white/15'}`}
                >All PDFs</button>
                <button
                  onClick={() => { setSourceMode('specific'); setIsMobileMenuOpen(false); }}
                  className={`px-3 py-2 text-sm transition ${sourceMode === 'specific' ? 'bg-white/30 text-white font-medium' : 'text-white/90 hover:bg-white/15'}`}
                >Specific</button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={onFileUpload}
                className="hidden"
              />
              <button
                onClick={() => { openFilePicker(); setIsMobileMenuOpen(false); }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-brand-700/80 hover:bg-brand-800/80 text-white px-3 py-2 text-sm font-medium shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" className="size-4">
                  <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Upload PDFs
              </button>

              <button
                onClick={() => { setIsDark(!isDark); setIsMobileMenuOpen(false); }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/25"
                title="Toggle dark mode"
              >
                {isDark ? (
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M12 3v2m0 14v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M3 12h2m14 0h2M4.22 19.78l1.42-1.42m12.72-12.72 1.42-1.42M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
