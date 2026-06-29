import express from "express";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth as getClientAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getAdminDb } from "../firebaseAdmin.js";

const router = express.Router();

const firebaseConfig = {
  apiKey: "AIzaSyDdLvDolAKgpmgIm51SgtEVwOGARZXS4yM",
  authDomain: "vast-zone-472711-j5.firebaseapp.com",
  projectId: "vast-zone-472711-j5",
  storageBucket: "vast-zone-472711-j5.firebasestorage.app",
  messagingSenderId: "937329760960",
  appId: "1:937329760960:web:f19d2c4ab75337f5b06b25",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const clientAuth = getClientAuth(app);

// Helper for sending user data
const USER_ROLES = new Set(["Citizen", "Moderator", "Officer", "Admin"]);

function isFirestoreUnavailable(error) {
  return (
    error?.code === 5 ||
    error?.code === "5" ||
    error?.status === 404 ||
    String(error?.message || "").includes("NOT_FOUND") ||
    String(error?.message || "")
      .toLowerCase()
      .includes("not found")
  );
}

function sanitizeUserPayload(input, uid) {
  const role = USER_ROLES.has(input.role) ? input.role : "Citizen";
  return {
    uid,
    name:
      typeof input.name === "string"
        ? input.name.slice(0, 120)
        : "Community Member",
    email: typeof input.email === "string" ? input.email.slice(0, 180) : "",
    role,
    location:
      typeof input.location === "string"
        ? input.location.slice(0, 140)
        : "Local Ward",
    profilePhoto:
      typeof input.profilePhoto === "string" ? input.profilePhoto : undefined,
    points: Number.isFinite(input.points)
      ? Math.max(0, Math.min(input.points, 100000))
      : 0,
    badges: Array.isArray(input.badges) ? input.badges.slice(0, 20) : [],
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt
        : new Date().toISOString(),
  };
}

function buildFallbackProfile(email, uid, extraFields = {}) {
  return sanitizeUserPayload(
    {
      name: email.split("@")[0].toUpperCase(),
      email,
      role: "Citizen",
      location: "Ward 4 - Sector C",
      points: 10,
      badges: ["Community Helper"],
      createdAt: new Date().toISOString(),
      ...extraFields,
    },
    uid,
  );
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role, ward } = req.body;
    const cred = await createUserWithEmailAndPassword(
      clientAuth,
      email,
      password,
    );

    // Save to Firestore via Admin SDK
    const newUser = sanitizeUserPayload(
      {
        name: name || "New Citizen",
        email,
        role,
        location: ward || "Ward 4 - Sector C",
        points: 10,
        badges: ["Community Helper"],
        createdAt: new Date().toISOString(),
      },
      cred.user.uid,
    );

    try {
      await getAdminDb()
        .collection("users")
        .doc(cred.user.uid)
        .set(newUser, { merge: true });
    } catch (error) {
      if (!isFirestoreUnavailable(error)) {
        throw error;
      }
      console.warn(
        "Firestore unavailable during register; returning fallback profile.",
      );
    }

    res.json({ user: newUser, degradedMode: true });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const cred = await signInWithEmailAndPassword(clientAuth, email, password);

    let savedProfile = null;

    try {
      // Fetch profile
      const userDoc = await getAdminDb()
        .collection("users")
        .doc(cred.user.uid)
        .get();

      if (userDoc.exists) {
        savedProfile = userDoc.data();
      } else {
        // Fallback if missing
        savedProfile = buildFallbackProfile(email, cred.user.uid);
        await getAdminDb()
          .collection("users")
          .doc(cred.user.uid)
          .set(savedProfile, { merge: true });
      }
    } catch (error) {
      if (!isFirestoreUnavailable(error)) {
        throw error;
      }

      console.warn(
        "Firestore unavailable during login; returning fallback profile.",
      );
      savedProfile = buildFallbackProfile(email, cred.user.uid);
    }

    res.json({ user: savedProfile, uid: cred.user.uid, degradedMode: true });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ error: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    await sendPasswordResetEmail(clientAuth, email);
    res.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
