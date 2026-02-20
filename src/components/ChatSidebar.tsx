import { Conversation } from "@/types/chat";
import { Plus, MessageSquare, Trash2, Cpu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const isMobile = useIsMobile();

  const handleSelect = (id: string) => {
    onSelect(id);
    if (isMobile) onToggle();
  };

  // Collapsed icon bar (desktop only)
  if (!isOpen && !isMobile) {
    return (
      <div className="flex flex-col items-center py-4 px-2 border-r border-border bg-sidebar w-14 shrink-0">
        <Button variant="ghost" size="icon" onClick={onToggle} className="mb-4 text-sidebar-foreground hover:text-foreground">
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNew} className="text-primary hover:bg-accent">
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  // On mobile: full-screen overlay. On desktop: fixed sidebar.
  const sidebarContent = (
    <div className={`flex flex-col bg-sidebar shrink-0 h-full ${
      isMobile ? "w-full" : "w-72 border-r border-border"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground tracking-tight">Nexus</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-sidebar-foreground hover:text-foreground">
          {isMobile ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        </Button>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <Button
          onClick={() => { onNew(); if (isMobile) onToggle(); }}
          className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="px-3 pb-3 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={`group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors text-sm ${
                activeId === conv.id
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{conv.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 ${
                  isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {conversations.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No conversations yet</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (isMobile && isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onToggle} />
        {/* Sidebar panel */}
        <div className="relative z-10 w-[85%] max-w-sm h-full animate-slide-in">
          {sidebarContent}
        </div>
      </div>
    );
  }

  if (isMobile && !isOpen) return null;

  return sidebarContent;
}
