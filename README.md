# ERP Requirement Dashboard — Firebase edition

Dashboard ติดตาม requirement / Project Automation 2026 (ไฟล์เดียว `index.html`)
เก็บข้อมูลกลางแบบ realtime บน **Firebase Firestore** + login รหัสเดียวร่วมกัน (**Firebase Auth**)
โฮสต์ฟรีบน **GitHub Pages**

## เริ่มต้น
1. อ่าน **`CLAUDE.md`** (สัญญาหลักของโปรเจค + กติกา "UI เหมือนเดิม 100%")
2. ตั้ง Firebase: **`docs/FIREBASE_SETUP.md`**
3. สคีมาฐานข้อมูล: **`docs/DATABASE_SCHEMA.md`**
4. Seed ข้อมูลตั้งต้น: **`seed/seed.md`**

## โครงไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | แอป (UI เหมือนของจริง 100% — baseline, ห้ามแก้ UI) |
| `js/db.js` | *(สร้างใหม่)* adapter Firestore: loadAll / saveItem / subscribe |
| `js/auth.js` | *(สร้างใหม่)* หน้า login รหัสเดียว |
| `js/firebase-config.js` | ค่า Firebase จริง (git-ignore) — คัดจาก `.example` |
| `firestore.rules` | กติกาความปลอดภัย (auth-required) |
| `seed/dash_data.json` | ข้อมูลตั้งต้น (reqs/bridge/plan) |
| `agents/firebase-sync.md` | sub-agent → **ย้ายไปไว้ที่ `.claude/agents/firebase-sync.md`** |

## ติดตั้ง sub-agent (Claude Code)
ย้าย `agents/firebase-sync.md` → `.claude/agents/firebase-sync.md`
แล้วเรียกใช้ผ่าน Claude Code เพื่อทำงานย้าย persistence โดยไม่แตะ UI

## หลักการสำคัญ
- แก้เฉพาะชั้น persistence (localStorage → Firestore) + เพิ่ม login — **ห้ามแตะ UI/render**
- เก็บ per-item document (หลายทีมแก้พร้อมกันไม่ทับ) + realtime `onSnapshot`
- per-user prefs (ธีม/สี/ภาษา/collapse) คงไว้ใน localStorage
- ฟรีทั้งหมด (Firebase Spark + GitHub Pages) — ไม่ผูกบัตร ไม่มีทางโดนชาร์จ
