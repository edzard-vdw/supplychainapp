import { streamText, stepCountIs, convertToModelMessages, UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getSession } from "@/lib/session";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { aiTools } from "@/lib/ai/tools";

function normalizeUIMessages(raw: Array<Record<string, unknown>>): UIMessage[] {
  return raw.map((msg) => {
    const role = msg.role as UIMessage["role"];
    const content = (msg.content as string) || "";
    const id = (msg.id as string) || crypto.randomUUID();
    if (Array.isArray(msg.parts) && msg.parts.length > 0) {
      return { ...msg, id, role, content } as unknown as UIMessage;
    }
    return { ...msg, id, role, content, parts: [{ type: "text" as const, text: content }] } as unknown as UIMessage;
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return new Response("Unauthorized — admin only", { status: 401 });
    }

    const apiKey = process.env.CHAT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured. Add CHAT_ANTHROPIC_API_KEY to .env.local" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    const uiMessages = normalizeUIMessages(messages);
    const modelMessages = await convertToModelMessages(uiMessages, { tools: aiTools });

    const anthropic = createAnthropic({ apiKey, baseURL: "https://api.anthropic.com/v1" });

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: aiTools,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    console.error("[chat] Error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
