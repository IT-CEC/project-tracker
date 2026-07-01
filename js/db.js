// ── Firestore adapter (per-item document, realtime) ──────────────────────────
// สร้างใหม่ตาม CLAUDE.md §4 + docs/DATABASE_SCHEMA.md
// หน้าที่: loadAll / saveItem / deleteItem / subscribe — แทนที่ localStorage
// ไม่ยุ่งกับ UI/render; ฝั่งแอป (index.html) เรียกผ่าน window.DB
//
// หลักการ: 1 item = 1 document → หลายทีมแก้คนละชิ้นพร้อมกันได้ ไม่ทับกัน

// Firebase Web SDK v11.10.0 (modular) จาก CDN gstatic — ถ้าจะอัปเวอร์ชัน แก้ทั้ง 3 URL ให้ตรงกัน
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, collection, doc,
  getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ── helpers ──────────────────────────────────────────────────────────────────
// อ่าน doc → object โมเดลเดิม (ใช้ field key ที่ฝังในเอกสารเอง: _id/_key/_pid)
// เก็บ id ของเอกสารไว้ที่ __docId เผื่อ save/delete กลับ (ไม่กระทบ render)
function fromDoc(d) {
  const o = d.data() || {};
  Object.defineProperty(o, "__docId", { value: d.id, enumerable: false, writable: true, configurable: true });
  return o;
}
// ตัด field ที่ไม่ควรเขียนกลับ (synthetic/undefined) ออกก่อน setDoc
function clean(data) {
  const out = {};
  Object.keys(data || {}).forEach(k => {
    if (k === "__docId") return;
    const v = data[k];
    if (v === undefined) return;
    out[k] = v;
  });
  return out;
}

// ── connection / sync status tracking ────────────────────────────────────────
// ติดตามสถานะออนไลน์/ออฟไลน์ + จำนวน write ที่ยังค้างอยู่ (in-flight)
// ให้ index.html แสดง badge สถานะซิงก์ผ่าน DB.onStatus(cb)
let _pending = 0, _online = true, _statusCb = null;
function _emit() { if (_statusCb) _statusCb({ online: _online, saving: _pending > 0 }); }
window.addEventListener('online', () => { _online = true; _emit(); });
window.addEventListener('offline', () => { _online = false; _emit(); });

// ── public adapter ───────────────────────────────────────────────────────────
const DB = {
  auth,
  serverTimestamp,

  // โหลดทุก doc ใน collection → array ของ object (รูปแบบโมเดลเดิม)
  async loadAll(col) {
    const snap = await getDocs(collection(db, col));
    return snap.docs.map(fromDoc);
  },

  // เขียนเฉพาะ item เดียว (merge) → เขียนทับเฉพาะ field ที่ส่งมา + stamp เวลา
  async saveItem(col, id, data) {
    _pending++; _emit();
    try {
      await setDoc(
        doc(db, col, String(id)),
        { ...clean(data), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } finally { _pending--; _emit(); }
  },

  // อัปเดตเฉพาะบาง field ของ item เดียว
  async updateItem(col, id, patch) {
    _pending++; _emit();
    try {
      await updateDoc(
        doc(db, col, String(id)),
        { ...clean(patch), updatedAt: serverTimestamp() }
      );
    } finally { _pending--; _emit(); }
  },

  // ลบ item เดียว
  async deleteItem(col, id) {
    _pending++; _emit();
    try {
      await deleteDoc(doc(db, col, String(id)));
    } finally { _pending--; _emit(); }
  },

  // realtime: มีการเปลี่ยนจากใครก็ตาม → cb(array) ; debounce กัน render รัวเกิน
  // คืน unsubscribe function
  subscribe(col, cb, debounceMs = 150) {
    let t = null, latest = null;
    return onSnapshot(collection(db, col), snap => {
      latest = snap.docs.map(fromDoc);
      if (debounceMs <= 0) { cb(latest); return; }
      clearTimeout(t);
      t = setTimeout(() => cb(latest), debounceMs);
    });
  },

  // สถานะซิงก์: cb({online, saving}) — เรียกทันทีครั้งแรกด้วยสถานะปัจจุบัน
  onStatus(cb) { _statusCb = cb; _emit(); }
};

// เปิดให้สคริปต์หลัก (classic script, global scope) เรียกใช้ได้
window.DB = DB;

export { db, auth, DB };
