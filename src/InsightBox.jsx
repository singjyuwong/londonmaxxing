import { useState } from "react";
import { Sparkles } from "lucide-react";
import { generateInsight } from "./api/insight";

// Splits a line of text on **bold** markers and renders the bold spans as
// <strong>, without pulling in a full markdown dependency.
function InlineText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-ink">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// Renders the LLM's markdown-ish response as headings / bullet lists /
// paragraphs, with inline **bold** support, without a full markdown parser.
function InsightContent({ text }) {
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.every(
          (line) =>
            /^[-*•]\s+/.test(line.trim()) || /^\d+[.)]\s+/.test(line.trim()),
        );

        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((line, j) => (
                <li key={j}>
                  <InlineText
                    text={line
                      .trim()
                      .replace(/^[-*•]\s+/, "")
                      .replace(/^\d+[.)]\s+/, "")}
                  />
                </li>
              ))}
            </ul>
          );
        }

        const headingMatch = block.trim().match(/^#{1,4}\s+(.*)$/);
        if (headingMatch) {
          return (
            <div key={i} className="font-bold text-ink text-sm">
              <InlineText text={headingMatch[1]} />
            </div>
          );
        }

        return (
          <p key={i}>
            <InlineText text={block} />
          </p>
        );
      })}
    </div>
  );
}

export default function InsightBox({ certificate, billBreakdown, factors }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setInsight(null);

    try {
      const result = await generateInsight({
        certificate,
        billBreakdown,
        factors,
      });
      setInsight(result);
    } catch (err) {
      setError(err.message || "Something went wrong generating your insight.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-2 border-ink rounded-2xl p-5 mt-6">
      <h3 className="font-bold text-ink mb-1 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-orange-accent" />
        AI-POWERED INSIGHT
      </h3>
      <p className="text-slate-400 text-xs mb-4">
        Get an AI summary comparing your EPC data with your personalized bill
        estimate, powered by Claude Sonnet 5.
      </p>

      {!insight && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={
            "pill-dark font-semibold px-6 py-3 transition inline-flex items-center gap-2 " +
            (loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90")
          }
        >
          {loading ? (
            "Generating insight…"
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate insight
            </>
          )}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {insight && (
        <>
          <div className="bg-slate-50 rounded-xl p-4 mt-2">
            <InsightContent text={insight} />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-3 text-xs font-semibold text-orange-accent hover:underline disabled:opacity-60"
          >
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        </>
      )}
    </div>
  );
}
