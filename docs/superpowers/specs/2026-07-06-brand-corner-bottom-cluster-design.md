# Brand Corner + Bottom Cluster — Design

**Date:** 2026-07-06
**File touched:** `index.html` (HTML + CSS; **no JS**)
**Status:** Approved (design), pending spec review
**Follows:** T-Shape top bar layout (already deployed) — builds on the fixed full-width topbar

## Goal

ปรับปรุง shell ต่อจาก T-Shape 2 จุด:
1. **Brand corner (ข้อ 2):** ใส่โลโก้ + wordmark ที่มุมซ้ายบน (T-corner) ในแถบ topbar — ดัน breadcrumb ให้เริ่มหลัง sidebar (เลิกล้ำคร่อม sidebar) และให้ identity
2. **จัดกลุ่มล่าง (ข้อ 3):** ย้าย `#syncBadge` ("เชื่อมต่อแล้ว") จาก element ลอย `position:fixed` เข้าไปอยู่ในกลุ่มล่างของ sidebar แบบ in-flow เลิกเบียด/ทับปุ่ม Sidebar control

## Constraints

- แก้ **HTML + CSS** ใน `index.html` เท่านั้น — **ห้ามแตะ JS**
- ต้องคง `id="syncBadge"` + ลูก `.sb-dot` / `.sb-txt` ไว้ครบ เพราะ JS (index.html:2293, `DB.onStatus`) อ้างอิงและอัปเดต element นี้ (toggle `display`, class `.off/.saving`, text)
- คงพฤติกรรมเดิม 100%: nav 3 โหมด (expanded/collapsed/hover) + popover, `--nav-w`, dark mode, สี, breadcrumb, sub-tabs, ปุ่มทุกตัว, T-Shape topbar (`--topbar-h:46px`, `.topbar` fixed)
- ไฟล์เป็น CRLF — anchor edit บน string บรรทัดเดียว
- โลโก้: `SMALL_CIVIL_LOGO.png` (emblem สี่เหลี่ยม เฟือง/เข็มทิศ แดง+กรมท่า — เหมาะทั้ง icon ตอนหุบและ icon+text ตอนกาง)
- wordmark = **"Civil ERP"** (เปลี่ยนภายหลังได้)

## Current structure (baseline, references)

```
<div id="syncBadge">…</div>                         index.html:692  (fixed, left:14 bottom:14, z:60, display:none until JS)
<div class="app" id="app">                          index.html:693
  <aside class="nav" data-mode="hover">             index.html:707  (fixed, top:var(--topbar-h), width var(--nav-w))
    <div class="nav-group"> โปรเจค / Automation </div>   708–711
    <div class="nav-spacer"></div>                  712  (flex:1 — the void; keep)
    <div class="nav-group nav-bottom">              713  (divider, ตั้งค่า, Sidebar control btn, nav-pop)
  </aside>
  <div class="content">                             726  (padding-left:var(--nav-w); padding-top:var(--topbar-h))
    <div class="topbar"> .crumb + projtabs + tsp + buttons </div>   727
```

CSS refs: `.topbar`=60 (`padding:0 16px`) · `.crumb`=65 · `.nav`=564 · `.nav-item`=567 · `.nav-lbl`=572 · nav modes=576–583 · `#syncBadge`=687–690 · `--nav-w` set on `#app` by `applyNavMode`=1592

## Design

### Component 1 — Brand corner (in the topbar, tracks sidebar width)

**HTML** — add as the FIRST child of `.topbar` (before `.crumb`):
```html
<div class="brand"><img class="brand-logo" src="SMALL_CIVIL_LOGO.png" alt="Civil ERP"><span class="brand-wm">Civil ERP</span></div>
```

**CSS:**
- `.topbar` : `padding:0 16px` → `padding:0 16px 0 0` (ตัด padding ซ้าย เพื่อให้ brand ชิดขอบ x=0 ตรงกับ sidebar)
- `.brand{flex:none;width:var(--nav-w,54px);height:100%;display:flex;align-items:center;gap:11px;padding-left:16px;border-right:1px solid var(--line2);overflow:hidden;transition:width .18s cubic-bezier(.32,.72,0,1)}`
- `.brand-logo{width:26px;height:26px;flex:none;object-fit:contain}`
- `.brand-wm{font-weight:700;font-size:14px;letter-spacing:-.01em;color:var(--ink);white-space:nowrap}`

**กลไกซ่อน wordmark ตอนหุบ (ไม่ต้องใช้ JS/mode selector):** `.brand` กว้าง `var(--nav-w)` + `overflow:hidden`. ตอนหุบ (54px): 16(pad)+26(logo)+11(gap)=53px → wordmark ถูก clip หาย. ตอนกาง (210px): wordmark โผล่. ใช้ `transition:width` เดียวกับ sidebar ให้ขยับพร้อมกัน.

- **Dark mode:** `.brand-wm` ใช้ `color:var(--ink)` ซึ่ง dark = สว่าง (หลัง fix `--ink:#f5f5f7`) อ่านออก. `border-right:var(--line2)` โปร่งบางทั้ง 2 ธีม.
- **Mobile (≤760px):** nav ถูกบังคับ 54px แต่ `--nav-w` อาจยังเป็น 210 → เพิ่มใน media query เดิม (index.html:587): `.brand{width:54px}` ให้ brand หุบตาม sidebar บนมือถือ.
- **breadcrumb:** `.crumb` ตามหลัง brand (flex gap เดิม 14px) → เริ่มหลัง sidebar อัตโนมัติ ไม่ล้ำ. border-right ของ brand ต่อแนวเส้นขอบขวาของ sidebar เป็นเส้นตั้งเดียวกัน.

### Component 2 — Bottom cluster (relocate syncBadge into sidebar)

**HTML** — ย้าย `<div id="syncBadge">…</div>` ทั้งก้อน (คง id + `.sb-dot` + `.sb-txt`) จาก index.html:692 ไปเป็นลูกตัวสุดท้ายใน `.nav-group.nav-bottom` (ใต้ปุ่ม Sidebar control, หลัง `#navPop`).

**CSS** — เปลี่ยน `#syncBadge` จาก floating เป็น in-flow row สไตล์เดียวกับ nav-item:
- เดิม: `position:fixed;left:14px;bottom:14px;z-index:60;…;box-shadow:var(--cardsh);background:var(--surface);border:1px solid var(--line)`
- ใหม่: `position:static;margin:2px 8px 2px;padding:0 9px;height:30px;background:none;border:0;box-shadow:none;border-radius:8px` (คงของเดิมไว้: `display:none` + `align-items:center;gap:7px`; JS จะ set `display:flex` ตอนเชื่อมต่อ)
- ซ่อน text ตอนหุบ: syncBadge อยู่ใน `.nav` แล้ว → `.nav[data-mode="collapsed"] #syncBadge .sb-txt,.nav[data-mode="hover"] #syncBadge .sb-txt{opacity:0}` (parity กับ `.nav-lbl`); ตอน hover-expand ให้โผล่: `.nav[data-mode="hover"]:hover #syncBadge .sb-txt{opacity:1}`. `.sb-dot` โชว์ทุกโหมด.
- `.sb-txt{transition:opacity .13s;white-space:nowrap;font-size:11.5px;color:var(--ink2)}` (dark: ผ่าน `--ink2` ซึ่งสว่างในธีมมืด)

**JS ไม่แตะ:** `DB.onStatus` (index.html:2293) ยังหา `#syncBadge` เจอ, set `display:flex`, toggle `.off/.saving`, อัปเดต `.sb-txt` ได้เหมือนเดิม เพราะ id/children คงอยู่.

## ผลลัพธ์ (mockup)
```
+--------+------------------------------------+
| ⬡ Civil| Project Implementation Oracle... / |
| ERP    |                                    |
+--------+------------------------------------+
| ⊞ โปรเจค          165 |                      |
| ⇄ Automation       39 |      content         |
|      (spacer)         |                      |
| ───────────          |                      |
| ⚙ ตั้งค่า             |                      |
| ▣ Sidebar control    |                      |
| 🟢 เชื่อมต่อแล้ว       |   <- in-flow now     |
+----------------------+                      |
```

## Verify (Playwright)
- Brand corner: กว้างตรง `--nav-w` ทั้ง 3 โหมด (54 หุบ / 210 กาง); โลโก้โชว์เสมอ, wordmark โชว์เฉพาะกาง (หุบ→clip); border-right ต่อแนว sidebar; breadcrumb เริ่มหลัง brand (ไม่ล้ำ sidebar)
- syncBadge: อยู่ในกลุ่มล่าง sidebar (ไม่ลอย/ไม่ทับปุ่ม control); force `display:flex` + `.off/.saving` ดูว่า dot/text ถูก; หุบ→เหลือ dot; ไม่มี element ลอยที่ bottom-left viewport แล้ว
- Regression: nav 3 โหมด, popover, T-Shape topbar geometry, ไม่มี horizontal scroll; light + dark screenshots
- (verify แบบซ่อน `#loginGate` + set DOM ตรงๆ เหมือนงาน T-Shape เพราะ login gate + Firebase offline)

## Out of scope (YAGNI)
- ข้อ 1 (เติมช่องว่าง sidebar เพิ่ม): brand corner ทำให้ void ดู intentional แบบ Supabase อยู่แล้ว — ไม่เติมเพิ่ม
- ข้อ 4 (badge), ข้อ 5 (nav hierarchy): ไม่อยู่ใน scope รอบนี้
- ไม่แตะ persistence/Firebase/JS, ไม่ย้าย sub-tabs, ไม่แตะ render logic
