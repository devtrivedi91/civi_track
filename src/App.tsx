import { useState, useEffect } from "react";
import { Issue, UserProfile, LeaderboardEntry, TimelineEvent } from "./types";
import {
  initialMockIssues,
  initialMockUsers,
  mockLeaderboard,
} from "./lib/mockData";
// Components
import InteractiveMap from "./components/InteractiveMap";
import CivicAssistant from "./components/CivicAssistant";
import ReportIssueModal from "./components/ReportIssueModal";
import IssueCard from "./components/IssueCard";
import PredictiveInsightsView from "./components/PredictiveInsightsView";
import RewardsStore from "./components/RewardsStore";
import ImpactDashboard from "./components/ImpactDashboard";
import LoginModal from "./components/LoginModal";
import { Gift } from "lucide-react";
import { apiUrl } from "./lib/api";

export default function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [firebaseStatusMessage, setFirebaseStatusMessage] = useState<
    string | null
  >(null);

  const loadIssues = async () => {
    const response = await fetch(apiUrl("/api/issues"));
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to load issues from Firebase.");
    }
    return {
      issues: (data.issues || []) as Issue[],
      degradedMode: Boolean(data.degradedMode),
    };
  };

  const saveIssue = async (issue: Issue) => {
    const response = await fetch(apiUrl("/api/issues"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issue),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to save issue to Firebase.");
    }
  };

  const updateIssue = async (issueId: string, updates: Partial<Issue>) => {
    const response = await fetch(apiUrl(`/api/issues/${issueId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to update issue in Firebase.");
    }
  };

  // Manage active user session with 24 hour persistence
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("community_hero_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure session is within the 24 hour limit (86400000ms)
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          return parsed.user;
        }
        localStorage.removeItem("community_hero_session"); // expired
      } catch (e) {
        console.error("Session parse error", e);
      }
    }
    return null;
  });

  // Keep localStorage perfectly synced with currentUser React state
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        "community_hero_session",
        JSON.stringify({
          user: currentUser,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        }),
      );
    } else {
      localStorage.removeItem("community_hero_session");
    }
  }, [currentUser]);

  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>(mockLeaderboard);

  // Modals & Navigation
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Dashboard view selection: "citizen" | "officer" | "admin" | "insights" | "about"
  const [activePortal, setActivePortal] = useState<
    "landing" | "citizen" | "officer" | "admin" | "insights" | "rewards"
  >("landing");

  // Issue search/filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  // Selected issue on map & detailed view
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Load notifications from localStorage if available, else default list
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      read: boolean;
    }>
  >(() => {
    const saved = localStorage.getItem("community_hero_notifications");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing notifications from localStorage:", e);
      }
    }
    return [
      {
        id: "notif-1",
        title: "🚨 Active Pothole Alert",
        message:
          "A critical pothole on Market Road was upvoted by 4 citizens. Placed on Officer queue.",
        time: "2 hours ago",
        read: false,
      },
      {
        id: "notif-2",
        title: "🎉 Badge Awarded!",
        message:
          "Aarav Sharma has been awarded the 'Local Hero' badge for high-volume crowdsourced verifications.",
        time: "1 day ago",
        read: true,
      },
    ];
  });

  // Synchronize issues through the server-side Firebase Admin SDK.
  useEffect(() => {
    let cancelled = false;

    const syncIssues = async () => {
      try {
        const { issues: fetched, degradedMode } = await loadIssues();
        if (cancelled) return;

        if (degradedMode) {
          setIssues(initialMockIssues);
          setFirebaseStatusMessage(
            "Firebase Admin API is unavailable. Showing local demo reports until server credentials are fixed.",
          );
          return;
        }

        fetched.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        if (fetched.length === 0) {
          setFirebaseStatusMessage(
            "Firebase is reachable, but no issues are stored yet.",
          );
          setIssues([]);
        } else {
          setIssues(fetched);
          setFirebaseStatusMessage(null);
        }
      } catch (error) {
        console.error("Firebase API error:", error);
        if (!cancelled) {
          setIssues(initialMockIssues);
          setFirebaseStatusMessage(
            "Firebase Admin API is unavailable. Showing local demo reports until server credentials are fixed.",
          );
        }
      }
    };

    syncIssues();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "community_hero_notifications",
      JSON.stringify(notifications),
    );
  }, [notifications]);

  const handleUpvote = async (issueId: string) => {
    if (!currentUser) return;

    // Find issue locally to compute updates
    const issue = issues.find((i) => i.issueId === issueId);
    if (!issue) return;

    const alreadyUpvoted = issue.upvotes.includes(currentUser.uid);
    const updatedUpvotes = alreadyUpvoted
      ? issue.upvotes.filter((uid) => uid !== currentUser.uid)
      : [...issue.upvotes, currentUser.uid];

    const diff = alreadyUpvoted ? -1 : 1;
    const newScore = issue.verificationScore + diff;

    // Award points for engagement
    if (!alreadyUpvoted && currentUser.uid === "citizen1") {
      setCurrentUser((prevUser) =>
        prevUser ? { ...prevUser, points: prevUser.points + 5 } : null,
      );
      addNotification(
        "⭐ Points Gained!",
        "You gained +5 points for upvoting and verifying community issues.",
      );
    }

    try {
      await updateIssue(issueId, {
        upvotes: updatedUpvotes,
        verificationScore: newScore,
      });
      setIssues((prev) =>
        prev.map((item) =>
          item.issueId === issueId
            ? {
                ...item,
                upvotes: updatedUpvotes,
                verificationScore: newScore,
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error updating upvote in Firebase: ", err);
      setFirebaseStatusMessage(
        "Could not save upvote to Firebase. Check the server Admin SDK credentials.",
      );
    }
  };

  // Handle comment submit
  const handleAddComment = async (issueId: string, message: string) => {
    if (!currentUser) return;

    addNotification(
      "💬 Comment Posted",
      "Your feedback was added to the community timeline.",
    );

    const issue = issues.find((i) => i.issueId === issueId);
    if (!issue) return;

    const newTimelineEvent: TimelineEvent = {
      status: issue.status,
      note: `💬 Citizen ${currentUser.name} commented: "${message}"`,
      updatedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    try {
      const timeline = [...issue.timeline, newTimelineEvent];
      await updateIssue(issueId, {
        timeline,
      });
      setIssues((prev) =>
        prev.map((item) =>
          item.issueId === issueId
            ? {
                ...item,
                timeline,
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error adding comment to Firebase:", err);
      setFirebaseStatusMessage(
        "Could not save comment to Firebase. Check the server Admin SDK credentials.",
      );
    }
  };

  // Handle citizen verification upload
  const handleVerify = async (
    issueId: string,
    note: string,
    photo?: string,
  ) => {
    if (!currentUser) return;

    const issue = issues.find((i) => i.issueId === issueId);
    if (!issue) return;

    const newTimelineEvent: TimelineEvent = {
      status: "Verified",
      note: `🔍 Citizen verification uploaded: "${note}"`,
      photo: photo || null,
      updatedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    try {
      const updates = {
        verificationScore: issue.verificationScore + 5,
        evidenceCount: issue.evidenceCount + 1,
        timeline: [...issue.timeline, newTimelineEvent],
      };
      await updateIssue(issueId, updates);
      setIssues((prev) =>
        prev.map((item) =>
          item.issueId === issueId
            ? {
                ...item,
                ...updates,
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error verifying in Firebase: ", err);
      setFirebaseStatusMessage(
        "Could not save verification to Firebase. Check the server Admin SDK credentials.",
      );
    }

    // Add points to citizen's account
    setCurrentUser((prev) => {
      if (!prev) return null;
      const newPoints = prev.points + 10;
      let updatedBadges = [...prev.badges];
      if (newPoints >= 200 && !updatedBadges.includes("Super Reporter")) {
        updatedBadges.push("Super Reporter");
        addNotification(
          "🏆 Badge Unlocked!",
          "Congratulations! You've unlocked the 'Super Reporter' badge.",
        );
      }
      return {
        ...prev,
        points: newPoints,
        badges: updatedBadges,
      };
    });

    addNotification(
      "✅ Verification Registered",
      "Thank you! You received +10 points for crowdsourced verification.",
    );
  };

  // Handle Officer or Citizen updating status
  const handleUpdateStatus = async (
    issueId: string,
    status: Issue["status"],
    note: string,
    photo?: string,
  ) => {
    if (!currentUser) return;

    const issue = issues.find((i) => i.issueId === issueId);
    if (!issue) return;

    // Award citizen points if closing/confirming resolution
    if (status === "Closed" && currentUser.role === "Citizen") {
      setCurrentUser((prev) => {
        if (!prev) return null;
        const newPoints = prev.points + 10;
        let updatedBadges = [...prev.badges];
        if (newPoints >= 200 && !updatedBadges.includes("Super Reporter")) {
          updatedBadges.push("Super Reporter");
          addNotification(
            "🏆 Badge Unlocked!",
            "Congratulations! You've unlocked the 'Super Reporter' badge.",
          );
        }
        return {
          ...prev,
          points: newPoints,
          badges: updatedBadges,
        };
      });
      addNotification(
        "⭐ Points Gained!",
        "You gained +10 points for confirming and closing resolved issues.",
      );
    }

    const newTimelineEvent: TimelineEvent = {
      status: status,
      note:
        currentUser.role === "Citizen"
          ? `✅ Citizen Confirmed: "${note}"`
          : `🚧 Officer Update: ${note}`,
      photo: photo || null,
      updatedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    try {
      const timeline = [...issue.timeline, newTimelineEvent];
      await updateIssue(issueId, {
        status: status,
        timeline,
      });
      setIssues((prev) =>
        prev.map((item) =>
          item.issueId === issueId
            ? {
                ...item,
                status,
                timeline,
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error updating status in Firebase: ", err);
      setFirebaseStatusMessage(
        "Could not save status update to Firebase. Check the server Admin SDK credentials.",
      );
    }

    addNotification(
      "🚧 Progress Log Committed",
      `Issue status transitioned to '${status}'. Alerts routed to local subscribers.`,
    );
  };

  // Help add notifications easily
  const addNotification = (title: string, message: string) => {
    const newN = {
      id: "notif-" + Math.random(),
      title,
      message,
      time: "Just now",
      read: false,
    };
    setNotifications((prev) => [newN, ...prev]);
  };

  // Form submit callback
  const handleReportSubmit = async (newIssueData: any) => {
    const id = "issue-" + Date.now().toString();
    const freshIssue: Issue = {
      ...newIssueData,
      issueId: id,
      createdAt: new Date().toISOString(),
      verificationScore: 1,
      upvotes: currentUser ? [currentUser.uid] : [],
      evidenceCount: newIssueData.images.length > 0 ? 1 : 0,
      status: "Reported",
      timeline: [
        {
          status: "Reported",
          note: `Issue submitted by ${newIssueData.reporterName}. Category: ${newIssueData.category}. Suggested: ${newIssueData.department}`,
          updatedBy: "System AI Classifier",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    setIssues((prev) => [freshIssue, ...prev]);
    setShowReportModal(false);
    addNotification(
      "📢 Report Filed Successfully!",
      "Your issue has been added locally and is being synced to Firebase.",
    );

    try {
      await saveIssue(freshIssue);
    } catch (err) {
      console.error("Error creating issue in Firebase: ", err);
      setFirebaseStatusMessage(
        "Could not create issue in Firebase. Check the server Admin SDK credentials.",
      );
    }

    // Award reporting points
    if (currentUser) {
      setCurrentUser((prev) =>
        prev ? { ...prev, points: prev.points + 15 } : null,
      );
    }
  };

  // Filtering Logic
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" || issue.category === categoryFilter;
    const matchesStatus =
      statusFilter === "All" || issue.status === statusFilter;
    const matchesEmergency = !emergencyOnly || issue.isEmergency;

    return (
      matchesSearch && matchesCategory && matchesStatus && matchesEmergency
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-[1000] bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-sm font-display tracking-tight">
              Community Hero AI
            </h1>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase font-bold">
              Hyperlocal Problem Solver
            </span>
          </div>
        </div>

        {/* Desktop Navbar */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActivePortal("landing")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activePortal === "landing" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"}`}
          >
            Home
          </button>
          <button
            onClick={() => setActivePortal("citizen")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activePortal === "citizen" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"}`}
          >
            Issues Hub
          </button>
          <button
            onClick={() => setActivePortal("insights")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activePortal === "insights" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"}`}
          >
            Insights
          </button>

          <button
            onClick={() => setActivePortal("rewards")}
            className={`px-4 py-2 rounded-xl transition-all font-semibold flex items-center gap-1 cursor-pointer ${activePortal === "rewards" ? "bg-pink-100 text-pink-700 shadow-sm" : "text-pink-600 hover:bg-pink-50"}`}
          >
            <Gift className="w-4 h-4" /> Rewards
          </button>

          {currentUser?.role === "Officer" && (
            <button
              onClick={() => setActivePortal("officer")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activePortal === "officer" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"}`}
            >
              Officer Queue
            </button>
          )}
          {currentUser?.role === "Admin" && (
            <button
              onClick={() => setActivePortal("admin")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activePortal === "admin" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"}`}
            >
              Admin Metrics
            </button>
          )}
        </nav>

        {/* Profile & Controls */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:block text-right">
                <span className="text-xs font-bold text-slate-800 block leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                  🏆 {currentUser.points} Points
                </span>
              </div>
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-700 text-xs border border-indigo-200">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setActivePortal("landing");
                }}
                className="text-[11px] hover:text-red-600 text-slate-400 font-semibold cursor-pointer border border-slate-200 hover:border-red-100 px-2.5 py-1.5 rounded-xl bg-white"
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {firebaseStatusMessage && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-8 py-2.5 text-xs text-amber-900">
          <strong className="font-bold">Firebase notice:</strong>{" "}
          {firebaseStatusMessage}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto">
        {/* LANDING PAGE VIEW */}
        {activePortal === "landing" && (
          <div className="space-y-16 pb-16">
            {/* 1. Hero banner with Stats */}
            <section className="relative bg-indigo-950 text-white py-16 lg:py-24 px-6 lg:px-12 overflow-hidden border-b border-indigo-800">
              {/* Abs circles */}
              <div className="absolute top-1/4 -right-16 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-1.5 bg-indigo-900/60 border border-indigo-500/30 rounded-xl px-3.5 py-1.5 text-xs text-indigo-200">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span>
                      Empowering Smarter Wards and Civic Accountability
                    </span>
                  </div>

                  <h2 className="text-3xl lg:text-5xl font-extrabold font-display leading-tight tracking-tight">
                    Be the Hero Your <br />
                    <span className="text-indigo-400 bg-clip-text">
                      Community Needs.
                    </span>
                  </h2>

                  <p className="text-slate-300 text-sm max-w-lg leading-relaxed">
                    Community Hero AI is an advanced hyperlocal civic platform
                    enabling citizens to identify, report, and verify
                    neighborhood issues. AI categorizes, analyzes damage, maps
                    coordinates, and dispatches requests instantly to the
                    correct municipality authorities.
                  </p>

                  <div className="flex flex-wrap gap-4 pt-3">
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          setShowLoginModal(true);
                        } else {
                          setShowReportModal(true);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
                    >
                      📢 Report Community Issue
                    </button>
                    <button
                      onClick={() => setActivePortal("citizen")}
                      className="bg-indigo-900/40 hover:bg-indigo-900/60 text-white font-bold text-xs px-6 py-3.5 rounded-xl border border-indigo-700 transition-all cursor-pointer"
                    >
                      🗺️ Explore Interactive Map
                    </button>
                  </div>
                </div>

                {/* Right side: Applet Snapshot or Interactive mini-dashboard */}
                <div className="bg-indigo-900/40 backdrop-blur-md border border-indigo-700/50 rounded-3xl p-6 shadow-2xl relative">
                  <h4 className="font-bold font-display text-sm mb-4 tracking-tight">
                    🔴 Live Ward Analytics (Ward 4 & 12)
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-center mb-6">
                    <div className="bg-indigo-950/60 p-4 rounded-2xl border border-indigo-800">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                        Total Reports
                      </span>
                      <strong className="text-3xl font-extrabold block mt-1 text-white">
                        {issues.length}
                      </strong>
                    </div>
                    <div className="bg-indigo-950/60 p-4 rounded-2xl border border-indigo-800">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                        Resolved Success
                      </span>
                      <strong className="text-3xl font-extrabold block mt-1 text-emerald-400">
                        {
                          issues.filter(
                            (i) =>
                              i.status === "Resolved" || i.status === "Closed",
                          ).length
                        }
                      </strong>
                    </div>
                  </div>

                  {/* Testimonial slider inline */}
                  <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-800 text-xs text-slate-300 italic leading-relaxed">
                    "I submitted a photo of a burst water main pipeline on
                    Tuesday, and using the AI categorization, the water board
                    arrived within 3 hours and repaired the block! Highly
                    recommend this app!"
                    <div className="mt-2.5 text-[10px] text-indigo-400 font-bold not-italic font-sans">
                      — Aarav S., Sector C Resident
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Core Features bento-grid */}
            <section className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-10 max-w-xl mx-auto space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                  How Platform Operates
                </span>
                <h3 className="text-2xl font-bold font-display tracking-tight text-slate-800">
                  Civic Automation Meets Crowd Crowdsourcing
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Smart city features that simplify accountability for both
                  citizens and local government staff.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Feature 1 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3.5">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm">
                    ⚡
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight">
                    AI Issue Detection
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Upload an image or voice description. Gemini AI parses the
                    details to auto-populate categories, determine severity, and
                    draft titles.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3.5">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-sm">
                    🔍
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight">
                    Community Verification
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Issues are vetted by local neighbors. Higher upvote
                    weightages and crowdsourced photos raise severity ranks on
                    dispatch logs.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3.5">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold text-sm">
                    🗺️
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight">
                    Smart Mapping
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    View local clustering, hazard heatmaps, and active emergency
                    points mapped on beautiful Leaflet grids without external
                    keys.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3.5">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-bold text-sm">
                    🏆
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight">
                    Civic Leaderboard
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Earn volunteering points for reporting, verifying, and
                    collaborating on issues. Claim exclusive civic badge
                    rankings.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Action Hub callout */}
            <section className="bg-indigo-50 border-y border-indigo-100/80 py-12 px-6">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2 max-w-lg">
                  <h3 className="font-bold text-lg font-display text-slate-800 tracking-tight">
                    Ready to verify or report neighborhood hazards?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter our active issue hub to view reported potholes,
                    illegal dumps, or damaged lights around your Ward. Help
                    upvote and verify them!
                  </p>
                </div>
                <button
                  onClick={() => setActivePortal("citizen")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  Enter Active Issues Hub →
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ISSUES HUB PORTAL (Primary Core Experience) */}
        {activePortal === "citizen" && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
            {/* Left Column: Interactive Map and Filter Controls */}
            <div className="flex-1 space-y-6">
              {/* Filter controls panel */}
              <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm font-display tracking-tight">
                    🔍 Explore & Filter Ward Issues
                  </h3>
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setShowLoginModal(true);
                      } else {
                        setShowReportModal(true);
                      }
                    }}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                  >
                    + Report New Issue
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Search input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search address or title..."
                      className="w-full text-xs border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                    />
                    <span className="absolute left-3 top-3 text-slate-400">
                      🔍
                    </span>
                  </div>

                  {/* Category select */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs border border-slate-200 bg-white rounded-xl px-2.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All">All Categories</option>
                    <option value="Potholes">Potholes</option>
                    <option value="Water Leakage">Water Leakage</option>
                    <option value="Streetlight Failure">
                      Streetlight Failure
                    </option>
                    <option value="Garbage Collection">
                      Garbage Collection
                    </option>
                    <option value="Road Damage">Road Damage</option>
                    <option value="Illegal Dumping">Illegal Dumping</option>
                    <option value="Sewage Problems">Sewage Problems</option>
                    <option value="Traffic Signal Issues">
                      Traffic Signal Issues
                    </option>
                    <option value="Public Safety Concerns">
                      Public Safety Concerns
                    </option>
                    <option value="Park Maintenance">Park Maintenance</option>
                  </select>

                  {/* Status select */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs border border-slate-200 bg-white rounded-xl px-2.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Verified">Verified</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold border-t border-slate-100 pt-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emergencyOnly}
                      onChange={(e) => setEmergencyOnly(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    ⚠️ Show Critical Emergencies Only
                  </label>
                </div>
              </div>

              {/* Map */}
              <div className="h-[400px] bg-white rounded-2xl shadow-sm border border-slate-200 p-2.5">
                <InteractiveMap
                  issues={filteredIssues}
                  selectedIssueId={selectedIssueId}
                  onSelectIssue={(id) => setSelectedIssueId(id)}
                  showHeatmap={true}
                />
              </div>

              {/* Smart Impact Dashboard embed */}
              <div className="mt-8">
                <h3 className="font-bold text-slate-800 text-sm font-display tracking-tight mb-4">
                  📊 Real-Time Ward Impact Dashboard
                </h3>
                <ImpactDashboard issues={issues} />
              </div>
            </div>

            {/* Right Column: List of issues & AI assistant / leaderboard widgets */}
            <div className="w-full lg:w-96 space-y-6">
              {/* Issues list scrollbox */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight">
                    📋 Reported Issues ({filteredIssues.length})
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ward database synced
                  </span>
                </div>

                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                  {filteredIssues.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      📭 No issues found matching the selected filters.
                    </div>
                  ) : (
                    filteredIssues.map((issue) => (
                      <div
                        key={issue.issueId}
                        onClick={() => setSelectedIssueId(issue.issueId)}
                        className={`cursor-pointer transition-all ${selectedIssueId === issue.issueId ? "ring-2 ring-indigo-500" : ""}`}
                      >
                        <IssueCard
                          issue={issue}
                          currentUser={currentUser}
                          onUpvote={handleUpvote}
                          onAddComment={handleAddComment}
                          onVerify={handleVerify}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Civic Assistant Embed */}
              <CivicAssistant issues={issues} />

              {/* Volunteer Leaderboard Widget */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight flex items-center gap-1">
                    🏆 Civic Hero Leaderboard
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Top volunteers making a difference in the local wards.
                  </p>
                </div>

                <div className="space-y-3">
                  {leaderboard.map((item, index) => (
                    <div
                      key={item.userId}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? "bg-amber-100 text-amber-800" : index === 1 ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"}`}
                        >
                          {item.rank}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800 block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-[9px] text-slate-400 leading-none">
                            {item.area}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-indigo-600 block">
                          {item.points} pts
                        </strong>
                        <span className="text-[9px] text-amber-600 font-medium block leading-none">
                          {item.badges[0]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREDICTIVE ALERTS VIEW */}
        {activePortal === "insights" && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
            <PredictiveInsightsView issues={issues} />
          </div>
        )}

        {/* OFFICER PORTAL */}
        {activePortal === "officer" && currentUser?.role === "Officer" && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 font-display tracking-tight">
                🚧 Assigned Officer Workload Panel
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Review active work-orders dispatched to you. Transition issues
                to "In Progress" or "Resolved" and upload completion proof
                photos.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Queue sidebar */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  🔧 Priority Action Queue
                </span>
                {issues
                  .filter(
                    (i) =>
                      i.department === "Public Works Department" ||
                      i.department === "Water Supply & Sewerage Board" ||
                      i.department === "Electrical Authority",
                  )
                  .map((i) => (
                    <div
                      key={i.issueId}
                      onClick={() => setSelectedIssueId(i.issueId)}
                      className={`bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:shadow transition-all ${selectedIssueId === i.issueId ? "border-indigo-600 bg-slate-50/50" : ""}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 font-bold px-1.5 py-0.5 rounded uppercase">
                          {i.severity}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {i.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {i.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {i.location.areaName}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Interactive work view */}
              <div className="lg:col-span-2">
                {selectedIssueId ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                        Currently Auditing: {selectedIssueId}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-lg font-display tracking-tight mt-1">
                        {
                          issues.find((i) => i.issueId === selectedIssueId)
                            ?.title
                        }
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Issue Details card */}
                      <div className="space-y-4">
                        <IssueCard
                          issue={
                            issues.find((i) => i.issueId === selectedIssueId)!
                          }
                          currentUser={currentUser}
                          onUpvote={handleUpvote}
                          onAddComment={handleAddComment}
                          onVerify={handleVerify}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      </div>

                      {/* Right: Map localization & Checklist */}
                      <div className="space-y-4">
                        <div className="h-44 rounded-xl overflow-hidden border border-slate-200">
                          <InteractiveMap
                            issues={[
                              issues.find(
                                (i) => i.issueId === selectedIssueId,
                              )!,
                            ]}
                            selectedIssueId={selectedIssueId}
                          />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
                          <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                            🚧 Standard Safety Protocol
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                            <input
                              type="checkbox"
                              className="rounded"
                              defaultChecked
                            />{" "}
                            Confirm physical barricades placed
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                            <input type="checkbox" className="rounded" />{" "}
                            Materials & asphalt dispatch logged
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                            <input type="checkbox" className="rounded" />{" "}
                            Environmental runoff cleanups scheduled
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                    Please select an issue from the priority action queue
                    sidebar to manage and commit status logs.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ADMIN PORTAL */}
        {activePortal === "admin" && currentUser?.role === "Admin" && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display tracking-tight">
                  🏢 Municipal Admin Analytics Room
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Global oversight of ward resolution rates, department workload
                  trends, and active emergency priority escalations.
                </p>
              </div>
              <button
                onClick={() =>
                  addNotification(
                    "📊 Monthly Audit Dispatched",
                    "Global reports compiled and queued for export to City Head Office.",
                  )
                }
                className="bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl cursor-pointer"
              >
                📥 Export Ward Reports
              </button>
            </div>

            {/* Smart analytics dashboard embed */}
            <ImpactDashboard issues={issues} />
          </div>
        )}
        {/* REWARDS PORTAL */}
        {activePortal === "rewards" && currentUser && (
          <RewardsStore
            currentUser={currentUser}
            onUpdatePoints={(newPoints) =>
              setCurrentUser({ ...currentUser, points: newPoints })
            }
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-12 px-6 lg:px-12 mt-16 font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <strong className="text-white font-bold font-display tracking-tight">
                Community Hero AI
              </strong>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
              SaaS civic-tech platform empowering cities and societies to
              streamline accountability and accelerate resolution cycles using
              Gemini AI.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-[11px] uppercase tracking-widest font-display">
              Responsible Agencies
            </h5>
            <ul className="space-y-1.5 text-[11px] text-slate-500 font-medium">
              <li>🛣️ Public Works Department (Roads)</li>
              <li>💧 Water Supply & Sewerage Board (Leakage)</li>
              <li>⚡ Electrical Authority (Streetlights)</li>
              <li>🧹 Sanitation Department (Waste)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-[11px] uppercase tracking-widest font-display">
              Security & Compliance
            </h5>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Fully compliant with smart-city standards and open data policies.
              Authenticated with Firebase Auth and secured by fine-grained
              security rules.
            </p>
          </div>
        </div>

        <hr className="border-slate-800 my-6" />

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500">
          <span>
            &copy; 2026 Community Hero AI. Dedicated to smart neighborhoods.
          </span>
          <span className="font-mono">
            Local UTC timestamp: 2026-06-23 19:23:19
          </span>
        </div>
      </footer>

      {/* Floating Report modal */}
      {showReportModal && (
        <ReportIssueModal
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
          currentUser={currentUser}
          issues={issues}
        />
      )}

      {/* Floating Login modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(u) => {
            setCurrentUser(u);
            if (u.role === "Officer") setActivePortal("officer");
            else if (u.role === "Admin") setActivePortal("admin");
            else setActivePortal("citizen");
            addNotification(
              "🔑 Authorized Successfully",
              `Logged in as ${u.name} with role: ${u.role}.`,
            );
          }}
        />
      )}
    </div>
  );
}
