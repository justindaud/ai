"use client";

import { useState } from "react";

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setOutput(String(data.output || ""));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Hotel Analytics Agent</h1>
      <form onSubmit={handleAsk} className="space-y-3">
        <textarea
          className="w-full border rounded p-3 text-sm"
          rows={5}
          placeholder="Tulis pertanyaan Anda..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Mengirim..." : "Tanya Agent"}
        </button>
      </form>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {output && (
        <div className="border rounded p-4 whitespace-pre-wrap text-sm">
          {output}
        </div>
      )}
    </div>
  );
}