import { useState, useRef, useEffect } from 'react'
import { processPdfForRag, searchRelevantChunks, generateCitation } from '../utils/ragSystem'
import { vectorStore } from '../utils/vectorStore'

function Chat({ isVisible, onToggle, uploadedFiles = [] }) {
  const [chats, setChats] = useState([
    {
      id: '1',
      title: 'AI Study Companion',
      messages: [
        {
          id: '1',
          type: 'assistant',
          content: 'Hello! I\'m your AI study companion with RAG capabilities. I can help you understand concepts from your PDFs, explain difficult topics, and provide study guidance. Ask me anything!',
          timestamp: new Date()
        }
      ],
      createdAt: new Date()
    }
  ])

  const [activeChatId, setActiveChatId] = useState('1')
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRagMode, setIsRagMode] = useState(true)
  const [availableDocuments, setAvailableDocuments] = useState([])
  const [isProcessingPdfs, setIsProcessingPdfs] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const activeChat = chats.find(chat => chat.id === activeChatId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeChat?.messages])

  // Process uploaded PDFs for RAG when they change
  useEffect(() => {
    if (uploadedFiles.length > 0 && isRagMode) {
      processPdfsForRag()
    }
  }, [uploadedFiles, isRagMode])

  const processPdfsForRag = async () => {
    if (uploadedFiles.length === 0 || !isRagMode) return

    setIsProcessingPdfs(true)

    try {
      const processedDocs = []

      for (const file of uploadedFiles) {
        try {
          console.log(`Processing ${file.name} for RAG...`)
          const { processPdfForRag } = await import('../utils/ragSystem')
          const document = await processPdfForRag(file.url, file.name)

          if (document && document.chunks.length > 0) {
            const { vectorStore } = await import('../utils/vectorStore')
            vectorStore.addDocument(document)
            processedDocs.push(document)
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error)
        }
      }

      setAvailableDocuments(processedDocs)
      console.log(`Successfully processed ${processedDocs.length} documents for RAG`)

    } catch (error) {
      console.error('Error in RAG processing:', error)
    } finally {
      setIsProcessingPdfs(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    // Add user message to active chat
    const updatedChats = chats.map(chat =>
      chat.id === activeChatId
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    )
    setChats(updatedChats)

    setInputMessage('')
    setIsLoading(true)

    try {
      const messageLower = inputMessage.toLowerCase().trim()

      // Handle conversational inputs differently - works even without RAG
      if (isRagMode && vectorStore.getStats().totalChunks > 0) {
        // Check if it's a conversational input that doesn't need RAG
        const conversationalInputs = [
          'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
          'how are you', 'what\'s up', 'sup', 'yo', 'welcome', 'thanks', 'thank you',
          'please', 'sorry', 'excuse me', 'pardon', 'help', 'assist'
        ]

        const isConversational = conversationalInputs.some(input =>
          messageLower.includes(input)
        ) || messageLower.length < 10

        if (isConversational) {
          // Handle conversational input with friendly response
          const aiResponse = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: getConversationalResponse(inputMessage),
            timestamp: new Date()
          }

          const finalChats = updatedChats.map(chat =>
            chat.id === activeChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          )
          setChats(finalChats)
          setIsLoading(false)
          return
        }

        // Use RAG system for substantive queries
        const relevantChunks = vectorStore.searchSimilar(inputMessage, 3)
        console.log('RAG search results:', relevantChunks)

        if (relevantChunks.length > 0) {
          // Generate RAG response with citations
          const citations = relevantChunks.map(chunk => generateCitation(chunk, inputMessage))
          console.log('Generated citations:', citations)

          let ragResponse = `Based on your documents, here's what I found:\n\n`

          citations.forEach((citation, index) => {
            ragResponse += `**Citation ${index + 1}:** According to p. ${citation.pageNumber} of ${citation.documentName}:\n"${citation.snippet}"\n\n`
          })

          ragResponse += `**Answer:** ${generateRagAnswer(inputMessage, citations)}\n\n*This answer is based on the content of your uploaded documents.*`

          const aiResponse = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: ragResponse,
            timestamp: new Date(),
            citations: citations
          }

          const finalChats = updatedChats.map(chat =>
            chat.id === activeChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          )
          setChats(finalChats)

        } else {
          // No relevant chunks found - provide helpful response
          const aiResponse = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `I couldn't find specific information about "${inputMessage}" in your uploaded documents. You can:\n\n1. Upload more relevant PDFs\n2. Try rephrasing your question\n3. Ask about general study topics\n\nWhat would you like to explore?`,
            timestamp: new Date()
          }

          const finalChats = updatedChats.map(chat =>
            chat.id === activeChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          )
          setChats(finalChats)
        }
      } else {
        // Handle conversational inputs even when RAG is disabled
        const conversationalInputs = [
          'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
          'how are you', 'what\'s up', 'sup', 'yo', 'welcome', 'thanks', 'thank you',
          'please', 'sorry', 'excuse me', 'pardon', 'help', 'assist'
        ]

        const isConversational = conversationalInputs.some(input =>
          messageLower.includes(input)
        ) || messageLower.length < 10

        if (isConversational) {
          const aiResponse = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: getConversationalResponse(inputMessage),
            timestamp: new Date()
          }

          const finalChats = updatedChats.map(chat =>
            chat.id === activeChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          )
          setChats(finalChats)
          setIsLoading(false)
          return
        }

        // Use enhanced demo response for non-RAG mode
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Thank you for your question! I'm here to help you with your studies.

**Demo Response**: This is a demonstration of the AI companion interface. To enable real AI responses:

1. Upload some PDFs and enable RAG mode in the chat settings
2. Add your API keys to the configuration for AI features
3. Get intelligent answers based on your PDF content

For now, I can help with:
- 📚 Study tips and techniques
- 🔍 Concept explanations
- 📝 Practice problem guidance
- 💡 Learning strategies

What would you like to explore?`,
          timestamp: new Date()
        }

        const finalChats = updatedChats.map(chat =>
          chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, aiResponse] }
          : chat
        )
        setChats(finalChats)
      }
    } catch (error) {
      console.error('Error generating response:', error)

      const errorResponse = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error while processing your question. Please try again or check if your documents are properly uploaded.`,
        timestamp: new Date()
      }

      const finalChats = updatedChats.map(chat =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, errorResponse] }
          : chat
      )
      setChats(finalChats)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate conversational responses for greetings and simple inputs
  const getConversationalResponse = (message) => {
    const msgLower = message.toLowerCase()

    if (msgLower.includes('hi') || msgLower.includes('hello') || msgLower.includes('hey')) {
      return `Hello! 👋 I'm your AI study companion. I can help you understand concepts from your PDFs, explain difficult topics, and provide study guidance. What would you like to learn about today?`
    }

    if (msgLower.includes('how are you') || msgLower.includes('what\'s up')) {
      return `I'm doing great, thank you for asking! I'm here and ready to help you with your studies. Do you have any questions about your uploaded PDFs or need help with any concepts?`
    }

    if (msgLower.includes('thank') || msgLower.includes('thanks')) {
      return `You're very welcome! I'm glad I could help. Feel free to ask me anything else about your studies or PDFs. I'm here to support your learning journey!`
    }

    if (msgLower.includes('help')) {
      return `I'm here to help! I can:\n\n• Answer questions about your uploaded PDFs\n• Explain concepts and provide citations\n• Help with study strategies and techniques\n• Clarify difficult topics\n\nWhat specific help do you need?`
    }

    // Default conversational response
    return `I understand you're looking for assistance! I'm your AI study companion with access to your uploaded PDFs. I can help explain concepts, answer questions, and provide study guidance. What would you like to explore?`
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
  }

  if (!isVisible) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">AI Companion</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click the chat button to start</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="font-medium text-gray-900 dark:text-white">AI Study Companion</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* RAG Mode Toggle */}
          <button
            onClick={() => setIsRagMode(!isRagMode)}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              isRagMode
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isRagMode ? 'RAG mode enabled' : 'RAG mode disabled'}
          >
            {isRagMode ? 'RAG' : 'Demo'}
          </button>

          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* RAG Status */}
      {isRagMode && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 dark:text-blue-300">
              RAG Mode: {vectorStore.getStats().totalChunks > 0 ? `${vectorStore.getStats().totalChunks} chunks ready` : 'Processing PDFs...'}
            </span>
            {isProcessingPdfs && (
              <div className="flex items-center gap-1 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <span className="text-xs">Processing</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeChat?.messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
            >
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
              <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isRagMode ? 'Searching documents...' : 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRagMode ? "Ask me anything about your uploaded PDFs..." : "Ask me anything about your studies..."}
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            rows={1}
            style={{ minHeight: '36px', maxHeight: '80px' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        {isRagMode && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            RAG Mode: Answers will include citations from your PDFs
          </p>
        )}
      </div>
    </div>
  )
}

export default Chat
