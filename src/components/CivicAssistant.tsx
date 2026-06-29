import { useState, useRef, useEffect } from "react";
import { Issue } from "../types";
import { apiUrl } from "../lib/api";

interface CivicAssistantProps {
  issues: Issue[];
}

export default function CivicAssistant({ issues }: CivicAssistantProps) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "model"; text: string }>
  >([
    {
      role: "model",
      text: "👋 Namaste! I am your Community Hero AI Civic Assistant. You can ask me questions about local guidelines, municipal services, reporting processes, or check the real-time status of any reported issue.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { text: "How do I report a water leak?", label: "💧 Report Leak" },
    { text: "Who handles road and pothole repairs?", label: "🛣️ Road Repairs" },
    { text: "How do I earn badges and points?", label: "🏆 Gamification" },
    { text: "Show me active emergencies", label: "⚠️ Emergencies" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    // Smart Local Parsing for issues status lookup!
    const lowerMsg = userMsg.toLowerCase();
    let localResponse = "";

    // If looking up status of a specific complaint
    if (
      lowerMsg.includes("status") ||
      lowerMsg.includes("complaint") ||
      lowerMsg.includes("issue")
    ) {
      // Look for match with issue titles or IDs
      const matchedIssue = issues.find(
        (issue) =>
          lowerMsg.includes(issue.issueId.toLowerCase()) ||
          lowerMsg.includes(issue.title.toLowerCase().substring(0, 15)) ||
          (issue.category && lowerMsg.includes(issue.category.toLowerCase())),
      );

      if (matchedIssue) {
        localResponse = `🔍 **Issue Status Found:** I located the issue **"${matchedIssue.title}"** (ID: ${matchedIssue.issueId}). 
        
* **Category:** ${matchedIssue.category}
* **Current Status:** **${matchedIssue.status}**
* **Severity:** ${matchedIssue.severity} (${matchedIssue.urgency})
* **Assigned Department:** ${matchedIssue.department}
* **Community Score:** Upvoted by ${matchedIssue.upvotes.length} citizens

**Latest Action Log:** ${matchedIssue.timeline[matchedIssue.timeline.length - 1]?.note || "Reported to department."}`;
      }
    }

    if (
      lowerMsg.includes("active emergencies") ||
      lowerMsg.includes("emergency")
    ) {
      const emergencyIssues = issues.filter(
        (i) =>
          i.isEmergency && i.status !== "Resolved" && i.status !== "Closed",
      );
      if (emergencyIssues.length > 0) {
        localResponse =
          `⚠️ **Active Critical Emergencies Detected Nearby:**\n\n` +
          emergencyIssues
            .map(
              (i) =>
                `* **[${i.emergencyType}] ${i.title}** at *${i.location.areaName}*\n  Status: \`${i.status}\` | Severity: \`${i.severity}\` (Priority Escalated)`,
            )
            .join("\n\n");
      } else {
        localResponse = `✅ No active severe safety emergencies (fires, floods, electrical arcs) are currently reported in the local ward databases. All systems are stable.`;
      }
    }

    try {
      // Trigger API endpoint
      const response = await fetch(apiUrl("/api/ai/assistant"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          // If we have localResponse, we can append it or guide the AI
          history: messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
          })),
        }),
      });

      const data = await response.json();
      let aiText =
        data.response ||
        "I apologize, I'm having difficulty connecting to the server. Let me try again shortly.";

      if (localResponse) {
        aiText = `${localResponse}\n\n---\n*AI Assistant Note:* ${aiText}`;
      }

      setMessages((prev) => [...prev, { role: "model", text: aiText }]);
    } catch (error) {
      console.error("Assistant API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text:
            localResponse ||
            "I encountered a minor network issue. Please check your internet connection or try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-indigo-900 px-4 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-500/35 rounded-xl flex items-center justify-center border border-indigo-400/30">
            <svg
              className="w-5 h-5 text-indigo-200 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm font-display tracking-tight">
              Civic AI Assistant
            </h3>
            <span className="text-[10px] text-indigo-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
              Online • AI Agent Ready
            </span>
          </div>
        </div>
        <div className="text-[11px] bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded-md font-mono">
          Model: gemini-2.5-flash
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600 text-white shadow-sm rounded-tr-none"
                  : "bg-white text-slate-700 border border-slate-200/80 shadow-sm rounded-tl-none whitespace-pre-line"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm rounded-tl-none flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Container */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.text)}
            type="button"
            className="text-[11px] bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm cursor-pointer"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 bg-white border-t border-slate-150 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about reports, points, departments..."
          className="flex-1 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 px-3.5 py-2.5 rounded-xl"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <svg
            className="w-4 h-4 transform rotate-90"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l92 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
