import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCQr7HOAM0NnwWNew19VIs6L4rJ7VL0ML4",
  authDomain: "gpc01-8d819.firebaseapp.com",
  projectId: "gpc01-8d819",
  storageBucket: "gpc01-8d819.firebasestorage.app",
  messagingSenderId: "1077120656605",
  appId: "1:1077120656605:web:8fc3bb1a96fb07ecffa734",
  measurementId: "G-ZW685QGBR6"
};

// Initialize Firebase (safeguard for server-side rendering in Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics conditionally
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, auth, analytics };
