# Firestore Schema — สอดคล้องกับข้อมูลปัจจุบัน 100%

ออกแบบให้ตรงกับโมเดลในแอปเดิม (จาก `dash_data.json` + edit-stores ใน localStorage)
หลักการ: **1 item = 1 document** (concurrency ดี, หลายทีมแก้คนละชิ้นพร้อมกันได้)

## สรุป mapping: localStorage → Firestore

| ข้อมูล | localStorage เดิม | Firestore collection | doc id | sync |
|---|---|---|---|---|
| Requirements (165) | `erp_req_dashboard_v10` (REQS ทั้งก้อน) | `requirements` | `_id` | realtime |
| Automation FTE / Bridge (54) | `erp_bridge_edit_v1` + `_add_v1` + `_del_v1` | `bridge` | `_key` (`b{i}`/`a{n}`) | realtime |
| Project Implementation tasks (23) | `erp_pi_edits_v1` + `_add_v1` + `_del_v1` | `pi_tasks` | `_key` | realtime |
| Automation Plan tasks (54, มี stages) | `erp_ap_edits_v1` + `_add_v1` + `_del_v1` | `ap_tasks` | `_key` | realtime |
| Plan timeline (65) | `erp_plan_status_v1` | `plan` | `_pid` | realtime |
| Settings ส่วนกลาง | (ในโค้ด) | `settings` | `global` | realtime |
| ธีม/สี/ภาษา/collapse | `erp_theme`,`erp_accent`,... | **คงใน localStorage** (per-user) | — | ไม่ sync |

> หมายเหตุ: `erp_bridge_status_v1` เป็น key เก่า (migration) — เก็บ status ลง `bridge.status` โดยตรง

---

## 1. `requirements/{_id}`
ตรงกับ object ใน `DATA.reqs` + การแก้ inline (type, gap, status) และ openModal
```jsonc
{
  "_id": "r001",
  "module": "บัญชีและการเงิน",
  "sub": "บัญชีแยกประเภททั่วไป - GL",
  "name": "…กระบวนการ…",
  "req": "รายละเอียดความต้องการ…",
  "type": "รายงาน",
  "tags": "",
  "owner": "K. …",
  "status": "In Process",            // แก้ inline
  "gap": "3. Customization",          // หรือแยก g_std/g_mod/g_cus/g_fut/g_no (ให้ตรงของเดิม)
  "remark": "",
  "srcSheet": "…", "srcRow": 12,
  "updatedAt": <serverTimestamp>
}
```

## 2. `bridge/{_key}`  (Automation 2026 — FTE view)
รวม base (`b0..b53`) + ที่เพิ่ม (`a{n}`); ลบ = ลบ doc
```jsonc
{
  "_key": "b0", "_bid": 0,
  "module": "Accounting", "name": "…", "type": "เชื่อมต่อ/Integration",
  "cycle": "Monthly", "hrs": "48", "save": "0.02", "fteNow": "0.0061",
  "cplx": "Low", "risk": "No", "status": "In Progress",
  "owner": "…", "app": "Excel", "cat": "Manual Gap Management",
  "req": "…", "src": "…",
  "updatedAt": <serverTimestamp>
}
```

## 3. `pi_tasks/{_key}`  (Project Implementation — Gantt หน้าโปรเจค)
ตรงกับ `PIBASE` + PIADD/PIE; งานย่อยใช้ `parent`
```jsonc
{
  "_key": "b2", "_pi": 2, "ph": "02",
  "name": "BRD Company Structure & General Setup",
  "asg": ["IT","Accounting"],
  "s": "17/06/2026", "e": "20/07/2026",       // dd/mm/yyyy (คงรูปแบบเดิม)
  "st": "In Progress", "prog": 0, "pr": "Low",
  "parent": null, "dep": [],                    // dep = array ของ _pi งานก่อนหน้า
  "ms": null, "gl": null, "pin": false,
  "updatedAt": <serverTimestamp>
}
```

## 4. `ap_tasks/{_key}`  (Automation Plan — Gantt หน้า Automation 2026, มี multi-stage)
กลุ่มตามแผนก (`ph` = ชื่อแผนก) + **stages[]** + Go-Live
```jsonc
{
  "_key": "b0", "_pi": 0, "ph": "Accounting",
  "name": "Accrued ผู้รับเหมา",
  "asg": ["…"], "st": "Not Started", "pr": "Low", "dep": [],
  "s": "01/07/2026", "e": "27/07/2026",          // ช่วงรวม (คำนวณจาก stages+gld)
  "stages": [
    { "k": "req", "s": "01/07/2026", "e": "11/07/2026", "st": "Partial Done" },
    { "k": "dev", "s": "12/07/2026", "e": "22/07/2026", "st": "In Progress" },
    { "k": "uat", "s": "23/07/2026", "e": "02/08/2026", "st": "Not Started" }
  ],
  "gld": "05/08/2026",                           // วัน Go-Live (milestone) หรือ ""
  "updatedAt": <serverTimestamp>
}
// stage.k ∈ {req, dev, uat}  ·  stage.st / task.st ∈
//   {Not Started, In Progress, Partial Done, Blocker, Done, On Hold, Delayed, Completed}
```

## 5. `plan/{_pid}`  (Automation timeline PLAN — 65 รายการ)
```jsonc
{
  "_pid": 0, "dept": "ACC", "name": "…", "owner": "…", "it": "…",
  "rpa": "…", "start": "…", "goLive": "…", "goLiveText": "…",
  "status": "IN PROGRESS",    // {NOT START, IN PROGRESS, PARTIAL DONE, BLOCKER, DONE}
  "updatedAt": <serverTimestamp>
}
```

## 6. `settings/global`
```jsonc
{ "fteCost": 600000, "updatedAt": <serverTimestamp> }
```

---

## 7. `audit_log/{auto}`  (ประวัติการใช้งาน — เขียนอย่างเดียว ไม่มีใน localStorage เดิม)

| field | ชนิด | ความหมาย |
|---|---|---|
| `ts` | number | เวลา (ms) ใช้เรียงและ query |
| `at` | string | `วว/ดด/ปปปป ชช:นน` สำหรับแสดง |
| `who` | string | ชื่อเครื่องที่ผู้ใช้ตั้งเอง (`localStorage.erp_device`) |
| `ua` | string | `Windows 10/11 · Edge 131` |
| `act` | string | `login` · `logout` · `add` · `edit` · `del` |
| `col` / `id` | string | collection + doc id ที่ถูกแตะ (ว่างสำหรับ login/logout) |
| `name` | string | ชื่อที่คนอ่านรู้เรื่อง |
| `ch` | array | `[{f,a,b}]` เฉพาะ `act='edit'` — ช่อง · ค่าก่อน · ค่าหลัง |

เขียนโดย `js/db.js` ที่ `saveItem`/`updateItem`/`deleteItem` แบบ fire-and-forget
ผ่าน `addDoc` **ไม่ผ่าน `saveItem`** (ไม่งั้นจะ log ตัวเองวนไม่จบ)

อ่านด้วย `DB.loadRecent('audit_log', 300)` เท่านั้น — **ไม่ subscribe** เพราะทุกเครื่อง
จะกินโควตาอ่านทุกครั้งที่มีใครแก้อะไร

> รายละเอียด: `docs/superpowers/specs/2026-09-11-audit-log-design.md`

## แนวทางเขียน (per-item, concurrency-safe)
- แก้ 1 field → `updateDoc(doc(db,'ap_tasks',key), { st:'Done', updatedAt: serverTimestamp() })`
- เพิ่มงาน → `setDoc(doc(db,'ap_tasks',newKey), {...})`
- ลบงาน → `deleteDoc(doc(db,'ap_tasks',key))`
- realtime → `onSnapshot(collection(db,'ap_tasks'), snap => rebuildModel(snap); renderPI())`
- ป้องกัน render รัวเกิน: debounce ~150ms ต่อ collection

## Seed ครั้งแรก (ดู seed/seed.md)
เขียนสคริปต์เล็ก ๆ อ่าน `seed/dash_data.json` → เขียนเข้า `requirements`, `bridge`, `plan`
และ generate `pi_tasks` (จาก PIBASE ในโค้ด) + `ap_tasks` (จาก bridge + default stages ตาม `buildAP`)
รันครั้งเดียวเพื่อให้ DB มีข้อมูลตั้งต้นเท่ากับแอปปัจจุบัน
