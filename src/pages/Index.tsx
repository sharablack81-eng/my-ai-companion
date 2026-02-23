import { useState, useRef, useEffect, useCallback } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { AgentStatusIndicator } from "@/components/AgentStatusIndicator";
import { EmptyState } from "@/components/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getConversations,
  createConversation,
  deleteConversation,
  updateConversationTitle,
  getMessages,
  saveMessage,
  streamChat,
} from "@/lib/chat-api";
import type { Conversation, Message, AgentStatus } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [browserActions, setBrowserActions] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load conversations on mount
  useEffect(() => {
    getConversations().then(setConversations).catch(console.error);
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId) {
      getMessages(activeConvId).then(setMessages).catch(console.error);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentStatus]);

  const handleNewChat = useCallback(async () => {
    try {
      const conv = await createConversation("New Chat");
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch {
      toast({ title: "Error", description: "Failed to create chat", variant: "destructive" });
    }
  }, [toast]);

  const handleDeleteConv = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConvId === id) {
          setActiveConvId(null);
          setMessages([]);
        }
      } catch {
        toast({ title: "Error", description: "Failed to delete chat", variant: "destructive" });
      }
    },
    [activeConvId, toast]
  );

  const handleSend = useCallback(
    async (text: string) => {
      let convId = activeConvId;

      // Create conversation if needed
      if (!convId) {
        try {
          const conv = await createConversation(text.slice(0, 50));
          setConversations((prev) => [conv, ...prev]);
          convId = conv.id;
          setActiveConvId(conv.id);
        } catch {
          toast({ title: "Error", description: "Failed to create chat", variant: "destructive" });
          return;
        }
      }

      // Save & display user message
      try {
        const userMsg = await saveMessage({
          conversation_id: convId,
          role: "user",
          content: text,
          status: "complete",
        });
        setMessages((prev) => [...prev, userMsg]);
      } catch {
        toast({ title: "Error", description: "Failed to save message", variant: "destructive" });
        return;
      }

      // Update conversation title from first message
      if (messages.length === 0) {
        updateConversationTitle(convId, text.slice(0, 60)).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: text.slice(0, 60) } : c))
        );
      }

      // Stream AI response
      setAgentStatus("thinking");
      const controller = new AbortController();
      abortRef.current = controller;

      let assistantContent = "";
      const tempId = crypto.randomUUID();

      try {
        const chatHistory = [...messages, { role: "user" as const, content: text }].map((m) => ({
          role: m.role as string,
          content: m.content,
        }));

        setAgentStatus("streaming");
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            conversation_id: convId!,
            role: "assistant",
            content: "",
            status: "streaming",
            created_at: new Date().toISOString(),
          },
        ]);

        await streamChat({
          messages: chatHistory,
          onDelta: (chunk) => {
            assistantContent += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, content: assistantContent } : m))
            );
          },
          onDone: () => {},
          signal: controller.signal,
        });

        // Save to DB
        const saved = await saveMessage({
          conversation_id: convId!,
          role: "assistant",
          content: assistantContent,
          status: "complete",
        });
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      } catch (e: any) {
        if (e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, content: assistantContent || "Cancelled.", status: "complete" } : m
            )
          );
        } else {
          toast({
            title: "Error",
            description: e.message || "Failed to get response",
            variant: "destructive",
          });
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } finally {
        setAgentStatus("idle");
        abortRef.current = null;
      }
    },
    [activeConvId, messages, toast]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={setActiveConvId}
        onNew={handleNewChat}
        onDelete={handleDeleteConv}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold text-foreground">Nexus</span>
          </div>
        )}

        {/* Chat area */}
        {!activeConvId && messages.length === 0 ? (
          <EmptyState onStart={handleNewChat} />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto max-w-3xl">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {agentStatus !== "idle" && <AgentStatusIndicator status={agentStatus} />}
            </div>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          onCancel={handleCancel}
          isLoading={agentStatus !== "idle"}
          browserActionsEnabled={browserActions}
          onToggleBrowserActions={() => setBrowserActions(!browserActions)}
        />
      </div>
    </div>
  );
};

export default Index;
