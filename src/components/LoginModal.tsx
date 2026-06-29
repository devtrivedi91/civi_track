import React, { useState } from "react";
import { UserProfile, UserRole } from "../types";
import { initialMockUsers } from "../lib/mockData";
import { auth } from "../lib/firebase";
import { apiUrl } from "../lib/api";
interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

function getAuthErrorMessage(error: any) {
  switch (error?.code) {
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled for this Firebase project. Enable it in Firebase Console > Authentication > Sign-in method.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect, or this account has not been created yet. For demo access, use one of the quick role buttons below.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Try logging in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "The Firebase API key is not valid for this project. Check src/lib/firebase.ts and firebase-applet-config.json.";
    case "permission-denied":
      return "Firebase denied access to the user profile document. Deploy Firestore rules for the configured database.";
    default:
      return error?.message || "Authentication failed. Please try again.";
  }
}

async function saveUserProfile(user: UserProfile) {
  const response = await fetch(apiUrl(`/api/users/${user.uid}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to save user profile.");
  }
}

async function loadUserProfile(uid: string) {
  const response = await fetch(apiUrl(`/api/users/${uid}`));
  if (response.status === 404) return null;

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to load user profile.");
  }
  return data.user as UserProfile;
}

export default function LoginModal({
  onClose,
  onLoginSuccess,
}: LoginModalProps) {
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("Citizen");
  const [ward, setWard] = useState("Ward 4 - Sector C");

  // Fast-testing selector for judges/evaluators
  const handleMockLogin = (mockUser: UserProfile) => {
    onLoginSuccess(mockUser);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tab === "forgot") {
        const response = await fetch(apiUrl("/api/auth/forgot-password"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!response.ok) throw new Error((await response.json()).error);
        alert(`Password reset link sent to ${email} successfully!`);
        setTab("login");
        return;
      }

      if (tab === "register") {
        const response = await fetch(apiUrl("/api/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, role, ward }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        onLoginSuccess(data.user);
        onClose();
        return;
      }

      // Standard Login
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      console.error("Authentication failed:", err);
      alert("Authentication failed: " + getAuthErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden font-sans p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login modal"
          className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <span className="text-xl leading-none">×</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold font-display tracking-tight text-slate-800 flex items-center justify-center gap-2">
            🛡️ Community Hero AI Login
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Join the civic revolution and build cleaner neighborhoods.
          </p>
        </div>

        {/* Tab switcher */}
        {tab !== "forgot" && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-500 mb-6">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${tab === "login" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-800"}`}
            >
              Log In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${tab === "register" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-800"}`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Testing Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-xl px-2 py-2.5 focus:outline-none"
                  >
                    <option value="Citizen">Citizen</option>
                    <option value="Officer">Municipal Officer</option>
                    <option value="Admin">Administrator</option>
                    <option value="Moderator">Moderator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Ward *
                  </label>
                  <select
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-xl px-2 py-2.5 focus:outline-none"
                  >
                    <option value="Ward 4 - Sector C">Ward 4</option>
                    <option value="Ward 12 - Metro Crossing">Ward 12</option>
                    <option value="Ward 9 - East Residential">Ward 9</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@community.org"
              className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {tab !== "forgot" && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Password *
                </label>
                {tab === "login" && (
                  <button
                    type="button"
                    onClick={() => setTab("forgot")}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-900 text-white font-semibold text-xs py-2.5 rounded-xl hover:bg-indigo-950 shadow-md transition-all cursor-pointer text-center"
            >
              {tab === "forgot"
                ? "Send Link"
                : tab === "register"
                  ? "Sign Up"
                  : "Log In"}
            </button>
          </div>
        </form>

        {/* FAST TRIAL SWITCHER FOR EVALUATORS */}
        <hr className="border-slate-150 my-5" />

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2.5">
          <span className="text-[9px] uppercase font-bold text-indigo-600 tracking-wider block">
            ⚡ Hackathon Judge Quick Role Sandbox
          </span>
          <p className="text-[10px] text-slate-500 leading-snug">
            Click any account below to instantly switch roles and inspect
            municipal officer queues, admin dashboards, or citizen gamification
            profiles without registering.
          </p>

          <div className="flex flex-col gap-1.5">
            {initialMockUsers.map((mUser) => (
              <button
                key={mUser.uid}
                onClick={() => handleMockLogin(mUser)}
                type="button"
                className="w-full text-left bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl px-3 py-2 text-xs transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-800 block">
                    {mUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {mUser.email}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                    mUser.role === "Admin"
                      ? "bg-red-50 text-red-700"
                      : mUser.role === "Officer"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {mUser.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
