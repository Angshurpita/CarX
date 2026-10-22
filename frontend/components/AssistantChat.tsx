"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, streamChatMessage } from "../lib/api";

// Helper to safely render markdown with clickable links and bold text
function renderFormattedMessage(content: string) {
  const lines = content.split("\n");
  return lines.map((line, lineIdx) => {
    // Process markdown link syntax [text](url)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      const anchorText = match[1];
      const anchorUrl = match[2];
      parts.push(
        <a
          key={`link-${lineIdx}-${match.index}`}
          href={anchorUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--liquid-blue)",
            textDecoration: "underline",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {anchorText}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    // Now format bold text inside string fragments
    const formattedParts = parts.map((part, pIdx) => {
      if (typeof part !== "string") return part;
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((sub, sIdx) => {
        if (sub.startsWith("**") && sub.endsWith("**")) {
          return (
            <strong key={`b-${pIdx}-${sIdx}`} style={{ fontWeight: 700 }}>
              {sub.slice(2, -2)}
            </strong>
          );
        }
        return sub;
      });
    });

    return (
      <div key={lineIdx} style={{ minHeight: "1.2em", marginBottom: line === "" ? "8px" : "2px" }}>
        {formattedParts}
      </div>
    );
  });
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  recentTools?: any[];
}

const MAX_SESSIONS = 20;
const SESSIONS_STORAGE_KEY = "carx_ai_chat_sessions_v2";
const ACTIVE_SESSION_STORAGE_KEY = "carx_ai_active_session_id_v2";
const OLD_CHAT_STORAGE_KEY = "carx_ai_chat_history_v1";

const DEFAULT_WELCOME_MSG: ChatMessage = {
  role: "assistant",
  content:
    "Welcome to CarX Automotive Intelligence Advisor. I can search verified used-car listings, evaluate machine-learning fair market prices, analyze inter-city transport logistics, and pull market benchmarks across CarWale, Spinny, Cars24, and CarDekho in India. How can I assist you with your car search?",
};

function createNewSession(title = "New Automotive Inquiry"): ChatSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [DEFAULT_WELCOME_MSG],
    recentTools: [],
  };
}

function deriveSessionTitle(text: string): string {
  const cleaned = text.trim().replace(/[\r\n]+/g, " ");
  if (!cleaned) return "New Inquiry";
  if (cleaned.length <= 34) return cleaned;
  return cleaned.substring(0, 34).trim() + "...";
}

function formatSessionDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function AssistantChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([createNewSession()]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const isLoadedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from localStorage on mount (ChatGPT-style history)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loadedSessions = parsed.slice(0, MAX_SESSIONS);
          setSessions(loadedSessions);

          const savedActiveId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
          if (savedActiveId && loadedSessions.some((s) => s.id === savedActiveId)) {
            setActiveSessionId(savedActiveId);
          } else {
            setActiveSessionId(loadedSessions[0].id);
          }
          isLoadedRef.current = true;
          return;
        }
      }

      // Check migration from old single-thread history
      const oldHistory = localStorage.getItem(OLD_CHAT_STORAGE_KEY);
      if (oldHistory) {
        const parsedOld: ChatMessage[] = JSON.parse(oldHistory);
        if (Array.isArray(parsedOld) && parsedOld.length > 0) {
          const firstUserMsg = parsedOld.find((m) => m.role === "user");
          const migratedTitle = firstUserMsg ? deriveSessionTitle(firstUserMsg.content) : "Recent Inquiry";
          const migratedSession: ChatSession = {
            id: `session_migrated_${Date.now()}`,
            title: migratedTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: parsedOld,
            recentTools: [],
          };
          setSessions([migratedSession]);
          setActiveSessionId(migratedSession.id);
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([migratedSession]));
          isLoadedRef.current = true;
          return;
        }
      }

      // Default new session
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([fresh]));
    } catch (e) {
      console.warn("Failed to load chat sessions from localStorage", e);
    } finally {
      isLoadedRef.current = true;
    }
  }, []);

  // Save sessions whenever state changes
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
    } catch (e) {
      console.warn("Failed to save chat sessions to localStorage", e);
    }
  }, [sessions]);

  // Save activeSessionId whenever updated
  useEffect(() => {
    if (!isLoadedRef.current || !activeSessionId) return;
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    } catch (e) {
      console.warn("Failed to save activeSessionId to localStorage", e);
    }
  }, [activeSessionId]);

  // Determine active session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || createNewSession();

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, loading]);

  const saveSessionsToStorage = (updatedSessions: ChatSession[], newActiveId?: string) => {
    try {
      const trimmed = updatedSessions.slice(0, MAX_SESSIONS);
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(trimmed));
      if (newActiveId) {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, newActiveId);
      }
    } catch (e) {
      console.warn("Failed to save chat sessions to localStorage", e);
    }
  };

  const handleNewChat = () => {
    // If active session is already fresh with no user messages, don't create duplicate
    if (activeSession.messages.length === 1 && activeSession.title === "New Automotive Inquiry") {
      setSidebarOpen(false);
      return;
    }

    const newS = createNewSession();
    const updated = [newS, ...sessions].slice(0, MAX_SESSIONS);
    setSessions(updated);
    setActiveSessionId(newS.id);
    setSidebarOpen(false);
    saveSessionsToStorage(updated, newS.id);
  };

  const handleSelectSession = (s: ChatSession) => {
    setActiveSessionId(s.id);
    setSidebarOpen(false);
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, s.id);
    } catch (e) {
      console.warn("Failed to update active session", e);
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      saveSessionsToStorage([fresh], fresh.id);
    } else {
      setSessions(remaining);
      const nextActiveId = activeSessionId === sessionId ? remaining[0].id : activeSessionId;
      setActiveSessionId(nextActiveId);
      saveSessionsToStorage(remaining, nextActiveId);
    }
  };

  const handleClearAllSessions = () => {
    const fresh = createNewSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    try {
      localStorage.removeItem(SESSIONS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      localStorage.removeItem(OLD_CHAT_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear chat storage", e);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const initialAssistantMsg: ChatMessage = { role: "assistant", content: "" };

    // Update title on first user turn
    const isFirstUserTurn = activeSession.messages.filter((m) => m.role === "user").length === 0;
    const updatedTitle = isFirstUserTurn ? deriveSessionTitle(text) : activeSession.title;

    const currentMessages = activeSession.messages;
    const newMessages: ChatMessage[] = [...currentMessages, userMsg];

    // Optimistically update active session with user message and placeholder assistant message
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: updatedTitle,
          updatedAt: Date.now(),
          messages: [...newMessages, initialAssistantMsg],
          recentTools: [],
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInput("");
    setLoading(true);

    let accumulatedContent = "";
    let capturedTools: any[] = [];

    try {
      await streamChatMessage(
        newMessages,
        (token) => {
          accumulatedContent += token;
          const textSnapshot = accumulatedContent;
          setSessions((prevSessions) =>
            prevSessions.map((s) => {
              if (s.id === activeSession.id) {
                const prevMsgs = s.messages;
                if (prevMsgs.length === 0) return s;
                const last = prevMsgs[prevMsgs.length - 1];
                if (last && last.role === "assistant") {
                  return {
                    ...s,
                    messages: [...prevMsgs.slice(0, -1), { ...last, content: textSnapshot }],
                  };
                }
              }
              return s;
            })
          );
        },
        (tool) => {
          capturedTools = [...capturedTools, tool];
          setSessions((prevSessions) =>
            prevSessions.map((s) => {
              if (s.id === activeSession.id) {
                const tools = s.recentTools || [];
                const isDup = tools.some(
                  (t) => t.name === tool.name && JSON.stringify(t.arguments) === JSON.stringify(tool.arguments)
                );
                if (!isDup) {
                  return { ...s, recentTools: [...tools, tool] };
                }
              }
              return s;
            })
          );
        },
        () => {
          setLoading(false);
          const finalAssistantMsg: ChatMessage = { role: "assistant", content: accumulatedContent };
          setSessions((prevSessions) => {
            const finalSessions = prevSessions.map((s) => {
              if (s.id === activeSession.id) {
                return {
                  ...s,
                  title: updatedTitle,
                  updatedAt: Date.now(),
                  messages: [...newMessages, finalAssistantMsg],
                  recentTools: capturedTools,
                };
              }
              return s;
            });

            // Move the recently updated session to top
            const updatedActive = finalSessions.find((s) => s.id === activeSession.id);
            const others = finalSessions.filter((s) => s.id !== activeSession.id);
            const ordered = updatedActive ? [updatedActive, ...others] : finalSessions;

            saveSessionsToStorage(ordered, activeSession.id);
            return ordered;
          });
        }
      );
    } catch {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content:
          "Encountered a connection delay with the assistant service. Please verify that the backend server is active.",
      };
      setSessions((prevSessions) => {
        const finalSessions = prevSessions.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              title: updatedTitle,
              updatedAt: Date.now(),
              messages: [...newMessages, errorMsg],
            };
          }
          return s;
        });
        saveSessionsToStorage(finalSessions, activeSession.id);
        return finalSessions;
      });
      setLoading(false);
    }
  };

  const currentTools = activeSession.recentTools || [];

  return (
    <div style={{ maxWidth: "1120px", margin: "0 auto 60px auto" }}>
      {/* Liquid Glass Header Banner with Custom Generated 3D AI Advisor Graphic */}
      <div className="section-feature-banner">
        <div className="banner-grid">
          <div className="banner-content">
            <span className="hero-pill">Automotive AI Intelligence Advisor</span>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: "8px", lineHeight: 1.2 }}>
              Conversational Used-Car Advisor
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "12px", lineHeight: 1.6 }}>
              Query the catalog in natural language for verified listings, statistical valuation checks, cross-city arbitrage, and direct links to live CarWale and Cars24 portals.
            </p>
          </div>
          <div className="banner-image-wrapper">
            <img
              src="/assets/ai_advisor_core.jpg"
              alt="AI Automotive Advisor Core"
              className="banner-custom-image"
            />
            <div className="banner-image-overlay" />
          </div>
        </div>
      </div>

      {/* ChatGPT-Style Chat Workspace */}
      <div className="glass-panel chat-workspace">
        {/* Left Sidebar: Previous Conversations History (up to 20) */}
        <aside className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="chat-sidebar-header">
            <button
              id="new-chat-btn"
              type="button"
              className="chat-new-btn"
              onClick={handleNewChat}
              title="Start a new chat thread"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ New Chat</span>
            </button>

            <div className="chat-sidebar-title-row">
              <span>Chat History</span>
              <span className="chat-sidebar-badge">
                {sessions.length}/{MAX_SESSIONS}
              </span>
            </div>
          </div>

          {/* Session Threads List */}
          <div className="chat-sessions-list">
            {sessions.map((s) => {
              const isActive = s.id === activeSession.id;
              return (
                <div
                  key={s.id}
                  className={`chat-session-item ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectSession(s)}
                  title={s.title}
                >
                  <div className="chat-session-content">
                    <span className="chat-session-title">{s.title}</span>
                    <span className="chat-session-date">
                      {formatSessionDate(s.updatedAt || s.createdAt)} • {s.messages.length} msg{s.messages.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      type="button"
                      className="chat-session-delete"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      title="Delete chat thread"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="chat-sidebar-footer">
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
              Max {MAX_SESSIONS} chats saved
            </span>
            {sessions.length > 1 && (
              <button
                type="button"
                className="chat-clear-btn"
                onClick={handleClearAllSessions}
                title="Clear all stored chat history"
              >
                Clear All
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Chat Area */}
        <div className="chat-main-area">
          {/* Main Chat Header */}
          <div className="chat-main-header">
            <div className="chat-main-header-left">
              <button
                type="button"
                className="chat-sidebar-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title="Toggle history sidebar"
              >
                💬 History ({sessions.length})
              </button>
              <div>
                <div className="chat-active-title">{activeSession.title}</div>
                <div className="chat-active-count">
                  {activeSession.messages.length} message{activeSession.messages.length === 1 ? "" : "s"} in this thread
                </div>
              </div>
            </div>

            <button
              id="new-inquiry-btn"
              type="button"
              className="liquid-btn-secondary"
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={handleNewChat}
              title="Start a new chat thread"
            >
              + New Chat
            </button>
          </div>

          {/* Quick Suggestions (when starting fresh) */}
          {activeSession.messages.length === 1 && (
            <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid var(--border-glass)" }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>
                QUICK PROMPT SUGGESTIONS:
              </div>
              <div className="chat-quick-suggestions" style={{ marginTop: 0 }}>
                {[
                  "Find Mahindra Thar in Delhi under ₹15 Lakh",
                  "Estimate fair price of 2022 Hyundai Creta in Mumbai",
                  "Compare Toyota Fortuner deals between Delhi and Mumbai",
                  "Show me automatic luxury cars in Bengaluru",
                ].map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    className="chat-suggestion-chip"
                    onClick={() => handleSend(suggestion)}
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {activeSession.messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble ${m.role}`}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                    color: m.role === "assistant" ? "var(--liquid-blue)" : "var(--text-muted)",
                    fontWeight: 700,
                  }}
                >
                  {m.role === "assistant" ? "CarX Intelligence Advisor" : "You"}
                </div>
                <div>{renderFormattedMessage(m.content)}</div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble assistant">
                <span style={{ color: "var(--liquid-blue)" }}>
                  Executing valuation models and querying automotive indexes...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Tool Provenance */}
          {currentTools.length > 0 && (
            <div
              style={{
                background: "#f8fafc",
                borderTop: "1px solid var(--border-glass)",
                padding: "10px 20px",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 600 }}>Tools Executed:</span>
              {currentTools.map((t, idx) => (
                <span
                  key={idx}
                  style={{
                    background: "rgba(37, 99, 235, 0.08)",
                    color: "var(--liquid-blue)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-xs)",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    border: "1px solid rgba(37, 99, 235, 0.2)",
                  }}
                >
                  {t.name}()
                </span>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="chat-input-bar"
          >
            <input
              id="assistant-chat-input"
              className="chat-input"
              type="text"
              placeholder="Ask about prices, models, cities, or car specs..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              id="assistant-chat-send-btn"
              type="submit"
              className="liquid-btn-primary"
              disabled={loading || !input.trim()}
            >
              {loading ? "Processing..." : "Ask Advisor"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
