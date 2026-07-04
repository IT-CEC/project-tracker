# Design Spec — Multi-select Filters (all views)

วันที่: 2026-07-04
ไฟล์ที่กระทบ: `index.html` (ไฟล์เดียว)
สถานะ: รออนุมัติ → เข้าสู่ implementation plan

---

## 1. เป้าหมาย
ให้ dropdown ฟิลเตอร์ในทุกแถบฟิลเตอร์ **เลือกได้หลายค่า (multi-select)** โดยยัง**เลือกตัวเดียวได้ผลเท่าเดิม** (backward-compatible) — ต่อยอดจากระบบ combobox `.cs` เดิม ไม่สร้าง widget ใหม่

---

## 2. Decisions ที่ยืนยันแล้ว
| หัวข้อ | ผลสรุป |
|---|---|
| ขอบเขต | **ทุกหน้า** — dropdown ฟิลเตอร์ที่มองเห็นในแถบฟิลเตอร์ทั้ง 5 view |
| กลไก | ต่อยอด `.cs`/`csSync` เดิม เพิ่ม **โหมด multi** opt-in ต่อ select ด้วย `data-multi` |
| ป้ายบนปุ่ม | 0 = placeholder ("ทุกเฟส/…") · 1 = ชื่อค่านั้น · 2+ = **"N รายการ"** (EN: "N selected") |
| เมนู | ทุกตัวเลือก = checkbox ติ๊กหลายตัว · **คลิกแล้วเมนูไม่ปิด** · แถว "ทุก…" (value="") = เคลียร์ทั้งหมด |
| ตรรกะกรอง | equality → **OR/includes** (`!arr.length || arr.includes(...)`) |
| Fit-Gap (fGap) | **multi ด้วย** (OR ของ predicate ต่อค่า) |
| กลุ่มงานย่อย (fSub) | ตัวเลือก = **union** ของกลุ่มงานที่เลือก |
| Status strip | **ไม่แตะ** (Requirements/FTE ใช้ chip strip อยู่แล้ว — `fStatus`/`brStatus` ที่ซ่อนไว้คงเดิม) |
| select อื่น | โมดัลแก้ไข, zoom, ตั้งค่า → **คงเป็น single** |

> ข้อจำกัด: แก้เฉพาะ `index.html` — เปลี่ยน UI layer ของ combobox + ตรรกะฟิลเตอร์ (ตามที่ผู้ใช้ร้องขอ) เท่านั้น; ไม่แตะ persistence/Firebase, การ render Gantt/ตาราง (นอกจากบรรทัดฟิลเตอร์), topbar, sidebar

---

## 3. โครงสร้างข้อมูล
- state ของ multi = **`Set` เก็บบน element ของ select** (เช่น property `sel._m`) ; **ว่าง = เลือกทั้งหมด (ไม่กรอง)**
- native `.value`/`selectedIndex` ไม่ใช้เป็น source of truth ของ multi (แต่ยังให้ setter ทำงานเพื่อ compat — ดู §6)
- reader ใหม่:
  ```js
  function vm(id){var e=document.getElementById(id);if(!e)return [];if(e.dataset.multi&&e._m)return [...e._m];var x=e.value;return x?[x]:[];}
  ```
  (multi → array จาก Set ; single → `[value]` หรือ `[]` — ใช้ร่วมกันได้)

---

## 4. UI / พฤติกรรม (โหมด multi ใน `csSync`)
- ตรวจ `sel.dataset.multi` → เข้า path multi
- **เรนเดอร์เมนู**: แต่ละ `.fl-opt` ติ๊กได้ ; option ที่อยู่ใน Set = `.selected` + เครื่องหมายถูก (ใช้ `.fl-check` เดิมได้ หลายตัวพร้อมกัน)
- **คลิก option** (ไม่ใช่ตัว "ทุก…"): toggle สมาชิกใน Set → อัปเดตเมนู + ป้าย → `dispatch input + change` (ให้ตัว render เดิมทำงาน) → **ไม่ปิดเมนู**
- **คลิกแถว "ทุก…"** (option ที่ `value===""`): เคลียร์ Set (→ ทั้งหมด) → อัปเดต → dispatch → ไม่ปิดเมนู ; แถวนี้ขึ้น `.selected` เมื่อ Set ว่าง
- **ป้ายบนปุ่ม** (`.fl-value`): Set ว่าง → ข้อความของ option `value===""` (placeholder) ; 1 ตัว → label ของตัวนั้น ; ≥2 → `N + ' รายการ'` (หรือ `N + ' selected'` ตาม `LANG`)
- ปิดเมนู: คลิกนอก / กดปุ่มอีกครั้ง (กลไก `csClose`/document-click เดิม)
- single select: path เดิมทุกอย่างไม่เปลี่ยน

---

## 5. ตรรกะกรอง (เปลี่ยน equality → array)
เปลี่ยนเฉพาะบรรทัดฟิลเตอร์ในแต่ละฟังก์ชัน:

- **`filteredPI()`** (ใช้ทั้ง pi/ap):
  ```js
  var phs=vm(GP+'Phase'),sts=vm(GP+'Status'),ags=vm(GP+'Asg'),q=v(GP+'Search').toLowerCase().trim();
  return PIMPL.filter(d=>(!phs.length||phs.includes(d.ph))&&(!sts.length||sts.includes(d.st))&&(!ags.length||ags.some(a=>d.asg.includes(a)))&&(!q||...));
  ```
- **`filteredReqs()`**: `mods,subs,types,gaps` เป็น array ; แทนที่ ternary fGap ด้วย predicate ต่อค่า:
  ```js
  function gapPred(g,x){return g==='yes'?gapAssessed(x):g==='no'?!gapAssessed(x):g==='dev'?(x.gap==='3. Customization'||x.gap==='5. Not supported'):x.gap===g;}
  // ...
  (!mods.length||mods.includes(x.module)) && (!subs.length||subs.includes(x.sub)) &&
  (!types.length||types.includes(x.type)) && (!gaps.length||gaps.some(g=>gapPred(g,x))) && ...
  ```
  (`fStatus` ยังอ่านแบบ single ผ่าน strip เดิม — ไม่แตะ)
- **`fillSub()`**: `var mods=vm('fMod'); subs=uniq(REQS.filter(r=>!mods.length||mods.includes(r.module)).map(r=>r.sub)...)`
- **Action** (`renderActTable` path): `actCat/actStatus/actPri/actOwner` → array + includes
- **FTE/Bridge** (ฟังก์ชันกรองของ brTable): `brDept/brType/brCplx/brRisk` → array + includes

---

## 6. ความเข้ากันได้ (compat)
- **โค้ดที่ set ค่าเชิงโปรแกรม** (`drill`, `cockGo`, `clearPI`, `clearFilters`, `clearBrFilters`, `actClear`) ใช้ `select.value = x`:
  hook ตัว value-setter เดิม (มี override อยู่แล้วที่ ~บรรทัด 2231) ให้กรณี multi:
  - `.value = ''` → เคลียร์ Set
  - `.value = x` (x ไม่ว่าง) → `Set = {x}`
  แล้วเรียก `csSync` — ทำให้ `drill()` (คลิกกราฟ→กรอง 1 ค่า) และปุ่ม "ล้าง" ทำงานเหมือนเดิม
- **ปุ่ม "ล้าง"** ทุกหน้า: เดิม loop `.value=''` → ผ่าน hook = เคลียร์ multi ครบ ; ไม่ต้องแก้ปุ่ม

---

## 7. ขอบเขต select ที่ใส่ `data-multi` (มองเห็นในแถบฟิลเตอร์)
`piPhase, piStatus, piAsg, apPhase, apStatus, apAsg, fMod, fSub, fType, fGap, actCat, actStatus, actPri, actOwner, brDept, brType, brCplx, brRisk`
- **ไม่ใส่**: `fStatus, brStatus` (ซ่อน/ขับด้วย strip), `piZoom, apZoom`, select ในโมดัลแก้ไข, segmented ตั้งค่า

---

## 8. Acceptance Criteria
1. เปิดเมนูฟิลเตอร์ใด ๆ ในแถบ → ติ๊กได้หลายตัว เมนูไม่ปิด
2. เลือก 2 ค่า → ตาราง/Gantt แสดงรายการที่ตรง **ค่าใดค่าหนึ่ง (OR)** ; ป้าย = "2 รายการ"
3. เลือก 1 ค่า → ผลและป้าย **เหมือน single เดิมเป๊ะ**
4. คลิก "ทุกเฟส" (แถวว่าง) หรือกด "ล้าง" → เคลียร์ → แสดงทั้งหมด
5. คลิกกราฟ/KPI ที่เรียก `drill()` → ฟิลเตอร์ตั้งเป็นค่าเดียวนั้น (multi = {ค่านั้น}) และตารางกรองถูก
6. "กลุ่มงานย่อย" อัปเดตตัวเลือกเป็น union เมื่อเลือกหลายกลุ่มงาน
7. Fit-Gap เลือกหลายประเภท → OR ถูกต้อง (รวม yes/no/dev)
8. select ที่ไม่ใช่ฟิลเตอร์ (โมดัลแก้ไข/zoom) ยังเป็น single
9. dark mode + i18n (ไทย/EN) ป้ายและเมนูถูกต้อง
10. `node --check` ผ่าน ; ไม่ regression หน้าอื่น

---

## 9. Out of scope (YAGNI)
- ไม่แตะ status strip (chip) ของ Requirements/FTE
- ไม่ทำ "เลือกทั้งหมด/select-all" นอกจากแถว "ทุก…" (=เคลียร์)
- ไม่จำค่าฟิลเตอร์ข้าม session (ไม่ persist)
- ไม่เปลี่ยนรูปแบบ/ตำแหน่งแถบฟิลเตอร์

---

## 10. การตรวจสอบ
- `node --check` สคริปต์หลัก
- Playwright preview (standalone): เมนู multi, ป้ายนับ, OR filter, drill compat, ล้าง, dark mode — (แอปจริงติด login gate)
- Manual (หลัง login): ไล่ตาม Acceptance Criteria ทุกหน้า
