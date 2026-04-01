import Link from "next/link";
import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <h1 className="text-lg font-semibold tracking-tight">
          Comparison History
        </h1>
        <Link
          href="/"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Back to Playground
        </Link>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6">
        <HistoryList />
      </main>
    </div>
  );
}
