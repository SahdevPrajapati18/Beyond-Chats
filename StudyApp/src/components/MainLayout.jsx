import QuizPanel from './QuizPanel'
import Dashboard from './Dashboard'
import ChatPanel from './Chat'
import VideoRecommendations from './VideoRecommendations'

function MainLayout({
  sourceMode,
  selectedFile,
  uploadedFiles,
  isChatVisible,
  rightTab,
  setRightTab,
  quizQuestions,
  quizId,
  isGenerating,
  buildQuizFromSelection,
  onChatToggle
}) {
  return (
    <>
      <div className="mb-3">
        <h2 className="text-sm font-semibold strong mb-2">Study workspace</h2>
      </div>

      <div className="flex flex-col gap-3 min-h-screen">
        {/* PDF Viewer and Learning Hub - Always visible */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <section className="h-[60vh] md:h-[65vh] lg:h-[70vh] xl:h-[75vh] border rounded-xl panel overflow-hidden shadow-sm">
            <div className="h-12 border-b panel-header flex items-center justify-between px-3 text-sm">
              <div className="font-medium">PDF Viewer</div>
              {selectedFile && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="hidden md:inline muted truncate max-w-[10rem] lg:max-w-[14rem]" title={selectedFile.name}>{selectedFile.name}</span>
                  <a href={selectedFile.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100">Open</a>
                  <a href={selectedFile.url} download={selectedFile.name} className="px-2 py-1 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-xs">Download</a>
                </div>
              )}
            </div>
            <div className="h-[calc(100%-3rem)]">
              {sourceMode === 'specific' && selectedFile ? (
                <iframe title={selectedFile.name} src={selectedFile.url} className="w-full h-full" />
              ) : uploadedFiles.length > 0 ? (
                <div className="p-4 md:p-6 text-sm muted">Select "Specific" and choose a file to preview.</div>
              ) : (
                <div className="p-4 md:p-6 text-sm muted">Upload a PDF to preview it here.</div>
              )}
            </div>
          </section>

          <section className="h-[50vh] md:h-[55vh] lg:h-[70vh] xl:h-[75vh] border rounded-xl panel overflow-hidden shadow-sm">
            <div className="h-10 sm:h-12 border-b panel-header flex items-center justify-between px-2 sm:px-3 text-xs sm:text-sm">
              <div className="font-medium">Learning</div>
              <div className="flex items-center gap-0.5 sm:gap-1 bg-white/60 dark:bg-gray-700/60 rounded-md p-0.5">
                <button onClick={() => setRightTab('quiz')} className={`px-1.5 sm:px-2.5 py-1 rounded text-xs sm:text-sm ${rightTab === 'quiz' ? 'bg-brand-500 text-white shadow' : ''}`}>Quiz</button>
                <button onClick={() => setRightTab('progress')} className={`px-1.5 sm:px-2.5 py-1 rounded text-xs sm:text-sm ${rightTab === 'progress' ? 'bg-brand-500 text-white shadow' : ''}`}>Progress</button>
                <button onClick={() => setRightTab('videos')} className={`px-1.5 sm:px-2.5 py-1 rounded text-xs sm:text-sm ${rightTab === 'videos' ? 'bg-brand-500 text-white shadow' : ''}`}>Videos</button>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {rightTab === 'quiz' && (
                  <button
                    onClick={buildQuizFromSelection}
                    disabled={uploadedFiles.length === 0 || isGenerating}
                    className="px-1.5 sm:px-2.5 py-1 rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs"
                  >
                    {isGenerating ? 'Generating…' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
            <div className="p-2 sm:p-3 h-[calc(100%-2.5rem)] sm:h-[calc(100%-3rem)] overflow-auto">
              {rightTab === 'quiz' ? (
                quizQuestions.length === 0 ? (
                  <div className="text-sm muted">Generate a quiz from your uploaded PDFs.</div>
                ) : (
                  <QuizPanel
                    quizId={quizId}
                    questions={quizQuestions}
                    onRegenerate={buildQuizFromSelection}
                  />
                )
              ) : rightTab === 'videos' ? (
                <VideoRecommendations
                  uploadedFiles={uploadedFiles}
                  selectedFile={selectedFile}
                  isVisible={true}
                />
              ) : (
                <Dashboard />
              )}
            </div>
          </section>
        </div>

        {/* Chat - Full width below when visible */}
        {isChatVisible && (
          <section className="flex-1 min-h-[40vh] border rounded-xl panel overflow-hidden shadow-sm">
            <ChatPanel isVisible={isChatVisible} onToggle={onChatToggle} uploadedFiles={uploadedFiles} />
          </section>
        )}
      </div>
    </>
  )
}

export default MainLayout
