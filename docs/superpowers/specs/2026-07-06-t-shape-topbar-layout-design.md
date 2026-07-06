# T-Shape Top Bar Layout — Design

**Date:** 2026-07-06
**File touched:** `index.html` (CSS only)
**Status:** Approved (design), pending spec review

## Goal

เปลี่ยน layout จากปัจจุบัน (sidebar ซ้ายเต็มความสูง + topbar อยู่ข้างใน content ทางขวาของ sidebar)
ให้เป็นแบบ **T-Shape**: top bar เต็มความกว้างพาดบนสุด (หัวของ T) + sidebar ซ้ายเริ่มใต้ top bar (ขาของ T)

## Constraint (สำคัญ)

- แก้ **CSS เท่านั้น** ใน `index.html` — ไม่แตะ HTML structure, ไม่แตะ JS
- คงพฤติกรรม/ฟีเจอร์เดิม 100%: เนื้อหาใน topbar (breadcrumb, sub-tabs, ปุ่มนำเสนอ, ปุ่ม +เพิ่ม),
  sidebar 3 โหมด (expanded/collapsed/hover) + popover, `--nav-w`, สี, dark mode, ปุ่มทุกตัว
- แนวทางที่เลือก: **A — ยืด topbar เดิมเต็มกว้างแบบมินิมอล** (ไม่มี brand zone, breadcrumb เริ่มจากขอบซ้ายสุด, ทุกอย่างอยู่ใน bar เดียว)

## โครงปัจจุบัน (baseline)

```
#app (--nav-w set by applyNavMode: 54px | 210px)
├─ aside.nav      position:fixed; left:0; top:0; bottom:0; z-index:90; width:var
└─ div.content    flex:1; display:flex; column; padding-left:var(--nav-w)
   ├─ div.topbar  position:relative; height:46px; glassy blur; border-bottom
   └─ div.main    flex:1; overflow-y:scroll; padding:26px 34px 52px
```

อ้างอิงบรรทัด: `.content` = index.html:59 · `.topbar` = index.html:60 · `.nav` = index.html:564 ·
`applyNavMode` (ตั้ง `--nav-w` บน `#app`) = index.html:1592 · responsive ≤760px = index.html:587

## การเปลี่ยนแปลง (CSS deltas)

ใช้ตัวแปรความสูง topbar เดียวคุมทั้งหมด เพื่อแก้ที่เดียว:

| Selector | เดิม | ใหม่ |
|----------|------|------|
| `:root` | — | เพิ่ม `--topbar-h:46px` |
| `.topbar` | `position:relative; height:46px` | `position:fixed; top:0; left:0; right:0; z-index:100; height:var(--topbar-h)` (คง blur/border/flex เดิม) |
| `.nav` | `top:0` | `top:var(--topbar-h)` |
| `.content` | `padding-left:var(--nav-w)` | เพิ่ม `padding-top:var(--topbar-h)` |

เหตุผล:
- `.topbar` fixed + `left:0;right:0` → พาดเต็ม viewport width คร่อมมุมซ้ายบน (หัว T); z-index:100 > nav(90)
- `.nav top:var(--topbar-h)` → sidebar เริ่มใต้ topbar (ขา T) ยังคง `bottom:0` เต็มถึงล่าง
- `.content padding-top` → กัน `.main` ไม่ให้ลอดใต้ topbar ที่ fixed แล้ว (topbar หลุดจาก flow ของ content)
- `.content padding-left:var(--nav-w)` คงเดิม → main ยังหลบ sidebar; nav modes ทำงานเหมือนเดิม

## ความเสี่ยง & การ verify

1. **พื้นที่แนวตั้ง −46px**: element ที่ใช้ `max-height:calc(100vh - Npx)` (เช่น Gantt `piGantt`
   = `calc(100vh - 300px)`, table scroll areas) จะมีที่น้อยลง 46px อยู่ใน `.main` ที่ scroll ได้
   → worst case scroll เพิ่มนิดเดียว. ถ้าล้น/ตัด ให้บวก `--topbar-h` เข้าไปใน calc ของ element นั้น
   (ปรับเฉพาะที่จำเป็นหลัง verify)
2. **Responsive ≤760px**: topbar เต็มกว้างอยู่แล้ว, nav ยัง 54px + top offset — ตรวจว่าไม่ทับกัน
3. **glassy blur topbar**: ตอน fixed จะเห็น content เลื่อนอยู่หลัง blur (เหมือน sticky header ทั่วไป) — คาดว่าเป็นผลลัพธ์ที่ดี

**Verify (Playwright):** เทียบก่อน/หลังทุก tab (ภาพรวม/โปรเจค/Requirements/Automation/แผนงาน) ทั้ง light + dark,
ทั้ง 3 โหมด sidebar — topbar พาดเต็มกว้าง, sidebar เริ่มใต้ topbar, ไม่มีเนื้อหาโดนบัง, ไม่มี horizontal scroll,
Gantt/ตารางไม่ล้น

## Out of scope (YAGNI)

- ไม่เพิ่ม brand/logo zone (นั่นคือ approach C)
- ไม่ย้าย sub-tabs ลงแถวที่สอง (approach B)
- ไม่แตะ persistence/Firebase, ไม่แตะ render logic, ไม่แตะ nav modes JS
