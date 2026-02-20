import { useState, useRef, useEffect } from "react";
import { Send, StopCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  browserActionsEnabled: boolean;
  onToggleBrowserActions: () => void;
}

export function ChatInput({
  onSend,
  onCancel,
  isLoading,
  browserActionsEnabled,
  onToggleBrowserActions,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-card p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Nexus..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none scrollbar-thin"
          />

          {isLoading ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={onCancel}
              className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="h-8 w-8 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={onToggleBrowserActions}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {browserActionsEnabled ? (
              <ToggleRight className="h-4 w-4 text-primary" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            Browser actions {browserActionsEnabled ? "on" : "off"}
          </button>
          <span className="text-xs text-muted-foreground font-mono">Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
