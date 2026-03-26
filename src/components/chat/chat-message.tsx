"use client";

import type { UIMessage } from "ai";
import { Bot, User } from "lucide-react";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  // Extract text content from parts
  const textContent = message.parts
    ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("") || "";

  if (!textContent.trim()) return null;

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? "bg-foreground" : "bg-primary"
      }`}>
        {isUser ? (
          <User size={12} className="text-background" />
        ) : (
          <Bot size={12} className="text-primary-foreground" />
        )}
      </div>
      <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
        isUser
          ? "bg-foreground text-background"
          : "bg-secondary/80 text-foreground"
      }`}>
        <div
          className="text-[12px] leading-relaxed [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:space-y-0.5 [&_code]:bg-black/10 [&_code]:px-1 [&_code]:rounded [&_code]:text-[11px] [&_code]:font-mono-brand"
          dangerouslySetInnerHTML={{
            __html: textContent
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\n- /g, "\n<li>")
              .replace(/\n\d+\. /g, "\n<li>")
              .replace(/`(.*?)`/g, "<code>$1</code>")
              .replace(/\n/g, "<br>"),
          }}
        />
      </div>
    </div>
  );
}
