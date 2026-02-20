import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/types/chat";
import { User, Bot } from "lucide-react";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 px-4 py-4 animate-slide-in ${isUser ? "" : "bg-chat-assistant"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-chat-user text-chat-user-foreground" : "bg-primary/10 text-primary"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <p className={`text-xs font-medium mb-1 ${isUser ? "text-primary" : "text-muted-foreground"}`}>
          {isUser ? "You" : "Nexus"}
        </p>
        {isUser ? (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-chat-assistant-foreground 
            prose-headings:text-foreground prose-strong:text-foreground 
            prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-mono
            prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || "..."}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
