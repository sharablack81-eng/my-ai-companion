import { Cpu, Sparkles } from "lucide-react";

export function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
      <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 mb-4 sm:mb-6 glow-primary">
        <Cpu className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2 tracking-tight">Nexus AI Agent</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6 sm:mb-8 text-sm leading-relaxed">
        Your private AI assistant. Ask questions, get analysis, and let the agent work for you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-lg w-full">
        {[
          "Explain quantum computing simply",
          "Write a Python sort script",
          "Latest trends in AI?",
          "Help debug a React component",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={onStart}
            className="flex items-start gap-2 px-3 sm:px-4 py-3 rounded-xl border border-border bg-card text-left text-sm text-foreground hover:bg-accent hover:border-primary/30 transition-all group active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
