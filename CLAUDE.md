# CLAUDE.md — ERP Requirement Dashboard → Firebase (shared, realtime)

## 1. เป้าหมายโปรเจค
ยกระบบ **ERP Requirement / Project Automation 2026 Dashboard** (ไฟล์เดียว `index.html`)
จากเดิมที่เก็บข้อมูลใน `localStorage` (ต่างคนต่างเห็น) → ให้เป็น **ฐานข้อมูลกลางแบบ realtime บน Firebase**
เพื่อให้ทุกทีมอัปเดต task ที่เดียวกัน เห็นพร้อมกัน มีหน้า login (รหัสเดียวร่วมกัน) และโฮสต์ฟรีบน GitHub Pages

## 2. กติกาสำคัญที่สุด (ห้ามพลาด)
> **UI / การแสดงผล / ฟีเจอร์ ต้องเหมือนเดิม 100% เทียบเท่า `index.html` ปัจจุบัน**

- ✅ แก้ได้เฉพาะ **ชั้น persistence** (การโหลด/บันทึกข้อมูล) และ **เพิ่มหน้า login**
- ❌ ห้ามแตะ: โครง HTML, CSS, ฟังก์ชัน render ทั้งหมด (renderPIGantt, renderReqTable, renderBridge, apSegs, openPI/openAP ฯลฯ), layout, สี, พฤติกรรมปุ่ม, การลาก/zoom, drawer
- โมเดลในหน่วยความจำเดิม (`REQS`, `BR`, `PIMPL`, `PIE`, `BRE`, `PIADD`, ฯลฯ) **คงไว้เหมือนเดิม** — เปลี่ยนแค่ "แหล่งที่มา/ที่เก็บ" ของมัน
- ตรวจสอบว่า UI ไม่เพี้ยน: เทียบกับ `index.html` (baseline) ก่อน-หลังทุกครั้ง

## 3. สถาปัตยกรรมเป้าหมาย
```
[GitHub Pages]  เสิร์ฟ index.html (ฟรี, HTTPS)
      │  โหลด Firebase SDK (CDN) + js/firebase-config.js
      ▼
[Firebase Auth]  บัญชีเดียวร่วมกัน (email ฝังไว้ + กรอกเฉพาะรหัสผ่าน)
      ▼
[Cloud Firestore]  ฐานข้อมูล realtime  ← แทนที่ localStorage (เฉพาะข้อมูล DATA)
```
- **per-user UI prefs** (`erp_theme`, `erp_accent`, ภาษา, collapse/taskCol) → **ยังเก็บใน localStorage** (ไม่ sync, เป็นความชอบส่วนตัว)
- **DATA ทั้งหมด** (requirements, bridge, PI tasks, AP tasks + stages, plan, settings) → Firestore

## 4. กลยุทธ์การย้าย localStorage → Firestore
เก็บเป็น **เอกสารรายชิ้น (per-item document)** ไม่ใช่ก้อนเดียว → หลายทีมแก้คนละ item พร้อมกันได้ ไม่ทับกัน

หลักการต่อฟังก์ชัน:
- **โหลด (load\*)**: `await` ดึงทุก doc จาก collection → เติมลงโมเดลในหน่วยความจำ (รูปแบบเดิม) → `render...()` (เหมือนเดิม)
- **บันทึก (save\*/set\*)**: เดิมเขียน `localStorage.setItem(KEY, JSON.stringify(ทั้งก้อน))` → เปลี่ยนเป็นเขียน **เฉพาะ item ที่แก้** ลง Firestore (`setDoc(doc(db,col,id), data, {merge:true})`)
- **realtime**: `onSnapshot(collection)` → เมื่อมีการเปลี่ยนจากคนอื่น อัปเดตโมเดล + เรียก render ใหม่ (debounce ได้)

ฟังก์ชัน persistence ที่ต้องแปลง (ที่เหลือห้ามแตะ):
`loadState / saveState` (REQS) · `loadPIE / savePIE` · `piLoadAddDel / piSaveAdd / piSaveDel` · `piRebuild` (อ่านจาก store) · `loadBR / brSaveStores` · `apSaveStages` (stages/gld) · `loadPlan / savePlan / setPlanStatus` · การอ่าน/เขียน `PLANKEY` · settings (`FTE_COST`)

> รายละเอียด mapping ทั้งหมด: ดู `docs/DATABASE_SCHEMA.md`

## 5. Auth (รหัสเดียวร่วมกัน)
- สร้าง **1 บัญชี** ใน Firebase Auth (email/password) เช่น `team@civil.co.th`
- หน้า login มี **ช่องกรอกรหัสผ่านช่องเดียว** (email ฝังไว้ในโค้ด)
- `signInWithEmailAndPassword(auth, TEAM_EMAIL, passwordInput)` → สำเร็จ = ปลดล็อกแอป
- ก่อน login: บังตัวแอป (overlay) ไม่ให้เห็น/แก้อะไร; หลัง login: แสดง dashboard ปกติ
- **รหัสไม่ได้อยู่ในโค้ด** (Firebase ตรวจฝั่งเซิร์ฟเวอร์) — ปลอดภัยกว่า hardcode
- ข้อแลกเปลี่ยน: ใช้บัญชีเดียว → ไม่รู้ว่าใครแก้ (ถ้าต้องการ ให้เพิ่ม dropdown "ทีม" บันทึกไปกับข้อมูล)

## 6. Firestore Security Rules (ดู `firestore.rules`)
```
match /{document=**} { allow read, write: if request.auth != null; }
```
= เฉพาะคนที่ login (รู้รหัส) เท่านั้นอ่าน/เขียนได้

## 7. โครงไฟล์โปรเจค
```
erp-firebase/
├─ CLAUDE.md                ← ไฟล์นี้
├─ index.html               ← แอป (UI เหมือนเดิม 100% — baseline ห้ามแก้ UI)
├─ js/
│  ├─ firebase-config.js       ← ใส่ config จริง (git-ignore) — ดู .example
│  ├─ firebase-config.example.js
│  ├─ db.js                    ← (สร้างใหม่) adapter Firestore: loadAll/saveItem/subscribe
│  └─ auth.js                  ← (สร้างใหม่) หน้า login รหัสเดียว
├─ firestore.rules          ← security rules
├─ seed/
│  ├─ dash_data.json           ← ข้อมูลตั้งต้น (reqs/bridge/plan)
│  └─ seed.md                  ← วิธี seed เข้า Firestore ครั้งแรก
├─ docs/
│  ├─ DATABASE_SCHEMA.md        ← สคีมา Firestore + mapping จาก localStorage
│  └─ FIREBASE_SETUP.md         ← ตั้ง Firebase console ทีละขั้น
└─ .claude/agents/firebase-sync.md   ← sub-agent เฉพาะงานนี้
```

## 8. Dev workflow (VSCode + Claude Code)
1. พัฒนา/แก้ `index.html` + `js/*.js` ใน VSCode (พรีวิวด้วย Live Server)
2. ตรวจ syntax ก่อน commit: `node --check` สคริปต์หลัก (ดูข้อ 9)
3. `git add . && git commit && git push` → GitHub Pages deploy อัตโนมัติ
4. `firebase-config.js` และ seed จริง **อย่า commit** (ใส่ใน `.gitignore`)

## 9. การตรวจสอบ (ทำทุกครั้งก่อน push)
- **UI parity**: เปิด `index.html` เทียบกับ baseline ปัจจุบัน ต้องเหมือนทุกหน้า (ภาพรวม/โปรเจค/Requirements/Automation 2026/แผนงาน)
- **JS syntax**: ดึง `<script>` ก้อนหลักมา `node --check`
- **Firestore round-trip**: แก้ 1 item → เปิดอีกเบราว์เซอร์ → เห็นอัปเดต realtime
- **Auth gate**: ยังไม่ login = แก้ข้อมูลไม่ได้ (rules บล็อก)
- **ห้าม regression**: เทียบ diff ว่าแตะเฉพาะ persistence + login เท่านั้น

## 10. ฟรีทั้งหมด (Firebase Spark + GitHub Pages)
Firestore 50k reads / 20k writes / 1GB / วัน · Auth ฟรี · GitHub Pages ฟรี — เพียงพอสำหรับทีมหลักสิบคน งานหลักร้อย-พัน และ **แผน Spark ไม่มีการเก็บเงิน** (เกินโควตา = throttle ไม่ชาร์จ)

## 11. เฟสการทำงานแนะนำ
1. **ตั้ง Firebase** (console) + `firebase-config.js` + `firestore.rules`
2. **หน้า login** (`js/auth.js`) — บังแอปจน login สำเร็จ
3. **db.js adapter** + **seed** ข้อมูลตั้งต้นเข้า Firestore ครั้งเดียว
4. แปลง persistence ทีละส่วน (เรียง: settings → requirements → bridge → PI → AP+stages → plan) พร้อม realtime
5. ตรวจ UI parity + push
