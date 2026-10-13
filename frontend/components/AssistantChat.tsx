"use client";

import React, { useState } from "react";
import { ChatMessage, streamChatMessage } from "../lib/api";

const SUGGESTED_PROMPTS = [
  "Find a diesel automatic SUV in Delhi under 15 lakh",
  "Compare Swift listings between Mumbai and Delhi",
  "What is the fair asking price of a 2021 Hyundai Creta SX?",
  "Which city offers the lowest total purchase cost for Honda City?",
];

export default function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Namaste! I am the CarX AI Assistant, powered by Google Gemma. I help you find fair used-car deals, estimate statistically backed asking prices, and calculate landed inter-city purchase costs including transport and RTO taxes. How can I help you today?",
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
        <span className="hero-pill">✨ Gemma AI • Server-Side Tool Grounding</span>
        <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>
          Conversational Used-Car Intelligence Advisor
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "4px" }}>
          Ask in plain English. Responses are strictly grounded in validated database searches and machine-learning valuation tools.
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
                marginBottom: "4px",
                opacity: 0.7
              }}>
                {m.role === "assistant" ? "CarX Gemma Advisor" : "You"}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble assistant">
              <span style={{ color: "var(--brand-cyan)" }}>
                ⚡ Executing server tools & querying valuation models...
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
        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            id="chat-input-text"
            className="search-input"
            type="text"
            placeholder="Ask anything (e.g. 'Compare Creta prices in Delhi and Mumbai', 'Find cars under 10 lakh')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            id="chat-submit-btn"
            type="submit"
            className="search-submit-btn"
            disabled={loading || !input.trim()}
          >
            Send 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
