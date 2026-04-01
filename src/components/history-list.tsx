"use client";

import { useState, useEffect } from "react";
import { ComparisonResult } from "@/types";
import { HistoryDetail } from "./history-detail";
import { Button } from "@/components/ui/button";

export function HistoryList() {
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/history?page=${p}&limit=10`);
    const data = await res.json();
    setComparisons(data.comparisons);
    setTotal(data.total);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setComparisons((prev) => prev.filter((c) => c.id !== id));
    setTotal((prev) => prev - 1);
    if (expandedId === id) setExpandedId(null);
  };

  const handleToggleSaved = async (id: string, saved: boolean) => {
    await fetch(`/api/history/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: !saved }),
    });
    setComparisons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, saved: !saved } : c))
    );
  };

  const totalPages = Math.ceil(total / 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-secondary)] text-sm">
        Loading history...
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-secondary)] text-sm">
        No comparisons yet. Go make some!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comparisons.map((comparison) => (
        <div
          key={comparison.id}
          className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedId(
                expandedId === comparison.id ? null : comparison.id
              )
            }
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{comparison.prompt}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                {new Date(comparison.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSaved(comparison.id, comparison.saved);
                }}
                className="text-[11px] px-2 py-1 rounded transition-colors"
                style={{
                  color: comparison.saved
                    ? "var(--accent-openai)"
                    : "var(--text-secondary)",
                }}
              >
                {comparison.saved ? "Saved" : "Save"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(comparison.id);
                }}
                className="text-[11px] text-[var(--text-secondary)] hover:text-red-400 px-2 py-1 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </button>

          {expandedId === comparison.id && (
            <HistoryDetail comparison={comparison} />
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchHistory(page - 1)}
            disabled={page <= 1}
            className="text-xs"
          >
            Previous
          </Button>
          <span className="text-xs text-[var(--text-secondary)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchHistory(page + 1)}
            disabled={page >= totalPages}
            className="text-xs"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
