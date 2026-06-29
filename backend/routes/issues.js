import express from "express";
import { getAdminDb } from "../firebaseAdmin.js";

const router = express.Router();

const ISSUE_STATUSES = new Set([
  "Reported",
  "Verified",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
]);

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeIssuePayload(input, issueId) {
  if (!isPlainObject(input)) {
    throw new Error("Issue payload must be an object.");
  }

  const safe = {};
  const allowedKeys = [
    "issueId",
    "title",
    "description",
    "category",
    "severity",
    "urgency",
    "status",
    "images",
    "videos",
    "location",
    "reporterId",
    "reporterName",
    "verificationScore",
    "upvotes",
    "evidenceCount",
    "createdAt",
    "department",
    "timeline",
    "isEmergency",
    "emergencyType",
    "qrCode",
    "voiceUrl",
    "duplicateOf",
    "resolutionNotes",
  ];

  for (const key of allowedKeys) {
    if (input[key] !== undefined) safe[key] = input[key];
  }

  if (issueId) safe.issueId = issueId;
  if (!safe.issueId || typeof safe.issueId !== "string") {
    throw new Error("issueId is required.");
  }
  if (safe.status && !ISSUE_STATUSES.has(safe.status)) {
    throw new Error("Invalid issue status.");
  }
  if (safe.title && typeof safe.title === "string")
    safe.title = safe.title.slice(0, 140);
  if (safe.description && typeof safe.description === "string")
    safe.description = safe.description.slice(0, 3001);
  if (Array.isArray(safe.images)) safe.images = safe.images.slice(0, 5);
  if (Array.isArray(safe.videos)) safe.videos = safe.videos.slice(0, 3);
  if (Array.isArray(safe.upvotes)) safe.upvotes = safe.upvotes.slice(0, 1000);
  if (Array.isArray(safe.timeline)) safe.timeline = safe.timeline.slice(0, 100);

  return safe;
}

router.get("/", async (_req, res) => {
  try {
    const snapshot = await getAdminDb().collection("issues").get();
    const issues = snapshot.docs
      .map((docSnap) => docSnap.data())
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

    res.json({ issues });
  } catch (error) {
    console.error("Error loading issues with Firebase Admin:", error);
    res.status(500).json({ error: error.message || "Unable to load issues." });
  }
});

router.post("/", async (req, res) => {
  try {
    const issue = sanitizeIssuePayload(req.body);

    await getAdminDb()
      .collection("issues")
      .doc(issue.issueId)
      .set(issue, { merge: true });
    res.json({ issue });
  } catch (error) {
    console.error("Error saving issue with Firebase Admin:", error);
    res.status(500).json({ error: error.message || "Unable to save issue." });
  }
});

router.patch("/:issueId", async (req, res) => {
  try {
    const updates = sanitizeIssuePayload(req.body, req.params.issueId);
    await getAdminDb()
      .collection("issues")
      .doc(req.params.issueId)
      .set(updates, { merge: true });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating issue with Firebase Admin:", error);
    res.status(500).json({ error: error.message || "Unable to update issue." });
  }
});

export default router;
