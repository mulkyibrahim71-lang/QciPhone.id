import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// Critical: The app will break without specifying the correct databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut };

// Helper to upload profile avatar to Firebase Storage
export async function uploadUserProfileImage(uid: string, file: File): Promise<string> {
  const fileRef = ref(storage, `users/${uid}/profile/avatar.jpg`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

// Type definition matching src/types.ts
import { Transaction } from "./types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error Exception Logged:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Sanitizer: ganti semua undefined -> null agar Firestore tidak crash
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    clean[key] = sanitizeForFirestore(value);
  }
  return clean;
}

// Dynamic Firestore accessors with strict isolation
export async function saveFirebaseTransaction(uid: string, tx: Transaction) {
  const path = `users/${uid}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, "users", uid, "transactions", tx.id);
    await setDoc(docRef, sanitizeForFirestore({
      ...tx,
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.error("Firestore save exception:", err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteFirebaseTransaction(uid: string, txId: string) {
  const path = `users/${uid}/transactions/${txId}`;
  try {
    const docRef = doc(db, "users", uid, "transactions", txId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Firestore delete exception:", err);
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getFirebaseTransactions(uid: string): Promise<Transaction[]> {
  const path = `users/${uid}/transactions`;
  try {
    const collRef = collection(db, "users", uid, "transactions");
    const snapshot = await getDocs(collRef);
    const txs: Transaction[] = [];
    snapshot.forEach((doc) => {
      txs.push(doc.data() as Transaction);
    });
    // Urutkan dari transaksi terbaru ke terlama
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return txs;
  } catch (err) {
    console.error("Firestore read exception:", err);
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveFirebaseSettings(uid: string, settings: any) {
  const path = `users/${uid}/settings/shop`;
  try {
    const docRef = doc(db, "users", uid, "settings", "shop");
    await setDoc(docRef, settings);
  } catch (err) {
    console.error("Firestore settings save exception:", err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getFirebaseSettings(uid: string) {
  const path = `users/${uid}/settings/shop`;
  try {
    const docRef = doc(db, "users", uid, "settings", "shop");
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (err) {
    console.error("Firestore settings read exception:", err);
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// Test the connection as requested by the Firebase integration guide
import { getDocFromServer } from "firebase/firestore";

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

