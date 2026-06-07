import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  getDoc 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDRTsvE6eqXp2xCjKQaQDkBwCZTSuKDmEo",
  authDomain: "qci-phone-id-d86b7.firebaseapp.com",
  projectId: "qci-phone-id-d86b7",
  storageBucket: "qci-phone-id-d86b7.firebasestorage.app",
  messagingSenderId: "522632982445",
  appId: "1:522632982445:web:a283b6cf79c540db32fb24",
  measurementId: "G-Q5481ZWSYM"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithRedirect, getRedirectResult, signOut };

export async function uploadUserProfileImage(uid: string, file: File): Promise<string> {
  const fileRef = ref(storage, `users/${uid}/profile/avatar.jpg`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

import { Transaction } from "./types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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

export async function saveFirebaseTransaction(uid: string, tx: Transaction) {
  try {
    const docRef = doc(db, "users", uid, "transactions", tx.id);
    await setDoc(docRef, sanitizeForFirestore({
      ...tx,
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.error("Firestore save error:", err);
    throw err;
  }
}

export async function deleteFirebaseTransaction(uid: string, txId: string) {
  try {
    const docRef = doc(db, "users", uid, "transactions", txId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Firestore delete error:", err);
    throw err;
  }
}

export async function getFirebaseTransactions(uid: string): Promise<Transaction[]> {
  try {
    const collRef = collection(db, "users", uid, "transactions");
    const snapshot = await getDocs(collRef);
    const txs: Transaction[] = [];
    snapshot.forEach((doc) => {
      txs.push(doc.data() as Transaction);
    });
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return txs;
  } catch (err) {
    console.error("Firestore read error:", err);
    return [];
  }
}

export async function saveFirebaseSettings(uid: string, settings: any) {
  try {
    const docRef = doc(db, "users", uid, "settings", "shop");
    await setDoc(docRef, settings);
  } catch (err) {
    console.error("Firestore settings save error:", err);
    throw err;
  }
}

export async function getFirebaseSettings(uid: string) {
  try {
    const docRef = doc(db, "users", uid, "settings", "shop");
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (err) {
    console.error("Firestore settings read error:", err);
    return null;
  }
}
