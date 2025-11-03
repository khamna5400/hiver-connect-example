// src/lib/db.ts
import { auth } from "./firebase";
import {
  addDoc, collection, serverTimestamp, doc, setDoc
} from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { db } from "./firebase";

export async function getSessionFirebase(): Promise<{ user: { id: string, email: string | null } | null } > {
  const a = getAuth();
  const user = a.currentUser;
  if (user) return { user: { id: user.uid, email: user.email } };
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(a, (u) => {
      unsub();
      if (u) resolve({ user: { id: u.uid, email: u.email } });
      else resolve({ user: null });
    });
  });
}

export async function insertHive(payload: any) {
  const col = collection(db, "hives");
  const data = { ...payload, created_at: serverTimestamp() };
  const ref = await addDoc(col, data);
  return { id: ref.id };
}

export async function insertBuzz(payload: any) {
  const col = collection(db, "buzz");
  const data = { ...payload, created_at: serverTimestamp() };
  const ref = await addDoc(col, data);
  return { id: ref.id };
}

export async function insertHiveAttendee(payload: any) {
  const col = collection(db, "hive_attendees");
  const data = { ...payload, created_at: serverTimestamp() };
  const ref = await addDoc(col, data);
  return { id: ref.id };
}

import {
  collection, query, orderBy, limit, getDocs, where, getDoc
} from "firebase/firestore";

export async function getHives(limitCount: number = 20) {
  const q = query(collection(db, "hives"), orderBy("created_at", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getBuzz(limitCount: number = 50) {
  const q = query(collection(db, "buzz"), orderBy("created_at", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getHiveById(id: string) {
  const ref = doc(db, "hives", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getAttendeesCount(hiveId: string) {
  const q = query(collection(db, "hive_attendees"), where("hiveId", "==", hiveId));
  const snap = await getDocs(q);
  return snap.size;
}
