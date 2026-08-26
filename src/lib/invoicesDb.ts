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

/**
 * Subscribe to patient-specific invoices for Patient Hub or Patient Profile
 * Matches by patientId, patientEmail, patientPhone, or custom PID
 */
export function subscribePatientInvoices(
  identifier: { patientId?: string; email?: string; phone?: string; customId?: string } | string,
  callback: (invoices: Invoice[]) => void
) {
  const q = query(collection(db, INVOICES_COLLECTION));
  
  return onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as Invoice));

    const matched = all.filter((inv) => {
      if (typeof identifier === "string") {
        const idStr = identifier.toLowerCase().trim();
        if (!idStr) return false;
        return (
          (inv.patientEmail && inv.patientEmail.toLowerCase().trim() === idStr) ||
          (inv.patientId && inv.patientId.toLowerCase().trim() === idStr) ||
          (inv.patientPhone && inv.patientPhone.replace(/\D/g, "").includes(idStr.replace(/\D/g, "")))
        );
      }

      const { patientId, email, phone, customId } = identifier;
      if (patientId && inv.patientId === patientId) return true;
      if (customId && inv.patientId === customId) return true;
      if (email && inv.patientEmail && inv.patientEmail.toLowerCase().trim() === email.toLowerCase().trim()) return true;
      if (phone && inv.patientPhone) {
        const p1 = phone.replace(/\D/g, "");
        const p2 = inv.patientPhone.replace(/\D/g, "");
        if (p1 && p2 && (p1.endsWith(p2) || p2.endsWith(p1))) return true;
      }
      return false;
    });

    // Sort client-side by serviceDate or createdAt descending
    matched.sort((a, b) => {
      const timeA = new Date(a.serviceDate || a.createdAt).getTime();
      const timeB = new Date(b.serviceDate || b.createdAt).getTime();
      return timeB - timeA;
    });

    callback(matched);
  }, (err) => {
    console.error("Patient invoices real-time subscription error:", err);
  });
}
