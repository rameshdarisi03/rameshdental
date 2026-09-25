import { getApps, initializeApp, cert, App } from "firebase-admin/app";
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

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY)."
      );
    }

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
