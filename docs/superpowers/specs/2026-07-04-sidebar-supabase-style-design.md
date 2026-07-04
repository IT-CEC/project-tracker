# Design Spec — Supabase-style Expandable Sidebar

วันที่: 2026-07-04
ไฟล์ที่กระทบ: `index.html` (ไฟล์เดียว)
สถานะ: รออนุมัติ → เข้าสู่ implementation plan

---

## 1. เป้าหมาย
เปลี่ยน navigation ซ้ายจาก **floating dock** (icon-only + magnification, ลอยกลางจอ) เป็น **sidebar แบบ Supabase** ที่:
- ขยาย/ยุบได้ มี **3 โหมด**: Expanded / Collapsed / Expand on hover
- มีตัวควบคุมโหมด (**Sidebar control**) ปุ่มล่างสุด เปิด popover เลือกโหมด
- โทนสี + ไอคอน แบบ Supabase (neutral/เทา, active แบบ subtle)
- **เก็บ dock เดิมไว้ในไฟล์แบบ archive (comment)** เพื่อ revert ได้

> ข้อจำกัดโปรเจค: แก้เฉพาะชั้น UI ของ nav — ไม่แตะ persistence/Firebase, ฟังก์ชัน render/ตาราง/Gantt, topbar, แท็บ, ปุ่มอื่น ๆ (คงเดิม 100%)

---

## 2. Decisions ที่ยืนยันแล้ว
| หัวข้อ | ผลสรุป |
|---|---|
| วิธีเก็บของเดิม | **Archive** — comment โค้ด dock เดิม (markup + CSS + magnification JS) ไว้ในไฟล์ พร้อมป้ายกำกับ revert |
| รายการเมนู | โปรเจค (badge 83) · Automation (badge 39) — เส้นคั่น — ตั้งค่า (ปักล่าง) — Sidebar control (ล่างสุด) |
| ภาพรวม (Overview) | **ซ่อนต่อ** (ตามที่ผู้ใช้พักไว้) |
| ค้นหา | **ตัดออก** ไม่มีในเมนู และไม่ทำ inline search แทน |
| โทนสี | **Supabase แท้ (neutral/เทา)** — active = ตัวหนังสือเข้มขึ้น + พื้นเทาอ่อน (ไม่มีสีเด่น); ใช้ token เดิมเพื่อให้ dark mode ทำงานต่อ; accent น้ำเงินเดิมของแอปคงไว้ (ไม่เปลี่ยนธีม) |
| ขนาด | collapsed **54px** / expanded **210px** |
| Default โหมด | **Expand on hover** |
| Persist | `localStorage['erp_nav_mode']` = `expanded` \| `collapsed` \| `hover` (per-user pref ตาม CLAUDE.md §3 ไม่ sync) |
| พฤติกรรมเนื้อหา | **เฟรมข้อมูลหลัก fix** — ตอน hover ขยาย sidebar จะ **ลอยทับ** เนื้อหา (content ไม่ reflow) |

---

## 3. โครงสร้าง & Layout

### 3.1 DOM
แทน `<aside class="dock">…</aside>` ด้วย:
```
<aside class="nav" id="nav" data-mode="hover">
  <div class="nav-group">
    <a class="nav-item" data-tab="project"> [icon] [label โปรเจค] [badge 83] </a>
    <a class="nav-item" data-tab="bridge">  [icon] [label Automation] [badge 39] </a>
  </div>
  <div class="nav-spacer"></div>          <!-- ดันของล่างลงไปติดล่าง -->
  <div class="nav-group nav-bottom">
    <div class="nav-div"></div>            <!-- เส้นคั่น -->
    <a class="nav-item" data-tab="settings"> [icon] [label ตั้งค่า] </a>
    <button class="nav-ctrl" id="navCtrlBtn"> [icon] [label Sidebar control] </button>
  </div>
  <div class="nav-pop" id="navPop">…3 ตัวเลือกโหมด…</div>
</aside>
```
- `id="navReqCount"` ต้องคงไว้ที่ badge ของ "โปรเจค" (มีโค้ดอัปเดตตัวเลขอยู่)
- `data-tab` ใช้ร่วมกับ `showTab()` เดิม

### 3.2 การวางเลย์เอาต์ (content fix)
- `.nav` = `position:fixed; left:0; top:0; bottom:0; z-index:90` (full height ซ้าย)
- ตัวแปรความกว้าง rail: `--nav-w` (ค่า reserve สำหรับ content) กับความกว้างจริงของ `.nav`
  - **Expanded**: `.nav` กว้าง 210, `--nav-w = 210` → content เว้นซ้าย 210
  - **Collapsed**: `.nav` กว้าง 54, `--nav-w = 54` → content เว้นซ้าย 54
  - **Hover**: `--nav-w = 54` (คงที่) ; `.nav` ปกติ 54, ตอน `:hover` ขยายเป็น 210 **โดย content ไม่ขยับ** (ลอยทับ + เงา)
- `.content` (flex child ที่มี topbar+main) ได้ `padding-left: var(--nav-w)` → topbar + main ขยับพร้อมกัน
- ตั้ง `--nav-w` ที่ `#app` (หรือ `:root`) ผ่าน JS `applyNavMode()`
- transition width/padding นุ่ม (~.18s)

### 3.3 Mobile (≤760px)
- ใช้ rail บาง **54px คงที่** (icon-only) เสมอ; `--nav-w = 54`; แตะไอคอน = navigate
- ไม่ทำ off-canvas/hamburger (ของเดิมไม่มีปุ่ม ham จริง — เลี่ยงความซับซ้อน; ถือเป็น future enhancement)
- Sidebar control popover ยังใช้งานได้

---

## 4. โทนสี & ไอคอน (Supabase neutral)

### 4.1 สี (ผูกกับ token เดิม → dark mode ได้ฟรี)
- พื้น `.nav`: `var(--side)` ; เส้นขวา `1px solid var(--line)`
- item ปกติ: ตัวหนังสือ/ไอคอน `var(--ink2)` (muted)
- item hover: bg `var(--hover)`, สี `var(--ink)`
- **item active** (subtle, ไม่มีสีเด่น): bg `var(--hover)` (เทาอ่อน) + ตัวหนังสือ/ไอคอน `var(--ink)` + font-weight เพิ่มขึ้นเล็กน้อย ; **ไม่มีแถบสี/ไม่ใช้ accent**
- badge: คงสไตล์เดิม (`.dbadge` ใช้ accent) หรือปรับเป็น chip เทาในโหมด expanded — ค่าเริ่ม: คงตัวเลขชิดขวา
- red dot (แจ้งเตือน) แบบรูป Advisors: ตอนนี้ยังไม่ใช้ (ไม่มี requirement)

### 4.2 ไอคอน
- เส้นบาง (stroke ~1.5–1.8), ขนาด ~18–20px, สี muted — คงชุด SVG เดิมของแต่ละเมนูได้ (โปรเจค=grid, Automation=arrows, ตั้งค่า=gear) เพียงปรับ stroke/ขนาด/สีให้เข้ากับโทน Supabase
- icon กล่องขนาดคงที่ (เช่น 20px) จัดชิดซ้ายในแถว ทำให้ตอนยุบ/กางไอคอน**ไม่ขยับ**

### 4.3 โครงแถว (nav-item)
- แถว: `height ~34px; display:flex; align-items:center; gap:10px; padding:0 12px; border-radius:8px; margin:2px 8px`
- label: `.nav-lbl` — โหมด expanded แสดง, collapsed ซ่อน (opacity/needs no reflow), hover→แสดง
- ตอน collapsed: hover ไอคอนโชว์ **tooltip** (reuse `::after` content:attr(data-tip) แบบเดิม) เฉพาะโหมด collapsed

---

## 5. สามโหมด (พฤติกรรมละเอียด)

| โหมด | `.nav` width | `--nav-w` | label | hover |
|---|---|---|---|---|
| **expanded** | 210 | 210 | แสดง | — |
| **collapsed** | 54 | 54 | ซ่อน | โชว์ tooltip |
| **hover** | 54 (→210 บน hover) | 54 (คงที่) | ซ่อน (→แสดงตอน hover) | ขยายลอยทับ + เงา |

- ควบคุมด้วย `[data-mode]` บน `.nav` เป็นหลัก (CSS) ; JS แค่ตั้ง `data-mode` + `--nav-w` + persist

---

## 6. Sidebar control (popover)
- ปุ่ม `#navCtrlBtn` ล่างสุด (ไอคอน + label "Sidebar control" ในโหมด expanded)
- คลิก → toggle `#navPop` (popover เล็ก ลอยเหนือปุ่ม)
- ตัวเลือก 3 อัน: **Expanded / Collapsed / Expand on hover** ; มี `●` หน้าตัวที่เลือกอยู่
- เลือก → `setNavMode(mode)` : ตั้ง data-mode + `--nav-w` + `localStorage` + ปิด popover
- คลิกนอกกรอบ = ปิด popover (document click handler แบบเดียวกับ combobox เดิม)

---

## 7. Integration กับโค้ดเดิม
- `showTab()` (บรรทัด ~1496) และ wiring (บรรทัด ~1497): เปลี่ยน selector `.di[data-tab]` → `[data-tab]` (dock เดิมถูก comment แล้วจึงไม่ชน) — active state + click navigation ใช้ต่อได้ทันที
- `navReqCount` : คง id ไว้บน badge โปรเจค
- boot: เพิ่มเรียก `applyNavMode(localStorage['erp_nav_mode']||'hover')` (ตอน init — ก่อน/หลัง startApp ได้ เพราะเป็น pref ล้วน)
- topbar, projtabs, brToggle, ปุ่ม present/add : **ไม่แตะ**

---

## 8. Archive dock เดิม (revert path)
ครอบ 3 ส่วนนี้ด้วย comment block พร้อมป้าย:
1. **Markup** `<aside class="dock">…</aside>` (บรรทัด ~656–663)
2. **CSS** `.dock/.di/.di-ic/.dbadge/.di-lbl/.di::after/…` + `.di.active…` (บรรทัด ~542–562)
3. **JS** magnification IIFE `(function(){const dock=…})()` (บรรทัด ~1498–1515)

ป้ายกำกับ (ตัวอย่าง):
```
<!-- ===== LEGACY DOCK (archived 2026-07-04). REVERT: uncomment this block
     and comment out the .nav sidebar block below. ===== -->
```
> revert = uncomment dock + comment `.nav` (สลับกลับได้ครบชุด)

---

## 9. Acceptance Criteria
1. เปิดแอป → เห็น sidebar ซ้ายแบบ Supabase (โหมด default = hover: rail 54px)
2. โหมด **Expanded**: กว้าง 210 เห็น label, content เว้นซ้าย 210
3. โหมด **Collapsed**: กว้าง 54 icon-only, hover เห็น tooltip
4. โหมด **Hover**: ปกติ 54, เอาเมาส์ชี้ → ขยายเป็น 210 ลอยทับ **content ไม่ขยับ**
5. Sidebar control popover เลือกโหมดได้ + `●` ตรงโหมดปัจจุบัน + จำค่าใน localStorage (reload แล้วคงเดิม)
6. คลิกเมนู (โปรเจค/Automation/ตั้งค่า) → เปลี่ยนหน้าเหมือนเดิม + แถว active ไฮไลต์แบบ subtle
7. badge 83/39 แสดงถูก (โปรเจคยังอัปเดตเลขได้)
8. Dark mode: sidebar เปลี่ยนสีตาม token ถูกต้อง
9. dock เดิมถูก comment ไว้ครบ — uncomment แล้วกลับไปใช้ได้
10. topbar/แท็บ/Gantt/ตาราง เหมือนเดิม (ไม่ regression)
11. `node --check` สคริปต์หลักผ่าน

---

## 10. Out of scope (YAGNI)
- ไม่ทำ off-canvas/hamburger บนมือถือ (rail บางพอ)
- ไม่เปลี่ยน accent ทั้งแอปเป็นเขียว
- ไม่เพิ่มเมนูใหม่ / ไม่เปิด Overview
- ไม่ทำ search กลับมา
- ไม่แตะ persistence/Firebase

---

## 11. การตรวจสอบ
- `node --check` สคริปต์หลัก
- Visual: preview แยก (standalone) ผ่าน Playwright — เทียบ 3 โหมด + popover + dark mode (แอปจริงติด login gate จึงตรวจผ่าน preview + code review)
- Manual (ผู้ใช้หลัง login): ไล่ตาม Acceptance Criteria
