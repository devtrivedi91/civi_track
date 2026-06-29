import { useState, useEffect } from "react";
import { Issue, PredictiveInsight } from "../types";

interface PredictiveInsightsProps {
  issues: Issue[];
}

export default function PredictiveInsightsView({ issues }: PredictiveInsightsProps) {
  const [predictions, setPredictions] = useState<PredictiveInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/predictive-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuesList: issues })
      });
      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch (err) {
      console.error("Failed to load predictive insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [issues]);

  const getRiskBadgeColor = (confidence: number) => {
    if (confidence >= 80) return "bg-red-50 text-red-700 border-red-100";
    if (confidence >= 70) return "bg-orange-50 text-orange-700 border-orange-100";
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 font-sans">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg font-display tracking-tight flex items-center gap-2">
            🔮 AI Smart City Predictive Insights
          </h3>
          <p className="text-xs text-slate-500 mt-1">AI modeling of recurring local reports, water logging points, and electrical logs to predict infrastructure failures.</p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-indigo-100"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-indigo-700/30 border-t-indigo-700 rounded-full animate-spin"></div>
              Calculating Forecasts...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4H4v5H4.118" />
              </svg>
              Refresh Forecast Models
            </>
          )}
        </button>
      </div>

      {loading && predictions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Running machine-learning predictive clusters...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {predictions.map((pred, idx) => (
            <div
              key={idx}
              className="border border-slate-150 rounded-2xl p-5 hover:border-indigo-300 transition-all shadow-sm bg-gradient-to-b from-slate-50/50 to-white"
            >
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{pred.type}</span>
                  <h4 className="font-bold text-slate-800 text-sm leading-snug mt-1">{pred.area}</h4>
                </div>
                
                {/* Confidence circle */}
                <div className={`border rounded-xl px-2.5 py-1 text-center ${getRiskBadgeColor(pred.confidence)}`}>
                  <span className="text-[10px] block text-slate-400 font-semibold leading-none">Confidence</span>
                  <strong className="text-xs font-bold leading-none block mt-0.5">{pred.confidence}%</strong>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                {pred.description}
              </p>

              <hr className="border-slate-100 mb-3" />

              <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/50">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">🛡️ Municipal Preemptive Guidelines</span>
                <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                  {pred.actions}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning note */}
      <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5 text-[10px] text-slate-500 leading-relaxed">
        <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>
          <strong>Notice:</strong> Predictive models update dynamically as citizens file new reports. Early patrol schedules or sewer sweeps based on confidence ratings higher than 75% reduce community emergency risks by an average of 40%.
        </p>
      </div>
    </div>
  );
}
