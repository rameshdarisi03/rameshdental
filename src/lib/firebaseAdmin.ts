import { getApps, initializeApp, cert } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getFirebaseAdmin() {
  const apps = getApps();
  let app: App;

  if (apps.length > 0) {
    app = apps[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "[Firebase Admin] Missing required credentials in environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)."
      );
    }

    // Remove any wrapping quotes that might have been copied into Vercel UI
    privateKey = privateKey.trim().replace(/^["']|["']$/g, "");
    // Replace literal \n escape sequences with actual newlines
    privateKey = privateKey.replace(/\\n/g, "\n");

    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}
