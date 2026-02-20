import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Message } from "@/types/chat";

export async function getConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Conversation[];
}

export async function createConversation(title = "New Chat"): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title })
    .select()
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase.from("conversations").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function saveMessage(msg: {
  conversation_id: string;
  role: string;
  content: string;
  status?: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert(msg)
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  signal,
}: {
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  const response = await resp.json();
  const content = response.content[0].text;
  onDelta(content);
  onDone();
}
