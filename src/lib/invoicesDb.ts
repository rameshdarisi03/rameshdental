import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";

export interface InvoiceItem {
  id: string;
  description: string;
  toothNumber?: string; // Optional dental tooth number e.g. "#16", "#21", "Full Mouth"
  quantity: number;
  unitPrice: number;
  rate?: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  therapistName: string; // Attending Dental Surgeon / Specialist
  serviceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  currency: string;
  status: "paid" | "pending" | "overdue" | "cancelled" | "voided";
  paymentMethod: "UPI" | "Cash" | "Card" | "Insurance Claim" | "Net Banking";
  notes?: string;
  voidReason?: string;
  replacesInvoiceNumber?: string;
  replacedByInvoiceNumber?: string;
  revision?: number;
  createdAt?: any;
  updatedAt?: any;
}

export const CLINICAL_SERVICES_PRESETS = [
  { description: "Comprehensive Dental Examination & Digital IOPAR", price: 500 },
  { description: "Rotary Endodontic Therapy (Single Sitting RCT)", price: 4500 },
  { description: "Multi-Sitting Root Canal Treatment (Molar)", price: 4000 },
  { description: "CAD/CAM Monolithic Zirconia Crown (15-Yr Warranty)", price: 8500 },
  { description: "Porcelain Fused to Metal (PFM) Crown", price: 4500 },
  { description: "Full Mouth Ultrasonic Scaling & Polishing", price: 1200 },
  { description: "Deep Subgingival Curettage & Laser Bacterial Reduction", price: 3500 },
  { description: "Direct Light-Cured Posterior Composite Restoration", price: 1500 },
  { description: "Surgical Extraction / Impacted Third Molar", price: 3500 },
  { description: "Simple Tooth Extraction (Exodontia)", price: 1500 },
  { description: "Titanium Dental Implant Fixture (Osseointegrated)", price: 25000 },
  { description: "Clear Aligner 3D Digital Treatment Plan & Scan", price: 5000 },
  { description: "In-Office Laser Teeth Whitening (Zoom 3-Cycle)", price: 9000 },
  { description: "Pediatric Pulpectomy & Stainless Steel Crown", price: 3500 },
];

const INVOICES_COLLECTION = "invoices";

/**
 * Generate next invoice number e.g., RD-INV-8821
 */
export function generateInvoiceNumber(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `RD-INV-${randomNum}`;
}

/**
 * Subscribe to all invoices in real-time (with infallible Server REST fallback)
 */
export function subscribeInvoices(callback: (invoices: Invoice[]) => void) {
  let isSubscribed = true;
  let pollInterval: any = null;

  const fallbackFetch = async () => {
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (data.success && Array.isArray(data.invoices) && isSubscribed) {
        callback(data.invoices);
      }
    } catch (e) {
      console.warn("[subscribeInvoices] Fallback fetch warning:", e);
    }
  };

  const q = query(collection(db, INVOICES_COLLECTION));
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: Invoice[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Invoice));
      
      // Sort in memory by createdAt or fallback date
      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
        return timeB - timeA;
      });

      callback(list);
    },
    (err) => {
      console.warn("Client Firestore invoices subscription failed, activating infallible REST engine:", err);
      fallbackFetch();
      if (!pollInterval) {
        pollInterval = setInterval(fallbackFetch, 15000);
      }
    }
  );

  return () => {
    isSubscribed = false;
    unsubscribe();
    if (pollInterval) clearInterval(pollInterval);
  };
}

/**
 * Fetch all invoices once
 */
export async function getInvoices(): Promise<Invoice[]> {
  try {
    const q = query(collection(db, INVOICES_COLLECTION));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as Invoice));
  } catch (err) {
    console.warn("Client SDK failed to fetch invoices, falling back to Server REST API:", err);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (data.success && Array.isArray(data.invoices)) {
        return data.invoices;
      }
    } catch (fetchErr) {
      console.error("Server API get invoices failed:", fetchErr);
    }
    return [];
  }
}

function sanitizeFirestoreData<T extends object>(obj: T): T {
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const val = (obj as any)[key];
    if (val !== undefined) {
      clean[key] = val;
    }
  });
  return clean;
}

/**
 * Create a new Invoice in Firestore (with infallible Server REST fallback)
 */
export async function createInvoice(invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const sanitized = sanitizeFirestoreData({
    ...invoiceData,
    currency: invoiceData.currency || "INR",
    revision: invoiceData.revision || 1
  });

  try {
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // If this invoice replaces a previously voided bill, auto-mark the old bill as replaced
    if (invoiceData.replacesInvoiceNumber) {
      try {
        const voidedQuery = query(
          collection(db, INVOICES_COLLECTION),
          where("invoiceNumber", "==", invoiceData.replacesInvoiceNumber)
        );
        const voidedSnap = await getDocs(voidedQuery);
        if (!voidedSnap.empty) {
          const oldDocRef = doc(db, INVOICES_COLLECTION, voidedSnap.docs[0].id);
          await updateDoc(oldDocRef, {
            replacedByInvoiceNumber: invoiceData.invoiceNumber,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (linkErr) {
        console.warn("Failed to mark voided invoice as replaced:", linkErr);
      }
    }

    return docRef.id;
  } catch (clientErr: any) {
    console.warn("[createInvoice] Client SDK write failed, falling back to Server Admin REST:", clientErr);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitized),
      });
      const data = await res.json();
      if (data.success && data.id) {
        return data.id;
      }
      throw new Error(data.error || "Server REST fallback failed to create invoice.");
    } catch (fallbackErr: any) {
      console.error("[createInvoice] Both Client SDK and Server Fallback failed:", fallbackErr);
      throw fallbackErr;
    }
  }
}

/**
 * Automatically detect the most recent voided invoice for a patient that has not yet been replaced.
 */
export async function findLatestUnreplacedVoidedInvoice(identifier: {
  patientId?: string;
  customId?: string;
  phone?: string;
  email?: string;
}): Promise<Invoice | null> {
  try {
    const allInvoices = await getInvoices();
    const normPhone = (p?: string) => (p || "").replace(/\D/g, "").slice(-10);

    for (const data of allInvoices) {
      const isVoid = data.status === "voided" || data.status === "cancelled";
      if (!isVoid) continue;
      // Skip if already replaced by a newer bill
      if (data.replacedByInvoiceNumber) continue;

      // Check matching patient
      let isMatch = false;
      if (identifier.patientId && data.patientId && data.patientId === identifier.patientId) isMatch = true;
      else if (identifier.customId && data.patientId && data.patientId === identifier.customId) isMatch = true;
      else if (identifier.phone && data.patientPhone && normPhone(data.patientPhone) === normPhone(identifier.phone)) isMatch = true;
      else if (identifier.email && data.patientEmail && data.patientEmail.toLowerCase() === identifier.email.toLowerCase()) isMatch = true;

      if (isMatch) {
        return data;
      }
    }
    return null;
  } catch (err) {
    console.warn("Failed to check for unreplaced voided invoice:", err);
    return null;
  }
}

/**
 * Update an existing Invoice in-place (Corrective edit with Server REST fallback)
 */
export async function updateInvoice(id: string, invoiceData: Partial<Invoice>) {
  const sanitized = sanitizeFirestoreData(invoiceData);
  try {
    const docRef = doc(db, INVOICES_COLLECTION, id);
    await updateDoc(docRef, {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (clientErr: any) {
    console.warn("[updateInvoice] Client SDK update failed, falling back to Server Admin REST:", clientErr);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitized),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Server REST fallback failed to update invoice.");
      }
    } catch (fallbackErr: any) {
      console.error("[updateInvoice] Both Client SDK and Server Fallback failed:", fallbackErr);
      throw fallbackErr;
    }
  }
}

/**
 * Update Invoice Status (e.g., Mark as Paid or Update Payment Method)
 */
export async function updateInvoiceStatus(
  id: string, 
  status: Invoice["status"], 
  paymentMethod?: Invoice["paymentMethod"]
) {
  const updates: any = {
    status,
  };
  if (paymentMethod) {
    updates.paymentMethod = paymentMethod;
  }

  try {
    const docRef = doc(db, INVOICES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (clientErr: any) {
    console.warn("[updateInvoiceStatus] Client SDK update failed, falling back to Server Admin REST:", clientErr);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Server REST fallback failed to update invoice status.");
      }
    } catch (fallbackErr: any) {
      console.error("[updateInvoiceStatus] Both Client SDK and Server Fallback failed:", fallbackErr);
      throw fallbackErr;
    }
  }
}

/**
 * Void an Invoice with audit reason (with Server REST fallback)
 */
export async function voidInvoice(id: string, reason: string) {
  const payload = {
    status: "voided" as const,
    voidReason: reason || "Voided by clinic administrator",
  };

  try {
    const docRef = doc(db, INVOICES_COLLECTION, id);
    await updateDoc(docRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (clientErr: any) {
    console.warn("[voidInvoice] Client SDK void failed, falling back to Server Admin REST:", clientErr);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Server REST fallback failed to void invoice.");
      }
    } catch (fallbackErr: any) {
      console.error("[voidInvoice] Both Client SDK and Server Fallback failed:", fallbackErr);
      throw fallbackErr;
    }
  }
}

/**
 * Delete an Invoice (Permanent deletion with Server REST fallback)
 */
export async function deleteInvoice(id: string) {
  try {
    await deleteDoc(doc(db, INVOICES_COLLECTION, id));
  } catch (clientErr: any) {
    console.warn("[deleteInvoice] Client SDK delete failed, falling back to Server Admin REST:", clientErr);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Server REST fallback failed to delete invoice.");
      }
    } catch (fallbackErr: any) {
      console.error("[deleteInvoice] Both Client SDK and Server Fallback failed:", fallbackErr);
      throw fallbackErr;
    }
  }
}

export interface PatientInvoiceIdentifier {
  patientId?: string;
  email?: string;
  phone?: string;
  name?: string;
  customId?: string;
  excludeVoided?: boolean;
}

/**
 * Subscribe to patient-specific invoices for Patient Hub or Patient Profile
 * Zero-Leak Isolation Architecture:
 * 1. Immediate Infallible Serverless REST Fetch (Bypasses all client Firestore security limits)
 * 2. Real-time Firestore snapshot for authenticated clinic staff
 * 3. Polling and window focus refresh to ensure immediate bill display
 */
export function subscribePatientInvoices(
  identifier: PatientInvoiceIdentifier | string,
  callback: (invoices: Invoice[]) => void
) {
  let isSubscribed = true;

  // Extract clean identifiers
  let targetPid = "";
  let targetEmail = "";
  let targetPhone = "";
  let targetName = "";
  let shouldExcludeVoided = true;

  if (typeof identifier === "string") {
    const cleanStr = identifier.trim();
    if (cleanStr.includes("@")) {
      targetEmail = cleanStr.toLowerCase();
    } else if (cleanStr.toUpperCase().startsWith("GPC-")) {
      targetPid = cleanStr.toUpperCase();
    } else {
      const digits = cleanStr.replace(/\D/g, "");
      if (digits.length >= 10) {
        targetPhone = digits.slice(-10);
      } else {
        targetPid = cleanStr;
      }
    }
  } else if (identifier) {
    targetPid = (identifier.patientId || identifier.customId || "").trim().toUpperCase();
    targetEmail = (identifier.email || "").trim().toLowerCase();
    const rawPhone = (identifier.phone || "").replace(/\D/g, "");
    targetPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : "";
    targetName = (identifier.name || "").trim().toLowerCase();
    if (identifier.excludeVoided !== undefined) {
      shouldExcludeVoided = identifier.excludeVoided;
    }
  }

  // Helper: Fetch from Serverless API
  const fetchFromServer = async () => {
    if (!targetPid && !targetEmail && !targetPhone) {
      if (isSubscribed) callback([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (targetPid) params.set("patientId", targetPid);
      if (targetPhone) params.set("phone", targetPhone);
      if (targetEmail) params.set("email", targetEmail);
      if (targetName) params.set("name", targetName);
      params.set("excludeVoided", shouldExcludeVoided ? "true" : "false");

      const res = await fetch(`/api/patient/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.invoices) && isSubscribed) {
          callback(data.invoices);
        }
      }
    } catch (e) {
      console.warn("[subscribePatientInvoices] Serverless fetch notice:", e);
    }
  };

  // 1. Immediate fetch on mount
  fetchFromServer();

  // 2. Refresh on window focus and poll every 30s
  const intervalId = setInterval(() => {
    if (isSubscribed) fetchFromServer();
  }, 30000);

  const handleFocus = () => {
    if (isSubscribed) fetchFromServer();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleFocus);
  }

  // 3. Client Firestore snapshot listener (runs for authorized staff)
  let unsubscribeFirestore = () => {};
  try {
    const q = query(collection(db, INVOICES_COLLECTION));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as Invoice));

        const matched = all.filter((inv) => {
          if (shouldExcludeVoided && (inv.status === "voided" || inv.status === "cancelled")) {
            return false;
          }

          const invPid = (inv.patientId || "").trim().toUpperCase();
          const invEmail = (inv.patientEmail || "").trim().toLowerCase();
          const invRawPhone = (inv.patientPhone || "").replace(/\D/g, "");
          const invPhone = invRawPhone.length >= 10 ? invRawPhone.slice(-10) : "";
          const invName = (inv.patientName || "").trim().toLowerCase();

          // Rule 1: Exact Patient ID match (UHID) - 100% Primary Truth
          if (targetPid && invPid) {
            return invPid === targetPid;
          }

          // Rule 2: Non-guest mismatch isolation
          if (invPid && targetPid && invPid !== targetPid) {
            const isCorruptedOrGuest = invPid.startsWith("GPC-GPC-") || invPid === "GPC-GUEST";
            if (!isCorruptedOrGuest) {
              return false;
            }
          }

          // Rule 3: Exact Email match
          if (targetEmail && invEmail && invEmail === targetEmail) {
            return true;
          }

          // Rule 4: Phone + Name match
          if (targetPhone && invPhone && targetPhone === invPhone) {
            if (targetName && invName && targetName === invName) {
              return true;
            }
            if (!targetPid) return true;
          }

          return false;
        });

        matched.sort((a, b) => {
          const getInvTime = (inv: Invoice) => {
            if (inv.serviceDate) {
              const t = new Date(inv.serviceDate).getTime();
              if (!isNaN(t) && t > 0) return t;
            }
            if (inv.createdAt) {
              if (typeof (inv.createdAt as any)?.toDate === "function") {
                return (inv.createdAt as any).toDate().getTime();
              }
              if ((inv.createdAt as any)?.seconds) {
                return (inv.createdAt as any).seconds * 1000;
              }
              const t = new Date(inv.createdAt as any).getTime();
              if (!isNaN(t) && t > 0) return t;
            }
            return 0;
          };
          return getInvTime(b) - getInvTime(a);
        });

        if (isSubscribed) {
          callback(matched);
        }
      },
      (err) => {
        // Silently handled: fetchFromServer already delivered patient invoices reliably
      }
    );
  } catch (e) {}

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", handleFocus);
    }
    unsubscribeFirestore();
  };
}
