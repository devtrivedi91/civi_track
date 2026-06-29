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

function cleanEnvValue(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function buildServiceAccountFromEnv() {
  const projectId = cleanEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKey = cleanEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    return {
      type: "service_account",
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  const base64Credentials = process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64;
  if (base64Credentials) {
    const decoded = Buffer.from(
      cleanEnvValue(base64Credentials),
      "base64",
    ).toString("utf8");
    return JSON.parse(decoded);
  }

  return null;
}

function loadServiceAccount(credentialsValue) {
  if (!credentialsValue) {
    throw new Error(
      "Firebase Admin credentials are not set. Provide FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY, or a JSON value/path in FIREBASE_ADMIN_CREDENTIALS.",
    );
  }

  const trimmedValue = cleanEnvValue(credentialsValue);

  if (trimmedValue.startsWith("{")) {
    return JSON.parse(trimmedValue);
  }

  const resolvedPath = path.isAbsolute(trimmedValue)
    ? trimmedValue
    : path.join(process.cwd(), trimmedValue);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Firebase Admin credentials file not found at ${resolvedPath}`,
    );
  }

  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

export function getAdminDb() {
  if (adminDb) return adminDb;

  const serviceAccount =
    buildServiceAccountFromEnv() ||
    loadServiceAccount(
      process.env.FIREBASE_ADMIN_CREDENTIALS || DEFAULT_SERVICE_ACCOUNT_PATH,
    );
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
