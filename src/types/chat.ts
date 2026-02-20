export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "thinking" | "browsing" | "reading" | "executing" | "streaming" | "complete" | "error";
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AgentStatus = "idle" | "thinking" | "browsing" | "reading" | "executing" | "streaming";
