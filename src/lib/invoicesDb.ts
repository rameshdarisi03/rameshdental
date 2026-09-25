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
  therapistName: string;
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
  revision?: number;
  createdAt?: any;
  updatedAt?: any;
}

export const CLINICAL_SERVICES_PRESETS = [
  { description: "Initial Physiotherapy Assessment", price: 600 },
  { description: "Follow-up Rehabilitation Session", price: 500 },
  { description: "Biomechanical Gait & Posture Analysis", price: 1000 },
  { description: "Dry Needling Therapy Session", price: 800 },
  { description: "Class IV Deep Tissue Laser Therapy", price: 1200 },
  { description: "IFT / TENS + Ultrasound Electrotherapy", price: 500 },
  { description: "Custom Orthotics Fitting & Molding", price: 2500 },
  { description: "Personalised Exercise Prescription & Home Plan", price: 750 },
  { description: "Home Care Visit / Geriatric Mobility Session", price: 1500 },
];

const INVOICES_COLLECTION = "invoices";

/**
 * Generate next invoice number e.g., GPC-INV-8821
 */
export function generateInvoiceNumber(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `GPC-INV-${randomNum}`;
}

/**
 * Subscribe to all invoices in real-time
 */
export function subscribeInvoices(callback: (invoices: Invoice[]) => void) {
  const q = query(collection(db, INVOICES_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Invoice[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Invoice));
      
      // Sort in memory by createdAt or fallback date
      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || Date.now());
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || Date.now());
        return timeB - timeA;
      });

      callback(list);
    },
    (err) => {
      console.error("Error subscribing to invoices:", err);
    }
  );
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
    console.error("Error fetching invoices:", err);
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
 * Create a new Invoice in Firestore
 */
export async function createInvoice(invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
  try {
    const sanitized = sanitizeFirestoreData({
      ...invoiceData,
      currency: invoiceData.currency || "INR",
      revision: invoiceData.revision || 1
    });
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating invoice:", err);
    throw err;
  }
}

/**
 * Update an existing Invoice in-place (Corrective edit)
 */
export async function updateInvoice(id: string, invoiceData: Partial<Invoice>) {
  try {
    const docRef = doc(db, INVOICES_COLLECTION, id);
    const sanitized = sanitizeFirestoreData(invoiceData);
    await updateDoc(docRef, {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error updating invoice:", err);
    throw err;
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
  try {
    const docRef = doc(db, INVOICES_COLLECTION, id);
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (paymentMethod) {
      updates.paymentMethod = paymentMethod;
    }
    await updateDoc(docRef, updates);
  } catch (err) {
    console.error("Error updating invoice status:", err);
    throw err;
  }
}

/**
 * Void an Invoice with audit reason
 */
export async function voidInvoice(id: string, reason: string) {
  try {
    const docRef = doc(db, INVOICES_COLLECTION, id);
    await updateDoc(docRef, {
      status: "voided",
      voidReason: reason || "Voided by clinic administrator",
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error voiding invoice:", err);
    throw err;
  }
}

/**
 * Delete an Invoice (Permanent deletion)
 */
export async function deleteInvoice(id: string) {
  try {
    await deleteDoc(doc(db, INVOICES_COLLECTION, id));
  } catch (err) {
    console.error("Error deleting invoice:", err);
    throw err;
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
 * 1. Primary: Exact patientId match (SSOT UHID)
 * 2. Strict barrier: If invoice has patientId and it doesn't match targetPid, REJECT.
 * 3. Fallback: Exact email match OR (Last 10 digits of phone AND exact name match)
 * NEVER uses partial phone matching or includes("").
 */
export function subscribePatientInvoices(
  identifier: PatientInvoiceIdentifier | string,
  callback: (invoices: Invoice[]) => void
) {
  const q = query(collection(db, INVOICES_COLLECTION));
  
  return onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as Invoice));

    let targetPid = "";
    let targetEmail = "";
    let targetPhone = "";
    let targetName = "";

    if (typeof identifier === "string") {
      const cleanStr = identifier.trim();
      if (!cleanStr) {
        callback([]);
        return;
      }
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
    }

    if (!targetPid && !targetEmail && !targetPhone) {
      callback([]);
      return;
    }

    const shouldExcludeVoided = typeof identifier !== "string" && Boolean(identifier?.excludeVoided);

    const matched = all.filter((inv) => {
      // If excludeVoided is requested (e.g., Patient Hub app), omit voided/cancelled invoices
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

      // Rule 2: If invoice has a valid patientId, but target didn't match it, DO NOT leak across family members
      if (invPid && targetPid && invPid !== targetPid) {
        const isCorruptedOrGuest = invPid.startsWith("GPC-GPC-") || invPid === "GPC-GUEST";
        if (!isCorruptedOrGuest) {
          return false;
        }
      }

      // Rule 3: Exact Email match (Only if both non-empty and invoice has no conflicting patientId)
      if (targetEmail && invEmail && invEmail === targetEmail) {
        return true;
      }

      // Rule 4: Phone + Name match for legacy invoices (Only if both phone AND name match)
      if (targetPhone && invPhone && targetPhone === invPhone) {
        if (targetName && invName && targetName === invName) {
          return true;
        }
      }

      return false;
    });

    // Sort client-side by serviceDate or createdAt descending safely
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

    callback(matched);
  }, (err) => {
    console.error("Patient invoices real-time subscription error:", err);
  });
}
