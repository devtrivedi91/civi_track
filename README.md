<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9058f14f-cff7-45f2-bffc-29ef557ed2de

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set backend environment values in [backend/.env.local](backend/.env.local)
   - `GROQ_API_KEY` for AI features
   - `FIREBASE_ADMIN_CREDENTIALS` for the Firebase Admin service account JSON
   - `PORT` if you want a non-default backend port
   - `FIREBASE_DATABASE_ID` if you want to override the Firestore database ID
3. Run the app locally:
   - `npm run dev` to start both frontend and backend together
   - `npm run dev:frontend` to start only the Vite frontend
   - `npm run dev:backend` to start only the Express backend

You can also build separately:

- `npm run build:frontend`
- `npm run build:backend`

## Firebase Hosting

The frontend is configured to call the backend at `https://civi-track-tau.vercel.app` by default in production.

To deploy the frontend to Firebase Hosting:

1. Install the Firebase CLI if you do not have it yet: `npm install -g firebase-tools`
2. Sign in: `firebase login`
3. Select or create your Firebase project: `firebase use <your-firebase-project-id>`
4. Build the app with `npm run build:frontend`
5. Deploy with `firebase deploy --only hosting`

If you want the frontend to point to a different backend URL, set `VITE_API_BASE_URL` before building, for example:

`VITE_API_BASE_URL=https://your-backend.example.com npm run build:frontend`

## Vercel Backend Credentials

The backend can now read Firebase Admin credentials from environment variables, so you do not need to upload a JSON file to GitHub.

Add these variables in the Vercel backend project:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `FIREBASE_DATABASE_ID`

For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the private key text with newlines preserved or escaped as `\n`.

Alternative: set `FIREBASE_ADMIN_CREDENTIALS` to the full JSON service account content, or `FIREBASE_ADMIN_CREDENTIALS_BASE64` to a base64-encoded JSON string.
