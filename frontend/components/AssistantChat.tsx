"use client";

import React, { useState } from "react";
import { ChatMessage, streamChatMessage } from "../lib/api";

const SUGGESTED_PROMPTS = [
  "Find a diesel automatic SUV in Delhi under 25 lakh",
  "What is the fair asking price of a 2023 Mahindra Thar in Mumbai?",
  "Find me a Toyota Fortuner in Bengaluru",
  "Compare XUV700 between Delhi and Mumbai",
  "Show live CarWale market prices for Tata Safari",
];

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
            color: "var(--brand-cyan)",
            textDecoration: "underline",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {anchorText} ↗
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
            <strong key={`b-${pIdx}-${sIdx}`} style={{ color: "#fff", fontWeight: 700 }}>
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

export default function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Namaste! I am the CarX AI Assistant. I search active used-car listings, compute machine-learning fair asking prices, compare cross-city logistics (carrier freight + RTO taxes), and fetch real-time market data directly from CarWale, CarDekho, Spinny, and Cars24 across India. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentTools, setRecentTools] = useState<any[]>([]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const initialAssistantMsg: ChatMessage = { role: "assistant", content: "" };
    const newMessages: ChatMessage[] = [...messages, userMsg];

    setMessages([...newMessages, initialAssistantMsg]);
    setInput("");
    setLoading(true);

    try {
      await streamChatMessage(
        newMessages,
        (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              last.content += token;
            }
            return [...updated];
          });
        },
        (tool) => {
          setRecentTools((prev) => [...prev, tool]);
        },
        () => {
          setLoading(false);
        },
      );
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Sorry, I encountered an error connecting to the assistant service. Please check that the backend is active.",
        },
      ]);
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "32px", maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <span className="hero-pill">✨ Live AI • Tool Grounding • Verified Portal Feeds</span>
        <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>
          Conversational Used-Car Intelligence Advisor
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "4px" }}>
          Ask in plain English. Responses are grounded in live database inventory, machine-learning valuations, and direct portal links (CarWale, Spinny, Cars24).
        </p>
      </div>

      {/* Suggested prompts */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginBottom: "20px" }}>
        {SUGGESTED_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            className="tag-btn"
            onClick={() => handleSend(p)}
            disabled={loading}
          >
            💬 {p}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="glass-panel chat-container" style={{ borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role}`}>
              <div style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "6px",
                opacity: 0.7
              }}>
                {m.role === "assistant" ? "CarX AI Intelligence Advisor" : "You"}
              </div>
              <div>{renderFormattedMessage(m.content)}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble assistant">
              <span style={{ color: "var(--brand-cyan)" }}>
                ⚡ Querying live automotive tools & executing valuation models...
              </span>
            </div>
          )}
        </div>

        {/* Tool Execution Provenance Bar */}
        {recentTools.length > 0 && (
          <div style={{
            background: "rgba(6, 9, 14, 0.9)",
            borderTop: "1px solid var(--border-subtle)",
            padding: "10px 24px",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap"
          }}>
            <span>Validated Server Tools Executed:</span>
            {recentTools.map((t, idx) => (
              <span key={idx} className="chat-tool-call">
                ⚙️ {t.name}({JSON.stringify(t.arguments || {})})
              </span>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="chat-input-bar">
          <input
            id="assistant-chat-input"
            className="chat-input"
            type="text"
            placeholder="e.g. Find me a 2022 Toyota Fortuner in Mumbai, or calculate fair price for Thar..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            id="assistant-chat-send-btn"
            type="submit"
            className="search-submit-btn"
            disabled={loading || !input.trim()}
          >
            {loading ? "..." : "Send 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}
