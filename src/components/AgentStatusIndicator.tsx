import { AgentStatus } from "@/types/chat";
import { Brain, Globe, BookOpen, Zap } from "lucide-react";

const statusConfig: Record<Exclude<AgentStatus, "idle">, { icon: typeof Brain; label: string; colorClass: string }> = {
  thinking: { icon: Brain, label: "Thinking...", colorClass: "text-agent-thinking" },
  browsing: { icon: Globe, label: "Browsing web...", colorClass: "text-agent-browsing" },
  reading: { icon: BookOpen, label: "Reading page...", colorClass: "text-agent-reading" },
  streaming: { icon: Zap, label: "Responding...", colorClass: "text-agent-browsing" },
  executing: { icon: Zap, label: "Executing action...", colorClass: "text-agent-executing" },
};

export function AgentStatusIndicator({ status }: { status: AgentStatus }) {
  if (status === "idle") return null;
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-slide-in">
      <div className={`flex items-center gap-2 ${config.colorClass}`}>
        <Icon className="h-4 w-4 animate-pulse-glow" />
        <span className="text-sm font-medium font-mono">{config.label}</span>
      </div>
      <div className="flex gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${config.colorClass} bg-current animate-typing-dot-1`} />
        <span className={`h-1.5 w-1.5 rounded-full ${config.colorClass} bg-current animate-typing-dot-2`} />
        <span className={`h-1.5 w-1.5 rounded-full ${config.colorClass} bg-current animate-typing-dot-3`} />
      </div>
    </div>
  );
}
