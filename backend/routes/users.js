import express from "express";
import { runFirestoreOperation } from "../firebaseAdmin.js";

const router = express.Router();

const USER_ROLES = new Set(["Citizen", "Moderator", "Officer", "Admin"]);

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeUserPayload(input, uid) {
  if (!isPlainObject(input)) {
    throw new Error("User payload must be an object.");
  }

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

router.get("/:uid", async (req, res) => {
  try {
    const userDoc = await runFirestoreOperation((db) =>
      db.collection("users").doc(req.params.uid).get(),
    );
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    res.json({ user: userDoc.data() });
  } catch (error) {
    console.error("Error loading user with Firebase Admin:", error);
    res.status(500).json({ error: error.message || "Unable to load user." });
  }
});

router.put("/:uid", async (req, res) => {
  try {
    const user = sanitizeUserPayload(req.body, req.params.uid);
    await runFirestoreOperation((db) =>
      db.collection("users").doc(req.params.uid).set(user, { merge: true }),
    );
    res.json({ user });
  } catch (error) {
    console.error("Error saving user with Firebase Admin:", error);
    res.status(500).json({ error: error.message || "Unable to save user." });
  }
});

export default router;
