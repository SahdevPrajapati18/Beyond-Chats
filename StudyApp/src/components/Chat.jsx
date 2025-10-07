import React, { useState, useRef, useEffect } from "react";
import { generateRAGResponse, initializeRAGWithFiles } from "../utils/ragSystem";

// Simple SVG icon components
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="12" cy="16" r="1"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ChatPanel = ({ isVisible, onToggle, uploadedFiles = [] }) => {
  const [chats, setChats] = useState([
    { id: 1, title: "Study Session 1", messages: [], lastMessage: "Hello! I'm your virtual teacher..." },
    { id: 2, title: "Math Help", messages: [], lastMessage: "Let's solve that equation together!" }
  ]);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ragInitialized, setRagInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  const currentChat = chats.find(chat => chat.id === currentChatId) || chats[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  // Initialize RAG system when files are uploaded
  useEffect(() => {
    if (uploadedFiles.length > 0 && !ragInitialized) {
      initializeRAGWithFiles(uploadedFiles)
        .then(() => {
          setRagInitialized(true);
        })
        .catch(error => {
          console.error('Error initializing RAG system:', error);
          setRagInitialized(false); // Reset on error
        });
    }
  }, [uploadedFiles, ragInitialized]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentChat) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    // Update current chat with user message
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    );

    setInput("");
    setIsLoading(true);

    try {
      // Use RAG system if files are available
      if (uploadedFiles.length > 0 && ragInitialized) {
        const fileIds = uploadedFiles.map(file => file.id);
        const ragResponse = await generateRAGResponse(input, fileIds);

        if (!currentChat) return; // Check again after async operation

        const aiResponse = {
          id: Date.now() + 1,
          text: ragResponse.response,
          sender: 'assistant',
          timestamp: new Date(),
          citations: ragResponse.citations,
          isRAGResponse: true
        };

        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === currentChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          )
        );
      } else {
        // Fallback to simple response if no files uploaded or RAG not initialized
        if (!currentChat) return; // Check again after async operation

        const aiResponse = {
          id: Date.now() + 1,
          text: `Thank you for your question: "${userMessage.text}". As your virtual teacher, I can help you understand this topic better. Please upload some study materials (PDFs) so I can provide more specific and accurate answers with citations from your documents.`,
          sender: 'assistant',
          timestamp: new Date(),
          isRAGResponse: false
        };

        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === currentChatId
              ? { ...chat, messages: [...chat.messages, aiResponse] }
              : chat
          )
        );
      }
    } catch (error) {
      console.error('Error generating response:', error);

      if (!currentChat) return; // Check again after async operation

      const errorResponse = {
        id: Date.now() + 1,
        text: "I apologize, but I encountered an error while processing your question. Please try again or upload some study materials for better assistance.",
        sender: 'assistant',
        timestamp: new Date(),
        isRAGResponse: false
      };

      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, errorResponse] }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: `Study Session ${chats.length + 1}`,
      messages: [],
      lastMessage: "New conversation started"
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setShowMenu(false);
  };

  const deleteCurrentChat = () => {
    if (chats.length <= 1) return; // Don't delete if it's the only chat

    const newChats = chats.filter(chat => chat.id !== currentChatId);
    setChats(newChats);
    setCurrentChatId(newChats[0]?.id || 1);
    setShowMenu(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Chat List */}
      <aside className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Virtual Teacher</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={createNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon />
              New Chat
            </button>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {!sidebarCollapsed ? (
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setCurrentChatId(chat.id)}
                className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-l-4 ${
                  currentChatId === chat.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-600'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentChatId === chat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                    <MessageIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {chat.lastMessage}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-2 space-y-2">
              {chats.slice(0, 5).map(chat => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setCurrentChatId(chat.id);
                  }}
                  className={`w-full p-2 rounded-lg transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  title={chat.title}
                >
                  <MessageIcon className="w-6 h-6 mx-auto" />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BotIcon className="text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-white">Virtual Teacher</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your AI study companion</p>
              </div>
            </div>

            {/* Close Chat Button */}
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
          {currentChat?.messages.length === 0 && !isLoading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BotIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Hello! I'm your Virtual Teacher
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  I'm here to help you with your studies. Ask me questions about your coursework,
                  get explanations for difficult topics, or request practice problems.
                </p>
              </div>
            </div>
          )}

          {currentChat?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <BotIcon className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                {/* Show citations for RAG responses */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Sources:</div>
                    {msg.citations.map((citation, index) => (
                      <div key={index} className="text-xs text-gray-500 dark:text-gray-400 mb-1 last:mb-0">
                        <span className="font-medium">According to page{citation.pages.length > 1 ? 's' : ''} {citation.pages.join(', ')}:</span>
                        <div className="ml-2 italic">"{citation.snippet}"</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`text-xs mt-2 opacity-70 ${
                  msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <BotIcon className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your virtual teacher anything..."
                className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
