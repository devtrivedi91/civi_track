import React, { useState } from "react";
import { Issue, UserProfile, Comment, Verification, ResolutionRecommendation } from "../types";

interface IssueCardProps {
  issue: Issue;
  currentUser: UserProfile | null;
  onUpvote: (issueId: string) => void;
  onAddComment: (issueId: string, message: string) => void;
  onVerify: (issueId: string, note: string, photo?: string) => void;
  onUpdateStatus: (issueId: string, status: Issue["status"], note: string, photo?: string) => void;
}

export default function IssueCard({
  issue,
  currentUser,
  onUpvote,
  onAddComment,
  onVerify,
  onUpdateStatus
}: IssueCardProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "comments" | "verify" | "ai-solution">("details");
  const [commentText, setCommentText] = useState("");
  const [verifyNote, setVerifyNote] = useState("");
  const [verifyPhoto, setVerifyPhoto] = useState<string | null>(null);

  // Status update states (for Officer/Admin)
  const [newStatus, setNewStatus] = useState<Issue["status"]>(issue.status);
  const [statusNote, setStatusNote] = useState("");
  const [statusPhoto, setStatusPhoto] = useState<string | null>(null);

  // Sync newStatus when issue prop changes
  React.useEffect(() => {
    setNewStatus(issue.status);
    setStatusNote("");
    setStatusPhoto(null);
  }, [issue.issueId, issue.status]);

  // Extract comments dynamically from the issue timeline
  const commentsList = issue.timeline
    .filter((event) => event.note.startsWith("💬"))
    .map((event, idx) => {
      let msg = event.note;
      const match = event.note.match(/commented:\s*"(.*)"/s) || event.note.match(/:\s*"(.*)"/s);
      if (match) {
        msg = match[1];
      } else {
        msg = event.note.replace(/^💬\s*[^:]+:\s*"?/, "").replace(/"?$/, "");
      }
      return {
        commentId: `comment-${idx}`,
        userName: event.updatedBy,
        message: msg,
        createdAt: event.createdAt
      };
    });

  // AI Solution Recommendations
  const [aiSolution, setAiSolution] = useState<ResolutionRecommendation | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Show QR Code state
  const [showQR, setShowQR] = useState(false);

  const isUpvoted = currentUser ? issue.upvotes.includes(currentUser.uid) : false;

  const handleUpvoteClick = () => {
    if (!currentUser) {
      alert("Please sign in or use a guest account to upvote community issues.");
      return;
    }
    onUpvote(issue.issueId);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login to comment.");
      return;
    }
    if (!commentText.trim()) return;
    onAddComment(issue.issueId, commentText.trim());
    setCommentText("");
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (issue.status === "Resolved") {
      onUpdateStatus(issue.issueId, "Closed", "Citizen confirmed resolution: " + verifyNote, verifyPhoto || undefined);
    } else {
      onVerify(issue.issueId, verifyNote, verifyPhoto || undefined);
    }
    
    setVerifyNote("");
    setVerifyPhoto(null);
    setActiveTab("timeline");
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusNote.trim()) {
      alert("Please provide a status update note.");
      return;
    }
    onUpdateStatus(issue.issueId, newStatus, statusNote, statusPhoto || undefined);
    setStatusNote("");
    setStatusPhoto(null);
    setActiveTab("timeline");
  };

  // Trigger AI Resolution Recommendation
  const handleFetchRecommendation = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch("/api/ai/recommend-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: issue.category,
          title: issue.title,
          description: issue.description
        })
      });
      const data = await response.json();
      if (data && !data.error && Array.isArray(data.steps) && Array.isArray(data.materials)) {
        setAiSolution(data);
      } else {
        console.warn("API returned error or invalid format:", data);
        setAiSolution(null);
      }
    } catch (err) {
      console.error("Failed to load AI recommendation:", err);
      setAiSolution(null);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleVerifyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setVerifyPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleStatusPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setStatusPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const severityColors = {
    Low: "bg-green-50 text-green-700 border-green-100",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-100",
    High: "bg-orange-50 text-orange-700 border-orange-100",
    Critical: "bg-red-50 text-red-700 border-red-100 animate-pulse"
  };

  const statusColors = {
    Reported: "bg-slate-100 text-slate-700 border-slate-200",
    Verified: "bg-blue-50 text-blue-700 border-blue-200",
    Assigned: "bg-purple-50 text-purple-700 border-purple-200",
    "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
    Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Closed: "bg-gray-100 text-gray-500 border-gray-200"
  };

  // Generate a QR Code representation that routes users to the area/landmark
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `https://communityhero.ai/issue/${issue.issueId}`
  )}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col font-sans transition-all hover:shadow-md">
      
      {/* Header Info */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl uppercase tracking-wider">
              {issue.category}
            </span>
            <span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-xl ${severityColors[issue.severity]}`}>
              Severity: {issue.severity}
            </span>
            {issue.isEmergency && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-xl uppercase flex items-center gap-1">
                ⚠️ Emergency
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-xl uppercase tracking-wide ${statusColors[issue.status]}`}>
              {issue.status}
            </span>
            
            {/* QR Button */}
            <button
              onClick={() => setShowQR(!showQR)}
              className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
              title="QR code for area scanning"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          </div>
        </div>

        <h3 className="font-bold text-slate-800 text-base font-display leading-tight tracking-tight">
          {issue.title}
        </h3>
        
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2.5">
          <span className="font-semibold text-slate-600">👤 {issue.reporterName}</span>
          <span>•</span>
          <span>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span className="text-indigo-600 font-medium">📍 {issue.location.areaName}</span>
        </div>
      </div>

      {/* QR Code display */}
      {showQR && (
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col items-center text-center">
          <h4 className="font-bold text-xs text-slate-800 mb-1">📍 QR Area Reporter Code</h4>
          <p className="text-[10px] text-slate-500 mb-3 max-w-xs">Scan this QR code with a phone to instantly report an issue or review status at this specific landmark.</p>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <img src={qrCodeUrl} alt="Area QR Code" className="w-28 h-28" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-2">ID: {issue.issueId}</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex bg-slate-50/50 border-b border-slate-100 text-xs text-slate-500">
        <button
          onClick={() => setActiveTab("details")}
          className={`flex-1 py-3 text-center border-b-2 font-semibold ${activeTab === "details" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:text-slate-800"}`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 py-3 text-center border-b-2 font-semibold ${activeTab === "timeline" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:text-slate-800"}`}
        >
          Timeline ({issue.timeline.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("comments");
          }}
          className={`flex-1 py-3 text-center border-b-2 font-semibold ${activeTab === "comments" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:text-slate-800"}`}
        >
          Comments
        </button>
        {currentUser?.role === "Citizen" && issue.status !== "Resolved" && issue.status !== "Closed" && (
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex-1 py-3 text-center border-b-2 font-semibold ${activeTab === "verify" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:text-slate-800"}`}
          >
            Verify (+5 pts)
          </button>
        )}
        {currentUser?.role === "Citizen" && issue.status === "Resolved" && (
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex-1 py-3 text-center border-b-2 font-semibold ${activeTab === "verify" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:text-slate-800"}`}
          >
            Confirm Resolution (+10 pts)
          </button>
        )}
        {(currentUser?.role === "Officer" || currentUser?.role === "Admin") && (
          <button
            onClick={() => {
              setActiveTab("ai-solution");
              if (!aiSolution) handleFetchRecommendation();
            }}
            className={`flex-1 py-3 text-center border-b-2 font-semibold ${activeTab === "ai-solution" ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent hover:text-slate-800"}`}
          >
            🔧 AI Solution
          </button>
        )}
      </div>

      {/* Content pane */}
      <div className="flex-1 p-5 min-h-[220px]">
        {activeTab === "details" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
              {issue.description}
            </p>

            {issue.images && issue.images.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={issue.images[0]}
                  alt="Evidence"
                  className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
              <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Landmark & Address</span>
                <p className="text-xs font-medium text-slate-700 leading-normal mt-0.5">{issue.location.address}</p>
                <span className="text-[9px] text-slate-400 mt-0.5 block">Department: {issue.department}</span>
              </div>
            </div>

            {/* Verification upvote summary */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Verification Score: <strong className="text-slate-800">{issue.verificationScore}</strong>
                </span>
                <span className="text-slate-500">
                  Evidence Uploads: <strong className="text-slate-800">{issue.evidenceCount}</strong>
                </span>
              </div>

              {/* Upvote button */}
              <button
                type="button"
                onClick={handleUpvoteClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                  isUpvoted
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {isUpvoted ? "Upvoted ✓" : "Upvote"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-4">
            
            {/* Timeline track list */}
            <div className="relative border-l-2 border-indigo-100 pl-4 ml-2.5 space-y-4">
              {issue.timeline.map((event, idx) => (
                <div key={idx} className="relative">
                  {/* Circle status indicator */}
                  <span className="absolute -left-[23px] top-0 bg-indigo-600 text-white w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px]" />
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 text-xs">{event.status}</span>
                      <span className="text-[9px] text-slate-400">{new Date(event.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{event.note}</p>
                    {event.photo && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 max-w-xs">
                        <img src={event.photo} alt="Timeline progress" className="w-full h-24 object-cover" />
                      </div>
                    )}
                    <div className="mt-1.5 text-[9px] text-slate-400 font-medium">By: {event.updatedBy}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Officer Status Editor Form */}
            {(currentUser?.role === "Officer" || currentUser?.role === "Admin") && (
              <div className="border-t border-slate-100 pt-4 mt-2">
                <h4 className="font-bold text-xs text-indigo-900 mb-2">⚡ Update Issue Progress (Officer Operations)</h4>
                
                <form onSubmit={handleStatusSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Set Work Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-2 py-2"
                      >
                        <option value="Reported">Reported</option>
                        <option value="Verified">Verified</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Upload Work Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStatusPhotoUpload}
                        className="w-full text-[10px] text-slate-500 border border-slate-200 px-2 py-1.5 rounded-xl cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Officer Progress Log Note *</label>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Assembled mixing team. Pavement core excavated. Base compacted."
                      rows={2}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-semibold text-[11px] py-2 rounded-xl shadow transition-all cursor-pointer"
                  >
                    Commit Status Log Update
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {commentsList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  💬 No comments posted yet. Start the community conversation!
                </div>
              ) : (
                commentsList.map((comment) => (
                  <div key={comment.commentId} className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 text-xs leading-relaxed">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-slate-700 font-semibold">{comment.userName}</strong>
                      <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600">{comment.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="flex gap-2 border-t border-slate-100 pt-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a constructive comment..."
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3.5 py-2"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 rounded-xl shadow-sm cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {activeTab === "verify" && (
          <form onSubmit={handleVerifySubmit} className="space-y-3.5">
            {issue.status === "Resolved" ? (
              <div className="bg-emerald-50 text-emerald-900 p-3 rounded-xl border border-emerald-100 text-[11px] leading-relaxed">
                <strong>✅ Confirm Resolution & Close Issue:</strong> Has this issue been successfully fixed to your satisfaction? Write a confirmation log note (and optionally upload proof). You earn <strong>+10 points</strong> for closing resolved issues!
              </div>
            ) : (
              <div className="bg-indigo-50 text-indigo-900 p-3 rounded-xl border border-indigo-100 text-[11px] leading-relaxed">
                <strong>✊ Community Crowdsourced Validation:</strong> Verifying coordinates, uploads, and details accelerates municipal response priority. You earn <strong>+5 points</strong> and boost civic validation!
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                {issue.status === "Resolved" ? "Completion Proof Photo (Optional)" : "Supporting Evidence Photo"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleVerifyPhotoUpload}
                className="w-full text-xs text-slate-500 border border-slate-200 px-3 py-2 rounded-xl cursor-pointer bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                {issue.status === "Resolved" ? "Confirmation Notes *" : "Verification Note *"}
              </label>
              <textarea
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder={issue.status === "Resolved"
                  ? "Describe your satisfaction (e.g. 'I passed by today and the pothole is completely patched and flat! Thanks!')"
                  : "Describe your physical verification (e.g. 'I passed by this morning and can confirm the water is flooding Sector 2 road.')"
                }
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-semibold text-xs py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
            >
              {issue.status === "Resolved" ? "Confirm Resolution & Close Issue" : "Submit Citizen Verification"}
            </button>
          </form>
        )}

        {activeTab === "ai-solution" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Resolution Assistant</span>
              <button
                type="button"
                onClick={handleFetchRecommendation}
                disabled={loadingAI}
                className="text-xs text-indigo-800 hover:text-indigo-950 font-bold underline cursor-pointer"
              >
                Re-Generate Plan
              </button>
            </div>

            {loadingAI ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-[11px]">AI compiling technical guidelines...</span>
              </div>
            ) : aiSolution ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-[10px]">
                  <div>
                    <span className="text-slate-400 font-medium">Estimated Time</span>
                    <p className="font-bold text-slate-800 mt-0.5">{aiSolution.estimatedHours} Hours</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Difficulty Rate</span>
                    <p className="font-bold text-indigo-700 mt-0.5">{aiSolution.difficulty}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Target Category</span>
                    <p className="font-bold text-slate-800 mt-0.5 truncate">{issue.category}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-700 block text-[11px]">📋 Required Engineering Steps:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-normal bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    {aiSolution.steps?.map((step, idx) => (
                      <li key={idx} className="pl-1 text-slate-700 leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 block text-[11px]">🛠️ Material Requirements:</span>
                  <div className="flex flex-wrap gap-1">
                    {aiSolution.materials?.map((mat, idx) => (
                      <span key={idx} className="bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-medium text-[10px] px-2.5 py-1 rounded-lg">
                        {mat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                Unable to retrieve AI guidelines. Click "Re-Generate Plan" to retry.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
