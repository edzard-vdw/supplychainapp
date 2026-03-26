"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { ChatMessage } from "./chat-message";

interface ChatPanelProps {
  onClose: () => void;
  contextSuggestions?: string[];
}

export function ChatPanel({ onClose, contextSuggestions }: ChatPanelProps) {
  const { messages, sendMessage, status, error } = useChat();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  function handleQuickQuestion(q: string) {
    if (isLoading) return;
    sendMessage({ text: q });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="fixed bottom-24 right-6 z-40 w-[400px] h-[540px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <MessageCircle size={14} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Supply Chain Guide</h3>
            <p className="text-[10px] text-muted-foreground font-mono-brand">Ask about orders, runs & garments</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <MessageCircle size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Ask me anything</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              I can look up orders, check production run status, trace garments, and report on supplier impact data.
            </p>
            <div className="mt-4 space-y-1.5 w-full">
              {(contextSuggestions || [
                "What's the status of all orders?",
                "How many production runs are active?",
                "Show me garment tagging progress",
              ]).map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuickQuestion(q)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-secondary/50 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  &ldquo;{q}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[11px] font-mono-brand">Checking supply chain data…</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-[11px] text-destructive">
            {error.message.includes("API key")
              ? "Anthropic API key not configured. Add CHAT_ANTHROPIC_API_KEY to .env.local"
              : `Error: ${error.message || "Please try again."}`}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your supply chain…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
