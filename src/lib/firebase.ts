import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from "firebase/auth";

// Configuration from the auto-provisioned json
const firebaseConfig = {
  apiKey: "AIzaSyDdLvDolAKgpmgIm51SgtEVwOGARZXS4yM",
  authDomain: "vast-zone-472711-j5.firebaseapp.com",
  projectId: "vast-zone-472711-j5",
  storageBucket: "vast-zone-472711-j5.firebasestorage.app",
  messagingSenderId: "937329760960",
  appId: "1:937329760960:web:f19d2c4ab75337f5b06b25"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
};
