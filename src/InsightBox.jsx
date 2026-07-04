import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { marked } from "marked";
import { generateInsight } from "./api/insight";

marked.setOptions({ breaks: true });

function InsightContent({ text }) {
  const html = useMemo(() => marked.parse(text), [text]);
  // eslint-disable-next-line react/no-danger
  return <div className="insight-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
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
