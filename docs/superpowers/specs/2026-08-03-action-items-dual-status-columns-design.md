# Action Items — คอลัมน์ใหม่ (Civil / PS Global แยกสถานะ)

**วันที่:** 2026-08-03
**ขอบเขต:** ตาราง Action Items ในแท็บ *โปรเจค → Action Item* (`#actionView` ใน `index.html`) เท่านั้น

## เป้าหมาย

ปรับตาราง Action Items จาก 9 คอลัมน์ เป็น 11 คอลัมน์ ให้ตรงกับสเปรดชีตต้นทางที่ทีมใช้จริง —
แยกสถานะและหมายเหตุออกเป็นสองฝั่ง (**Civil** และ **PS Global**) เพราะทั้งสองฝ่ายติดตามงานเดียวกันคนละมุม
และเพิ่มคอลัมน์ **วันที่เสร็จ** ที่มีข้อมูลอยู่แล้วในโมเดลแต่ยังไม่ได้แสดงในตาราง

## สถานะปัจจุบัน

ตาราง `#actTable` มี 9 คอลัมน์:
`No · หมวด · Department · Action Request · Priority · ผู้รับผิดชอบ · กำหนดส่ง · สถานะ · หมายเหตุ`

โมเดล `ACTS` (collection `action_items`, per-item doc, realtime) แต่ละรายการมีฟิลด์:
`_id · cat · dept · action · pri · owner · due · status · done · note`

## เป้าหมายปลายทาง

11 คอลัมน์:
`No · หมวด · Action Request · Priority · ผู้รับผิดชอบ · กำหนดส่ง · วันที่เสร็จ · Civil Work Status · Civil : หมายเหตุ / ติดตาม · PS Global Work Status · PS Global : หมายเหตุ / ติดตาม`

---

## 1. Data model

เพิ่ม 2 ฟิลด์ในเอกสาร `action_items`:

| ฟิลด์ | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| `status2` | PS Global Work Status | `'Not Started'` |
| `note2` | PS Global : หมายเหตุ / ติดตาม | `''` |

- ใช้ vocabulary และสีชุดเดียวกับ Civil — `ACT_STATUS` / `ACT_SC` ที่มีอยู่ ไม่สร้าง constant ใหม่
  (`Not Started` `#8e8e93` · `In Process` `#ff9500` · `On Hold` `#af52de` · `Done` `#28cd41`)
- `actNorm()` เติมค่าเริ่มต้นในหน่วยความจำเท่านั้น — **ไม่** เขียน backfill 43 docs กลับ Firestore ตอนโหลด
  ค่าจะถูก persist เมื่อผู้ใช้แก้แถวนั้นจริง (`actSaveOne`)
- `actAdd()` ใส่ `status2:'Not Started', note2:''` ใน template รายการใหม่
- `ACT_SEED` ไม่ต้องแก้ — `actNorm()` เติมให้อยู่แล้ว

### `dept` ไม่ถูกลบ

ฟิลด์ `dept` ยังอยู่ในข้อมูล และยังใช้ใน:
- บรรทัดรอง (`#mSub`) ของ drawer
- คำค้นใน `filteredActs()`

เอาออกเฉพาะ**คอลัมน์ในตาราง** ตามรูปต้นทาง — ไม่มีข้อมูลสูญหาย

---

## 2. ตาราง (`#actTable`)

### colgroup / thead

| # | หัวคอลัมน์ | width | field | `data-asort` |
|---|---|---|---|---|
| 1 | No | 52 | `_id` | `_id` |
| 2 | หมวด | 118 | `cat` (chip) | `cat` |
| 3 | Action Request | 300 | `action` | — |
| 4 | Priority | 86 | `pri` (chip) | `pri` |
| 5 | ผู้รับผิดชอบ | 150 | `owner` | — |
| 6 | กำหนดส่ง | 100 | `due` | `due` |
| 7 | วันที่เสร็จ | 100 | `done` | `done` |
| 8 | Civil Work Status | 132 | `status` | `status` |
| 9 | Civil : หมายเหตุ / ติดตาม | 180 | `note` | — |
| 10 | PS Global Work Status | 140 | `status2` | `status2` |
| 11 | PS Global : หมายเหตุ / ติดตาม | 180 | `note2` | — |

รวม ≈ 1538px (เดิม 1382px) — `.tscroll` เลื่อนแนวนอนได้อยู่แล้ว ไม่ต้องแก้ CSS layout

### เซลล์สถานะ

`actStatusCell(a)` ปัจจุบัน hardcode ฟิลด์ `status` — เปลี่ยนเป็นรับพารามิเตอร์ฟิลด์:

```js
function actStatusCell(a,f){ /* f = 'status' | 'status2' */ }
```

ทั้งสองคอลัมน์ใช้ `.stwrap`/`.stdot`/`.selmini.stsel` เดิม → เลือกในตารางได้ทันที เรียก `actEdit(id,f,val)`

### เรียงลำดับ

`filteredActs()` เพิ่มการเรียงตาม `done` แบบวันที่ (ใช้ `actDue()` แปลง `dd/mm/yyyy` เหมือน `due`)
`status2` เรียงแบบ string ผ่าน branch เดิม

### แถวเลยกำหนด

ไม่เปลี่ยนพฤติกรรมเดิม: `tr.act-over` + `td.act-duered` อิง `actOverdue(a)` = `due < วันนี้ && status !== 'Done'` (ฝั่ง Civil)

`colspan` ของแถว "ไม่พบรายการ" เปลี่ยน 9 → 11

---

## 3. KPI — แยก 2 แถว

```
Civil       [ทั้งหมด 43] [กำลังทำ] [ยังไม่เริ่ม] [เสร็จแล้ว] [เลยกำหนด]
PS Global   ⟨spacer⟩     [กำลังทำ] [ยังไม่เริ่ม] [เสร็จแล้ว] [เลยกำหนด]
```

- แต่ละแถวมี label เล็ก ๆ ทางซ้าย (`Civil` / `PS Global`)
- แถว PS Global ไม่มีการ์ด "ทั้งหมด" (เลขเท่ากับแถวบน) แต่ใส่ spacer กว้างเท่าการ์ดเพื่อให้ตรงคอลัมน์กัน
- นับจาก `status` (แถวบน) และ `status2` (แถวล่าง)
- "เลยกำหนด" แถวบน = `actOverdue(a)`; แถวล่าง = `due < วันนี้ && status2 !== 'Done'`
- คลิกการ์ด → filter สถานะของฝั่งนั้น (toggle) — แถวบนคุม `#actStatus`, แถวล่างคุม `#actStatus2`
- "ทั้งหมด" ยังเรียก `actClear()` (ล้างทุก filter)

`renderActKpi()` เขียนใหม่ให้ปล่อย 2 แถว; `actKfilter` / `actKoverdue` รับพารามิเตอร์ระบุฝั่ง

CSS เพิ่มใน `<style>` เดิมที่มี `.actkpi`:
- `.actkrow` — flex row
- `.actkl` — label ซ้าย (ความกว้างคงที่)
- `.actk-sp` — spacer โปร่งใสกว้างเท่า `.actk`

---

## 4. แถบ filter

```
หมวด · Civil · PS Global · Priority · ผู้รับผิดชอบ · [ค้นหา…] · [ล้าง]
```

- label เดิม "สถานะ" → "Civil"; เพิ่ม `<select id="actStatus2" data-multi="1">` label "PS Global"
- `fillActFilters()` เติม `ACT_STATUS` ให้ `actStatus2` ด้วย (`'ทุกสถานะ'`)
- `filteredActs()` เพิ่มเงื่อนไข `status2` (multi-select ผ่าน `vm()` เหมือนตัวอื่น) และเพิ่ม `note2` ในคำค้น
- `actClear()` และ `actBind()` เพิ่ม `'actStatus2'` ในลิสต์ id
- `actFilt` เปลี่ยนจาก `{overdue:false}` เป็น `{overdue:false, overdue2:false}`

select ใหม่ต้องผ่าน `enhanceSelects()` เหมือนตัวอื่น — เพราะเป็น markup ใน HTML ตั้งแต่แรก จึงถูก enhance ตอน boot อยู่แล้ว

---

## 5. Drawer (`openAct`)

ฝั่งซ้าย (`.dleft`) แบ่งเป็น 2 บล็อกมีหัวข้อ:

```
[stepper — อิง Civil status]

Priority · กำหนดส่ง · วันที่เสร็จ · ผู้รับผิดชอบ      ← ของร่วม

── Civil ──────────────
สถานะ (#ea_status)  ·  หมายเหตุ / ติดตาม (#ea_note)

── PS Global ──────────
สถานะ (#ea_status2) ·  หมายเหตุ / ติดตาม (#ea_note2)
```

- `#ea_status` ยังขับ `actPaintStep()` เหมือนเดิม (stepper = ฝั่ง Civil)
- `#ea_status2` ไม่ขับ stepper
- `actSave(id)` เพิ่ม `a.status2 = g('ea_status2')` และ `a.note2 = g('ea_note2')`
- ฝั่งขวา (`.dright` — Action Request editor) ไม่เปลี่ยน
- หัวข้อบล็อกใช้คลาส `.dsec` ที่มีอยู่แล้ว

---

## ข้อจำกัด / นอกขอบเขต

- แก้เฉพาะ `index.html` — ไม่แตะ `js/db.js`, `js/auth.js`, `firestore.rules`
- ไม่แตะหน้าอื่น (ภาพรวม / Requirements / Automation 2026 / แผนงาน / Gantt)
- ไม่เปลี่ยน vocabulary สถานะ — คงเป็น `Not Started / In Process / On Hold / Done`
  (รูปต้นทางใช้ `Not Start / In Progress / Completed` แต่ตัดสินใจคงคำเดิมเพื่อไม่ต้อง migrate ข้อมูลจริง 43 รายการ)
- ไม่แก้ `seed/action_items.json`
- ไม่มี migration script — ค่าเริ่มต้นเติมตอน runtime

## การตรวจสอบ

1. **JS syntax** — ดึง `<script>` ก้อนหลักมา `node --check` (ต้องได้ `SYNTAX OK`)
2. **Playwright smoke** — boot แบบ fallback (`loginGate` ซ่อน → `await window.startApp()`) แล้วตรวจ:
   - `#actTable thead th` = 11 หัวคอลัมน์ ตรงตามตาราง §2
   - `#actTable tbody tr` = 43 แถว, `td` แถวละ 11
   - การ์ด KPI 2 แถว, `Civil ทั้งหมด` = 43
   - เปลี่ยนค่า select คอลัมน์ 10 → `ACTS.find(...).status2` เปลี่ยนตาม
   - `openAct(1)` → drawer มีทั้ง `#ea_status2` และ `#ea_note2`
   - filter `#actStatus2` กรองแถวได้จริง
3. **ไม่ regress หน้าอื่น** — `setProjView('reqs')` (165 แถว) และ `setProjView('impl')` (Gantt) ยัง render ปกติ
4. **Firestore round-trip** — แก้ `status2` 1 แถว → เปิดอีกเบราว์เซอร์เห็น realtime
