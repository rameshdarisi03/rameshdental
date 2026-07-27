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
  status: "paid" | "pending" | "overdue" | "cancelled";
  paymentMethod: "UPI" | "Cash" | "Card" | "Insurance Claim" | "Net Banking";
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const CLINICAL_SERVICES_PRESETS = [
  { description: "Initial Physiotherapy Assessment", price: 120 },
  { description: "Biomechanical Gait & Posture Analysis", price: 150 },
  { description: "Dry Needling Therapy Session", price: 85 },
  { description: "Class IV Deep Tissue Laser Therapy", price: 110 },
  { description: "Custom Orthotics Fitting & Molding", price: 200 },
  { description: "Personalised Exercise Prescription", price: 90 },
  { description: "Follow-up Rehabilitation Session", price: 75 },
];

const INVOICES_COLLECTION = "invoices";

/**
 * Generate next invoice number e.g., INV-8821
 */
export function generateInvoiceNumber(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `INV-${randomNum}`;
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
    const sanitized = sanitizeFirestoreData(invoiceData);
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
 * Update Invoice Status (e.g., Mark as Paid)
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
 * Delete an Invoice
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
 * Subscribe to patient-specific invoices for Patient Hub
 */
export function subscribePatientInvoices(patientEmail: string, callback: (invoices: Invoice[]) => void) {
  if (!patientEmail) return () => {};
  const q = query(
    collection(db, INVOICES_COLLECTION), 
    where("patientEmail", "==", patientEmail.toLowerCase().trim())
  );
  return onSnapshot(q, (snapshot) => {
    const list: Invoice[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as Invoice));
    // Sort client-side by date
    list.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    callback(list);
  }, (err) => {
    console.error("Patient invoices real-time subscription error:", err);
  });
}
