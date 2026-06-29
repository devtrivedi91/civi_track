import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  cert,
  getApps,
  initializeApp as initializeAdminApp,
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const DEFAULT_SERVICE_ACCOUNT_PATH =
  "vast-zone-472711-j5-firebase-adminsdk-fbsvc-17d2b4531a.json";
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..");

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

  const candidatePaths = path.isAbsolute(trimmedValue)
    ? [trimmedValue]
    : [
        path.resolve(MODULE_DIR, trimmedValue),
        path.resolve(REPO_ROOT, trimmedValue),
        path.resolve(process.cwd(), trimmedValue),
      ];

  const resolvedPath = candidatePaths.find((candidatePath) =>
    fs.existsSync(candidatePath),
  );

  if (!resolvedPath) {
    throw new Error(
      `Firebase Admin credentials file not found at ${candidatePaths[0]}`,
    );
  }

  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

function logAdminConfig(source, serviceAccount, databaseId) {
  console.log("[Firebase Admin] credential source:", source);
  console.log(
    "[Firebase Admin] project_id:",
    serviceAccount?.project_id ||
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      "MISSING",
  );
  console.log(
    "[Firebase Admin] FIREBASE_DATABASE_ID:",
    databaseId || "<default>",
  );
}

export function getAdminDb() {
  if (adminDb) return adminDb;

  const FIREBASE_DATABASE_ID = cleanEnvValue(process.env.FIREBASE_DATABASE_ID);
  const serviceAccountFromEnv = buildServiceAccountFromEnv();
  const serviceAccount =
    serviceAccountFromEnv ||
    loadServiceAccount(
      process.env.FIREBASE_ADMIN_CREDENTIALS || DEFAULT_SERVICE_ACCOUNT_PATH,
    );

  if (!serviceAccount.project_id && process.env.FIREBASE_ADMIN_PROJECT_ID) {
    serviceAccount.project_id = cleanEnvValue(
      process.env.FIREBASE_ADMIN_PROJECT_ID,
    );
  }

  logAdminConfig(
    serviceAccountFromEnv ? "env vars" : "credentials file/JSON",
    serviceAccount,
    FIREBASE_DATABASE_ID,
  );

  const adminApp = getApps().length
    ? getApps()[0]
    : initializeAdminApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

  console.log(
    `[Firebase Admin] Initialized with project_id: ${serviceAccount.project_id}, client_email: ${serviceAccount.client_email}`,
  );

  adminDb = FIREBASE_DATABASE_ID
    ? getAdminFirestore(adminApp, FIREBASE_DATABASE_ID)
    : getAdminFirestore(adminApp);
  adminDb.settings({ ignoreUndefinedProperties: true });
  return adminDb;
}
