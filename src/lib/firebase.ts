import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBGwChtJ1s8gZIleg26Bx-EnIm_F2nTr_8",
  authDomain: "rameshdental-01.firebaseapp.com",
  projectId: "rameshdental-01",
  storageBucket: "rameshdental-01.firebasestorage.app",
  messagingSenderId: "821605955964",
  appId: "1:821605955964:web:09d3b932597fe0c0ca8cf9",
  measurementId: "G-WZG446PYRR"
};

// Initialize Firebase (safeguard for server-side rendering in Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics conditionally
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, auth, storage, analytics };
