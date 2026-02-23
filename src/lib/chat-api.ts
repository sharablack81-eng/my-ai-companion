import { supabase } from "@/integrations/supabase/client";
import type { Message, Conversation } from "@/types/chat";

// --- Core Chat Streaming via Edge Function ---

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function streamChat(options: {
  messages: { role: string; content: string }[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  signal: AbortSignal;
  browserActions?: boolean;
}): Promise<void> {
  const { messages, onDelta, onDone, signal, browserActions } = options;

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, browserActions }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Chat failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;

      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}

// --- Conversation Management (Supabase) ---

export async function getConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Conversation[];
}

export async function createConversation(title?: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title || "New Chat" })
    .select()
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function deleteConversation(id: string): Promise<boolean> {
  // Delete messages first, then conversation
  await supabase.from("messages").delete().eq("conversation_id", id);
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Message[];
}

export async function saveMessage(
  message: Omit<Message, "id" | "created_at">
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: message.conversation_id,
      role: message.role,
      content: message.content,
      status: message.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function updateConversationTitle(
  id: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", id);
  if (error) throw error;
}
