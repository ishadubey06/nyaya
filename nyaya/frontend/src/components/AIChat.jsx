import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Info, ArrowLeft, Plus, History, MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { saveCase, getCase, getChatHistory, saveChatSession, getChatSession, deleteChatSession, getAdviceAuthHeaders } from '../utils/storage';
import VoiceMicButton from './VoiceMicButton';

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'ai',
    text: "Hello. I'm Nyaya AI. I can help you understand your rights and figure out your next steps. What situation are you dealing with today?"
  }
];

export default function AIChat({ onNavigate, initialQuery, autoSend, initialGreeting, caseId, clearQuery, userPersona, user }) {
  const getUserName = (user) => {
    if (!user) return '';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name.split(' ')[0];
    if (user.user_metadata?.name) return user.user_metadata.name.split(' ')[0];
    if (user.email) return user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1);
    return '';
  };

  const userName = getUserName(user);
  const defaultGreeting = userName 
    ? `Hey ${userName}, I'm Nyaya AI. How can I help you today?`
    : "Hello. I'm Nyaya AI. I can help you understand your rights and figure out your next steps. What situation are you dealing with today?";

  const customInitialMessage = initialGreeting ? {
    id: 1,
    sender: 'ai',
    text: initialGreeting
  } : {
    id: 1,
    sender: 'ai',
    text: defaultGreeting
  };

  const [messages, setMessages] = useState([customInitialMessage]);
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentCaseId, setCurrentCaseId] = useState(caseId || null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const hasFiredRef = useRef(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load chat history list
  useEffect(() => {
    const fetchHistory = async () => {
      const history = await getChatHistory();
      setChatHistory(history);
    };
    fetchHistory();
  }, []);

  // Load case if caseId is provided
  useEffect(() => {
    if (caseId) {
      const fetchCaseData = async () => {
        const savedCase = await getCase(caseId);
        if (savedCase && savedCase.data) {
          setMessages(savedCase.data);
          setCurrentCaseId(caseId);
          hasFiredRef.current = true; // Prevent initial query firing if loading old case
        }
      };
      fetchCaseData();
    }
  }, [caseId]);

  // Save case whenever messages change (if there are user messages)
  useEffect(() => {
    const saveData = async () => {
      const userMessages = messages.filter(m => m.sender === 'user');
      if (userMessages.length > 0) {
        const id = currentCaseId || `chat-${Date.now()}`;
        if (!currentCaseId) setCurrentCaseId(id);
        
        const title = userMessages[0].text.substring(0, 40) + (userMessages[0].text.length > 40 ? '...' : '');
        const lastMsg = messages[messages.length - 1].text;
        const snippet = lastMsg.substring(0, 60) + (lastMsg.length > 60 ? '...' : '');
        
        await saveCase({
          id,
          title,
          category: 'Legal Advice',
          status: 'In Draft',
          statusColor: 'var(--color-warning)',
          type: 'Chat Session',
          snippet,
          data: messages
        });

        // Also save to chat history
        const sessionId = currentSessionId || id;
        if (!currentSessionId) setCurrentSessionId(sessionId);
        
        await saveChatSession({
          id: sessionId,
          title,
          snippet,
          messageCount: messages.length,
          messages: messages,
        });

        // Refresh history list
        const history = await getChatHistory();
        setChatHistory(history);
      }
    };
    saveData();
  }, [messages, currentCaseId, currentSessionId]);

  const handleSend = async (textOverride) => {
    // If called from an event handler, textOverride might be an event object.
    const textToSend = typeof textOverride === 'string' ? textOverride : input;
    if (!textToSend.trim()) return;
    
    const userMsg = { id: Date.now(), sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = textToSend;
    setInput('');
    
    // Add a loading message
    const loadingId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: loadingId, sender: 'ai', text: "Analyzing your story and searching legal databases...", isLoading: true }]);

    try {
      const authHeaders = await getAdviceAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/advice`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ 
          story: currentInput,
          history: messages.map(m => ({ role: m.sender, content: m.text })),
          persona: userPersona
        })
      });
      
      const result = await response.json();
      
      // Remove loading message
      setMessages((prev) => prev.filter(msg => msg.id !== loadingId));

      if (result.success && result.data) {
        const data = result.data;
        
        // Combine Advice and Action Plan into a single message
        const combinedText = data.action_plan 
          ? `${data.advice}\n\n---\n\n**Action Plan:**\n${data.action_plan}`
          : data.advice;

        const aiMsg = { 
          id: Date.now() + 2, 
          sender: 'ai', 
          text: combinedText,
          citation: `Category: ${data.category} | ${data.kanoon_results?.length ? 'Found relevant cases' : 'No cases found'}`
        };
        const newMessages = [aiMsg];

        // Append the RTI Add-on Draft if eligible
        if (data.rti_addon?.needs_rti) {
          newMessages.push({
            id: Date.now() + 3,
            sender: 'ai',
            text: `**RTI Drafting Add-on:** It looks like your issue is with a government/public body (${data.rti_addon.department || 'the department'}). You are eligible to file an RTI application. Here is a draft you can use:\n\n---\n\n${data.rti_addon.rti_draft}`
          });
        }

        setMessages((prev) => [...prev, ...newMessages]);
      } else {
        throw new Error(result.error || "Failed to get advice");
      }
    } catch (error) {
      setMessages((prev) => prev.filter(msg => msg.id !== loadingId));
      setMessages((prev) => [...prev, { id: Date.now() + 4, sender: 'ai', text: `Sorry, an error occurred: ${error.message}` }]);
    }
  };

  useEffect(() => {
    if ((initialQuery || initialGreeting) && !hasFiredRef.current) {
      hasFiredRef.current = true;
      if (initialQuery && autoSend) {
        handleSend(initialQuery);
      } else if (initialQuery) {
        setInput(initialQuery);
      }
      if (clearQuery) clearQuery();
    }
  }, [initialQuery, initialGreeting, autoSend]);

  // Start a new chat session
  const handleNewChat = () => {
    setMessages([{
      id: 1,
      sender: 'ai',
      text: defaultGreeting
    }]);
    setInput('');
    setCurrentCaseId(null);
    setCurrentSessionId(null);
    hasFiredRef.current = true; // prevent re-firing initial query
  };

  // Load a past chat session
  const handleLoadSession = async (sessionId) => {
    const session = await getChatSession(sessionId);
    if (session && session.messages) {
      setMessages(session.messages);
      setCurrentSessionId(session.id);
      setCurrentCaseId(session.id);
      hasFiredRef.current = true;
      setIsHistoryOpen(false);
    }
  };

  // Delete a chat session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    await deleteChatSession(sessionId);
    const history = await getChatHistory();
    setChatHistory(history);
    // If we deleted the current session, start a new chat
    if (sessionId === currentSessionId) {
      handleNewChat();
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffInSeconds = Math.floor((new Date() - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="chat-layout">
      {/* Chat History Sidebar */}
      <aside className={`chat-history-panel ${isHistoryOpen ? 'open' : ''}`}>
        <div className="chat-history-header">
          <h3><History size={16} /> Chat History</h3>
          <button className="chat-history-close" onClick={() => setIsHistoryOpen(false)} title="Close history">
            <ChevronLeft size={18} />
          </button>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={16} /> New Chat
        </button>
        <div className="chat-history-list">
          {chatHistory.length === 0 ? (
            <div className="chat-history-empty">
              <MessageSquare size={24} />
              <p>No previous chats yet</p>
            </div>
          ) : (
            chatHistory.map((session) => (
              <div
                key={session.id}
                className={`chat-history-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => handleLoadSession(session.id)}
              >
                <div className="chat-history-item-content">
                  <div className="chat-history-item-title">{session.title}</div>
                  <div className="chat-history-item-meta">
                    <span>{session.messageCount || session.messages?.length || 0} msgs</span>
                    <span>•</span>
                    <span>{formatTimeAgo(session.updatedAt)}</span>
                  </div>
                </div>
                <button
                  className="chat-history-delete"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  title="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="chat-container">
        {/* Back Button Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <button onClick={() => onNavigate('home')} style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', flex: 1 }}>AI Legal Assistant</h2>
          <button
            className={`chat-history-toggle ${isHistoryOpen ? 'active' : ''}`}
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            title="Chat History"
          >
            <History size={20} />
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <div className={`message ${msg.sender}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              
              {msg.citation && (
                <div className="source-citation" style={{ alignSelf: 'flex-start', marginLeft: '4px' }}>
                  <Info size={12} />
                  {msg.citation}
                </div>
              )}
              
              {msg.isAction && (
                <div style={{ alignSelf: 'flex-start', marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                    <FileText size={16} /> Yes, draft notice
                  </button>
                  <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                    Not right now
                  </button>
                </div>
              )}
            </div>
          ))}
          {/* Sentinel element for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input-area" style={{ position: 'relative' }}>
          {interimTranscript && (
            <div className="voice-interim-badge">
              🎤 {interimTranscript}
            </div>
          )}
          <textarea 
            placeholder="Type your message here in plain language..." 
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <VoiceMicButton
            onInterim={(text) => setInterimTranscript(text)}
            onFinal={(text) => {
              setInterimTranscript('');
              setInput((prev) => (prev.trim() ? prev + ' ' + text : text));
            }}
          />
          <button className="send-btn" onClick={handleSend}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
