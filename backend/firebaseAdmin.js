import fs from "fs";
import path from "path";
import {
  cert,
  getApps,
  initializeApp as initializeAdminApp,
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const FIREBASE_DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID ||
  "ai-studio-9058f14f-cff7-45f2-bffc-29ef557ed2de";
const DEFAULT_SERVICE_ACCOUNT_PATH =
  "vast-zone-472711-j5-firebase-adminsdk-fbsvc-17d2b4531a.json";

let adminDb = null;

export function getAdminDb() {
  if (adminDb) return adminDb;

  const serviceAccountPath =
    process.env.FIREBASE_ADMIN_CREDENTIALS || DEFAULT_SERVICE_ACCOUNT_PATH;
  const resolvedPath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Firebase Admin credentials file not found at ${resolvedPath}`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  const adminApp = getApps().length
    ? getApps()[0]
    : initializeAdminApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

  adminDb = getAdminFirestore(adminApp, FIREBASE_DATABASE_ID);
  adminDb.settings({ ignoreUndefinedProperties: true });
  return adminDb;
}
