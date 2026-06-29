import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { demoAuthAccounts, initialMockIssues, initialMockUsers, mockLeaderboard } from "../src/lib/mockData";

dotenv.config();

const FIREBASE_DATABASE_ID = "ai-studio-9058f14f-cff7-45f2-bffc-29ef557ed2de";
const DEFAULT_SERVICE_ACCOUNT_PATH = "vast-zone-472711-j5-firebase-adminsdk-fbsvc-17d2b4531a.json";

function loadServiceAccount() {
  const serviceAccountPath = process.env.FIREBASE_ADMIN_CREDENTIALS || DEFAULT_SERVICE_ACCOUNT_PATH;
  const resolvedPath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Firebase Admin credentials file not found at ${resolvedPath}`);
  }

  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

async function upsertAuthUser(account: { uid: string; email: string; password: string }, displayName: string) {
  const auth = getAuth();
  try {
    await auth.createUser({
      uid: account.uid,
      email: account.email,
      password: account.password,
      displayName,
      emailVerified: true
    });
  } catch (error: any) {
    if (error?.code !== "auth/uid-already-exists" && error?.code !== "auth/email-already-exists") {
      throw error;
    }

    const existing = error?.code === "auth/email-already-exists"
      ? await auth.getUserByEmail(account.email)
      : await auth.getUser(account.uid);

    await auth.updateUser(existing.uid, {
      email: account.email,
      password: account.password,
      displayName,
      emailVerified: true
    });
  }

  const user = initialMockUsers.find((entry) => entry.uid === account.uid);
  if (user) {
    await auth.setCustomUserClaims(account.uid, { role: user.role });
  }
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

  const db = getFirestore(app, FIREBASE_DATABASE_ID);
  const batch = db.batch();

  for (const user of initialMockUsers) {
    const account = demoAuthAccounts.find((entry) => entry.uid === user.uid);
    if (account) {
      await upsertAuthUser(account, user.name);
    }
    batch.set(db.collection("users").doc(user.uid), user, { merge: true });
  }

  for (const issue of initialMockIssues) {
    batch.set(db.collection("issues").doc(issue.issueId), issue, { merge: true });
  }

  for (const entry of mockLeaderboard) {
    batch.set(db.collection("leaderboard").doc(entry.userId), entry, { merge: true });
  }

  await batch.commit();

  console.log("Seeded demo Firebase Auth users and Firestore collections.");
  console.log("Demo password for all seeded accounts: Demo@12345");
  console.log("Hackathon admin: hackathon.admin@communityhero.ai");
}

main().catch((error) => {
  console.error("Failed to seed demo data:", error);
  process.exit(1);
});
