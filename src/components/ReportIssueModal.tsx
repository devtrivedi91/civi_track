import React, { useState, useEffect } from "react";
import InteractiveMap from "./InteractiveMap";
import { Issue, UserProfile } from "../types";
import { apiUrl } from "../lib/api";

interface ReportIssueModalProps {
  onClose: () => void;
  onSubmit: (
    newIssue: Omit<
      Issue,
      | "issueId"
      | "createdAt"
      | "timeline"
      | "upvotes"
      | "verificationScore"
      | "evidenceCount"
    > & { imageBase64?: string },
  ) => void;
  currentUser: UserProfile | null;
  issues: Issue[];
}

export default function ReportIssueModal({
  onClose,
  onSubmit,
  currentUser,
  issues,
}: ReportIssueModalProps) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<any>("Road Damage");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<
    "Low" | "Medium" | "High" | "Critical"
  >("Medium");
  const [urgency, setUrgency] = useState<"Normal" | "Urgent" | "Emergency">(
    "Normal",
  );
  const [department, setDepartment] = useState("Public Works Department");

  const [image, setImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Geolocation states
  const [lat, setLat] = useState<number>(19.076);
  const [lng, setLng] = useState<number>(72.8777);
  const [address, setAddress] = useState(
    "Mumbai General Ward, Maharashtra, India",
  );
  const [areaName, setAreaName] = useState("Central Ward");

  const [analyzing, setAnalyzing] = useState(false);
  const [duplicateDetected, setDuplicateDetected] = useState<Issue | null>(
    null,
  );

  // Voice recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Multilingual state for reporting input
  const [selectedLang, setSelectedLang] = useState<"en" | "hi" | "gu">("en");

  const categories = [
    "Potholes",
    "Water Leakage",
    "Streetlight Failure",
    "Garbage Collection",
    "Road Damage",
    "Illegal Dumping",
    "Sewage Problems",
    "Traffic Signal Issues",
    "Public Safety Concerns",
    "Park Maintenance",
  ];

  const departments = [
    "Public Works Department",
    "Water Supply & Sewerage Board",
    "Electrical Authority",
    "Sanitation Department",
    "Traffic Control Division",
    "Local Police & Vigilance",
    "Horticulture Department",
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang =
        selectedLang === "hi"
          ? "hi-IN"
          : selectedLang === "gu"
            ? "gu-IN"
            : "en-US";

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setDescription((prev) => (prev ? prev + " " + transcript : transcript));
        setIsRecording(false);
      };

      rec.onerror = (err: any) => {
        console.error("Speech Recognition Error:", err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [selectedLang]);

  const toggleRecording = () => {
    if (!recognition) {
      alert(
        "Speech-to-text is not supported in your browser or iframe constraints block microphone permission.",
      );
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognition.start();
    }
  };

  // Check duplicates locally based on distance < 150m and category
  const checkForDuplicates = (
    selectedLat: number,
    selectedLng: number,
    selectedCategory: string,
  ) => {
    // 1 deg is ~111km. 150m is approx 0.0013 degrees
    const threshold = 0.0013;
    const match = issues.find((issue) => {
      if (issue.category !== selectedCategory) return false;
      const distance = Math.sqrt(
        Math.pow(issue.location.lat - selectedLat, 2) +
          Math.pow(issue.location.lng - selectedLng, 2),
      );
      return (
        distance <= threshold &&
        issue.status !== "Resolved" &&
        issue.status !== "Closed"
      );
    });

    setDuplicateDetected(match || null);
  };

  // File picker handler for images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI autofill analysis trigger
  const handleAIAnalyze = async () => {
    if (!description && !image) {
      alert(
        "Please provide at least a description or upload an image for AI to analyze.",
      );
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch(apiUrl("/api/ai/analyze-issue"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: image,
          description: description,
          lat,
          lng,
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      // Populate results
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.category) {
        setCategory(result.category);
        checkForDuplicates(lat, lng, result.category);
      }
      if (result.severity) setSeverity(result.severity);
      if (result.urgency) setUrgency(result.urgency);
      if (result.suggestedDepartment) setDepartment(result.suggestedDepartment);

      // Notification if Emergency is detected by AI
      if (result.isEmergency) {
        setUrgency("Emergency");
        setSeverity("Critical");
      }
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      alert(
        "AI Analysis encountered an error: " +
          err.message +
          ". Falling back to manual entry.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLocationSelected = (
    newLat: number,
    newLng: number,
    newAddr: string,
    newArea: string,
  ) => {
    setLat(newLat);
    setLng(newLng);
    setAddress(newAddr);
    setAreaName(newArea);
    checkForDuplicates(newLat, newLng, category);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !address) {
      alert("Please fill in the title, description, and location details.");
      return;
    }

    onSubmit({
      title,
      description,
      category,
      severity,
      urgency,
      department,
      images: image ? [image] : [],
      videos: videoUrl ? [videoUrl] : [],
      location: {
        lat,
        lng,
        address,
        areaName,
      },
      reporterId: currentUser?.uid || "anonymous",
      reporterName: currentUser?.name || "Anonymous Citizen",
      isEmergency: urgency === "Emergency",
      emergencyType: urgency === "Emergency" ? "Accident" : null, // default classification
      status: "Reported",
      imageBase64: image || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100/80 flex flex-col md:flex-row overflow-hidden max-h-[92vh] font-sans">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close report issue modal"
          className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <span className="text-xl leading-none">×</span>
        </button>

        {/* Left pane: Form */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[92vh]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold font-display tracking-tight text-slate-800 flex items-center gap-2">
                📢 Report Community Issue
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Make your ward a better, safer place for everyone.
              </p>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedLang("en")}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${selectedLang === "en" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang("hi")}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${selectedLang === "hi" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang("gu")}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${selectedLang === "gu" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
              >
                ગુજરાતી
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick voice & description */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {selectedLang === "hi"
                    ? "समस्या का विवरण"
                    : selectedLang === "gu"
                      ? "સમસ્યાની વિગત"
                      : "Issue Description *"}
                </label>

                {/* Voice button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isRecording
                      ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-100"
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  {isRecording ? "Listening..." : "Speak Issue (Voice)"}
                </button>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  selectedLang === "hi"
                    ? "यहां अपनी समस्या बताएं (जैसे: सड़क पर बड़ा गड्ढा है, पानी बह रहा है...)"
                    : selectedLang === "gu"
                      ? "અહીં તમારી સમસ્યા લખો..."
                      : "Describe the problem in detail. (e.g., 'There is a major water leak from the municipal connection on South Road. The footpath is flooded.')"
                }
                rows={3}
                className="w-full text-xs border border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {/* Photo upload container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  📷 Upload Photo (Supports AI Damage Check)
                </label>
                <div className="flex items-center gap-3">
                  {image ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                      <img
                        src={image}
                        alt="Report preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImage(null)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <svg
                        className="w-5 h-5 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-slate-400 leading-tight">
                    Add a clear picture. AI will scan for potholes, overflowing
                    garbage, and broken streetlights automatically.
                  </span>
                </div>
              </div>

              {/* AI Auto Classification Trigger */}
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleAIAnalyze}
                  disabled={analyzing || (!description && !image)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {analyzing ? (
                    <>
                      <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      AI Scanning Damage...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-indigo-100"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      ⚡ Scan & Autofill with AI
                    </>
                  )}
                </button>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* AI Generated / Editable Fields */}
            <div className="space-y-3 bg-slate-50/40 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Classification Details
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Generated Issue Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken streetlight on Lane 3 Sector B"
                  className="w-full text-xs border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      checkForDuplicates(lat, lng, e.target.value);
                    }}
                    className="w-full text-xs border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Responsible Dept
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Severity Priority
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency (Active Hazard)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Warning if Duplicate Detected */}
            {duplicateDetected && (
              <div className="p-3.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  ⚠️ Nearby Duplicate Detected!
                </p>
                <p className="text-[11px] text-yellow-700">
                  Another citizen has already reported{" "}
                  <strong>"{duplicateDetected.title}"</strong> (Status:{" "}
                  {duplicateDetected.status}) in this exact area. Upvoting it
                  raises priority instead of filing a new one.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-900 text-white font-semibold text-xs hover:bg-indigo-950 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>

        {/* Right pane: Map picker */}
        <div className="w-full md:w-1/2 bg-slate-50 p-6 md:p-8 flex flex-col border-t md:border-t-0 md:border-l border-slate-100 overflow-y-auto max-h-[92vh]">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-sm font-display tracking-tight flex items-center gap-1">
              📍 Geolocation Coordinate Selection
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Select the issue center on map. Coordinates map to ward
              authorities automatically.
            </p>
          </div>

          <div className="flex-1 min-h-[300px] mb-4">
            <InteractiveMap
              issues={issues}
              selectable={true}
              onLocationSelect={handleLocationSelected}
              defaultCenter={[19.076, 72.8777]}
            />
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200/80 space-y-1">
            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">
              Resolved Landmark
            </span>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {areaName}
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
              {address}
            </p>
            <span className="text-[10px] font-mono text-slate-400 block mt-1">
              Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
