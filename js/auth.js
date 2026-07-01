// ── Login gate (บัญชีเดียวร่วมกัน — กรอกเฉพาะรหัสผ่าน) ────────────────────────
// สร้างใหม่ตาม CLAUDE.md §5 : email ฝังในโค้ด, ผู้ใช้กรอกแค่รหัสผ่าน
// signInWithEmailAndPassword(auth, TEAM_EMAIL, password) → สำเร็จ = ปลดล็อกแอป
// ไม่แตะ UI เดิม — บังด้วย overlay #loginGate จนกว่าจะ login ผ่าน แล้วเรียก window.startApp()

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth } from "./db.js";
import { TEAM_EMAIL } from "./firebase-config.js";

let appStarted = false;
let wasSignedIn = false;

function $(id) { return document.getElementById(id); }

function showErr(msg) {
  const el = $("loginErr");
  if (el) { el.textContent = msg || ""; el.style.display = msg ? "block" : "none"; }
}

function setBusy(busy) {
  const btn = $("loginBtn"), pass = $("loginPass");
  if (btn)  { btn.disabled = busy; btn.classList.toggle("busy", busy); }
  if (pass) pass.disabled = busy;
}

// แปลง error code ของ Firebase → ข้อความไทยที่อ่านง่าย
function msgFor(err) {
  const c = (err && err.code) || "";
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/invalid-login-credentials")
    return "รหัสผ่านไม่ถูกต้อง";
  if (c === "auth/too-many-requests") return "ลองผิดหลายครั้ง — รอสักครู่แล้วลองใหม่";
  if (c === "auth/network-request-failed") return "เชื่อมต่อเครือข่ายไม่ได้";
  if (c === "auth/invalid-api-key" || c === "auth/configuration-not-found")
    return "ยังไม่ได้ตั้งค่า Firebase (js/firebase-config.js)";
  return "เข้าสู่ระบบไม่สำเร็จ: " + (c || (err && err.message) || "ไม่ทราบสาเหตุ");
}

// ปลดล็อกแอป: ซ่อน overlay + บูตแอป (เรียกครั้งเดียว)
function reveal() {
  const gate = $("loginGate");
  if (gate) gate.style.display = "none";
  document.body.classList.remove("locked");
  if (!appStarted && typeof window.startApp === "function") {
    appStarted = true;
    window.startApp();
  }
}

function lock() {
  const gate = $("loginGate");
  if (gate) gate.style.display = "";
  document.body.classList.add("locked");
}

async function doLogin(e) {
  if (e) e.preventDefault();
  const pass = ($("loginPass") && $("loginPass").value) || "";
  if (!pass) { showErr("กรอกรหัสผ่าน"); return; }
  showErr(""); setBusy(true);
  try {
    await signInWithEmailAndPassword(auth, TEAM_EMAIL, pass);
    // onAuthStateChanged จะเรียก reveal() ต่อเอง
  } catch (err) {
    showErr(msgFor(err));
    setBusy(false);
    const p = $("loginPass"); if (p) { p.select && p.select(); p.focus(); }
  }
}

function wire() {
  const form = $("loginForm"), btn = $("loginBtn");
  if (form) form.addEventListener("submit", doLogin);
  if (btn && !form) btn.addEventListener("click", doLogin);

  // สถานะ auth: ถ้ามี session อยู่แล้ว → เข้าเลย ; ไม่งั้นแสดงหน้า login
  onAuthStateChanged(auth, user => {
    if (user) { showErr(""); setBusy(false); reveal(); wasSignedIn = true; }
    else {
      if (wasSignedIn) { if (window.toast) window.toast('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่'); }
      setBusy(false); lock();
    }
  });
}

// ล็อกเอาต์ (ปุ่มใน Settings หรือ console) — เคลียร์ wasSignedIn ก่อน signOut กันโชว์ toast "เซสชันหมดอายุ" ตอนตั้งใจออก
window.erpLogout = () => { wasSignedIn = false; signOut(auth).then(() => location.reload()); };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
else wire();
