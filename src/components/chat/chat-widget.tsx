"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, MessageCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { ChatPanel } from "./chat-panel";

// Contextual quick suggestions based on current page
function getSuggestions(pathname: string): string[] {
  if (pathname.includes("/orders")) {
    return [
      "What's the status of all orders?",
      "Which orders are unassigned?",
      "Show me orders in production",
    ];
  }
  if (pathname.includes("/production-runs")) {
    return [
      "How many runs are active?",
      "Which runs are ready to ship?",
      "Show tagging progress across all runs",
    ];
  }
  if (pathname.includes("/garments")) {
    return [
      "How many garments are tagged?",
      "What's the tagging rate?",
      "Show recent garment activity",
    ];
  }
  if (pathname.includes("/impact")) {
    return [
      "Summarise impact data across suppliers",
      "How many records are pending review?",
      "Which supplier has the highest emissions?",
    ];
  }
  if (pathname.includes("/overview")) {
    return [
      "Give me a supply chain overview",
      "Which suppliers have the most active runs?",
      "What are our stock levels?",
    ];
  }
  return [
    "What's the status of all orders?",
    "How many production runs are active?",
    "Show me garment tagging progress",
  ];
}

export function ChatWidget() {
  const [chatOpen, setChatOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  // Check if user is admin
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.success) setIsAdmin(d.data.role === "ADMIN"); })
      .catch(() => {});
  }, []);

  if (!isAdmin) return null;

  const suggestions = getSuggestions(pathname);

  return (
    <>
      <AnimatePresence>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} contextSuggestions={suggestions} />}
      </AnimatePresence>

      {/* Glowing ring chat button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 z-30 group"
        title="Supply Chain Guide"
      >
        <div className="relative w-14 h-14 flex items-center justify-center">
          {/* Outer ring — pulsing glow */}
          {!chatOpen && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-[ping_3s_ease-in-out_infinite]" />
              <div className="absolute inset-0 rounded-full border border-primary/20" />
              <div className="absolute inset-1 rounded-full border border-primary/10" />
            </>
          )}
          {/* Inner circle */}
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            chatOpen
              ? "bg-foreground text-background scale-90"
              : "bg-card border-2 border-primary/40 text-primary group-hover:border-primary group-hover:scale-110"
          }`}
            style={!chatOpen ? { boxShadow: "0 0 20px hsl(217 91% 60% / 0.15), 0 0 40px hsl(217 91% 60% / 0.05)" } : undefined}
          >
            {chatOpen ? <X size={16} /> : <MessageCircle size={16} />}
          </div>
        </div>
      </button>
    </>
  );
}
