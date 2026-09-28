import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getFirebaseAdmin() {
  const apps = getApps();
  let app: App;

  if (apps.length > 0) {
    app = apps[0];
  } else {
    const DEFAULT_PROJECT_ID = "gpc01-8d819";
    const DEFAULT_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@gpc01-8d819.iam.gserviceaccount.com";
    const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzTUYwQ836Vesg\nwqChhdBN+C7niy3uXvYLJ1+rfgvsP9tB2TI/SMl5qy3WExjzwEOEAW90xzv6mIb6\nca0yuWyHjKkAPvHw+GLO6W/PN8pLVsHo1d6yuO9U1lpxwUc3i55z+0QroV2l33rF\nR+OAdCU+E0qFVHTclJUB/nyyz8Qnr/g2xdxUOwzclE7tjil41kJblfljnG0oxp+u\nZxGTmnVLiPH2Si5pgHd7B3ddP181/28hgdGg3AYvMPWC6SmArVSu+SWp9sagDCfJ\n5donCFY71ANfPjxuN3TcT1XNMxAgfzIV3LNfcJWPNNvCyABzLYCVaekQVNaMkoWi\nIKX8ZcQTAgMBAAECgf8a76j9hij7SqDmrNSHQDU4Q7QNxhvoj32t/BWPQt28L+4L\n9xKOKbckAaumuSvuLOeeZ+4hY+8W6my56ZO8RC1jrwwTFFso43fc9wbTFKgnVUhT\nf732+BHD61mSGoo2ljXjDfINB5QNTrgIADESYVyEZxVemmcrHUa1ABNw3nl2p/Gr\nS369lFnQowV6EQFEJEhPuo5wKuscsiEaeRuaYjbulW9oJoi1LEoocKPPcqlh1oim\nZ0dc3BQUQ2cfHkRZVvL4C7eN7QIVyYXZd62eTeTJZZQSBOPx3qBWsll7FehSgJ6q\nmHAQdeN3lGzp8lm5T8ngGZmTjTpiTJars4+GHgUCgYEA26KoOQKlK4FJCH/O40UR\nYv5CfE53/S5Gh9LYwz1q4RztmeGWKZ7pVemoNgNCCzEIPMPaXQ8YMsims7Rrat44\nQR/ke6Ta5c/h+hQZT8qeXMwo9IyVU+bOsmHti0Pg2gwIIImVyntWAQHxCnjC+nYi\nK3fsOLSHmxr0Pxs0+5LBW60CgYEA0P0QCMXQ1rEbnltPRvVDZYoA2wW04ZjhV9Db\nBO7qAzThx5iuZ5FVFDyNZ2KE+1b2Jtbgv4jWr0y2OWhe9lt6uLfbEY1ZZqMrvz36\noIYS3YFLVcDXLx9ocJmMXlthPY35FYtsq5hnFbmUNIvu60S98xQYKdEW8+FRAS0b\nuYl3lr8CgYEAyq5ZyvJz9afC+8Ll6rjMCKxWMlw/Qja4A5NBUTqWLNMDOGQCrLnm\n3c9X2TA8fBNtZJXgJsxNKmAb5e3yypXzF7YUpT1Ge5jREnQFv6pdZYlJqhMpoll2\nGQthqIilMNK1lUEiJ86VWSyvgVhbpcHqWm66YMHH+gxvpOS4igetw6kCgYB7Xui4\nRQ6jrqm/Mef6246Nwon+wb+l7boZPRION3utqOogCeHrAcBX0ecnwOD//rYQ94h1\niTIzCfYIrbRhel9X7DFGi0rbbDfHDa+GU5+PY2Q1m0Fsb/4Xeo2Cpi8hR05jiYr9\nQVqZWJRE8NZ5zHrVpGcfSG9kSP6o0xgqzxvpwQKBgQC+x0PrrVPvLCpCodzk5hXS\nEKGz8VTV5y5+iDsht5WFStslF+ZdrBAUxeJIptalTuFLIr7gscYSkOtnSdbMuIPH\nOOMxb3aZXGebfa6wgFB+liy5JgYvi6SJjuhFW5BYm+W9znYQ2Lb5fzu/DCjZd/kB\n7A7BKubaYps5bLqCMZNZFg==\n-----END PRIVATE KEY-----\n`;

    const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || DEFAULT_PRIVATE_KEY;

    if (privateKey) {
      // Remove any wrapping quotes that might have been copied into Vercel UI
      privateKey = privateKey.trim().replace(/^["']|["']$/g, "");
      // Replace literal \n escape sequences with actual newlines
      privateKey = privateKey.replace(/\\n/g, "\n");
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
