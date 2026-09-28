import crypto from "crypto";

const DEFAULT_PROJECT_ID = "gpc01-8d819";
const DEFAULT_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@gpc01-8d819.iam.gserviceaccount.com";
const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzTUYwQ836Vesg
wqChhdBN+C7niy3uXvYLJ1+rfgvsP9tB2TI/SMl5qy3WExjzwEOEAW90xzv6mIb6
ca0yuWyHjKkAPvHw+GLO6W/PN8pLVsHo1d6yuO9U1lpxwUc3i55z+0QroV2l33rF
R+OAdCU+E0qFVHTclJUB/nyyz8Qnr/g2xdxUOwzclE7tjil41kJblfljnG0oxp+u
ZxGTmnVLiPH2Si5pgHd7B3ddP181/28hgdGg3AYvMPWC6SmArVSu+SWp9sagDCfJ
5donCFY71ANfPjxuN3TcT1XNMxAgfzIV3LNfcJWPNNvCyABzLYCVaekQVNaMkoWi
IKX8ZcQTAgMBAAECgf8a76j9hij7SqDmrNSHQDU4Q7QNxhvoj32t/BWPQt28L+4L
9xKOKbckAaumuSvuLOeeZ+4hY+8W6my56ZO8RC1jrwwTFFso43fc9wbTFKgnVUhT
f732+BHD61mSGoo2ljXjDfINB5QNTrgIADESYVyEZxVemmcrHUa1ABNw3nl2p/Gr
S369lFnQowV6EQFEJEhPuo5wKuscsiEaeRuaYjbulW9oJoi1LEoocKPPcqlh1oim
Z0dc3BQUQ2cfHkRZVvL4C7eN7QIVyYXZd62eTeTJZZQSBOPx3qBWsll7FehSgJ6q
mHAQdeN3lGzp8lm5T8ngGZmTjTpiTJars4+GHgUCgYEA26KoOQKlK4FJCH/O40UR
Yv5CfE53/S5Gh9LYwz1q4RztmeGWKZ7pVemoNgNCCzEIPMPaXQ8YMsims7Rrat44
QR/ke6Ta5c/h+hQZT8qeXMwo9IyVU+bOsmHti0Pg2gwIIImVyntWAQHxCnjC+nYi
K3fsOLSHmxr0Pxs0+5LBW60CgYEA0P0QCMXQ1rEbnltPRvVDZYoA2wW04ZjhV9Db
BO7qAzThx5iuZ5FVFDyNZ2KE+1b2Jtbgv4jWr0y2OWhe9lt6uLfbEY1ZZqMrvz36
oIYS3YFLVcDXLx9ocJmMXlthPY35FYtsq5hnFbmUNIvu60S98xQYKdEW8+FRAS0b
uYl3lr8CgYEAyq5ZyvJz9afC+8Ll6rjMCKxWMlw/Qja4A5NBUTqWLNMDOGQCrLnm
3c9X2TA8fBNtZJXgJsxNKmAb5e3yypXzF7YUpT1Ge5jREnQFv6pdZYlJqhMpoll2
GQthqIilMNK1lUEiJ86VWSyvgVhbpcHqWm66YMHH+gxvpOS4igetw6kCgYB7Xui4
RQ6jrqm/Mef6246Nwon+wb+l7boZPRION3utqOogCeHrAcBX0ecnwOD//rYQ94h1
iTIzCfYIrbRhel9X7DFGi0rbbDfHDa+GU5+PY2Q1m0Fsb/4Xeo2Cpi8hR05jiYr9
QVqZWJRE8NZ5zHrVpGcfSG9kSP6o0xgqzxvpwQKBgQC+x0PrrVPvLCpCodzk5hXS
EKGz8VTV5y5+iDsht5WFStslF+ZdrBAUxeJIptalTuFLIr7gscYSkOtnSdbMuIPH
OOMxb3aZXGebfa6wgFB+liy5JgYvi6SJjuhFW5BYm+W9znYQ2Lb5fzu/DCjZd/kB
7A7BKubaYps5bLqCMZNZFg==
-----END PRIVATE KEY-----
`;

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function getCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || DEFAULT_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.trim().replace(/^["']|["']$/g, "");
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return { projectId, clientEmail, privateKey };
}

export async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const { clientEmail, privateKey } = getCredentials();

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope:
      "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsignedJwt = `${b64(header)}.${b64(claimSet)}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  const signature = signer.sign(privateKey, "base64url");
  const assertion = `${unsignedJwt}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to obtain Google OAuth access token: ${errText}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return cachedToken.token;
}

export interface StaffUserData {
  uid: string;
  email: string;
  name?: string;
  role?: string;
  totpSecret?: string;
  totpEnabled?: boolean;
}

export async function getStaffUserByEmail(
  email: string
): Promise<StaffUserData | null> {
  const token = await getGoogleAccessToken();
  const { projectId } = getCredentials();
  const cleanEmail = email.trim().toLowerCase();

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: cleanEmail },
            },
          },
          limit: 1,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore query failed: ${errText}`);
  }

  const queryResults = await res.json();
  const firstDoc = queryResults[0]?.document;

  if (!firstDoc || !firstDoc.name) {
    return null;
  }

  const uid = firstDoc.name.split("/").pop() || "";
  const fields = firstDoc.fields || {};

  return {
    uid,
    email: fields.email?.stringValue || cleanEmail,
    name: fields.name?.stringValue,
    role: fields.role?.stringValue,
    totpSecret: fields.totpSecret?.stringValue,
    totpEnabled: fields.totpEnabled?.booleanValue,
  };
}

export async function updateUserPassword(
  uid: string,
  newPassword: string
): Promise<void> {
  const token = await getGoogleAccessToken();
  const { projectId } = getCredentials();

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        localId: uid,
        password: newPassword,
        returnSecureToken: false,
      }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `Failed to update password for account.`
    );
  }
}

export async function recordPasswordResetAudit(
  uid: string,
  email: string,
  ip: string,
  userAgent: string
): Promise<void> {
  try {
    const token = await getGoogleAccessToken();
    const { projectId } = getCredentials();
    const nowIso = new Date().toISOString();

    // 1. Update lastPasswordResetAt on the user's document
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=lastPasswordResetAt`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            lastPasswordResetAt: { timestampValue: nowIso },
          },
        }),
      }
    );

    // 2. Add an audit log entry
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/audit_logs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            action: { stringValue: "STAFF_PASSWORD_RESET_TOTP" },
            targetUid: { stringValue: uid },
            targetEmail: { stringValue: email },
            timestamp: { timestampValue: nowIso },
            ip: { stringValue: ip || "unknown" },
            userAgent: { stringValue: userAgent || "unknown" },
          },
        }),
      }
    );
  } catch (err) {
    console.error("[recordPasswordResetAudit non-fatal error]:", err);
  }
}
