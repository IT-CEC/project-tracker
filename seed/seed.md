# Seed ข้อมูลตั้งต้นเข้า Firestore (ทำครั้งเดียว)

เป้าหมาย: ให้ Firestore มีข้อมูลเท่ากับแอปปัจจุบันเป๊ะ ก่อนเริ่มใช้จริง

## แหล่งข้อมูลตั้งต้น
- `seed/dash_data.json` → `reqs` (165), `bridge` (54), `plan` (65)
- `PIBASE` (23 งาน) — อยู่ในโค้ด `index.html` (const PIBASE=[...])
- `ap_tasks` — generate จาก `bridge` + default stages ตามลอจิก `buildAP()` ใน `index.html`
  (แต่ละงาน: stage req/dev/uat ช่วงละ 10 วัน + gld, สถานะเริ่ม Not Started)

## แนวทาง (เลือก 1)

### วิธี A — สคริปต์ Node + firebase-admin (แนะนำ)
```
npm i firebase-admin
```
`seed.mjs`:
```js
import admin from 'firebase-admin';
import fs from 'fs';
admin.initializeApp({ credential: admin.credential.cert(
  JSON.parse(fs.readFileSync('serviceAccountKey.json'))) });   // ดาวน์โหลดจาก Console → Service accounts
const db = admin.firestore();
const data = JSON.parse(fs.readFileSync('seed/dash_data.json','utf8'));

async function put(col, arr, idKey){
  const b = db.batch();
  arr.forEach((it,i)=>{ const id = String(it[idKey] ?? i);
    b.set(db.collection(col).doc(id), {...it, updatedAt: admin.firestore.FieldValue.serverTimestamp()}); });
  await b.commit(); console.log(col, arr.length);
}
await put('requirements', data.reqs, '_id');
await put('bridge',       data.bridge.map((b,i)=>({...b,_key:'b'+i,_bid:i})), '_key');
await put('plan',         data.plan.map((p,i)=>({...p,_pid:i})), '_pid');
// pi_tasks / ap_tasks: คัด PIBASE + buildAP จาก index.html มาใส่ให้ตรง แล้ว put เช่นกัน
```
รัน: `node seed.mjs`  (batch จำกัด 500 doc/ครั้ง — แบ่ง batch ถ้าเกิน)

### วิธี B — ให้แอป seed ครั้งแรก
ตอนแอปโหลด ถ้า collection ว่าง → เขียน seed จาก `DATA` + PIBASE + buildAP ที่มีในโค้ดอยู่แล้ว
(ทำ flag กันเขียนซ้ำ เช่น `settings/global.seeded = true`)

## ตรวจสอบหลัง seed
เปิดแอป (หลัง migrate) → ต้องเห็นข้อมูลเท่ากับ baseline:
Requirements 165 · Bridge 54 · PI 23 · AP 54 (มี stages) · Plan 65
