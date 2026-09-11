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
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc,
  getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, serverTimestamp, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db  = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
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

// ── audit log ────────────────────────────────────────────────────────────────
// บันทึกว่าใครแก้อะไรเมื่อไหร่ ระดับช่อง (ค่าก่อน → ค่าหลัง)
//
// ดักที่ชั้นนี้ชั้นเดียวเพราะ saveItem/updateItem/deleteItem เป็นทางผ่านของการเขียน
// ทุกอย่างในระบบ ไม่ต้องไล่แก้ทีละฟังก์ชันในแอป และไม่มีทางหลุด
//
// "ค่าก่อน" มาจากสำเนาในหน่วยความจำที่เก็บไว้จาก loadAll/subscribe — ไม่ต้องอ่าน
// Firestore เพิ่มก่อนเขียน จึงไม่กินโควตาอ่านและไม่หน่วงการบันทึก
const AUDIT_COL = "audit_log";
const _last = {};                       // _last[col][id] = สำเนา doc ล่าสุดที่เห็น
let _actor = { who: "", ua: "" };       // แอปตั้งผ่าน DB.setActor()

function _snap(col, id, data) {
  (_last[col] || (_last[col] = {}))[String(id)] = JSON.parse(JSON.stringify(clean(data || {})));
}
function _seen(col, id) { return (_last[col] || {})[String(id)]; }

// ฟิลด์ที่ไม่ใช่ข้อมูลของผู้ใช้ ไม่ต้องรายงาน
const _SKIP = new Set(["__docId", "updatedAt", "_key", "_pi", "_id"]);
function _str(v) {
  if (v === undefined || v === null || v === "") return "—";
  return String(v).slice(0, 80);
}
// ค่าที่เป็น array/object สรุปเป็นจำนวนรายการ ไม่ dump JSON ลง log เพื่อกัน doc บวม
function _size(v) { return Array.isArray(v) ? v.length : (v && typeof v === "object" ? Object.keys(v).length : 0); }
function _diff(before, after) {
  const ch = [], keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  keys.forEach(k => {
    if (_SKIP.has(k)) return;
    const a = before ? before[k] : undefined, b = after ? after[k] : undefined;
    if (a === b) return;
    if ((a && typeof a === "object") || (b && typeof b === "object")) {
      if (JSON.stringify(a) === JSON.stringify(b)) return;
      ch.push({ f: k, a: _size(a) + " รายการ", b: _size(b) + " รายการ" });
      return;
    }
    ch.push({ f: k, a: _str(a), b: _str(b) });
  });
  return ch;
}
function _now() {
  const d = new Date(), z = n => ("0" + n).slice(-2);
  return z(d.getDate()) + "/" + z(d.getMonth() + 1) + "/" + d.getFullYear() + " " + z(d.getHours()) + ":" + z(d.getMinutes());
}
function _title(data, id) {
  const o = data || {};
  return String(o.name || o.ms || o.process || o.title || o.req || id || "");
}
// เขียนตรงผ่าน addDoc ไม่ผ่าน saveItem เด็ดขาด ไม่งั้นจะ log ตัวเองวนไม่จบ
// fire-and-forget + กลืน error ทุกกรณี: log พังต้องไม่ทำให้การบันทึกข้อมูลจริงพังตาม
function _write(entry) {
  try {
    addDoc(collection(db, AUDIT_COL), {
      ts: Date.now(), at: _now(), who: _actor.who || "ไม่ระบุ", ua: _actor.ua || "", ...entry
    }).catch(() => {});
  } catch (e) { /* เงียบไว้ */ }
}
function _audit(act, col, id, data, before) {
  if (col === AUDIT_COL) return;
  const e = { act, col, id: String(id), name: _title(data || before, id) };
  if (act === "edit") {
    const ch = _diff(before, data);
    if (!ch.length) return;              // ไม่มีอะไรเปลี่ยน ไม่ต้องบันทึก
    e.ch = ch.slice(0, 25);
  }
  _write(e);
}

// ── public adapter ───────────────────────────────────────────────────────────
const DB = {
  auth,
  serverTimestamp,

  // โหลดทุก doc ใน collection → array ของ object (รูปแบบโมเดลเดิม)
  async loadAll(col) {
    const snap = await getDocs(collection(db, col));
    const out = snap.docs.map(fromDoc);
    out.forEach(o => _snap(col, o.__docId, o));
    return out;
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
    const had = _seen(col, id);
    _audit(had ? "edit" : "add", col, id, data, had);
    _snap(col, id, data);
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
    const had = _seen(col, id);
    _audit("edit", col, id, { ...(had || {}), ...clean(patch) }, had);
    _snap(col, id, { ...(had || {}), ...clean(patch) });
  },

  // ลบ item เดียว
  async deleteItem(col, id) {
    _pending++; _emit();
    try {
      await deleteDoc(doc(db, col, String(id)));
    } finally { _pending--; _emit(); }
    _audit("del", col, id, null, _seen(col, id));
    if (_last[col]) delete _last[col][String(id)];
  },

  // realtime: มีการเปลี่ยนจากใครก็ตาม → cb(array) ; debounce กัน render รัวเกิน
  // คืน unsubscribe function
  subscribe(col, cb, debounceMs = 150) {
    let t = null, latest = null;
    return onSnapshot(collection(db, col), snap => {
      latest = snap.docs.map(fromDoc);
      latest.forEach(o => _snap(col, o.__docId, o));
      if (debounceMs <= 0) { cb(latest); return; }
      clearTimeout(t);
      t = setTimeout(() => cb(latest), debounceMs);
    });
  },

  // สถานะซิงก์: cb({online, saving}) — เรียกทันทีครั้งแรกด้วยสถานะปัจจุบัน
  onStatus(cb) { _statusCb = cb; _emit(); },

  // ── audit log ──
  // แอปบอกว่า "ใคร" กำลังใช้งานอยู่ (ชื่อเครื่องที่ผู้ใช้ตั้งเอง + OS/เบราว์เซอร์)
  setActor(a) { _actor = { who: (a && a.who) || "", ua: (a && a.ua) || "" }; },
  // เหตุการณ์ที่ไม่ได้เกิดจากการเขียนข้อมูล เช่น ล็อกอิน/ออกจากระบบ
  logEvent(act, extra) { _write({ act, col: "", id: "", name: "", ...(extra || {}) }); },
  // ดึงเฉพาะรายการล่าสุด n รายการ — ไม่ใช้ subscribe เพราะทุกเครื่องจะกินโควตาอ่าน
  // ทุกครั้งที่มีใครแก้อะไรสักอย่าง
  async loadRecent(col, n = 300) {
    const snap = await getDocs(query(collection(db, col), orderBy("ts", "desc"), limit(n)));
    return snap.docs.map(fromDoc);
  }
};

// เปิดให้สคริปต์หลัก (classic script, global scope) เรียกใช้ได้
window.DB = DB;

export { db, auth, DB };
