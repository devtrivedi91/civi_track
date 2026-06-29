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
